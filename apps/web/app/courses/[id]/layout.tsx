import type { Metadata } from 'next';

type Props = {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const resolvedParams = await params;
  const idOrSlug = resolvedParams.id;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://nesmastery.com';

  return {
    title: `Course Details | NES Mastery`,
    description: `Complete examination syllabus, curated learning materials, and practice exams for course #${idOrSlug} on NES Mastery.`,
    alternates: {
      canonical: `/courses/${idOrSlug}`,
    },
    openGraph: {
      title: `Course Details | NES Mastery`,
      description: `Complete examination syllabus, curated learning materials, and practice exams on NES Mastery.`,
      url: `${siteUrl}/courses/${idOrSlug}`,
    },
  };
}

export default async function CourseDetailLayout({
  children,
  params,
}: Props) {
  const resolvedParams = await params;
  const idOrSlug = resolvedParams.id;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://nesmastery.com';

  const courseJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: `NES Mastery Course #${idOrSlug}`,
    description:
      'Comprehensive exam preparation course including syllabus notes, question banks, and live mock tests.',
    provider: {
      '@type': 'EducationalOrganization',
      name: 'NES Mastery',
      url: siteUrl,
    },
    url: `${siteUrl}/courses/${idOrSlug}`,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(courseJsonLd) }}
      />
      {children}
    </>
  );
}
