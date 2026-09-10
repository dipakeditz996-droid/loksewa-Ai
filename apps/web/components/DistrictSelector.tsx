"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Search, Check, MapPin, X } from "lucide-react";
import { ALL_NEPAL_DISTRICTS } from "@/lib/constants/nepal-districts";

interface DistrictSelectorProps {
  value: string;
  onChange: (district: string) => void;
  error?: string | null;
  required?: boolean;
  disabled?: boolean;
  id?: string;
}

export function DistrictSelector({
  value,
  onChange,
  error,
  required = true,
  disabled = false,
  id = "districtSelect",
}: DistrictSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
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

  // Focus search input when opening
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchQuery("");
    }
  }, [isOpen]);

  const filteredDistricts = ALL_NEPAL_DISTRICTS.filter((d) =>
    d.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  const handleSelect = (districtName: string) => {
    onChange(districtName);
    setIsOpen(false);
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {/* Hidden input to ensure native form validation works if required */}
      <input
        type="text"
        id={id}
        tabIndex={-1}
        className="sr-only"
        value={value}
        onChange={() => {}}
        required={required}
      />

      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`h-[46px] w-full px-3.5 bg-[#121B24] border text-[13px] rounded-[10px] flex items-center justify-between text-left transition-all cursor-pointer ${
          isOpen
            ? "border-[#D4A72C] ring-1 ring-[#D4A72C]"
            : error
            ? "border-red-500/50"
            : "border-white/20 hover:border-white/40"
        } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        <div className="flex items-center gap-2 truncate">
          <MapPin className={`h-4 w-4 shrink-0 ${value ? "text-[#D4A72C]" : "text-white/40"}`} />
          {value ? (
            <span className="text-white font-medium">{value}</span>
          ) : (
            <span className="text-white/40">Select your district (77 districts)</span>
          )}
        </div>
        <ChevronDown
          className={`h-4 w-4 text-white/50 shrink-0 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-[#D4A72C]" : ""
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-2 bg-[#0F1822] border border-white/20 rounded-[14px] shadow-[0_16px_40px_rgba(0,0,0,0.6)] backdrop-blur-xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150">
          {/* Search Header */}
          <div className="p-2.5 border-b border-white/10 bg-[#141F2C]">
            <div className="relative flex items-center">
              <Search className="absolute left-3 h-3.5 w-3.5 text-white/40 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Type to search 77 districts..."
                className="w-full h-9 pl-9 pr-8 bg-[#0B121A] border border-white/15 rounded-[8px] text-[12px] text-white placeholder:text-white/40 focus:outline-none focus:border-[#D4A72C] focus:ring-1 focus:ring-[#D4A72C]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 text-white/40 hover:text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* List of Districts */}
          <div className="max-h-60 overflow-y-auto p-1.5 space-y-0.5 scrollbar-thin scrollbar-thumb-white/10">
            {filteredDistricts.length === 0 ? (
              <div className="py-6 text-center text-[12px] text-white/50">
                No district matching &quot;{searchQuery}&quot;
              </div>
            ) : (
              filteredDistricts.map((d) => {
                const isSelected = value === d;
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => handleSelect(d)}
                    className={`w-full px-3 py-2 rounded-[8px] text-[13px] flex items-center justify-between transition-colors text-left cursor-pointer ${
                      isSelected
                        ? "bg-[#D4A72C]/20 text-[#D4A72C] font-semibold"
                        : "text-white/90 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <span>{d}</span>
                    {isSelected && <Check className="h-4 w-4 text-[#D4A72C]" />}
                  </button>
                );
              })
            )}
          </div>

          {/* Footer note */}
          <div className="px-3 py-2 bg-[#0B121A]/80 border-t border-white/5 text-[10px] text-white/40 flex items-center justify-between">
            <span>77 official districts of Nepal</span>
            <span>{filteredDistricts.length} available</span>
          </div>
        </div>
      )}
    </div>
  );
}
