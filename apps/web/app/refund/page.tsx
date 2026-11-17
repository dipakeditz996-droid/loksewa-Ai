import type { Metadata } from "next";
import { PublicLegalPage } from "@/components/public/PublicLegalPage";

export const metadata: Metadata = {
  title: "Refund Policy",
  description:
    "Learn about NES Mastery's refund policy, payment dispute handling, and enrollment transfer procedures.",
  alternates: {
    canonical: "/refund",
  },
};

export default function RefundPage() {
  return <PublicLegalPage slug="refund" />;
}
