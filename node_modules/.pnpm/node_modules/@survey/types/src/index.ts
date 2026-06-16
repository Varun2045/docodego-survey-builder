/**
 * Raw Database Representation for the `users` table.
 */
export interface DbUser {
  id: string;
  username: string;
  password_hash: string;
  created_at: string;
}

/**
 * Raw Database Representation for the `surveys` table.
 */
export interface DbSurvey {
  id: string;
  user_id: string;
  title: string;
  primary_color: string | null;
  logo_url: string | null;
  is_open: number;
  font_family: string;
  bg_style: string;
  created_at: string;
}

/**
 * Valid question types.
 */
export type QuestionType =
  | "short_text"
  | "long_text"
  | "multiple_choice"
  | "single_select"
  | "rating"
  | "matrix"
  | "date";

export interface LogicRule {
  depends_on_question_id: string;
  operator: "equals" | "not_equals" | "contains" | "filled" | "empty";
  value: string;
}

/**
 * Raw Database Representation for the `questions` table.
 * Options and Logic Rules are stored as JSON strings in SQLite.
 */
export interface DbQuestion {
  id: string;
  survey_id: string;
  type: QuestionType;
  text: string;
  order_index: number;
  options: string | null; // JSON array of options for multiple choice
  logic_rule: string | null; // JSON string representing LogicRule
}

/**
 * Raw Database Representation for the `responses` table.
 * Answers are stored as a JSON string in SQLite.
 */
export interface DbResponse {
  id: string;
  survey_id: string;
  answers: string; // JSON string mapping question ID to AnswerValue
  submitted_at: string;
}

// --- Application Types (Parsed representations) ---

export interface User {
  id: string;
  username: string;
  created_at: string;
}

export interface Survey {
  id: string;
  user_id: string;
  title: string;
  primary_color: string | null;
  logo_url: string | null;
  is_open: number;
  font_family: string;
  bg_style: string;
  created_at: string;
}

export interface Question {
  id: string;
  survey_id: string;
  type: QuestionType;
  text: string;
  order_index: number;
  options: string[] | null; // Parsed JSON options
  logic_rule: LogicRule | null; // Parsed LogicRule
}

/**
 * Typed answer value representing answers for different question types:
 * - short_text: string
 * - rating: number
 * - multiple_choice: string or string[]
 */
export type AnswerValue = string | number | string[];

export interface Response {
  id: string;
  survey_id: string;
  answers: Record<string, AnswerValue>; // Parsed JSON answers, mapped by question ID
  submitted_at: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}
