import { Metadata } from "next";
import { FeaturesContent } from "./FeaturesContent";

export const metadata: Metadata = {
  title: "Platform Features — Smart Exam Preparation",
  description:
    "Explore NES Mastery's comprehensive suite of exam preparation tools: syllabus-aligned courses, real-time practice, timed mock exams, and performance analytics.",
  alternates: {
    canonical: "/features",
  },
  openGraph: {
    title: "NES Mastery Features — Smart Exam Preparation Platform",
    description:
      "Explore NES Mastery's comprehensive suite of exam preparation tools: syllabus-aligned courses, real-time practice, timed mock exams, and analytics.",
    url: "/features",
  },
};

export default function FeaturesPage() {
  return (
    <>
      <main className="flex-1 min-h-screen pt-[72px] sm:pt-[80px]">
        <FeaturesContent />
      </main>
    </>
  );
}
