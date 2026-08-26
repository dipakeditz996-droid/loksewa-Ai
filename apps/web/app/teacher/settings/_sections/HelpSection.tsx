import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FileText, LogOut, MessageSquare } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export function HelpSection() {
  const { logout } = useAuth();

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[#E7EBF3] bg-white p-6 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <div className="mb-5 border-b border-[#E7EBF3] pb-5">
          <h3 className="text-lg font-semibold text-[#101828]">Help & Support</h3>
          <p className="text-sm text-[#667085]">
            Need assistance or have feedback? We're here to help.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Link href="/teacher/help-support" className="flex items-start gap-4 rounded-xl border border-[#E7EBF3] p-4 transition-colors hover:bg-[#F7F9FC]">
            <div className="shrink-0 rounded-lg bg-[#EEF2F8] p-2.5 text-[#0B2545]">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <h4 className="mb-1 font-semibold text-[#101828]">Contact Support</h4>
              <p className="text-sm text-[#667085]">Open a ticket with our dedicated teacher success team.</p>
            </div>
          </Link>

          <Link href="/teacher/help-support" className="flex items-start gap-4 rounded-xl border border-[#E7EBF3] p-4 transition-colors hover:bg-[#F7F9FC]">
            <div className="shrink-0 rounded-lg bg-[#E9F6F2] p-2.5 text-[#0F7A69]">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h4 className="mb-1 font-semibold text-[#101828]">Documentation</h4>
              <p className="text-sm text-[#667085]">Read guides on how to create questions, exams, and more.</p>
            </div>
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border border-[#B23A3A]/20 bg-[#FBEAEA] p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h3 className="mb-1 text-lg font-semibold text-[#8B2E2E]">Session Management</h3>
            <p className="text-sm text-[#B23A3A]">
              Sign out of your account on this device.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => logout()}
            className="shrink-0 border-[#B23A3A]/30 text-[#B23A3A] hover:bg-[#f5d3d3] hover:text-[#8B2E2E]"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
}
