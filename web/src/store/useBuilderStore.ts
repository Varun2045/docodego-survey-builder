import type { Question, Survey } from "@survey/types";
import { create } from "zustand";

interface BuilderState {
  currentSurvey: Survey | null;
  questions: Question[];
  surveys: Survey[];
  setSurvey: (survey: Survey | null) => void;
  setQuestions: (questions: Question[]) => void;
  addQuestion: (question: Omit<Question, "id" | "survey_id">) => void;
  updateQuestion: (
    id: string,
    updates: Partial<Omit<Question, "id" | "survey_id">>,
  ) => void;
  deleteQuestion: (id: string) => void;
  setSurveys: (surveys: Survey[]) => void;
  removeSurvey: (id: string) => void;
}

export const useBuilderStore = create<BuilderState>((set) => ({
  currentSurvey: null,
  questions: [],
  surveys: [],

  setSurvey: (survey) => set({ currentSurvey: survey }),

  setQuestions: (questions) => set({ questions }),

  addQuestion: (questionData) =>
    set((state) => {
      const surveyId = state.currentSurvey?.id || "";
      const newQuestion: Question = {
        ...questionData,
        id: crypto.randomUUID(),
        survey_id: surveyId,
      };
      return {
        questions: [...state.questions, newQuestion],
      };
    }),

  updateQuestion: (id, updates) =>
    set((state) => ({
      questions: state.questions.map((q) =>
        q.id === id ? { ...q, ...updates } : q,
      ),
    })),

  deleteQuestion: (id) =>
    set((state) => {
      const filtered = state.questions.filter((q) => q.id !== id);
      // Re-normalize order indexes sequentially to keep ordering clean
      const normalized = filtered
        .sort((a, b) => a.order_index - b.order_index)
        .map((q, index) => ({
          ...q,
          order_index: index,
        }));
      return { questions: normalized };
    }),

  setSurveys: (surveys) => set({ surveys }),

  removeSurvey: (id) =>
    set((state) => {
      const filteredSurveys = state.surveys.filter((s) => s.id !== id);
      const isCurrent = state.currentSurvey?.id === id;
      return {
        surveys: filteredSurveys,
        currentSurvey: isCurrent ? null : state.currentSurvey,
        questions: isCurrent ? [] : state.questions,
      };
    }),
}));
