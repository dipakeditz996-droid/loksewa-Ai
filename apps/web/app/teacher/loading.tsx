import React from "react";
import { Loader2 } from "lucide-react";

export default function TeacherLoading() {
  return (
    <div className="flex h-[60vh] w-full flex-col items-center justify-center">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
      <p className="mt-4 text-sm font-medium text-slate-500 animate-pulse">
        Loading...
      </p>
    </div>
  );
}
