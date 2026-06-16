import type {
  AnswerValue,
  AuthResponse,
  DbResponse,
  Question,
  Survey,
} from "@survey/types";

const API_BASE = "https://survey-api.docodego-api.workers.dev/api";

export class AuthError extends Error {
  usernameTaken?: boolean;
  suggestions?: string[];
  constructor(
    message: string,
    usernameTaken?: boolean,
    suggestions?: string[],
  ) {
    super(message);
    this.name = "AuthError";
    this.usernameTaken = usernameTaken;
    this.suggestions = suggestions;
  }
}

/**
 * Helper to perform API requests with authorization headers if a token is present.
 */
async function apiFetch(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const token = localStorage.getItem("auth_token");
  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });
}

export async function login(
  username: string,
  password: string,
): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new AuthError(errorData.error || "Failed to log in");
  }
  return res.json();
}

export async function register(
  username: string,
  password: string,
): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new AuthError(
      errorData.error || "Failed to register account",
      errorData.usernameTaken,
      errorData.suggestions,
    );
  }
  return res.json();
}

export async function getSurveys(): Promise<Survey[]> {
  const res = await apiFetch("/surveys");
  if (!res.ok) {
    throw new Error("Failed to fetch surveys");
  }
  return res.json();
}

export async function createSurvey(data: {
  title: string;
  primary_color?: string | null;
  logo_url?: string | null;
}): Promise<Survey> {
  const res = await apiFetch("/surveys", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    throw new Error("Failed to create survey");
  }
  return res.json();
}

export async function getSurvey(
  id: string,
): Promise<Survey & { questions: Question[] }> {
  const res = await apiFetch(`/surveys/${id}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch survey with id: ${id}`);
  }
  return res.json();
}

export async function updateSurveyQuestions(
  surveyId: string,
  questions: Omit<Question, "survey_id">[],
): Promise<{ questions: Question[] }> {
  const res = await apiFetch(`/surveys/${surveyId}/questions`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ questions }),
  });
  if (!res.ok) {
    throw new Error(`Failed to update questions for survey: ${surveyId}`);
  }
  return res.json();
}

export async function updateSurvey(
  id: string,
  data: {
    title: string;
    primary_color?: string | null;
    logo_url?: string | null;
    is_open?: number;
    font_family?: string;
    bg_style?: string;
  },
): Promise<{ success: boolean }> {
  const res = await apiFetch(`/surveys/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    throw new Error(`Failed to update survey details for survey: ${id}`);
  }
  return res.json();
}

export async function deleteSurvey(id: string): Promise<{ success: boolean }> {
  const res = await apiFetch(`/surveys/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    throw new Error(`Failed to delete survey with id: ${id}`);
  }
  return res.json();
}

export async function submitResponse(
  surveyId: string,
  answers: Record<string, string | number | string[]>,
): Promise<{ success: boolean; id: string }> {
  const res = await apiFetch(`/surveys/${surveyId}/responses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ answers }),
  });
  if (!res.ok) {
    throw new Error(`Failed to submit response for survey: ${surveyId}`);
  }
  return res.json();
}

export async function getSurveyResponses(
  surveyId: string,
): Promise<
  (Omit<DbResponse, "answers"> & { answers: Record<string, AnswerValue> })[]
> {
  const res = await apiFetch(`/surveys/${surveyId}/responses`);
  if (!res.ok) {
    throw new Error(`Failed to fetch responses for survey: ${surveyId}`);
  }
  return res.json();
}

export async function uploadLogo(file: File): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await apiFetch("/upload", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to upload logo");
  }
  return res.json();
}
