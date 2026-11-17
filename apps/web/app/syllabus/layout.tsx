import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Competitive Engineering Exam Syllabi & Curriculum',
  description:
    'Browse official syllabus structures, paper breakdowns, subject topics, and downloadable curriculum PDFs for Competitive Engineering Exams (Technical PSC), IOE Entrance, and NEC License.',
  alternates: {
    canonical: '/syllabus',
  },
  openGraph: {
    title: 'Competitive Engineering Exam Syllabi & Curriculum | NES Mastery',
    description:
      'Browse official syllabus structures, paper breakdowns, and downloadable curriculum PDFs for Nepal engineering and competitive examinations.',
    url: '/syllabus',
  },
};

export default function SyllabusLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
