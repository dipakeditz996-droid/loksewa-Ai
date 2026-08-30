"use client";

import React, { useState } from "react";
import { Search, RefreshCw, AlertCircle, BookOpen, Info } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { adminApi } from "@/lib/api/admin";

export default function AITutorKnowledgeBasePage() {
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "study-materials", "published", search],
    queryFn: () => adminApi.getStudyMaterials({ status: "published", search, pageSize: 50 }),
  });

  const [togglingId, setTogglingId] = useState<number | null>(null);

  const handleToggle = async (id: number, next: boolean) => {
    setTogglingId(id);
    try {
      await adminApi.setStudyMaterialAiTutorAvailability(id, next);
      queryClient.invalidateQueries({ queryKey: ["admin", "study-materials", "published"] });
    } catch (err) {
      console.error("Failed to update AI Tutor availability:", err);
    } finally {
      setTogglingId(null);
    }
  };

  const enabledCount = data?.materials.filter((m) => m.availableToAiTutor).length ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-[#0B2545]">Knowledge Base</h2>
        <p className="text-sm text-slate-500">
          Select published study materials the AI Tutor may quote from when answering
          student questions. This searches material content directly - no separate
          upload step, no vector database.
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
        <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
        <p className="text-sm text-blue-800">
          {enabledCount} of {data?.materials.length ?? 0} published materials currently
          available to the AI Tutor. Retrieval matches question keywords against material
          title and content - the closest 2 matches are quoted as reference context.
        </p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Search published materials..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center items-center h-48">
            <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : error ? (
          <div className="bg-red-50 text-red-500 p-6 flex items-center gap-3">
            <AlertCircle className="w-5 h-5" />
            <p>Failed to load study materials.</p>
          </div>
        ) : !data || data.materials.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-400 gap-2">
            <BookOpen className="w-8 h-8" />
            <p className="text-sm">No published study materials found.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Available to AI Tutor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.materials.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>
                    <p className="font-medium text-slate-800">{m.title}</p>
                    <p className="text-xs text-slate-500">{m.description}</p>
                  </TableCell>
                  <TableCell className="text-sm text-slate-600">{m.subject}</TableCell>
                  <TableCell>
                    <span className="text-xs font-medium px-2 py-1 rounded bg-slate-100 text-slate-700">
                      {m.materialType}
                    </span>
                  </TableCell>
                  <TableCell>
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={m.availableToAiTutor}
                        disabled={togglingId === m.id}
                        onChange={(e) => handleToggle(m.id, e.target.checked)}
                        className="w-4 h-4 rounded"
                      />
                      <span className="text-xs text-slate-500">
                        {togglingId === m.id ? "Saving..." : m.availableToAiTutor ? "Included" : "Excluded"}
                      </span>
                    </label>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
