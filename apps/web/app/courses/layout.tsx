import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Engineering & Public Service Preparation Courses',
  description:
    'Explore comprehensive exam preparation courses for IOE Entrance, Nepal Engineering Council (NEC) License, and Loksewa PSC Technical Engineering services with syllabus notes, mock tests, and MCQs.',
  alternates: {
    canonical: '/courses',
  },
  openGraph: {
    title: 'NES Mastery Courses | IOE, NEC License & Loksewa Preparation',
    description:
      'Explore comprehensive exam preparation courses for IOE Entrance, Nepal Engineering Council (NEC) License, and Loksewa PSC Technical Engineering services.',
    url: '/courses',
  },
};

export default function CoursesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
