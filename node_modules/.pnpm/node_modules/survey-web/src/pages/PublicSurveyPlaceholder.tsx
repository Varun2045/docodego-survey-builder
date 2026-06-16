import type { Question, Survey } from "@survey/types";
import { Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getSurvey, submitResponse } from "../lib/api";
import { getBgColorStyle, getFontFamilyStyle } from "../lib/theme";

function checkQuestionVisibility(
  q: Question,
  answers: Record<string, string | number>,
  allQuestions: Question[],
): boolean {
  if (!q.logic_rule) return true;

  const rule = q.logic_rule;
  const parentId = rule.depends_on_question_id;

  const parent = allQuestions.find((pq) => pq.id === parentId);
  if (!parent || parent.order_index >= q.order_index) {
    return false;
  }

  if (!checkQuestionVisibility(parent, answers, allQuestions)) {
    return false;
  }

  const parentAnswer = answers[parentId];

  switch (rule.operator) {
    case "equals":
      return String(parentAnswer ?? "") === String(rule.value);
    case "not_equals":
      return String(parentAnswer ?? "") !== String(rule.value);
    case "contains":
      return String(parentAnswer ?? "")
        .toLowerCase()
        .includes(String(rule.value).toLowerCase());
    case "filled":
      return (
        parentAnswer !== undefined &&
        parentAnswer !== null &&
        String(parentAnswer).trim() !== ""
      );
    case "empty":
      return (
        parentAnswer === undefined ||
        parentAnswer === null ||
        String(parentAnswer).trim() === ""
      );
    default:
      return true;
  }
}

export default function PublicSurveyPlaceholder() {
  const { surveyId } = useParams({ from: "/s/$surveyId" });
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [answers, setAnswers] = useState<Record<string, string | number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Tracks active focus state of question fields for primary color border injection
  const [focusedField, setFocusedField] = useState<string | null>(null);

  useEffect(() => {
    async function loadSurvey() {
      try {
        setIsLoading(true);
        const data = await getSurvey(surveyId);
        setSurvey({
          id: data.id,
          user_id: data.user_id,
          title: data.title,
          primary_color: data.primary_color,
          logo_url: data.logo_url,
          is_open: data.is_open,
          font_family: data.font_family,
          bg_style: data.bg_style,
          created_at: data.created_at,
        });
        setQuestions(data.questions);
      } catch (err) {
        console.error(err);
        setError(
          "Failed to load public survey. Ensure backend API is running.",
        );
      } finally {
        setIsLoading(false);
      }
    }
    loadSurvey();
  }, [surveyId]);

  const handleAnswerChange = (questionId: string, value: string | number) => {
    setAnswers((prev) => {
      const updated = {
        ...prev,
        [questionId]: value,
      };

      // Sequentially clear answers of any questions that are no longer visible
      const sortedQuestions = [...questions].sort(
        (a, b) => a.order_index - b.order_index,
      );
      for (const q of sortedQuestions) {
        if (!checkQuestionVisibility(q, updated, questions)) {
          delete updated[q.id];
        }
      }
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      // Cast local answers mapping to match submitResponse specs, pruning hidden questions
      const responsePayload: Record<string, string | number | string[]> = {};
      for (const q of questions) {
        if (checkQuestionVisibility(q, answers, questions)) {
          const val = answers[q.id];
          if (val !== undefined && val !== null) {
            responsePayload[q.id] = val;
          }
        }
      }
      await submitResponse(surveyId, responsePayload);
      setIsSubmitted(true);
    } catch (err) {
      console.error(err);
      alert("Failed to submit response. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 overflow-y-auto bg-[#f8f9fa] flex flex-col items-center justify-center z-[100]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500" />
        <p className="text-zinc-600 mt-4 text-sm font-medium">
          Loading survey form...
        </p>
      </div>
    );
  }

  if (error || !survey) {
    return (
      <div className="fixed inset-0 overflow-y-auto bg-[#f8f9fa] flex flex-col items-center justify-center p-4 z-[100]">
        <div className="max-w-md w-full p-6 bg-white border border-gray-200 rounded-xl space-y-4 text-center shadow-md">
          <h3 className="text-xl font-bold text-rose-600">
            Survey Unavailable
          </h3>
          <p className="text-zinc-600 text-sm">
            {error || "This survey link is invalid or has expired."}
          </p>
          <Link
            to="/"
            className="inline-block px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg text-sm transition-colors"
          >
            Return Home
          </Link>
        </div>
      </div>
    );
  }

  const primaryColor = survey.primary_color || "#673ab7";
  const bgColor = getBgColorStyle(survey.bg_style, primaryColor);
  const fontFamily = getFontFamilyStyle(survey.font_family);

  if (survey.is_open === 0) {
    return (
      <div
        className="fixed inset-0 overflow-y-auto text-zinc-900 z-[100]"
        style={{ backgroundColor: bgColor, fontFamily: fontFamily }}
      >
        <div className="max-w-2xl mx-auto pt-8 pb-12 px-4 space-y-4">
          {survey.logo_url && (
            <div className="w-full bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
              <img
                src={survey.logo_url}
                alt={`${survey.title} Header Banner`}
                className="w-full h-auto max-h-[220px] object-cover"
              />
            </div>
          )}

          <div
            className="bg-white rounded-lg border border-gray-200 shadow-sm p-6"
            style={{ borderTop: "8px solid #ef4444" }}
          >
            <h1 className="text-3xl text-zinc-900 font-normal leading-normal">
              {survey.title}
            </h1>
            <p className="text-sm text-zinc-800 mt-4 font-medium">
              This form is no longer accepting responses.
            </p>
          </div>

          <div className="text-[11px] text-center text-zinc-500 mt-8 space-y-1">
            <div>Never submit passwords through this form.</div>
            <div className="pt-2 text-[12px] text-zinc-650 font-normal">
              This content is neither created nor endorsed by Google.
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div
        className="fixed inset-0 overflow-y-auto text-zinc-900 z-[100]"
        style={{ backgroundColor: bgColor, fontFamily: fontFamily }}
      >
        <div className="max-w-2xl mx-auto pt-8 pb-12 px-4 space-y-4">
          {/* Header Card */}
          <div
            className="bg-white rounded-lg border border-gray-200 shadow-sm p-6"
            style={{ borderTop: `8px solid ${primaryColor}` }}
          >
            <h1 className="text-3xl text-zinc-900 font-normal">
              {survey.title}
            </h1>
            <p className="text-sm text-zinc-800 mt-4">
              Your response has been recorded.
            </p>
            <div className="pt-4 flex items-center gap-4 text-xs">
              <button
                type="button"
                onClick={() => {
                  setAnswers({});
                  setIsSubmitted(false);
                }}
                className="text-[#1a73e8] hover:underline font-medium cursor-pointer"
              >
                Submit another response
              </button>
            </div>
          </div>
          {/* Footer */}
          <div className="text-[11px] text-center text-zinc-500 mt-8 space-y-1">
            <div>Never submit passwords through this form.</div>
            <div className="pt-2 text-[12px] text-zinc-600 font-normal">
              This content is neither created nor endorsed by Google. -{" "}
              <button
                type="button"
                onClick={(e) => e.preventDefault()}
                className="hover:underline bg-transparent border-none p-0 cursor-pointer text-[12px]"
              >
                Terms of Service
              </button>{" "}
              -{" "}
              <button
                type="button"
                onClick={(e) => e.preventDefault()}
                className="hover:underline bg-transparent border-none p-0 cursor-pointer text-[12px]"
              >
                Privacy Policy
              </button>
            </div>
            <div className="pt-1 text-[11px] text-zinc-400">
              <button
                type="button"
                onClick={(e) => e.preventDefault()}
                className="hover:underline bg-transparent border-none p-0 cursor-pointer text-[11px] font-semibold text-zinc-500"
              >
                Does this form look suspicious? Report
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 overflow-y-auto text-zinc-900 z-[100]"
      style={{ backgroundColor: bgColor, fontFamily: fontFamily }}
    >
      <div className="max-w-2xl mx-auto pt-8 pb-12 px-4 space-y-4">
        {/* Brand header image if provided */}
        {survey.logo_url && (
          <div className="w-full bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
            <img
              src={survey.logo_url}
              alt={`${survey.title} Header Banner`}
              className="w-full h-auto max-h-[220px] object-cover"
            />
          </div>
        )}

        {/* Survey Header Card */}
        <div
          className="bg-white rounded-lg border border-gray-200 shadow-sm p-6"
          style={{ borderTop: `8px solid ${primaryColor}` }}
        >
          <h1 className="text-3xl text-zinc-900 font-normal leading-normal">
            {survey.title}
          </h1>
          <div className="text-[14px] text-rose-600 mt-3 pt-3 border-t border-gray-100 font-normal">
            * Indicates required question
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {questions.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-lg p-8 text-center text-zinc-500 text-sm shadow-sm">
              This survey currently has no questions to display.
            </div>
          ) : (
            <div className="space-y-4">
              {questions
                .sort((a, b) => a.order_index - b.order_index)
                .filter((q) => checkQuestionVisibility(q, answers, questions))
                .map((q) => {
                  const isFocused = focusedField === q.id;
                  return (
                    <div
                      key={q.id}
                      className="bg-white border border-gray-200 rounded-lg p-6 space-y-4 transition-all duration-200 shadow-sm"
                    >
                      <label className="block text-md text-zinc-900 leading-snug font-normal">
                        {q.text}
                      </label>

                      {/* Render short text input */}
                      {q.type === "short_text" && (
                        <input
                          type="text"
                          required
                          placeholder="Your answer"
                          value={answers[q.id] || ""}
                          onFocus={() => setFocusedField(q.id)}
                          onBlur={() => setFocusedField(null)}
                          onChange={(e) =>
                            handleAnswerChange(q.id, e.target.value)
                          }
                          className="border-0 border-b border-gray-300 rounded-none focus:ring-0 focus:border-b-2 bg-transparent px-0 py-2 w-full md:w-1/2 outline-none transition-colors"
                          style={{
                            borderBottomColor: isFocused
                              ? primaryColor
                              : undefined,
                            borderBottomWidth: isFocused ? "2px" : "1px",
                          }}
                        />
                      )}

                      {/* Render long text input */}
                      {q.type === "long_text" && (
                        <textarea
                          required
                          placeholder="Your answer"
                          value={answers[q.id] || ""}
                          onFocus={() => setFocusedField(q.id)}
                          onBlur={() => setFocusedField(null)}
                          onChange={(e) =>
                            handleAnswerChange(q.id, e.target.value)
                          }
                          rows={3}
                          className="border-0 border-b border-gray-300 rounded-none focus:ring-0 focus:border-b-2 bg-transparent px-0 py-2 w-full outline-none transition-colors resize-none text-sm text-zinc-800"
                          style={{
                            borderBottomColor: isFocused
                              ? primaryColor
                              : undefined,
                            borderBottomWidth: isFocused ? "2px" : "1px",
                          }}
                        />
                      )}

                      {/* Render rating scale input */}
                      {q.type === "rating" && (
                        <div className="flex items-center gap-3">
                          {[1, 2, 3, 4, 5].map((num) => {
                            const isSelected = answers[q.id] === num;
                            return (
                              <button
                                key={num}
                                type="button"
                                onClick={() => handleAnswerChange(q.id, num)}
                                className={`w-10 h-10 rounded-full font-bold border transition-all cursor-pointer flex items-center justify-center text-sm ${
                                  isSelected
                                    ? "text-white shadow-sm"
                                    : "bg-zinc-50 border-zinc-200 text-zinc-650 hover:bg-zinc-100 hover:border-zinc-300"
                                }`}
                                style={{
                                  backgroundColor: isSelected
                                    ? primaryColor
                                    : undefined,
                                  borderColor: isSelected
                                    ? primaryColor
                                    : undefined,
                                }}
                              >
                                {num}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* Render single select option input */}
                      {q.type === "single_select" && q.options && (
                        <select
                          required
                          value={answers[q.id] || ""}
                          onFocus={() => setFocusedField(q.id)}
                          onBlur={() => setFocusedField(null)}
                          onChange={(e) =>
                            handleAnswerChange(q.id, e.target.value)
                          }
                          className="border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-white px-3 py-2 text-sm text-zinc-800 outline-none w-full md:w-1/2 cursor-pointer shadow-sm"
                          style={{
                            borderColor: isFocused ? primaryColor : undefined,
                          }}
                        >
                          <option value="" disabled>
                            Choose
                          </option>
                          {q.options.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      )}

                      {/* Render date picker input */}
                      {q.type === "date" && (
                        <input
                          type="date"
                          required
                          value={answers[q.id] || ""}
                          onFocus={() => setFocusedField(q.id)}
                          onBlur={() => setFocusedField(null)}
                          onChange={(e) =>
                            handleAnswerChange(q.id, e.target.value)
                          }
                          className="border-0 border-b border-gray-300 rounded-none focus:ring-0 focus:border-b-2 bg-transparent px-0 py-2 w-full md:w-1/3 outline-none transition-colors text-sm text-zinc-800 cursor-pointer"
                          style={{
                            borderBottomColor: isFocused
                              ? primaryColor
                              : undefined,
                            borderBottomWidth: isFocused ? "2px" : "1px",
                          }}
                        />
                      )}

                      {/* Render matrix choice grid input */}
                      {q.type === "matrix" &&
                        q.options &&
                        (() => {
                          const sepIdx = q.options.indexOf("__rows__");
                          const columns =
                            sepIdx !== -1
                              ? q.options.slice(0, sepIdx)
                              : ["Column 1", "Column 2"];
                          const rows =
                            sepIdx !== -1
                              ? q.options.slice(sepIdx + 1)
                              : ["Row 1", "Row 2"];

                          const currentMatrixAnswers: Record<string, string> =
                            (() => {
                              try {
                                return answers[q.id]
                                  ? JSON.parse(answers[q.id] as string)
                                  : {};
                              } catch {
                                return {};
                              }
                            })();

                          const handleMatrixSelect = (
                            row: string,
                            col: string,
                          ) => {
                            const newMatrixAnswers = {
                              ...currentMatrixAnswers,
                              [row]: col,
                            };
                            handleAnswerChange(
                              q.id,
                              JSON.stringify(newMatrixAnswers),
                            );
                          };

                          return (
                            <div className="overflow-x-auto">
                              <table className="w-full text-left border-collapse text-xs text-zinc-700">
                                <thead>
                                  <tr className="border-b border-gray-150">
                                    <th className="py-2.5 font-semibold text-zinc-655 min-w-[120px]" />
                                    {columns.map((col) => (
                                      <th
                                        key={col}
                                        className="py-2.5 text-center font-semibold text-zinc-650 min-w-[80px]"
                                      >
                                        {col}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {rows.map((row) => (
                                    <tr
                                      key={row}
                                      className="border-b border-gray-100 hover:bg-zinc-50/50"
                                    >
                                      <td className="py-3 font-normal text-zinc-800">
                                        {row}
                                      </td>
                                      {columns.map((col) => {
                                        const isChecked =
                                          currentMatrixAnswers[row] === col;
                                        return (
                                          <td
                                            key={col}
                                            className="py-3 text-center"
                                          >
                                            <input
                                              type="radio"
                                              name={`matrix-${q.id}-${row}`}
                                              checked={isChecked}
                                              onChange={() =>
                                                handleMatrixSelect(row, col)
                                              }
                                              className="w-4 h-4 focus:ring-0 cursor-pointer"
                                              style={{
                                                accentColor: primaryColor,
                                              }}
                                            />
                                          </td>
                                        );
                                      })}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          );
                        })()}

                      {/* Render multiple choice options */}
                      {q.type === "multiple_choice" && q.options && (
                        <div className="flex flex-col gap-3">
                          {q.options.map((opt) => {
                            const isSelected = answers[q.id] === opt;
                            return (
                              <label
                                key={opt}
                                className="flex items-center gap-3 cursor-pointer group text-sm text-zinc-800"
                              >
                                <input
                                  type="radio"
                                  name={`q-${q.id}`}
                                  required
                                  checked={isSelected}
                                  onChange={() => handleAnswerChange(q.id, opt)}
                                  className="w-5 h-5 border-gray-300 focus:ring-0"
                                  style={{
                                    accentColor: primaryColor,
                                  }}
                                />
                                <span className="font-normal text-zinc-800">
                                  {opt}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}

              <div className="flex items-center justify-between pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2 text-white font-medium rounded-md shadow-sm transition-all duration-150 disabled:opacity-50 text-center text-sm cursor-pointer"
                  style={{
                    backgroundColor: primaryColor,
                  }}
                >
                  {isSubmitting ? "Submitting..." : "Submit"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAnswers({});
                    setFocusedField(null);
                  }}
                  className="px-4 py-2 hover:bg-zinc-200/50 rounded text-sm font-medium transition-colors cursor-pointer"
                  style={{ color: primaryColor }}
                >
                  Clear form
                </button>
              </div>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="text-[11px] text-center text-zinc-500 mt-8 space-y-1">
          <div>Never submit passwords through this form.</div>
          <div className="pt-2 text-[12px] text-zinc-650 font-normal">
            This content is neither created nor endorsed by Google. -{" "}
            <button
              type="button"
              onClick={(e) => e.preventDefault()}
              className="hover:underline bg-transparent border-none p-0 cursor-pointer text-[12px]"
            >
              Terms of Service
            </button>{" "}
            -{" "}
            <button
              type="button"
              onClick={(e) => e.preventDefault()}
              className="hover:underline bg-transparent border-none p-0 cursor-pointer text-[12px]"
            >
              Privacy Policy
            </button>
          </div>
          <div className="pt-1 text-[11px] text-zinc-400">
            <button
              type="button"
              onClick={(e) => e.preventDefault()}
              className="hover:underline bg-transparent border-none p-0 cursor-pointer text-[11px] font-semibold text-zinc-500"
            >
              Does this form look suspicious? Report
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
