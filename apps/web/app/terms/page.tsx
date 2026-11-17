import type { Metadata } from "next";
import { PublicLegalPage } from "@/components/public/PublicLegalPage";

export const metadata: Metadata = {
  title: "Terms and Conditions",
  description:
    "Review the terms and conditions governing course access, examinations, subscriptions, and platform usage on NES Mastery.",
  alternates: {
    canonical: "/terms",
  },
};

export default function TermsPage() {
  return <PublicLegalPage slug="terms" />;
}
