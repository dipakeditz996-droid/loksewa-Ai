import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Official Nepal Exam Syllabi & Curriculum',
  description:
    'Browse official syllabus structures, paper breakdowns, subject topics, and downloadable curriculum PDFs for Nepal Public Service Commission (Loksewa), IOE Entrance, and NEC License.',
  alternates: {
    canonical: '/syllabus',
  },
  openGraph: {
    title: 'Nepal Exam Syllabi & Curriculum | NES Mastery',
    description:
      'Browse official syllabus structures, paper breakdowns, and downloadable curriculum PDFs for Nepal engineering and civil service examinations.',
    url: '/syllabus',
  },
};

export default function SyllabusLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
