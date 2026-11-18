"use client";

import React, { useState, useEffect, useRef } from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X, Sparkles } from "lucide-react";
import {
  NEPALI_MONTHS,
  NEPALI_DAYS,
  adToBs,
  bsToAd,
  getBsDaysInMonth,
  getBsMonthStartDay,
  getTodayBs,
  toNepaliNumerals,
} from "@/lib/nepali-date";

export interface NepaliDatePickerProps {
  value?: string; // Gregorian AD string: "YYYY-MM-DD"
  onChange: (adDateStr: string) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export function NepaliDatePicker({
  value = "",
  onChange,
  label,
  placeholder = "Select Nepali (BS) Date",
  required = false,
  disabled = false,
  className = "",
  id,
}: NepaliDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse initial selected date
  const bsInfo = adToBs(value);

  // Calendar navigation state (year & month index 0-11 in BS)
  const todayBs = getTodayBs();
  const [viewYear, setViewYear] = useState<number>(bsInfo?.bsYear ?? todayBs.year);
  const [viewMonth, setViewMonth] = useState<number>(bsInfo?.bsMonth ?? todayBs.month);

  // Sync view when value prop changes externally
  useEffect(() => {
    if (value) {
      const parsed = adToBs(value);
      if (parsed) {
        setViewYear(parsed.bsYear);
        setViewMonth(parsed.bsMonth);
      }
    }
  }, [value]);

  // Click outside listener to close popup
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Navigation handlers
  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((prev) => Math.max(2000, prev - 1));
    } else {
      setViewMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((prev) => Math.min(2095, prev + 1));
    } else {
      setViewMonth((prev) => prev + 1);
    }
  };

  const handleSelectDay = (day: number) => {
    const adDate = bsToAd(viewYear, viewMonth, day);
    onChange(adDate);
    setIsOpen(false);
  };

  const handleSelectToday = (e: React.MouseEvent) => {
    e.stopPropagation();
    const adDate = bsToAd(todayBs.year, todayBs.month, todayBs.day);
    onChange(adDate);
    setViewYear(todayBs.year);
    setViewMonth(todayBs.month);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
  };

  // Month days calculation
  const totalDays = getBsDaysInMonth(viewYear, viewMonth);
  const startDayOfWeek = getBsMonthStartDay(viewYear, viewMonth); // 0 = Sun, 6 = Sat

  // Check if a day is currently selected
  const isSelected = (day: number) => {
    if (!bsInfo) return false;
    return bsInfo.bsYear === viewYear && bsInfo.bsMonth === viewMonth && bsInfo.bsDate === day;
  };

  // Check if a day is today
  const isToday = (day: number) => {
    return todayBs.year === viewYear && todayBs.month === viewMonth && todayBs.day === day;
  };

  // Generate Year options (2070 BS to 2095 BS)
  const yearOptions: number[] = [];
  for (let y = 2070; y <= 2095; y++) {
    yearOptions.push(y);
  }

  // Display trigger label
  const displayLabel = bsInfo
    ? `${bsInfo.bsYear} ${bsInfo.monthEn} ${bsInfo.bsDate} BS (${value} AD)`
    : "";

  return (
    <div className={`relative w-full ${className}`} ref={containerRef}>
      {label && (
        <label
          htmlFor={id}
          className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1"
        >
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-3 py-2 text-xs sm:text-sm bg-white dark:bg-slate-900 border rounded-lg shadow-sm transition-all text-left ${
          isOpen
            ? "border-blue-500 ring-2 ring-blue-500/20"
            : "border-slate-300 dark:border-slate-700 hover:border-slate-400"
        } ${disabled ? "opacity-50 cursor-not-allowed bg-slate-50" : "cursor-pointer"}`}
      >
        <div className="flex items-center gap-2 truncate">
          <CalendarIcon className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
          {displayLabel ? (
            <span className="font-semibold text-slate-900 dark:text-white truncate">
              {displayLabel}
            </span>
          ) : (
            <span className="text-slate-400 dark:text-slate-500 truncate">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          {value && !required && !disabled && (
            <span
              onClick={handleClear}
              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 hover:text-slate-600"
              title="Clear date"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <span className="px-1.5 py-0.5 rounded text-[10px] font-black tracking-wider bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            BS
          </span>
        </div>
      </button>

      {/* Popover Calendar */}
      {isOpen && (
        <div
          className="absolute z-50 mt-1.5 w-80 sm:w-88 p-3.5 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in-50 zoom-in-95"
          style={{ minWidth: "300px" }}
        >
          {/* Header Controls: Month & Year Dropdowns */}
          <div className="flex items-center justify-between gap-1 mb-3 pb-2.5 border-b border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1.5 flex-1 justify-center">
              {/* Month Select */}
              <select
                value={viewMonth}
                onChange={(e) => setViewMonth(Number(e.target.value))}
                className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold py-1 px-2 rounded-md border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                {NEPALI_MONTHS.map((m) => (
                  <option key={m.index} value={m.index}>
                    {m.np} ({m.en})
                  </option>
                ))}
              </select>

              {/* Year Select */}
              <select
                value={viewYear}
                onChange={(e) => setViewYear(Number(e.target.value))}
                className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold py-1 px-2 rounded-md border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y} BS ({toNepaliNumerals(y)})
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Weekday Labels (Sun to Sat) */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {NEPALI_DAYS.map((d, i) => (
              <div
                key={i}
                className={`text-[11px] font-bold py-1 ${
                  d.isWeekend
                    ? "text-red-500 dark:text-red-400"
                    : "text-slate-500 dark:text-slate-400"
                }`}
                title={`${d.np} (${d.en})`}
              >
                <span>{d.shortNp}</span>
                <span className="block text-[9px] font-normal opacity-70">{d.en[0]}</span>
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty offset days before 1st of month */}
            {Array.from({ length: startDayOfWeek }).map((_, idx) => (
              <div key={`empty-${idx}`} className="h-8 w-full" />
            ))}

            {/* Days of current month */}
            {Array.from({ length: totalDays }, (_, i) => i + 1).map((day) => {
              const selected = isSelected(day);
              const today = isToday(day);
              const dayOfWeek = (startDayOfWeek + day - 1) % 7;
              const isSaturday = dayOfWeek === 6;

              return (
                <button
                  type="button"
                  key={day}
                  onClick={() => handleSelectDay(day)}
                  className={`h-8 w-full rounded-md text-xs font-semibold flex flex-col items-center justify-center transition-all ${
                    selected
                      ? "bg-[#0B2545] text-white font-bold shadow-sm ring-2 ring-blue-500/40"
                      : today
                        ? "border border-blue-500 bg-blue-50/50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 hover:bg-blue-100"
                        : isSaturday
                          ? "text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
                          : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  <span className="leading-tight">{day}</span>
                  <span className="text-[9px] leading-none opacity-60 font-normal">
                    {toNepaliNumerals(day)}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Footer Bar: Selected Conversion & Quick Jump to Today */}
          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <button
              type="button"
              onClick={handleSelectToday}
              className="inline-flex items-center gap-1 font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
            >
              <Sparkles className="w-3 h-3" /> Today ({todayBs.year}-{String(todayBs.month + 1).padStart(2, "0")}-{String(todayBs.day).padStart(2, "0")})
            </button>

            {value && (
              <span className="text-[11px] text-slate-400 truncate ml-2">
                AD: <span className="font-semibold text-slate-600 dark:text-slate-300">{value}</span>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
