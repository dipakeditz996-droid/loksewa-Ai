"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, RefreshCw, AlertCircle, User, Bot, Info } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { adminApi } from "@/lib/api/admin";

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export default function AITutorConversationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "ai-tutor", "conversation", id],
    queryFn: () => adminApi.getAITutorConversationDetail(id),
    enabled: Number.isFinite(id),
  });

  return (
    <div className="space-y-6">
      <button
        onClick={() => router.push("/admin-dashboard/ai-tutor/conversations")}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Conversations
      </button>

      {isLoading ? (
        <div className="flex justify-center items-center h-48">
          <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
        </div>
      ) : error ? (
        <div className="bg-red-50 text-red-500 p-6 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5" />
          <p>Conversation not found, or failed to load.</p>
        </div>
      ) : data ? (
        <>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-[#0B2545]">{data.title}</h2>
                <p className="text-sm text-slate-500">
                  {data.student.name} &middot; {data.student.email}
                </p>
              </div>
              <span className="text-xs font-medium px-2 py-1 rounded bg-slate-100 text-slate-700">
                {data.mode}
              </span>
            </div>
            <div className="flex gap-6 mt-4 text-xs text-slate-400">
              <span>Created {formatDate(data.createdAt)}</span>
              <span>Last activity {formatDate(data.updatedAt)}</span>
              <span>{data.messages.length} message{data.messages.length === 1 ? "" : "s"}</span>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            {data.messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-2">
                <Info className="w-6 h-6" />
                <p className="text-sm">No messages have been sent in this conversation yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {data.messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex gap-3 ${m.role === "user" ? "" : "flex-row-reverse"}`}
                  >
                    <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                      m.role === "user" ? "bg-blue-50 text-blue-600" : "bg-amber-50 text-amber-600"
                    }`}>
                      {m.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                    </div>
                    <div className={`max-w-2xl rounded-xl px-4 py-3 text-sm whitespace-pre-wrap ${
                      m.role === "user" ? "bg-slate-50 text-slate-800" : "bg-amber-50 text-slate-800"
                    }`}>
                      <p>{m.content}</p>
                      <p className="text-[10px] text-slate-400 mt-2">{formatDate(m.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
