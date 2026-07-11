// ── Core domain types ─────────────────────────────────────────────

export type MemoryType =
  | "concept"
  | "emotion"
  | "person"
  | "goal"
  | "pattern"
  | "session";

export interface MemoryEntry {
  id: string;
  learner_id: string;
  type: MemoryType;
  key: string;
  data: Record<string, any>;
  confidence: number; // 0..1
  created_at: string; // ISO
  updated_at: string; // ISO
  source_session: string;
}

export interface ConceptData {
  label: string;
  mastery: number; // 0..1
  attempts?: number;
  last_error_type?: string | null;
  best_modality?: string | null;
  decaying?: boolean;
  prereqs?: string[]; // keys of prerequisite concepts
}

export interface PersonData {
  name: string;
  role: string;
  context: string;
  helps_with?: string[]; // concept keys
}

export interface GoalData {
  label: string;
  status: "new" | "progress" | "achieved";
  target_date?: string;
  concept_keys?: string[];
}

export interface PatternData {
  label: string;
  strength: number;
}

export interface SessionData {
  summary: string;
  duration_min?: number;
}

// ── Chat ──────────────────────────────────────────────────────────

export type ChatRole = "user" | "assistant" | "connector";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string; // for connector, unused (card holds data)
  card?: ConnectorCard;
  image?: string; // data URL — camera capture or whiteboard snapshot
  streaming?: boolean;
  ts: string;
}

// ── Agent I/O ─────────────────────────────────────────────────────

export interface ObserverResult {
  concept_updates: {
    key: string;
    label: string;
    mastery_delta: number; // -1..1
    error_type: string | null;
    modality_worked: string | null;
  }[];
  frustration: number; // 0..1
  engagement: number; // 0..1
  people_mentioned: { name: string; role: string; context: string }[];
  goals: { label: string; status: "new" | "progress" | "achieved" }[];
  notable: string | null;
}

export type ConnectorType =
  | "ask_teacher"
  | "take_break"
  | "help_peer"
  | "review_nudge";

export interface ConnectorCard {
  type: ConnectorType;
  headline: string;
  message_to_student: string;
  handoff_artifact: string | null;
  video?: string; // data URL — student-recorded video handoff
  // demo metadata
  rule: string;
  focus_person?: string; // person name involved
  focus_concept?: string; // concept key involved
}

// ── Canvas graph ──────────────────────────────────────────────────

export type NodeKind = "concept" | "person" | "goal" | "pattern";

export interface GraphNode {
  id: string; // = memory key (namespaced by kind)
  kind: NodeKind;
  label: string;
  mastery?: number;
  confidence: number;
  note?: string;
  updated_at?: string;
  achieved?: boolean;
  decaying?: boolean;
  // simulation fields (mutated by d3-force)
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface GraphLink {
  source: string;
  target: string;
  kind: "prereq" | "helps" | "goal";
}
