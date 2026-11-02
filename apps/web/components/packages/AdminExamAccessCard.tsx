"use client";

import React, { useState, useMemo } from "react";
import { 
  Check, X, Search, Globe, ListFilter, Sparkles, AlertCircle, 
  Layers, Clock, HelpCircle, ChevronDown, ChevronUp, Trash2
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PackageExamAccessConfig } from "@/lib/api/subscriptions";

interface Props {
  config: PackageExamAccessConfig;
  allExams: any[];
  onChange: (updated: PackageExamAccessConfig) => void;
}

export function AdminExamAccessCard({ config, allExams, onChange }: Props) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isExpanded, setIsExpanded] = useState(true);

  const selectedIds = config.selected_exam_ids || [];

  // Filter exams eligible for this category
  const categoryExams = useMemo(() => {
    return allExams.filter((exam) => {
      switch (config.exam_type) {
        case "subjective":
          return exam.exam_type === "subjective";
        case "live":
          return exam.objective_category === "live" || Boolean(exam.start_time);
        case "practice":
          return exam.exam_type === "practice";
        case "model":
          return exam.objective_category === "model";
        case "past_year":
          return exam.objective_category === "past_year";
        case "subject":
          return exam.exam_type === "subject";
        case "topicwise":
          return exam.objective_category === "topicwise" || Boolean(exam.topic);
        case "mock":
        default:
          return exam.exam_type === "mock" || ["model", "past_year"].includes(exam.objective_category);
      }
    });
  }, [allExams, config.exam_type]);

  // Search filtered
  const filteredExams = useMemo(() => {
    if (!searchTerm.trim()) return categoryExams;
    const q = searchTerm.toLowerCase();
    return categoryExams.filter((exam) => {
      return (
        (exam.title || "").toLowerCase().includes(q) ||
        (exam.category_name || "").toLowerCase().includes(q) ||
        (exam.exam_name || "").toLowerCase().includes(q)
      );
    });
  }, [categoryExams, searchTerm]);

  // Selected exams map
  const selectedExamsList = useMemo(() => {
    const examMap = new Map<number, any>(allExams.map((e) => [e.id, e]));
    return selectedIds.map((id) => examMap.get(id) || { id, title: `Exam #${id}` });
  }, [allExams, selectedIds]);

  const toggleExam = (id: number) => {
    const nextIds = selectedIds.includes(id)
      ? selectedIds.filter((item) => item !== id)
      : [...selectedIds, id];
    onChange({
      ...config,
      selected_exam_ids: nextIds,
      selected_exams_count: nextIds.length,
    });
  };

  const selectAllFiltered = () => {
    const filteredIds = filteredExams.map((e) => e.id);
    const set = new Set([...selectedIds, ...filteredIds]);
    const nextIds = Array.from(set);
    onChange({
      ...config,
      selected_exam_ids: nextIds,
      selected_exams_count: nextIds.length,
    });
  };

  const deselectAllFiltered = () => {
    const filteredIdSet = new Set(filteredExams.map((e) => e.id));
    const nextIds = selectedIds.filter((id) => !filteredIdSet.has(id));
    onChange({
      ...config,
      selected_exam_ids: nextIds,
      selected_exams_count: nextIds.length,
    });
  };

  const clearSelection = () => {
    onChange({
      ...config,
      selected_exam_ids: [],
      selected_exams_count: 0,
    });
  };

  return (
    <div className={`rounded-xl border transition-all ${
      !config.is_enabled 
        ? "border-slate-200 bg-slate-50/50 opacity-75" 
        : "border-slate-200 bg-white shadow-sm"
    }`}>
      {/* Header bar */}
      <div className="p-4 flex items-center justify-between gap-3 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={config.is_enabled}
              onChange={(e) => onChange({ ...config, is_enabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#0B2545]"></div>
          </label>

          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-sm text-slate-900">{config.exam_type_label}</h4>
              {!config.is_enabled ? (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
                  Disabled
                </span>
              ) : config.access_mode === "SPECIFIC" ? (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                  Specific Selected ({selectedIds.length})
                </span>
              ) : (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Any Available
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">{config.description}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {config.is_enabled && (
            <span className="text-xs font-bold text-slate-700 hidden sm:inline-block">
              {config.total_attempts === -1 ? "Unlimited Attempts" : `${config.total_attempts} Attempts`}
            </span>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-7 w-7 p-0 text-slate-400 hover:text-slate-600"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Expanded controls */}
      {config.is_enabled && isExpanded && (
        <div className="p-4 space-y-4 text-xs">
          {/* Access Mode Selector */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">Access Mode</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onChange({ ...config, access_mode: "ANY" })}
                className={`flex items-start gap-2.5 p-3 rounded-xl border text-left transition-all ${
                  config.access_mode === "ANY"
                    ? "border-[#0B2545] bg-[#0B2545]/5 text-[#0B2545] font-semibold ring-1 ring-[#0B2545]"
                    : "border-slate-200 hover:border-slate-300 text-slate-600 bg-white"
                }`}
              >
                <Globe className={`w-4 h-4 mt-0.5 shrink-0 ${config.access_mode === "ANY" ? "text-[#0B2545]" : "text-slate-400"}`} />
                <div>
                  <div className="font-bold text-xs">Mode A: Any Available Exams</div>
                  <div className="text-[11px] text-slate-500 font-normal mt-0.5">
                    Students can attempt any published exam in this category up to the quota limit.
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => onChange({ ...config, access_mode: "SPECIFIC" })}
                className={`flex items-start gap-2.5 p-3 rounded-xl border text-left transition-all ${
                  config.access_mode === "SPECIFIC"
                    ? "border-amber-600 bg-amber-500/5 text-amber-950 font-semibold ring-1 ring-amber-600"
                    : "border-slate-200 hover:border-slate-300 text-slate-600 bg-white"
                }`}
              >
                <ListFilter className={`w-4 h-4 mt-0.5 shrink-0 ${config.access_mode === "SPECIFIC" ? "text-amber-600" : "text-slate-400"}`} />
                <div>
                  <div className="font-bold text-xs">Mode B: Specific Selected Exams</div>
                  <div className="text-[11px] text-slate-500 font-normal mt-0.5">
                    Only the exact exams you select below can be accessed through this package.
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Attempt Quota Configuration */}
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <Label className="text-xs font-semibold text-slate-800">Allowed Attempt Quota</Label>
                <p className="text-[11px] text-slate-500">
                  Total attempts students can consume in this category (-1 for Unlimited).
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={config.total_attempts}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    onChange({ ...config, total_attempts: isNaN(val) ? 0 : val });
                  }}
                  className="h-8 text-xs font-bold w-24 bg-white"
                />
                <span className="text-[11px] text-slate-500">
                  {config.total_attempts === -1 ? "(Unlimited)" : "attempts"}
                </span>

                <Button
                  type="button"
                  variant={config.total_attempts === -1 ? "default" : "outline"}
                  size="sm"
                  onClick={() => onChange({ ...config, total_attempts: config.total_attempts === -1 ? 10 : -1 })}
                  className={`h-8 text-xs px-2.5 rounded-lg ${
                    config.total_attempts === -1 ? "bg-[#0B2545] text-white" : ""
                  }`}
                >
                  {config.total_attempts === -1 ? "Set Limited" : "Set Unlimited"}
                </Button>
              </div>
            </div>

            {/* If Mode B: Optional Per-Exam limit */}
            {config.access_mode === "SPECIFIC" && (
              <div className="pt-2 border-t border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <Label className="text-[11px] font-semibold text-slate-700">Max Attempts per Individual Exam (Optional)</Label>
                  <p className="text-[10px] text-slate-500">Leave empty or 0 to allow category quota without per-exam cap.</p>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    placeholder="e.g. 2"
                    value={config.attempts_per_exam ?? ""}
                    onChange={(e) => {
                      const val = e.target.value === "" ? null : parseInt(e.target.value);
                      onChange({ ...config, attempts_per_exam: isNaN(val as any) ? null : val });
                    }}
                    className="h-7 text-xs w-20 bg-white"
                  />
                  <span className="text-[10px] text-slate-400">per exam</span>
                </div>
              </div>
            )}
          </div>

          {/* Mode B: Specific Exam Selection Interface */}
          {config.access_mode === "SPECIFIC" && (
            <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/20 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <Label className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-amber-600" />
                    Select Specific {config.exam_type_label}
                  </Label>
                  <p className="text-[11px] text-amber-800/80">
                    Search and pick the examinations eligible under this package.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-amber-100 text-amber-900 border-amber-300 text-xs font-bold">
                    {selectedIds.length} Selected
                  </Badge>
                  {selectedIds.length > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={clearSelection}
                      className="h-7 text-[11px] text-rose-600 hover:text-rose-700 px-2"
                    >
                      Clear Selection
                    </Button>
                  )}
                </div>
              </div>

              {/* Search & Bulk Select */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    placeholder={`Search ${categoryExams.length} available ${config.exam_type_label.toLowerCase()}...`}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-8 pl-8 text-xs bg-white"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={selectAllFiltered}
                  className="h-8 text-xs px-2.5 shrink-0 bg-white"
                >
                  Select All Filtered
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={deselectAllFiltered}
                  className="h-8 text-xs px-2.5 shrink-0 bg-white text-slate-600"
                >
                  Deselect All
                </Button>
              </div>

              {/* Available exams checklist */}
              <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg bg-white p-2 space-y-1">
                {filteredExams.length === 0 ? (
                  <div className="p-4 text-center text-slate-400 text-xs italic">
                    {categoryExams.length === 0 
                      ? `No ${config.exam_type_label.toLowerCase()} found in the database.` 
                      : `No examinations match "${searchTerm}".`}
                  </div>
                ) : (
                  filteredExams.map((exam) => {
                    const isChecked = selectedIds.includes(exam.id);
                    return (
                      <div
                        key={exam.id}
                        onClick={() => toggleExam(exam.id)}
                        className={`flex items-center justify-between p-2 rounded-lg cursor-pointer text-xs transition-colors ${
                          isChecked
                            ? "bg-amber-50 border border-amber-300 text-amber-950 font-semibold"
                            : "hover:bg-slate-50 border border-transparent text-slate-700"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0 pr-2">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}} // handled by div onClick
                            className="rounded border-slate-300 text-[#0B2545] shrink-0"
                          />
                          <span className="truncate">{exam.title}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 text-[11px] text-slate-400">
                          {exam.total_questions ? <span>{exam.total_questions} Qs</span> : null}
                          {exam.total_marks ? <span>{exam.total_marks} M</span> : null}
                          {exam.status === "draft" && (
                            <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">Draft</span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Selected Pills Tray */}
              {selectedExamsList.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Currently Selected Examinations ({selectedExamsList.length}):
                  </span>
                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-1">
                    {selectedExamsList.map((exam) => (
                      <span
                        key={exam.id}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100/80 text-amber-950 border border-amber-300/80 text-[11px] font-medium"
                      >
                        <span className="truncate max-w-[200px]">{exam.title}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleExam(exam.id);
                          }}
                          className="hover:text-rose-600 rounded-full p-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

