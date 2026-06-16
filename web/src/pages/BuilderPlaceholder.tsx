import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { LogicRule, Question, QuestionType } from "@survey/types";
import { Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getSurvey, updateSurvey, updateSurveyQuestions } from "../lib/api";
import { getBgColorStyle, getFontFamilyStyle } from "../lib/theme";
import { useBuilderStore } from "../store/useBuilderStore";

// --- Option Editor sub-component for Multiple Choice questions ---
interface MultipleChoiceOptionsEditorProps {
  options: string[];
  onChange: (options: string[]) => void;
}

function MultipleChoiceOptionsEditor({
  options,
  onChange,
}: MultipleChoiceOptionsEditorProps) {
  const handleOptionChange = (idx: number, val: string) => {
    const updated = [...options];
    updated[idx] = val;
    onChange(updated);
  };

  const handleAddOption = () => {
    onChange([...options, `Option ${options.length + 1}`]);
  };

  const handleRemoveOption = (idx: number) => {
    onChange(options.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-2.5 pt-3 border-t border-zinc-200 dark:border-zinc-800/40">
      <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 block tracking-wide uppercase">
        Multiple Choice Choices
      </label>
      <div className="space-y-2">
        {options.map((opt, oIdx) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: indices are stable for rows representing dynamic options
          <div key={oIdx} className="flex items-center gap-2">
            <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-650 w-4 text-right">
              {oIdx + 1}.
            </span>
            <input
              type="text"
              value={opt}
              onChange={(e) => handleOptionChange(oIdx, e.target.value)}
              className="flex-1 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-750 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-zinc-900 dark:text-white rounded-lg px-2.5 py-1.5 text-xs outline-none transition-colors"
            />
            {options.length > 1 && (
              <button
                type="button"
                onClick={() => handleRemoveOption(oIdx)}
                className="text-zinc-550 dark:text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-colors"
                title="Remove choice"
              >
                ✕
              </button>
            )}
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={handleAddOption}
        className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-semibold inline-flex items-center gap-1 mt-1 transition-colors"
      >
        + Add Choice
      </button>
    </div>
  );
}

// --- Matrix Options Editor sub-component ---
interface MatrixOptionsEditorProps {
  options: string[];
  onChange: (options: string[]) => void;
}

function MatrixOptionsEditor({ options, onChange }: MatrixOptionsEditorProps) {
  const sepIdx = options.indexOf("__rows__");
  const columns =
    sepIdx !== -1 ? options.slice(0, sepIdx) : ["Column 1", "Column 2"];
  const rows = sepIdx !== -1 ? options.slice(sepIdx + 1) : ["Row 1", "Row 2"];

  const updateOptions = (newCols: string[], newRows: string[]) => {
    onChange([...newCols, "__rows__", ...newRows]);
  };

  const handleColumnChange = (idx: number, val: string) => {
    const updated = [...columns];
    updated[idx] = val;
    updateOptions(updated, rows);
  };

  const handleRowChange = (idx: number, val: string) => {
    const updated = [...rows];
    updated[idx] = val;
    updateOptions(columns, updated);
  };

  return (
    <div className="space-y-4 pt-3 border-t border-zinc-200 dark:border-zinc-800/40 text-xs">
      {/* Columns Editor */}
      <div className="space-y-2">
        <label className="font-semibold text-zinc-500 dark:text-zinc-400 block tracking-wide uppercase text-[10px]">
          Columns (X-Axis)
        </label>
        {columns.map((col, idx) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: standard form builder editing array index
          <div key={`col-${idx}`} className="flex items-center gap-2">
            <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-650 w-4 text-right">
              {idx + 1}.
            </span>
            <input
              type="text"
              value={col}
              onChange={(e) => handleColumnChange(idx, e.target.value)}
              className="flex-1 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-750 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-zinc-900 dark:text-white rounded-lg px-2.5 py-1.5 text-xs outline-none transition-colors"
            />
            {columns.length > 1 && (
              <button
                type="button"
                onClick={() =>
                  updateOptions(
                    columns.filter((_, i) => i !== idx),
                    rows,
                  )
                }
                className="text-zinc-555 dark:text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 p-1 hover:bg-zinc-150 dark:hover:bg-zinc-800 rounded transition-colors"
              >
                ✕
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            updateOptions([...columns, `Column ${columns.length + 1}`], rows)
          }
          className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-350 font-semibold inline-flex items-center gap-1 mt-1 transition-colors"
        >
          + Add Column
        </button>
      </div>

      {/* Rows Editor */}
      <div className="space-y-2">
        <label className="font-semibold text-zinc-500 dark:text-zinc-400 block tracking-wide uppercase text-[10px]">
          Rows (Y-Axis)
        </label>
        {rows.map((row, idx) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: standard form builder editing array index
          <div key={`row-${idx}`} className="flex items-center gap-2">
            <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-650 w-4 text-right">
              {idx + 1}.
            </span>
            <input
              type="text"
              value={row}
              onChange={(e) => handleRowChange(idx, e.target.value)}
              className="flex-1 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-750 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-zinc-900 dark:text-white rounded-lg px-2.5 py-1.5 text-xs outline-none transition-colors"
            />
            {rows.length > 1 && (
              <button
                type="button"
                onClick={() =>
                  updateOptions(
                    columns,
                    rows.filter((_, i) => i !== idx),
                  )
                }
                className="text-zinc-555 dark:text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 p-1 hover:bg-zinc-150 dark:hover:bg-zinc-800 rounded transition-colors"
              >
                ✕
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            updateOptions(columns, [...rows, `Row ${rows.length + 1}`])
          }
          className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-350 font-semibold inline-flex items-center gap-1 mt-1 transition-colors"
        >
          + Add Row
        </button>
      </div>
    </div>
  );
}

// --- Sortable Question Card Wrapper ---
interface SortableQuestionCardProps {
  q: Question;
  idx: number;
  onDelete: () => void;
  onUpdateText: (text: string) => void;
  onUpdateOptions: (options: string[]) => void;
  onUpdateLogic: (logic: LogicRule | null) => void;
  allQuestions: Question[];
}

function SortableQuestionCard({
  q,
  idx,
  onDelete,
  onUpdateText,
  onUpdateOptions,
  onUpdateLogic,
  allQuestions,
}: SortableQuestionCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: q.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 10 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white dark:bg-zinc-800 border ${
        isDragging
          ? "border-indigo-500 shadow-xl scale-[1.01]"
          : "border-zinc-200 dark:border-zinc-750"
      } rounded-xl p-5 space-y-4 relative transition-all hover:border-zinc-300 dark:hover:border-zinc-700/80`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Drag Handle */}
          <button
            type="button"
            className="cursor-grab active:cursor-grabbing p-1.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded hover:bg-zinc-150 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white text-zinc-500 dark:text-zinc-400 transition-colors"
            {...attributes}
            {...listeners}
            title="Drag to reorder"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <title>Drag Handle</title>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
          <span className="text-xs font-bold px-2 py-0.5 rounded bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400">
            Q{idx + 1}
          </span>
          <span className="text-[10px] uppercase tracking-wider font-extrabold text-indigo-600 dark:text-indigo-400 bg-indigo-500/5 border border-indigo-500/10 px-2 py-0.5 rounded">
            {q.type.replace("_", " ")}
          </span>
        </div>
        <button
          type="button"
          onClick={onDelete}
          className="text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/5 px-2.5 py-1.5 rounded-lg border border-transparent hover:border-rose-500/10 transition-colors"
        >
          Delete
        </button>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 block tracking-wide uppercase">
          Question Title
        </label>
        <input
          type="text"
          value={q.text}
          onChange={(e) => onUpdateText(e.target.value)}
          className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-750 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-zinc-900 dark:text-white rounded-lg px-3 py-2 text-sm outline-none transition-colors"
        />
      </div>

      {(q.type === "multiple_choice" || q.type === "single_select") && (
        <MultipleChoiceOptionsEditor
          options={q.options || []}
          onChange={onUpdateOptions}
        />
      )}

      {q.type === "matrix" && (
        <MatrixOptionsEditor
          options={q.options || []}
          onChange={onUpdateOptions}
        />
      )}

      {/* Branching Logic Section */}
      {(() => {
        const previousQuestions = allQuestions.filter(
          (question) => question.order_index < q.order_index,
        );

        if (previousQuestions.length === 0) return null;

        const logicRule = q.logic_rule;
        const isLogicEnabled = logicRule !== null;

        // Find the question this logic depends on
        const depQuestion =
          isLogicEnabled && logicRule
            ? previousQuestions.find(
                (pq) => pq.id === logicRule.depends_on_question_id,
              )
            : null;

        const handleToggleLogic = (enabled: boolean) => {
          if (enabled) {
            onUpdateLogic({
              depends_on_question_id: previousQuestions[0].id,
              operator: "equals",
              value: "",
            });
          } else {
            onUpdateLogic(null);
          }
        };

        return (
          <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800/40 space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id={`logic-toggle-${q.id}`}
                checked={isLogicEnabled}
                onChange={(e) => handleToggleLogic(e.target.checked)}
                className="w-4 h-4 text-indigo-600 border-zinc-300 rounded focus:ring-indigo-500 cursor-pointer"
              />
              <label
                htmlFor={`logic-toggle-${q.id}`}
                className="text-xs font-semibold text-zinc-750 dark:text-zinc-350 cursor-pointer"
              >
                Enable conditional visibility logic
              </label>
            </div>

            {isLogicEnabled && logicRule && (
              <div className="bg-zinc-50/50 dark:bg-zinc-950/20 p-3 rounded-lg border border-zinc-200/60 dark:border-zinc-800/40 space-y-3 text-xs">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <span className="text-zinc-500 font-medium whitespace-nowrap">
                    Show this field if:
                  </span>
                  <select
                    value={logicRule.depends_on_question_id}
                    onChange={(e) =>
                      onUpdateLogic({
                        depends_on_question_id: e.target.value,
                        operator: logicRule.operator,
                        value: "", // Reset value when target question changes
                      })
                    }
                    className="flex-1 bg-white dark:bg-zinc-900 border border-zinc-250 dark:border-zinc-800 text-zinc-900 dark:text-white rounded-lg px-2 py-1.5 text-xs outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                  >
                    {previousQuestions.map((prev) => (
                      <option key={prev.id} value={prev.id}>
                        Q{prev.order_index + 1}: {prev.text}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <select
                    value={logicRule.operator}
                    onChange={(e) => {
                      const op = e.target.value;
                      if (
                        op === "equals" ||
                        op === "not_equals" ||
                        op === "contains" ||
                        op === "filled" ||
                        op === "empty"
                      ) {
                        onUpdateLogic({
                          depends_on_question_id:
                            logicRule.depends_on_question_id,
                          operator: op,
                          value: "", // Reset value on operator changes
                        });
                      }
                    }}
                    className="w-full sm:w-40 bg-white dark:bg-zinc-900 border border-zinc-250 dark:border-zinc-800 text-zinc-900 dark:text-white rounded-lg px-2 py-1.5 text-xs outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                  >
                    <option value="equals">equals</option>
                    <option value="not_equals">does not equal</option>
                    <option value="contains">contains</option>
                    <option value="filled">is filled / has answer</option>
                    <option value="empty">is empty / unanswered</option>
                  </select>

                  {logicRule.operator !== "filled" &&
                    logicRule.operator !== "empty" && (
                      <div className="flex-1">
                        {depQuestion?.options &&
                        depQuestion.options.length > 0 ? (
                          <select
                            value={logicRule.value}
                            onChange={(e) =>
                              onUpdateLogic({
                                depends_on_question_id:
                                  logicRule.depends_on_question_id,
                                operator: logicRule.operator,
                                value: e.target.value,
                              })
                            }
                            className="w-full bg-white dark:bg-zinc-900 border border-zinc-250 dark:border-zinc-800 text-zinc-900 dark:text-white rounded-lg px-2 py-1.5 text-xs outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                          >
                            <option value="" disabled>
                              Select option
                            </option>
                            {depQuestion.options.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            placeholder="Enter value"
                            value={logicRule.value}
                            onChange={(e) =>
                              onUpdateLogic({
                                depends_on_question_id:
                                  logicRule.depends_on_question_id,
                                operator: logicRule.operator,
                                value: e.target.value,
                              })
                            }
                            className="w-full bg-white dark:bg-zinc-900 border border-zinc-250 dark:border-zinc-800 text-zinc-900 dark:text-white rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                          />
                        )}
                      </div>
                    )}
                </div>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}

// --- Main Survey Builder Component ---
export default function BuilderPlaceholder() {
  const { surveyId } = useParams({ from: "/builder/$surveyId" });
  const {
    currentSurvey,
    questions,
    setSurvey,
    setQuestions,
    addQuestion,
    updateQuestion,
    deleteQuestion,
  } = useBuilderStore();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<"toolbox" | "branding">("toolbox");
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  // DND kit sensors configuration
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require drag movement threshold to separate click/drag
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

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
        setError("Failed to load survey data. Ensure backend API is running.");
      } finally {
        setIsLoading(false);
      }
    }
    loadSurvey();

    // Reset store on exit
    return () => {
      setSurvey(null);
      setQuestions([]);
    };
  }, [surveyId, setSurvey, setQuestions]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = questions.findIndex((q) => q.id === active.id);
      const newIndex = questions.findIndex((q) => q.id === over.id);

      const reordered = arrayMove(questions, oldIndex, newIndex);
      // Re-assign order_index to keep consistent sequence
      const updated = reordered.map((q, idx) => ({
        ...q,
        order_index: idx,
      }));

      setQuestions(updated);
    }
  };

  const handleAddQuestion = (type: QuestionType) => {
    const defaultTexts = {
      short_text: "Describe your experience...",
      long_text: "Describe your experience in detail...",
      multiple_choice: "Choose one option:",
      single_select: "Choose one option:",
      rating: "Rate our service:",
      matrix: "Grid Question:",
      date: "Select Date:",
    };

    const defaultOptions = (() => {
      if (type === "multiple_choice" || type === "single_select") {
        return ["Option 1", "Option 2", "Option 3"];
      }
      if (type === "matrix") {
        return ["Column 1", "Column 2", "__rows__", "Row 1", "Row 2"];
      }
      return null;
    })();

    addQuestion({
      type,
      text: defaultTexts[type],
      order_index: questions.length,
      options: defaultOptions,
      logic_rule: null,
    });
  };

  const handleSaveAndPublish = async () => {
    if (!currentSurvey) return;
    try {
      setIsSaving(true);
      setSaveSuccess(false);

      // Concurrently save survey meta-information and bulk question updates
      await Promise.all([
        updateSurvey(surveyId, {
          title: currentSurvey.title,
          primary_color: currentSurvey.primary_color,
          logo_url: currentSurvey.logo_url,
          font_family: currentSurvey.font_family,
          bg_style: currentSurvey.bg_style,
        }),
        updateSurveyQuestions(surveyId, questions),
      ]);

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      alert(
        "Failed to save and publish survey. Please check backend connection.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 space-y-4">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500" />
        <p className="text-slate-400">Loading editor state...</p>
      </div>
    );
  }

  if (error || !currentSurvey) {
    return (
      <div className="max-w-md mx-auto mt-20 p-6 bg-slate-900 border border-slate-800 rounded-xl space-y-4 text-center">
        <h3 className="text-xl font-bold text-rose-400">
          Error Loading Survey
        </h3>
        <p className="text-slate-400 text-sm">{error || "Survey not found."}</p>
        <Link
          to="/dashboard"
          className="inline-block px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white font-medium rounded-lg text-sm transition-colors"
        >
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Editor Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-6 transition-colors">
        <div className="space-y-1">
          <Link
            to="/dashboard"
            className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-semibold inline-flex items-center gap-1 transition-colors"
          >
            ← Back to Dashboard
          </Link>
          <div className="flex items-center gap-3">
            <span
              className="w-3.5 h-3.5 rounded-full border border-zinc-200 dark:border-zinc-800 shadow"
              style={{
                backgroundColor: currentSurvey.primary_color || "#673ab7",
              }}
            />
            <h1 className="text-2xl font-extrabold text-zinc-900 dark:text-white tracking-tight sm:text-3xl line-clamp-1">
              {currentSurvey.title}
            </h1>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            D1 Database Node ID:{" "}
            <code className="text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-900 px-1 py-0.5 rounded">
              {currentSurvey.id}
            </code>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => window.open(`/s/${surveyId}`, "_blank")}
            className="px-4 py-2.5 bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-150 dark:hover:bg-zinc-850 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white font-semibold rounded-lg transition-all cursor-pointer"
          >
            Live Preview ↗
          </button>
          <button
            type="button"
            onClick={handleSaveAndPublish}
            disabled={isSaving}
            className="px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 disabled:from-indigo-500/50 disabled:to-purple-600/50 text-white font-semibold rounded-lg shadow-lg shadow-indigo-500/10 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            {isSaving ? "Publishing..." : "Save & Publish"}
          </button>
        </div>
      </div>

      {/* Floating Save success message */}
      {saveSuccess && (
        <div className="fixed bottom-5 right-5 z-50 px-5 py-3 bg-emerald-500 border border-emerald-400/20 text-white font-bold rounded-xl shadow-xl flex items-center gap-2 animate-bounce">
          <span>✓</span>
          <span>Survey published and updated!</span>
        </div>
      )}

      {/* Main split dashboard content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Questions Drag and Drop Canvas */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-300">
              Question Canvas
            </h2>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
              {questions.length} Fields
            </span>
          </div>

          <div
            className="p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-6 transition-all"
            style={{
              backgroundColor: getBgColorStyle(
                currentSurvey.bg_style,
                currentSurvey.primary_color || "#673ab7",
              ),
              fontFamily: getFontFamilyStyle(currentSurvey.font_family),
            }}
          >
            {/* Form Header Banner & Title Card Preview */}
            <div className="space-y-4">
              {currentSurvey.logo_url && (
                <div className="w-full bg-white rounded-xl border border-zinc-200 overflow-hidden shadow-sm">
                  <img
                    src={currentSurvey.logo_url}
                    alt={`${currentSurvey.title} Header Banner`}
                    className="w-full h-auto max-h-[180px] object-cover"
                  />
                </div>
              )}
              <div
                className="bg-white rounded-xl border border-zinc-200 shadow-sm p-6"
                style={{
                  borderTop: `8px solid ${currentSurvey.primary_color || "#673ab7"}`,
                }}
              >
                <h1 className="text-2xl font-bold text-zinc-900">
                  {currentSurvey.title || "Untitled Survey"}
                </h1>
                <p className="text-xs text-zinc-500 mt-2">
                  This is how the header looks on the live form page. Customize
                  title, color, and banner logo image in the Branding settings
                  sidebar.
                </p>
              </div>
            </div>

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={questions.map((q) => q.id)}
                strategy={verticalListSortingStrategy}
              >
                {questions.length === 0 ? (
                  <div className="border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl p-16 text-center space-y-3 bg-zinc-50/50 dark:bg-zinc-900/10">
                    <p className="text-zinc-500 dark:text-zinc-400 text-sm">
                      No questions created yet. Use the Add Fields toolbox in
                      the sidebar to populate your survey.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {questions.map((q, idx) => (
                      <SortableQuestionCard
                        key={q.id}
                        q={q}
                        idx={idx}
                        onDelete={() => deleteQuestion(q.id)}
                        onUpdateText={(text) => updateQuestion(q.id, { text })}
                        onUpdateOptions={(options) =>
                          updateQuestion(q.id, { options })
                        }
                        onUpdateLogic={(logic) =>
                          updateQuestion(q.id, { logic_rule: logic })
                        }
                        allQuestions={questions}
                      />
                    ))}
                  </div>
                )}
              </SortableContext>
            </DndContext>
          </div>
        </div>

        {/* Multi-Tab settings sidebar (Toolbox vs Branding Settings) */}
        <div className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-750 rounded-2xl overflow-hidden shadow-xl">
          {/* Tab Switcher Headers */}
          <div className="flex border-b border-zinc-200 dark:border-zinc-750 bg-zinc-100/50 dark:bg-zinc-900/40">
            <button
              type="button"
              onClick={() => setActiveTab("toolbox")}
              className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 ${
                activeTab === "toolbox"
                  ? "text-indigo-600 dark:text-indigo-400 border-indigo-500 bg-white dark:bg-zinc-850/20"
                  : "text-zinc-500 dark:text-zinc-400 border-transparent hover:text-zinc-850 dark:hover:text-zinc-200"
              }`}
            >
              Add Fields
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("branding")}
              className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 ${
                activeTab === "branding"
                  ? "text-indigo-600 dark:text-indigo-400 border-indigo-500 bg-white dark:bg-zinc-850/20"
                  : "text-zinc-500 dark:text-zinc-400 border-transparent hover:text-zinc-850 dark:hover:text-zinc-200"
              }`}
            >
              Branding & Style
            </button>
          </div>

          <div className="p-6">
            {/* Tab 1: Toolbox */}
            {activeTab === "toolbox" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
                    Fields Palette
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                    Select a block to append a new response question.
                  </p>
                  <div className="grid grid-cols-1 gap-3.5">
                    <button
                      type="button"
                      onClick={() => handleAddQuestion("short_text")}
                      className="w-full flex items-center gap-3.5 p-3.5 bg-white border border-zinc-200 hover:bg-zinc-50 text-left rounded-xl transition-all duration-200 cursor-pointer group hover:-translate-y-0.5 hover:shadow-md hover:border-zinc-300"
                    >
                      <div>
                        <span className="text-sm font-bold text-zinc-900 dark:text-white block">
                          Short Text
                        </span>
                        <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block mt-0.5">
                          Free-form text input response field.
                        </span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAddQuestion("long_text")}
                      className="w-full flex items-center gap-3.5 p-3.5 bg-white border border-zinc-200 hover:bg-zinc-50 text-left rounded-xl transition-all duration-200 cursor-pointer group hover:-translate-y-0.5 hover:shadow-md hover:border-zinc-300"
                    >
                      <div>
                        <span className="text-sm font-bold text-zinc-900 dark:text-white block">
                          Long Text
                        </span>
                        <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block mt-0.5">
                          Paragraph text response field.
                        </span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAddQuestion("multiple_choice")}
                      className="w-full flex items-center gap-3.5 p-3.5 bg-white border border-zinc-200 hover:bg-zinc-50 text-left rounded-xl transition-all duration-200 cursor-pointer group hover:-translate-y-0.5 hover:shadow-md hover:border-zinc-300"
                    >
                      <div>
                        <span className="text-sm font-bold text-zinc-900 dark:text-white block">
                          Multiple Choice
                        </span>
                        <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block mt-0.5">
                          Single select check-list options.
                        </span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAddQuestion("single_select")}
                      className="w-full flex items-center gap-3.5 p-3.5 bg-white border border-zinc-200 hover:bg-zinc-50 text-left rounded-xl transition-all duration-200 cursor-pointer group hover:-translate-y-0.5 hover:shadow-md hover:border-zinc-300"
                    >
                      <div>
                        <span className="text-sm font-bold text-zinc-900 dark:text-white block">
                          Dropdown
                        </span>
                        <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block mt-0.5">
                          Select one option from a dropdown list.
                        </span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAddQuestion("rating")}
                      className="w-full flex items-center gap-3.5 p-3.5 bg-white border border-zinc-200 hover:bg-zinc-50 text-left rounded-xl transition-all duration-200 cursor-pointer group hover:-translate-y-0.5 hover:shadow-md hover:border-zinc-300"
                    >
                      <div>
                        <span className="text-sm font-bold text-zinc-900 dark:text-white block">
                          Rating Scale
                        </span>
                        <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block mt-0.5">
                          Select integer ratings from 1 to 5.
                        </span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAddQuestion("matrix")}
                      className="w-full flex items-center gap-3.5 p-3.5 bg-white border border-zinc-200 hover:bg-zinc-50 text-left rounded-xl transition-all duration-200 cursor-pointer group hover:-translate-y-0.5 hover:shadow-md hover:border-zinc-300"
                    >
                      <div>
                        <span className="text-sm font-bold text-zinc-900 dark:text-white block">
                          Multiple Choice Grid
                        </span>
                        <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block mt-0.5">
                          Grid of rows and columns with single-select per row.
                        </span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAddQuestion("date")}
                      className="w-full flex items-center gap-3.5 p-3.5 bg-white border border-zinc-200 hover:bg-zinc-50 text-left rounded-xl transition-all duration-200 cursor-pointer group hover:-translate-y-0.5 hover:shadow-md hover:border-zinc-300"
                    >
                      <div>
                        <span className="text-sm font-bold text-zinc-900 dark:text-white block">
                          Date
                        </span>
                        <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block mt-0.5">
                          Standard calendar date selection field.
                        </span>
                      </div>
                    </button>
                  </div>{" "}
                </div>
              </div>
            )}

            {/* Tab 2: Branding Settings */}
            {activeTab === "branding" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
                    Theme Settings
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                    Branding variables saved directly to D1 SQL profiles.
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Title */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 block tracking-wide uppercase">
                      Survey Title
                    </label>
                    <input
                      type="text"
                      value={currentSurvey.title}
                      onChange={(e) =>
                        setSurvey({ ...currentSurvey, title: e.target.value })
                      }
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-zinc-900 dark:text-white rounded-lg px-3 py-2 text-sm outline-none transition-colors"
                    />
                  </div>

                  {/* Primary Color hex */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 block tracking-wide uppercase">
                      Theme Primary Color
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <span className="absolute inset-y-0 left-3 flex items-center text-zinc-500 text-sm">
                          #
                        </span>
                        <input
                          type="text"
                          value={
                            currentSurvey.primary_color?.replace("#", "") || ""
                          }
                          onChange={(e) => {
                            const val = e.target.value.trim();
                            const hexColor = val ? `#${val}` : null;
                            setSurvey({
                              ...currentSurvey,
                              primary_color: hexColor,
                            });
                          }}
                          placeholder="673ab7"
                          maxLength={6}
                          className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-zinc-900 dark:text-white rounded-lg pl-7 pr-3 py-2 text-sm outline-none transition-colors"
                        />
                      </div>
                      <input
                        type="color"
                        value={currentSurvey.primary_color || "#673ab7"}
                        onChange={(e) =>
                          setSurvey({
                            ...currentSurvey,
                            primary_color: e.target.value,
                          })
                        }
                        className="w-10 h-10 border border-zinc-200 dark:border-zinc-800 rounded-lg cursor-pointer bg-zinc-50 dark:bg-zinc-950 p-1"
                      />
                    </div>
                    <div className="flex items-center gap-2 mt-1.5 pl-1">
                      <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 block tracking-wide uppercase">
                        Preset:
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setSurvey({
                            ...currentSurvey,
                            primary_color: "#673ab7",
                          })
                        }
                        className="px-2 py-0.5 bg-zinc-150 dark:bg-zinc-850 hover:bg-zinc-200 dark:hover:bg-zinc-800 border border-zinc-250 dark:border-zinc-750 text-zinc-700 dark:text-zinc-300 font-bold rounded text-[10px] transition-colors cursor-pointer"
                      >
                        Default Purple
                      </button>
                    </div>
                  </div>

                  {/* Font Typography Selector */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 block tracking-wide uppercase">
                      Typography Font
                    </label>
                    <select
                      value={currentSurvey.font_family || "sans"}
                      onChange={(e) =>
                        setSurvey({
                          ...currentSurvey,
                          font_family: e.target.value,
                        })
                      }
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-zinc-900 dark:text-white rounded-lg px-3 py-2 text-sm outline-none transition-colors cursor-pointer"
                    >
                      <option value="sans">System Sans (Inter / Roboto)</option>
                      <option value="outfit">Outfit</option>
                      <option value="lexend">Lexend</option>
                      <option value="serif">Georgia (Serif)</option>
                      <option value="playfair">Playfair Display</option>
                      <option value="mono">Fira Code (Monospace)</option>
                    </select>
                  </div>

                  {/* Form Background Theme */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 block tracking-wide uppercase">
                      Form Background Theme
                    </label>
                    <select
                      value={currentSurvey.bg_style || "tinted"}
                      onChange={(e) =>
                        setSurvey({
                          ...currentSurvey,
                          bg_style: e.target.value,
                        })
                      }
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-zinc-900 dark:text-white rounded-lg px-3 py-2 text-sm outline-none transition-colors cursor-pointer"
                    >
                      <option value="tinted">
                        Tinted (Soft primary color variant)
                      </option>
                      <option value="white">Solid White</option>
                      <option value="gray">Soft Gray</option>
                      <option value="cream">Warm Cream</option>
                      <option value="slate">Cool Slate</option>
                    </select>
                  </div>

                  {/* Logo URL */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 block tracking-wide uppercase">
                      Brand Logo URL
                    </label>
                    <input
                      type="text"
                      value={currentSurvey.logo_url || ""}
                      onChange={(e) =>
                        setSurvey({
                          ...currentSurvey,
                          logo_url: e.target.value || null,
                        })
                      }
                      placeholder="https://example.com/logo.png"
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-zinc-900 dark:text-white rounded-lg px-3 py-2 text-sm outline-none transition-colors"
                    />
                    <div className="pt-1 flex items-center justify-between text-[11px] text-zinc-550 dark:text-zinc-400">
                      <span>
                        {isUploadingLogo ? (
                          <span className="text-indigo-650 dark:text-indigo-400 font-semibold animate-pulse">
                            Uploading to Cloudflare R2...
                          </span>
                        ) : (
                          "Or upload an image file (Max 800KB):"
                        )}
                      </span>
                      {currentSurvey.logo_url && !isUploadingLogo && (
                        <button
                          type="button"
                          onClick={() =>
                            setSurvey({
                              ...currentSurvey,
                              logo_url: null,
                            })
                          }
                          className="text-rose-600 dark:text-rose-450 hover:underline cursor-pointer font-medium"
                        >
                          Clear Logo
                        </button>
                      )}
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      disabled={isUploadingLogo}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.size > 800 * 1024) {
                            alert("Image size should be less than 800 KB.");
                            return;
                          }
                          try {
                            setIsUploadingLogo(true);
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              const base64String = reader.result as string;
                              setSurvey({
                                ...currentSurvey,
                                logo_url: base64String,
                              });
                              setIsUploadingLogo(false);
                            };
                            reader.onerror = () => {
                              alert("Failed to read image file.");
                              setIsUploadingLogo(false);
                            };
                            reader.readAsDataURL(file);
                          } catch (err) {
                            console.error(err);
                            alert("Failed to process logo image.");
                            setIsUploadingLogo(false);
                          }
                        }
                      }}
                      className="w-full text-xs text-zinc-500 dark:text-zinc-450 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 dark:file:bg-indigo-950/30 file:text-indigo-600 dark:file:text-indigo-400 hover:file:bg-indigo-100 dark:hover:file:bg-indigo-950/50 cursor-pointer file:cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
