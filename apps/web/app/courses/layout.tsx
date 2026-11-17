import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Competitive Engineering Exam Preparation Courses',
  description:
    'Explore comprehensive exam preparation courses for IOE Entrance, Nepal Engineering Council (NEC) License, and Competitive Engineering Examinations (Technical PSC) with syllabus notes, mock tests, and MCQs.',
  alternates: {
    canonical: '/courses',
  },
  openGraph: {
    title: 'NES Mastery Courses | IOE, NEC License & Competitive Engineering Exam Preparation',
    description:
      'Explore comprehensive exam preparation courses for IOE Entrance, Nepal Engineering Council (NEC) License, and Competitive Engineering Examinations (Technical PSC).',
    url: '/courses',
  },
};

export default function CoursesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
