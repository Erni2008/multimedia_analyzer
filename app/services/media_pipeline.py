"""Media processing services."""

import json
import math
import re
from pathlib import Path

from app.config import settings

try:
    import ffmpeg
except ImportError:  # pragma: no cover - optional local dependency for host-side tests
    ffmpeg = None

try:
    from faster_whisper import WhisperModel
except ImportError:  # pragma: no cover - optional local dependency for host-side tests
    WhisperModel = None

SENTENCE_SPLIT_RE = re.compile(r"(?<=[.!?])\s+")
TOKEN_RE = re.compile(r"[^\W\d_]+", flags=re.UNICODE)
TRANSCRIPT_SPACE_RE = re.compile(r"\s+")
STOPWORDS = {
    "a",
    "an",
    "and",
    "are",
    "as",
    "at",
    "be",
    "but",
    "by",
    "for",
    "from",
    "if",
    "in",
    "into",
    "is",
    "it",
    "its",
    "of",
    "on",
    "or",
    "that",
    "the",
    "their",
    "there",
    "this",
    "to",
    "was",
    "we",
    "with",
    "about",
    "after",
    "before",
    "what",
    "when",
    "where",
    "who",
    "why",
    "как",
    "для",
    "или",
    "это",
    "эта",
    "эти",
    "того",
    "если",
    "когда",
    "чтобы",
    "только",
    "после",
    "перед",
    "про",
    "его",
    "её",
    "они",
    "она",
    "оно",
    "мы",
    "вы",
    "их",
    "наш",
    "ваш",
    "быть",
    "есть",
    "так",
    "там",
}
MIN_RECAP_TOKENS = 4
MAX_RECAP_SENTENCES = 3
RECAP_WORD_WINDOW = 24
MAX_RECAP_CHARS = 420


def _normalize_text(value: str) -> str:
    return TRANSCRIPT_SPACE_RE.sub(" ", value).strip()


def _meaningful_tokens(value: str) -> list[str]:
    return [
        token
        for token in TOKEN_RE.findall(value.lower())
        if len(token) >= 3 and token not in STOPWORDS
    ]


def _split_recap_units(transcript: str) -> list[str]:
    sentences = [_normalize_text(sentence) for sentence in SENTENCE_SPLIT_RE.split(transcript)]
    sentences = [sentence for sentence in sentences if len(_meaningful_tokens(sentence)) >= MIN_RECAP_TOKENS]

    if len(sentences) >= 2:
        deduplicated: list[str] = []
        seen: set[str] = set()
        for sentence in sentences:
            key = sentence.casefold()
            if key in seen:
                continue
            deduplicated.append(sentence)
            seen.add(key)
        return deduplicated

    words = transcript.split()
    if not words:
        return []

    chunks: list[str] = []
    for start in range(0, min(len(words), RECAP_WORD_WINDOW * MAX_RECAP_SENTENCES), RECAP_WORD_WINDOW):
        chunk = _normalize_text(" ".join(words[start : start + RECAP_WORD_WINDOW]))
        if chunk:
            if chunk[-1] not in ".!?":
                chunk = f"{chunk}."
            chunks.append(chunk)
    return chunks


def _token_overlap(left: list[str], right: list[str]) -> float:
    left_set = set(left)
    right_set = set(right)
    if not left_set or not right_set:
        return 0.0
    shared = len(left_set & right_set)
    return shared / max(len(left_set), len(right_set))


class MediaPipeline:
    """High-level orchestration for media analysis."""

    def __init__(self) -> None:
        self._model = None

    def extract_audio(self, input_path: str, output_path: str) -> str:
        source = Path(input_path)
        if source.suffix.lower() in {".mp3", ".wav", ".m4a", ".aac", ".flac"}:
            return input_path
        if ffmpeg is None:
            raise RuntimeError(
                "FFmpeg Python bindings are not installed. Rebuild the containers to enable video audio extraction."
            )

        ffmpeg.input(input_path).output(output_path, acodec="pcm_s16le", ac=1, ar="16000").run(
            overwrite_output=True,
            quiet=True,
        )
        return output_path

    def _get_model(self):
        if self._model is not None:
            return self._model
        if WhisperModel is None:
            raise RuntimeError(
                "Speech-to-text backend is not installed. Rebuild the containers to enable transcription."
            )

        settings.whisper_cache_path.mkdir(parents=True, exist_ok=True)
        self._model = WhisperModel(
            settings.whisper_model_size,
            device=settings.whisper_device,
            compute_type=settings.whisper_compute_type,
            download_root=str(settings.whisper_cache_path),
        )
        return self._model

    def transcribe(self, media_path: str) -> str:
        model = self._get_model()
        segments, _ = model.transcribe(
            media_path,
            beam_size=settings.whisper_beam_size,
            language=settings.whisper_language or None,
            task="transcribe",
            vad_filter=True,
            condition_on_previous_text=True,
        )

        parts = [_normalize_text(segment.text) for segment in segments]
        transcript = " ".join(part for part in parts if part)
        transcript = _normalize_text(transcript)
        if not transcript:
            raise RuntimeError("No speech could be transcribed from this file.")
        return transcript

    def summarize(self, transcript: str) -> str:
        cleaned = _normalize_text(transcript)
        if not cleaned:
            return "Quick recap: No transcript available yet."

        units = _split_recap_units(cleaned)
        if not units:
            return "Quick recap: No transcript available yet."
        if len(units) <= 2:
            recap = " ".join(units)
            if len(recap) > MAX_RECAP_CHARS:
                recap = f"{recap[:MAX_RECAP_CHARS].rstrip(' .,;:')}..."
            return f"Quick recap: {recap}"

        frequencies: dict[str, int] = {}
        for token in TOKEN_RE.findall(cleaned.lower()):
            if len(token) < 3 or token in STOPWORDS:
                continue
            frequencies[token] = frequencies.get(token, 0) + 1

        ranked: list[tuple[int, float, str, list[str]]] = []
        for index, sentence in enumerate(units):
            tokens = _meaningful_tokens(sentence)
            if not tokens:
                continue
            score = sum(math.log1p(frequencies.get(token, 0)) for token in tokens)
            score = score / math.sqrt(max(len(tokens), 1))
            if index == 0:
                score += 0.75
            elif index < 3:
                score += 0.2
            if len(sentence) > 260:
                score -= 0.15
            ranked.append((index, score, sentence, tokens))

        if not ranked:
            recap = " ".join(units[:2])
            return f"Quick recap: {recap}"

        selected: list[tuple[int, str, list[str]]] = []
        first_index, _, first_sentence, first_tokens = ranked[0]
        selected.append((first_index, first_sentence, first_tokens))

        for index, _, sentence, tokens in sorted(ranked[1:], key=lambda item: item[1], reverse=True):
            if len(selected) >= MAX_RECAP_SENTENCES:
                break
            if any(_token_overlap(tokens, existing_tokens) >= 0.65 for _, _, existing_tokens in selected):
                continue
            selected.append((index, sentence, tokens))

        selected.sort(key=lambda item: item[0])
        recap = " ".join(sentence for _, sentence, _ in selected)
        recap = _normalize_text(recap)
        if len(recap) > MAX_RECAP_CHARS:
            recap = f"{recap[:MAX_RECAP_CHARS].rstrip(' .,;:')}..."
        return f"Quick recap: {recap}"

    def extract_entities(self, transcript: str) -> list[dict[str, str]]:
        if not transcript.strip():
            return []

        known_entities = {
            "OpenAI",
            "Microsoft",
            "Google",
            "Amazon",
            "YouTube",
            "Europe",
        }
        candidate_pattern = re.compile(r"\b(?:[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2}|[A-Z]{2,}(?:\s+[A-Z]{2,})*)\b")
        known_entities.update(match.group(0) for match in candidate_pattern.finditer(transcript))

        matches: list[dict[str, str]] = []
        seen: set[str] = set()
        for entity in sorted(known_entities):
            if re.search(rf"\b{re.escape(entity)}\b", transcript, flags=re.IGNORECASE):
                label = "ORG" if entity not in {"Europe"} else "GPE"
                key = entity.lower()
                if key not in seen:
                    matches.append({"text": entity, "label": label})
                    seen.add(key)
        return matches

    def render_entities(self, entities: list[dict[str, str]]) -> str:
        return json.dumps(entities, ensure_ascii=False)

    def detect_alert_matches(
        self,
        transcript: str,
        entities: list[dict[str, str]],
        watchlist: list[str],
    ) -> list[str]:
        normalized: dict[str, str] = {}
        for item in watchlist:
            clean = item.strip()
            if not clean:
                continue
            key = clean.casefold()
            if key not in normalized:
                normalized[key] = clean

        hits: list[str] = []
        seen: set[str] = set()
        transcript_haystack = transcript.casefold()

        for key, original in normalized.items():
            if key in transcript_haystack and key not in seen:
                hits.append(original)
                seen.add(key)

        for entity in entities:
            label = entity.get("text", "").strip().casefold()
            if label in normalized and label not in seen:
                hits.append(normalized[label])
                seen.add(label)
        return hits
