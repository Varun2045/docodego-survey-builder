import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  createSurvey,
  deleteSurvey,
  getSurveys,
  updateSurvey,
} from "../lib/api";
import { parseSQLiteUTCTime } from "../lib/date";
import { useBuilderStore } from "../store/useBuilderStore";

export default function Dashboard() {
  const { surveys, setSurveys, removeSurvey } = useBuilderStore();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    async function loadSurveys() {
      try {
        setIsLoading(true);
        const data = await getSurveys();
        setSurveys(data);
      } catch (err) {
        console.error(err);
        setError("Failed to load surveys. Ensure backend API is running.");
      } finally {
        setIsLoading(false);
      }
    }
    loadSurveys();
  }, [setSurveys]);

  const handleCreateSurvey = async () => {
    try {
      setIsCreating(true);
      // Create a default survey
      const newSurvey = await createSurvey({
        title: `New Survey - ${new Date().toLocaleDateString()}`,
        primary_color: "#673ab7", // default purple
      });
      // Append new survey to store
      setSurveys([newSurvey, ...surveys]);
      navigate({
        to: "/builder/$surveyId",
        params: { surveyId: newSurvey.id },
      });
    } catch (err) {
      console.error(err);
      alert("Failed to create survey. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteSurvey = async (id: string, title: string) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete the survey "${title}"? This will permanently delete all questions and responses.`,
    );
    if (!confirmed) return;

    try {
      await deleteSurvey(id);
      removeSurvey(id);
    } catch (err) {
      console.error(err);
      alert("Failed to delete survey. Please try again.");
    }
  };

  const handleToggleSurveyStatus = async (
    id: string,
    title: string,
    currentIsOpen: number,
  ) => {
    const nextIsOpen = currentIsOpen === 1 ? 0 : 1;
    try {
      await updateSurvey(id, {
        title,
        is_open: nextIsOpen,
      });
      setSurveys(
        surveys.map((s) => (s.id === id ? { ...s, is_open: nextIsOpen } : s)),
      );
    } catch (err) {
      console.error(err);
      alert("Failed to toggle survey status. Please try again.");
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Dashboard Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-6 transition-colors">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold tracking-tight font-display text-zinc-900 dark:text-white sm:text-4xl">
              My Surveys
            </h1>
            {!isLoading && (
              <span className="inline-flex items-center px-2.5 py-1 text-xs font-bold rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 transition-all duration-300">
                {surveys.length}
              </span>
            )}
          </div>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">
            Manage your feedback forms, view details, or build new ones.
          </p>
        </div>
        <button
          type="button"
          onClick={handleCreateSurvey}
          disabled={isCreating}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#673ab7] to-indigo-600 hover:from-[#7b4fc6] hover:to-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl transition-all duration-200 hover:-translate-y-0.5 shadow-lg shadow-indigo-500/10 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
        >
          {isCreating ? (
            <>
              <svg
                className="animate-spin h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <title>Loading</title>
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Creating...
            </>
          ) : (
            <>
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <title>Create Survey</title>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Create New Survey
            </>
          )}
        </button>
      </div>

      {/* Loading & Error States */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500" />
          <p className="text-zinc-500 dark:text-zinc-400">Loading surveys...</p>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-500/10 dark:bg-rose-500/15 border border-rose-500/20 dark:border-rose-500/30 rounded-lg text-rose-700 dark:text-rose-200">
          <p className="font-semibold">Error occurred</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      )}

      {/* Main Grid View */}
      {!isLoading && !error && (
        <>
          {surveys.length === 0 ? (
            <div className="border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl p-12 text-center max-w-md mx-auto space-y-4">
              <div className="inline-flex p-3 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-indigo-500 dark:text-indigo-400">
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <title>Empty Surveys</title>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                No surveys yet
              </h3>
              <p className="text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed">
                Start gathering feedback by building your first interactive
                survey. It's completely free.
              </p>
              <button
                type="button"
                onClick={handleCreateSurvey}
                disabled={isCreating}
                className="w-full inline-flex justify-center items-center py-2.5 bg-gradient-to-r from-[#673ab7] to-indigo-600 hover:from-[#7b4fc6] hover:to-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/10 transition-all duration-200 hover:-translate-y-0.5 cursor-pointer"
              >
                Create First Survey
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {surveys.map((survey) => (
                <div
                  key={survey.id}
                  className="group bg-white border border-zinc-200 rounded-2xl p-6 flex flex-col justify-between transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-500/5 duration-300"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      {/* Color chip representation */}
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-white/20 shadow-lg transition-transform duration-300 group-hover:scale-110"
                        style={{
                          backgroundColor: survey.primary_color || "#673ab7",
                          boxShadow: `0 0 12px ${survey.primary_color || "#673ab7"}80`,
                        }}
                        title={`Theme: ${survey.primary_color}`}
                      />
                      <span className="text-xs text-zinc-400 dark:text-zinc-500">
                        {parseSQLiteUTCTime(
                          survey.created_at,
                        ).toLocaleDateString()}
                      </span>
                    </div>
                    <h2 className="text-xl font-bold text-zinc-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors line-clamp-1">
                      {survey.title}
                    </h2>
                  </div>

                  <div className="flex flex-col gap-2 pt-4 border-t border-zinc-100 dark:border-zinc-800/80 mt-5 text-xs">
                    <div className="flex items-center gap-2">
                      <Link
                        to="/builder/$surveyId"
                        params={{ surveyId: survey.id }}
                        className="flex-1 text-center py-2 bg-zinc-50/50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-750 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white font-bold rounded-xl transition-all duration-200"
                      >
                        Edit
                      </Link>
                      <Link
                        to="/dashboard/$surveyId/responses"
                        params={{ surveyId: survey.id }}
                        className="flex-1 text-center py-2 bg-zinc-50/50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-750 text-zinc-700 dark:text-zinc-350 hover:text-zinc-900 dark:hover:text-white font-bold rounded-xl transition-all duration-200"
                      >
                        Responses
                      </Link>
                      <button
                        type="button"
                        onClick={() =>
                          handleDeleteSurvey(survey.id, survey.title)
                        }
                        className="flex-1 text-center py-2 bg-zinc-50/50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:text-rose-600 dark:hover:text-rose-450 hover:bg-rose-500/5 hover:border-rose-500/20 dark:hover:border-rose-500/30 font-bold rounded-xl transition-all duration-200 cursor-pointer"
                      >
                        Delete
                      </button>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-zinc-150 mt-2">
                      <Link
                        to="/s/$surveyId"
                        params={{ surveyId: survey.id }}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
                      >
                        View Live ↗
                      </Link>

                      {/* Status Toggle Switch */}
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[10px] font-bold ${
                            survey.is_open === 1
                              ? "text-emerald-600"
                              : "text-rose-600"
                          }`}
                        >
                          {survey.is_open === 1 ? "Active" : "Closed"}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            handleToggleSurveyStatus(
                              survey.id,
                              survey.title,
                              survey.is_open,
                            )
                          }
                          className={`relative inline-flex h-4.5 w-8 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            survey.is_open === 1
                              ? "bg-emerald-500"
                              : "bg-zinc-200"
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              survey.is_open === 1
                                ? "translate-x-3.5"
                                : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
