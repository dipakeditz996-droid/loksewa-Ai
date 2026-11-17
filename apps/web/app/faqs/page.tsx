import { Metadata } from "next";
import { FaqsContent } from "./FaqsContent";

export const metadata: Metadata = {
  title: "Frequently Asked Questions (FAQs)",
  description:
    "Find clear answers to frequently asked questions about NES Mastery exam preparation courses, syllabus tracking, practice MCQs, timed mock exams, negative marking, and payments.",
  alternates: {
    canonical: "/faqs",
  },
  openGraph: {
    title: "NES Mastery FAQs — Answers to Common Questions",
    description:
      "Find clear answers about courses, syllabus tracking, practice MCQs, timed mock exams, negative marking, and payments.",
    url: "/faqs",
  },
};

const faqPageSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is NES Mastery?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "NES Mastery is Nepal's premier examination preparation platform. It integrates official curriculum tracking, video and modular courses, unlimited topic-wise MCQ practice, full-length timed mock exams with official negative deduction marking, an intelligent AI Tutor, gamified study streaks, and a student marketplace for study resources.",
      },
    },
    {
      "@type": "Question",
      name: "Who is NES Mastery for?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "NES Mastery is designed for students and professionals preparing for competitive engineering and public examinations in Nepal, including IOE Entrance, NEC License examinations, and Public Service Commission (Loksewa) engineering and civil service posts.",
      },
    },
    {
      "@type": "Question",
      name: "Which exams are supported?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "The platform supports major Public Service Commission examinations across administrative and technical cadres. It covers Section Officer, Nayab Subba, Kharidar, health & engineering technical posts, and selected national banking exam curricula.",
      },
    },
    {
      "@type": "Question",
      name: "How does syllabus-based learning work?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Our curriculum explorer breaks down the official PSC syllabus into hierarchical topic units with assigned mark weightages. As you study notes or solve practice sets associated with a syllabus node, the system marks topics as covered so you can systematically ensure zero blind spots before your exam.",
      },
    },
    {
      "@type": "Question",
      name: "How are results and scores calculated?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Results strictly implement the official Public Service Commission scoring formula: each correct answer adds the question's full mark, unattempted questions do not affect the score, and incorrect answers incur a 20% negative deduction (-0.20 of the mark value).",
      },
    },
    {
      "@type": "Question",
      name: "How do I purchase a package or course?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Navigate to the course or package you wish to purchase and click Enroll/Buy. The checkout screen provides payment instructions for domestic digital wallets (eSewa, Khalti) and direct Bank Transfer with our official merchant details. After transferring the amount, enter your transaction reference number and upload a screenshot or photo of your receipt.",
      },
    },
  ],
};

export default function FaqsPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqPageSchema) }}
      />
      <main className="flex-1 min-h-screen pt-[72px] sm:pt-[80px]">
        <FaqsContent />
      </main>
    </>
  );
}
