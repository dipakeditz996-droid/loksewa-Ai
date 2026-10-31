"use client";

import React, { useState } from "react";
import { Send, CheckCircle2, XCircle, Loader2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { adminApi } from "@/lib/api/admin";

interface SendTestEmailCardProps {
  onSuccess?: () => void;
}

export default function SendTestEmailCard({ onSuccess }: SendTestEmailCardProps) {
  const [testEmailInput, setTestEmailInput] = useState("");
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSendTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetEmail = testEmailInput.trim();
    if (!targetEmail) {
      setTestResult({ success: false, message: "Please enter an email address to send a test message." });
      return;
    }

    setIsSendingTest(true);
    setTestResult(null);
    try {
      const res = await adminApi.sendTestEmail({ recipient_email: targetEmail });
      setTestResult({
        success: res.success,
        message: res.message || (res.success ? "Test email dispatched successfully. Check your inbox/spam folder." : "Delivery failed."),
      });
      if (onSuccess) onSuccess();
    } catch (err: any) {
      const msg = err?.data?.error || err?.message || "Failed to deliver test email. Check server logs and SMTP credentials.";
      setTestResult({ success: false, message: msg });
    } finally {
      setIsSendingTest(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
      <div>
        <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Send className="w-4 h-4 text-indigo-500" />
          Send Test Diagnostic Email
        </h4>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Dispatches a diagnostic message to test your configured email provider (SMTP Relay or Resend HTTPS API).
        </p>
      </div>

      <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 rounded-lg p-3 text-[11px] text-slate-600 dark:text-slate-400 flex items-start gap-2">
        <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong>Purpose:</strong> Testing outbound delivery only. The email address entered here is used solely for this test dispatch and is <strong>never automatically saved</strong> as an administrative recipient or associated with student preferences.
        </p>
      </div>

      <form onSubmit={handleSendTestEmail} className="flex flex-col sm:flex-row gap-3">
        <Input
          type="email"
          value={testEmailInput}
          onChange={(e) => setTestEmailInput(e.target.value)}
          placeholder="Enter recipient email (e.g. admin@gmail.com)"
          className="flex-1 text-xs"
          disabled={isSendingTest}
        />
        <Button
          type="submit"
          disabled={isSendingTest || !testEmailInput.trim()}
          className="bg-indigo-600 hover:bg-indigo-700 text-white shrink-0 text-xs"
        >
          {isSendingTest ? (
            <>
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              Testing Delivery...
            </>
          ) : (
            <>
              <Send className="w-3.5 h-3.5 mr-1.5" />
              Send Test Email
            </>
          )}
        </Button>
      </form>

      {testResult && (
        <div
          className={`p-3 rounded-lg border text-xs flex items-start gap-2.5 ${
            testResult.success
              ? "bg-green-50 border-green-200 text-green-800 dark:bg-green-950/30 dark:border-green-900 dark:text-green-300"
              : "bg-red-50 border-red-200 text-red-800 dark:bg-red-950/30 dark:border-red-900 dark:text-red-300"
          }`}
        >
          {testResult.success ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-green-600 mt-0.5" />
          ) : (
            <XCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
          )}
          <div>
            <p className="font-semibold">{testResult.success ? "Delivery Test Succeeded" : "Delivery Test Failed"}</p>
            <p className="mt-0.5 leading-relaxed">{testResult.message}</p>
          </div>
        </div>
      )}
    </div>
  );
}

