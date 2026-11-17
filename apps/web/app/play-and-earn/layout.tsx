import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Play & Earn — Quiz Duels & Knowledge Streaks',
  description:
    'Challenge fellow students to rapid live quiz duels, maintain study streaks, earn coin rewards, and unlock premium practice packages on NES Mastery.',
  alternates: {
    canonical: '/play-and-earn',
  },
  openGraph: {
    title: 'Play & Earn | NES Mastery',
    description:
      'Challenge fellow students to rapid live quiz duels, maintain study streaks, and earn coin rewards.',
    url: '/play-and-earn',
  },
};

export default function PlayAndEarnLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
