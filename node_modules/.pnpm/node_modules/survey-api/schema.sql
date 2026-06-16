-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Surveys Table
CREATE TABLE IF NOT EXISTS surveys (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    primary_color TEXT,
    logo_url TEXT,
    is_open INTEGER NOT NULL DEFAULT 1,
    font_family TEXT NOT NULL DEFAULT 'sans',
    bg_style TEXT NOT NULL DEFAULT 'tinted',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Questions Table
CREATE TABLE IF NOT EXISTS questions (
    id TEXT PRIMARY KEY,
    survey_id TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('short_text', 'long_text', 'multiple_choice', 'single_select', 'rating', 'matrix', 'date')),
    text TEXT NOT NULL,
    order_index INTEGER NOT NULL,
    options TEXT, -- JSON array of strings for multiple choice options
    logic_rule TEXT, -- JSON string representing visibility conditions
    FOREIGN KEY (survey_id) REFERENCES surveys(id) ON DELETE CASCADE,
    CHECK (options IS NULL OR json_valid(options)),
    CHECK (logic_rule IS NULL OR json_valid(logic_rule))
);

-- Responses Table
CREATE TABLE IF NOT EXISTS responses (
    id TEXT PRIMARY KEY,
    survey_id TEXT NOT NULL,
    answers TEXT NOT NULL, -- JSON object of question_id -> response_value
    submitted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (survey_id) REFERENCES surveys(id) ON DELETE CASCADE,
    CHECK (json_valid(answers))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_surveys_user_id ON surveys(user_id);
CREATE INDEX IF NOT EXISTS idx_questions_survey_order ON questions(survey_id, order_index);
CREATE INDEX IF NOT EXISTS idx_responses_survey_id ON responses(survey_id);
