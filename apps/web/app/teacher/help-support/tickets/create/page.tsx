"use client";

import { useRouter } from "next/navigation";
import { CreateTicketModal } from "../../_components/CreateTicketModal";

export default function CreateTicketPage() {
  const router = useRouter();

  return (
    <CreateTicketModal
      open
      onOpenChange={(open) => {
        if (!open) router.push("/teacher/help-support");
      }}
      onSuccess={() => router.push("/teacher/help-support/tickets")}
    />
  );
}
