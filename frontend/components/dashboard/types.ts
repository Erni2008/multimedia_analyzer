export type MediaAsset = {
  id: number;
  original_filename: string;
  extension: string;
  media_type: string;
  status: string;
  processing_stage: string;
  transcript: string | null;
  transcript_excerpt: string | null;
  summary: string | null;
  entities: Array<{ text: string; label: string }>;
  entity_count: number;
  alert_matches: string[];
  alert_count: number;
  error_message: string | null;
  processing_started_at: string | null;
  processing_finished_at: string | null;
  processing_duration_ms: number | null;
  retry_count: number;
  created_at: string | null;
  updated_at: string | null;
};

export type MediaListResponse = {
  items: MediaAsset[];
  limit: number;
  offset: number;
  total: number;
};

export type MediaListResult = {
  items: MediaAsset[];
  limit: number;
  offset: number;
  total: number;
};

export type DashboardProfile = {
  email: string | null;
  watchedEntities: string[];
};

export type StatusTone = "neutral" | "success" | "error";
export type BusyAction = "register" | "login" | "watchlist" | "upload" | "recap" | "delete" | null;
export type AuthMode = "login" | "register";
export type FeedFilter = "all" | "attention" | "active" | "completed" | "failed";
export type SortMode = "recent" | "alerts" | "entities" | "name";
export type ToastItem = {
  id: number;
  message: string;
  tone: StatusTone;
};

export type FeedStats = {
  total: number;
  pending: number;
  completed: number;
  alerted: number;
  failed: number;
  entities: number;
};
