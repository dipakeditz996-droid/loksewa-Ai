"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function StudentsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/admin-dashboard/users?role=student");
  }, [router]);
  return null;
}
