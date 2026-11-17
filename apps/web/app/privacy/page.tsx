import type { Metadata } from "next";
import { PublicLegalPage } from "@/components/public/PublicLegalPage";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Read how NES Mastery protects and manages student data, personal information, and payment records in Nepal.",
  alternates: {
    canonical: "/privacy",
  },
};

export default function PrivacyPage() {
  return <PublicLegalPage slug="privacy" />;
}
