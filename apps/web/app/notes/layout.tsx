import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Free Engineering & Exam Study Materials',
  description:
    'Free high-yield revision notes, reference guides, lecture summaries, and previous years exam resources for Nepal engineering students.',
  alternates: {
    canonical: '/notes',
  },
  openGraph: {
    title: 'Free Engineering & Exam Study Materials | NES Mastery',
    description:
      'Free high-yield revision notes, reference guides, and previous years exam resources for Nepal engineering students.',
    url: '/notes',
  },
};

export default function NotesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
