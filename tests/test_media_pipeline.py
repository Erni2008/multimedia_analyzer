"""Unit tests for media pipeline helpers."""

import sys
import types
import unittest

sys.modules.setdefault("ffmpeg", types.ModuleType("ffmpeg"))

from app.services.media_pipeline import MediaPipeline


class MediaPipelineTests(unittest.TestCase):
    def setUp(self) -> None:
        self.pipeline = MediaPipeline()

    def test_summarize_normalizes_whitespace_and_truncates(self) -> None:
        transcript = (
            "OpenAI discussed shipping a new multilingual transcript workflow for enterprise teams. "
            "The speaker explained that the product now supports longer recordings and clearer recap output. "
            "A final section focused on Russian speech support and dashboard review."
        )

        summary = self.pipeline.summarize(f"  {transcript}\n\n")

        self.assertTrue(summary.startswith("Quick recap: "))
        self.assertNotIn("  ", summary)

    def test_summarize_handles_empty_transcript(self) -> None:
        summary = self.pipeline.summarize("   ")

        self.assertEqual(summary, "Quick recap: No transcript available yet.")

    def test_summarize_prefers_clean_lead_sentence(self) -> None:
        transcript = (
            "The speaker introduces a compact transcription workflow for uploaded media. "
            "Then the talk repeats implementation details about caching and background jobs several times. "
            "Finally the speaker explains that users can open the full transcript and request a short recap."
        )

        summary = self.pipeline.summarize(transcript)

        self.assertIn("The speaker introduces a compact transcription workflow", summary)
        self.assertIn("users can open the full transcript", summary)

    def test_summarize_handles_low_punctuation_transcript(self) -> None:
        transcript = " ".join(["transcript"] * 18 + ["workflow"] * 10 + ["recap"] * 10 + ["dashboard"] * 10)

        summary = self.pipeline.summarize(transcript)

        self.assertTrue(summary.startswith("Quick recap: "))
        self.assertLess(len(summary), 460)

    def test_extract_entities_ignores_blank_transcript(self) -> None:
        entities = self.pipeline.extract_entities("   ")

        self.assertEqual(entities, [])

    def test_detect_alert_matches_reads_transcript_and_deduplicates_case_insensitively(self) -> None:
        transcript = "OpenAI and Microsoft were both mentioned. Later openai appeared again."
        entities = [
            {"text": "OpenAI", "label": "ORG"},
            {"text": "openai", "label": "ORG"},
            {"text": "Microsoft", "label": "ORG"},
        ]
        watchlist = [" OpenAI ", "openai", "", "MICROSOFT"]

        hits = self.pipeline.detect_alert_matches(transcript, entities, watchlist)

        self.assertEqual(hits, ["OpenAI", "MICROSOFT"])


if __name__ == "__main__":
    unittest.main()
