import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Interactive Practice Sets & Question Bank',
  description:
    'Test your knowledge with authentic Nepal engineering and civil service practice questions. Instant answers, detailed explanations, and performance scoring.',
  alternates: {
    canonical: '/practice',
  },
  openGraph: {
    title: 'Interactive Practice Sets | NES Mastery',
    description:
      'Test your knowledge with authentic Nepal engineering and civil service practice questions. Instant answers and performance scoring.',
    url: '/practice',
  },
};

export default function PracticeLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
