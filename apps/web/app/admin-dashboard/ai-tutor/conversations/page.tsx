"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Search, RefreshCw, AlertCircle, MessageSquare, ChevronLeft, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { adminApi } from "@/lib/api/admin";

const MODES = [
  { value: "", label: "All Modes" },
  { value: "EXPLAIN", label: "Explain" },
  { value: "PRACTICE", label: "Practice" },
  { value: "REVISION", label: "Revision" },
  { value: "EXAM_STRATEGY", label: "Exam Strategy" },
  { value: "STUDY_PLAN", label: "Study Plan" },
];

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export default function AITutorConversationsPage() {
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "ai-tutor", "conversations", search, mode, page],
    queryFn: () => adminApi.getAITutorConversations({ search, mode, page, pageSize }),
  });

  const totalPages = data?.totalPages ?? 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-lg font-bold text-[#0B2545]">Conversations</h2>
          <p className="text-sm text-slate-500">
            Real AI Tutor conversations pulled directly from the database.
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search by student name or email..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>
        <select
          value={mode}
          onChange={(e) => { setMode(e.target.value); setPage(1); }}
          className="border border-slate-200 rounded-md px-3 py-2 text-sm bg-white"
        >
          {MODES.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center items-center h-48">
            <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : error ? (
          <div className="bg-red-50 text-red-500 p-6 flex items-center gap-3">
            <AlertCircle className="w-5 h-5" />
            <p>Failed to load conversations.</p>
          </div>
        ) : !data || data.conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-400 gap-2">
            <MessageSquare className="w-8 h-8" />
            <p className="text-sm">No AI Tutor conversations found.</p>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Messages</TableHead>
                  <TableHead>Last Activity</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.conversations.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <Link
                        href={`/admin-dashboard/ai-tutor/conversations/${c.id}`}
                        className="hover:underline"
                      >
                        <p className="font-medium text-slate-800">{c.student.name}</p>
                        <p className="text-xs text-slate-500">{c.student.email}</p>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link href={`/admin-dashboard/ai-tutor/conversations/${c.id}`} className="hover:underline">
                        {c.title}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs font-medium px-2 py-1 rounded bg-slate-100 text-slate-700">
                        {c.mode}
                      </span>
                    </TableCell>
                    <TableCell>{c.messageCount}</TableCell>
                    <TableCell className="text-slate-500 text-sm">{formatDate(c.updatedAt)}</TableCell>
                    <TableCell className="text-slate-500 text-sm">{formatDate(c.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
              <p className="text-sm text-slate-500">
                {data.total} conversation{data.total === 1 ? "" : "s"} total
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="p-1.5 rounded border border-slate-200 disabled:opacity-40"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm text-slate-600">Page {page} of {totalPages}</span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="p-1.5 rounded border border-slate-200 disabled:opacity-40"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
