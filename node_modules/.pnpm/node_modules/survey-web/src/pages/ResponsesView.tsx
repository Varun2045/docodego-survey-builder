import type { AnswerValue, Question, Survey } from "@survey/types";
import { Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getSurvey, getSurveyResponses, updateSurvey } from "../lib/api";
import { parseSQLiteUTCTime } from "../lib/date";

interface ParsedResponse {
  id: string;
  survey_id: string;
  answers: Record<string, AnswerValue>;
  submitted_at: string;
}

// Helper to escape and sanitize values for CSV Excel/Google Sheets
function cleanCSVValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  let stringVal = "";
  if (Array.isArray(value)) {
    stringVal = value.join(", ");
  } else if (typeof value === "object") {
    stringVal = JSON.stringify(value);
  } else {
    stringVal = String(value);
  }

  // 1. Trim whitespace
  stringVal = stringVal.trim();

  // 2. CSV Injection Prevention (Excel formula sanitization)
  const injectionChars = ["=", "+", "-", "@"];
  if (injectionChars.some((char) => stringVal.startsWith(char))) {
    stringVal = `'${stringVal}`;
  }

  // 3. Escape double quotes and handle fields with commas/newlines (RFC 4180)
  if (
    stringVal.includes('"') ||
    stringVal.includes(",") ||
    stringVal.includes("\n") ||
    stringVal.includes("\r")
  ) {
    return `"${stringVal.replace(/"/g, '""')}"`;
  }

  return stringVal;
}

export default function ResponsesView() {
  const { surveyId } = useParams({ from: "/dashboard/$surveyId/responses" });
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [responses, setResponses] = useState<ParsedResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"individual" | "analytics">(
    "individual",
  );

  useEffect(() => {
    async function loadResponsesData() {
      try {
        setIsLoading(true);
        const [surveyData, responsesData] = await Promise.all([
          getSurvey(surveyId),
          getSurveyResponses(surveyId),
        ]);

        setSurvey({
          id: surveyData.id,
          user_id: surveyData.user_id,
          title: surveyData.title,
          primary_color: surveyData.primary_color,
          logo_url: surveyData.logo_url,
          is_open: surveyData.is_open,
          font_family: surveyData.font_family,
          bg_style: surveyData.bg_style,
          created_at: surveyData.created_at,
        });
        setQuestions(surveyData.questions);
        setResponses(responsesData);
      } catch (err) {
        console.error(err);
        setError("Failed to load responses. Ensure backend API is active.");
      } finally {
        setIsLoading(false);
      }
    }
    loadResponsesData();
  }, [surveyId]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 space-y-4">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500" />
        <p className="text-zinc-500 font-medium">Loading responses...</p>
      </div>
    );
  }

  if (error || !survey) {
    return (
      <div className="max-w-md mx-auto mt-20 p-6 bg-white border border-zinc-200 rounded-xl space-y-4 text-center shadow-md">
        <h3 className="text-xl font-bold text-rose-600">
          Error Loading Responses
        </h3>
        <p className="text-zinc-500 text-sm">{error || "Survey not found."}</p>
        <Link
          to="/dashboard"
          className="inline-block px-4 py-2.5 bg-[#673ab7] hover:bg-[#7b4fc6] text-white font-bold rounded-lg text-sm transition-colors cursor-pointer"
        >
          Back to Dashboard
        </Link>
      </div>
    );
  }

  // Helper to safely format answer cell values (objects/arrays become strings)
  const formatCellValue = (val: AnswerValue | undefined | null): string => {
    if (val === undefined || val === null) return "—";
    if (Array.isArray(val)) return val.join(", ");
    return String(val);
  };

  const handleExportCSV = () => {
    if (responses.length === 0) return;

    // 1. Sort questions by order_index
    const sortedQuestions = [...questions].sort(
      (a, b) => a.order_index - b.order_index,
    );

    // 2. Define headers
    const headers = ["Submitted At", ...sortedQuestions.map((q) => q.text)];

    // 3. Create CSV rows
    const csvRows = [
      headers
        .map((h) => cleanCSVValue(h))
        .join(","), // header row
      ...responses.map((resp) => {
        const rowData = [
          parseSQLiteUTCTime(resp.submitted_at).toLocaleString(),
          ...sortedQuestions.map((q) => resp.answers[q.id]),
        ];
        return rowData.map((val) => cleanCSVValue(val)).join(",");
      }),
    ];

    const csvContent = csvRows.join("\n");

    // 4. Download file in browser
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `survey_responses_${survey.id}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleToggleOpen = async () => {
    if (!survey) return;
    const nextIsOpen = survey.is_open === 1 ? 0 : 1;
    try {
      const res = await updateSurvey(survey.id, {
        title: survey.title,
        is_open: nextIsOpen,
      });
      if (res.success) {
        setSurvey((prev) => (prev ? { ...prev, is_open: nextIsOpen } : null));
      }
    } catch (err) {
      console.error(err);
      alert("Failed to toggle survey status. Please try again.");
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8 animate-fade-in">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-200 pb-6">
        <div className="space-y-1">
          <Link
            to="/dashboard"
            className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold inline-flex items-center gap-1 transition-colors"
          >
            ← Back to Dashboard
          </Link>
          <h1 className="text-2xl font-extrabold text-zinc-900 tracking-tight sm:text-3xl line-clamp-1">
            Responses: {survey.title}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {/* Status Toggle Switch */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-zinc-200 rounded-xl text-xs font-bold shadow-sm">
            <span
              className={
                survey.is_open === 1 ? "text-emerald-600" : "text-rose-600"
              }
            >
              {survey.is_open === 1 ? "Accepting Responses" : "Closed"}
            </span>
            <button
              type="button"
              onClick={handleToggleOpen}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                survey.is_open === 1 ? "bg-emerald-500" : "bg-zinc-200"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  survey.is_open === 1 ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-zinc-200 hover:border-zinc-350 text-zinc-700 hover:text-zinc-900 font-bold rounded-xl text-xs transition-all cursor-pointer shadow-sm hover:-translate-y-0.5"
          >
            Export as CSV
          </button>
          <span className="inline-flex items-center px-3 py-1.5 text-xs font-bold rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700">
            Total Responses: {responses.length}
          </span>
        </div>
      </div>

      {responses.length > 0 && (
        <div className="flex border-b border-zinc-200">
          <button
            type="button"
            onClick={() => setActiveTab("individual")}
            className={`py-2.5 px-4 text-sm font-semibold transition-colors border-b-2 -mb-px cursor-pointer ${
              activeTab === "individual"
                ? "text-indigo-600 border-indigo-600"
                : "text-zinc-500 border-transparent hover:text-zinc-800"
            }`}
          >
            Individual Responses
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("analytics")}
            className={`py-2.5 px-4 text-sm font-semibold transition-colors border-b-2 -mb-px cursor-pointer ${
              activeTab === "analytics"
                ? "text-indigo-600 border-indigo-600"
                : "text-zinc-500 border-transparent hover:text-zinc-800"
            }`}
          >
            Summary Analytics
          </button>
        </div>
      )}

      {responses.length === 0 ? (
        <div className="border border-dashed border-zinc-200 rounded-2xl p-16 text-center space-y-3 bg-white max-w-md mx-auto shadow-sm">
          <div className="inline-flex p-3 bg-zinc-50 border border-zinc-200 rounded-lg text-indigo-500 text-xl">
            📊
          </div>
          <h3 className="text-lg font-bold text-zinc-900">No responses yet</h3>
          <p className="text-zinc-500 text-sm leading-relaxed">
            Distribute your live preview link to collect responses. Submissions
            will populate here instantly.
          </p>
          <button
            type="button"
            onClick={() => window.open(`/s/${survey.id}`, "_blank")}
            className="px-4 py-2.5 bg-[#673ab7] hover:bg-[#7b4fc6] text-white text-xs font-bold rounded-lg transition-all shadow-md shadow-indigo-500/10 cursor-pointer"
          >
            Open Live Portal
          </button>
        </div>
      ) : activeTab === "individual" ? (
        /* Dynamic spreadsheet-like table */
        <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-200">
                  <th className="p-4 text-xs font-bold text-zinc-500 uppercase tracking-wider min-w-[200px]">
                    Submitted At
                  </th>
                  {questions
                    .sort((a, b) => a.order_index - b.order_index)
                    .map((q) => (
                      <th
                        key={q.id}
                        className="p-4 text-xs font-bold text-zinc-500 uppercase tracking-wider min-w-[220px] max-w-xs truncate"
                        title={q.text}
                      >
                        {q.text}
                      </th>
                    ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200/60">
                {responses.map((resp) => (
                  <tr
                    key={resp.id}
                    className="hover:bg-zinc-50/50 transition-colors"
                  >
                    <td className="p-4 text-sm text-zinc-900 font-semibold whitespace-nowrap">
                      {parseSQLiteUTCTime(resp.submitted_at).toLocaleString()}
                    </td>
                    {questions
                      .sort((a, b) => a.order_index - b.order_index)
                      .map((q) => {
                        const cellVal = resp.answers[q.id];
                        return (
                          <td
                            key={q.id}
                            className="p-4 text-sm text-zinc-850 font-medium max-w-xs truncate"
                            title={formatCellValue(cellVal)}
                          >
                            {formatCellValue(cellVal)}
                          </td>
                        );
                      })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Visual summary analytics cards */
        <div className="space-y-6">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-1">
              <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider block">
                Total Submissions
              </span>
              <span className="text-3xl font-black text-zinc-900 block">
                {responses.length}
              </span>
            </div>
            <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-1">
              <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider block">
                Total Questions
              </span>
              <span className="text-3xl font-black text-zinc-900 block">
                {questions.length}
              </span>
            </div>
            <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-1">
              <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider block">
                Collection Status
              </span>
              {survey.is_open === 1 ? (
                <span className="text-3xl font-black text-emerald-600 flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  Active
                </span>
              ) : (
                <span className="text-3xl font-black text-rose-600 flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                  Closed
                </span>
              )}
            </div>
          </div>

          {/* Question Breakdowns */}
          <div className="space-y-6">
            {questions
              .sort((a, b) => a.order_index - b.order_index)
              .map((q, qIdx) => {
                // Get all valid non-empty responses for this question
                const validAnswers = responses
                  .map((r) => r.answers[q.id])
                  .filter(
                    (val) => val !== undefined && val !== null && val !== "",
                  );

                return (
                  <div
                    key={q.id}
                    className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm space-y-4"
                  >
                    {/* Question Header */}
                    <div className="flex items-start justify-between gap-4 border-b border-zinc-100 pb-3">
                      <h3 className="text-base font-bold text-zinc-900 leading-snug">
                        {qIdx + 1}. {q.text}
                      </h3>
                      <span className="shrink-0 inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded bg-zinc-100 border border-zinc-200 text-zinc-650 uppercase tracking-wide">
                        {q.type.replace("_", " ")}
                      </span>
                    </div>

                    {/* Question Content/Visualization */}
                    {validAnswers.length === 0 ? (
                      <p className="text-xs text-zinc-400 italic">
                        No answers submitted for this question.
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {/* Short / Long Text fields */}
                        {(q.type === "short_text" ||
                          q.type === "long_text") && (
                          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                            {responses
                              .filter(
                                (r) =>
                                  r.answers[q.id] !== undefined &&
                                  r.answers[q.id] !== null &&
                                  r.answers[q.id] !== "",
                              )
                              .map((resp) => (
                                <div
                                  key={resp.id}
                                  className="p-3 bg-zinc-50 border border-zinc-150 rounded-xl text-sm text-zinc-800 font-medium leading-relaxed"
                                >
                                  {String(resp.answers[q.id])}
                                </div>
                              ))}
                          </div>
                        )}

                        {/* Multiple Choice / Dropdown */}
                        {(q.type === "multiple_choice" ||
                          q.type === "single_select") &&
                          q.options && (
                            <div className="space-y-3">
                              {q.options.map((opt) => {
                                const count = validAnswers.filter(
                                  (a) => a === opt,
                                ).length;
                                const pct =
                                  Math.round(
                                    (count / validAnswers.length) * 100,
                                  ) || 0;
                                return (
                                  <div key={opt} className="space-y-1">
                                    <div className="flex justify-between text-xs font-semibold text-zinc-700">
                                      <span>{opt}</span>
                                      <span>
                                        {count} ({pct}%)
                                      </span>
                                    </div>
                                    <div className="w-full bg-zinc-100 h-2.5 rounded-full overflow-hidden">
                                      <div
                                        className="h-full rounded-full transition-all duration-500"
                                        style={{
                                          backgroundColor:
                                            survey.primary_color || "#673ab7",
                                          width: `${pct}%`,
                                        }}
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                        {/* Rating scale analysis */}
                        {q.type === "rating" &&
                          (() => {
                            const numbers = validAnswers
                              .map((a) => Number(a))
                              .filter((n) => !Number.isNaN(n));
                            const average =
                              numbers.length > 0
                                ? (
                                    numbers.reduce((s, n) => s + n, 0) /
                                    numbers.length
                                  ).toFixed(1)
                                : "0.0";

                            return (
                              <div className="flex flex-col md:flex-row items-center gap-8">
                                {/* Large Average Score display */}
                                <div className="text-center md:border-r border-zinc-200 md:pr-8 space-y-1 shrink-0">
                                  <span className="text-5xl font-black text-zinc-900 tracking-tight">
                                    {average}
                                  </span>
                                  <span className="text-xs text-zinc-500 font-bold block uppercase tracking-wider">
                                    Average Rating
                                  </span>
                                </div>
                                {/* Distribution Bars */}
                                <div className="flex-1 w-full space-y-2.5">
                                  {[5, 4, 3, 2, 1].map((ratingVal) => {
                                    const count = numbers.filter(
                                      (n) => n === ratingVal,
                                    ).length;
                                    const pct =
                                      Math.round(
                                        (count / numbers.length) * 100,
                                      ) || 0;
                                    return (
                                      <div
                                        key={ratingVal}
                                        className="flex items-center gap-3 text-xs"
                                      >
                                        <span className="w-3 font-bold text-zinc-650">
                                          {ratingVal}★
                                        </span>
                                        <div className="flex-1 bg-zinc-100 h-2 rounded-full overflow-hidden">
                                          <div
                                            className="h-full rounded-full"
                                            style={{
                                              backgroundColor:
                                                survey.primary_color ||
                                                "#673ab7",
                                              width: `${pct}%`,
                                            }}
                                          />
                                        </div>
                                        <span className="w-12 text-right font-semibold text-zinc-500">
                                          {count} ({pct}%)
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })()}

                        {/* Date selection analysis */}
                        {q.type === "date" &&
                          (() => {
                            const dateCounts: Record<string, number> = {};
                            for (const ans of validAnswers) {
                              const dateStr = String(ans);
                              dateCounts[dateStr] =
                                (dateCounts[dateStr] || 0) + 1;
                            }
                            const sortedDates = Object.entries(dateCounts).sort(
                              (a, b) => a[0].localeCompare(b[0]),
                            );
                            return (
                              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                                {sortedDates.map(([dateVal, count]) => {
                                  const pct =
                                    Math.round(
                                      (count / validAnswers.length) * 100,
                                    ) || 0;
                                  return (
                                    <div
                                      key={dateVal}
                                      className="flex items-center justify-between p-3 bg-zinc-50 border border-zinc-150 rounded-xl text-xs text-zinc-800 font-medium"
                                    >
                                      <span className="font-semibold">
                                        {dateVal}
                                      </span>
                                      <span>
                                        {count} response
                                        {count !== 1 ? "s" : ""} ({pct}%)
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })()}

                        {/* Matrix choice grid analysis */}
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

                            // Calculate weights for heatmap
                            const counts: Record<
                              string,
                              Record<string, number>
                            > = {};
                            for (const rName of rows) {
                              counts[rName] = {};
                              for (const cName of columns) {
                                counts[rName][cName] = 0;
                              }
                            }

                            let totalMatrixResponses = 0;
                            for (const ans of validAnswers) {
                              try {
                                const parsed = JSON.parse(String(ans));
                                if (parsed && typeof parsed === "object") {
                                  totalMatrixResponses++;
                                  for (const [rName, colVal] of Object.entries(
                                    parsed,
                                  )) {
                                    if (
                                      counts[rName] &&
                                      counts[rName][String(colVal)] !==
                                        undefined
                                    ) {
                                      counts[rName][String(colVal)]++;
                                    }
                                  }
                                }
                              } catch {
                                // ignore JSON parse errors
                              }
                            }

                            return (
                              <div className="overflow-x-auto border border-zinc-200 rounded-xl bg-zinc-50/25">
                                <table className="w-full text-left border-collapse text-xs">
                                  <thead>
                                    <tr className="border-b border-zinc-200 bg-zinc-50">
                                      <th className="p-3 font-bold text-zinc-550 min-w-[120px]" />
                                      {columns.map((col) => (
                                        <th
                                          key={col}
                                          className="p-3 text-center font-bold text-zinc-550 min-w-[80px]"
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
                                        className="border-b border-zinc-150 last:border-0 bg-white"
                                      >
                                        <td className="p-3 font-semibold text-zinc-800">
                                          {row}
                                        </td>
                                        {columns.map((col) => {
                                          const count = counts[row][col] || 0;
                                          const pct =
                                            totalMatrixResponses > 0
                                              ? Math.round(
                                                  (count /
                                                    totalMatrixResponses) *
                                                    100,
                                                )
                                              : 0;
                                          const alpha = (pct / 100) * 0.15;
                                          return (
                                            <td
                                              key={col}
                                              className="p-3 text-center font-bold text-zinc-700 transition-colors"
                                              style={{
                                                backgroundColor:
                                                  pct > 0
                                                    ? `rgba(99, 102, 241, ${alpha})`
                                                    : undefined,
                                              }}
                                            >
                                              {count}
                                              {pct > 0 && (
                                                <span className="block text-[10px] text-zinc-400 font-normal mt-0.5">
                                                  {pct}%
                                                </span>
                                              )}
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
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
