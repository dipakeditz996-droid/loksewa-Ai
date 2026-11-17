import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://nesmastery.com';

  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/courses',
          '/courses/*',
          '/syllabus',
          '/features',
          '/faqs',
          '/contact',
          '/play-and-earn',
          '/privacy',
          '/terms',
          '/refund',
          '/marketplace',
          '/notes',
          '/practice',
        ],
        disallow: [
          '/admin/',
          '/admin-dashboard/',
          '/admin-dashboard/*',
          '/admin-login',
          '/student/',
          '/student/*',
          '/student-dashboard/',
          '/teacher/',
          '/teacher/*',
          '/api/',
          '/_next/',
          '/practice/session',
          '/practice/result',
          '/subjective/answer',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
