import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Student Marketplace & Study Resources',
  description:
    'Discover physical and digital study resources, books, hand-curated notes, and exam supplies for engineering and competitive examinations in Nepal.',
  alternates: {
    canonical: '/marketplace',
  },
  openGraph: {
    title: 'NES Mastery Student Marketplace',
    description:
      'Discover physical and digital study resources, books, and exam supplies in Nepal.',
    url: '/marketplace',
  },
};

export default function MarketplaceLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
