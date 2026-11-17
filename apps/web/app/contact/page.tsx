import type { Metadata } from "next";
import { PublicLegalPage } from "@/components/public/PublicLegalPage";

export const metadata: Metadata = {
  title: "Contact Us & Support",
  description:
    "Get in touch with the NES Mastery academic support and technical assistance team in Nepal. Reach out via email, phone, or support ticket.",
  alternates: {
    canonical: "/contact",
  },
  openGraph: {
    title: "Contact NES Mastery Support",
    description:
      "Get in touch with the NES Mastery academic support and technical assistance team in Nepal.",
    url: "/contact",
  },
};

export default function ContactPage() {
  return <PublicLegalPage slug="contact" />;
}
