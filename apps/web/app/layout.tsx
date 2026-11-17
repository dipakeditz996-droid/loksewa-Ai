import type { Metadata, Viewport } from "next";
import dynamic from "next/dynamic";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/contexts/AuthContext";
import { FocusModeProvider } from "@/contexts/FocusModeContext";
import { PublicSiteShell } from "@/components/layout/PublicSiteShell";
import Providers from "./providers";

import { prefetchDNS } from "react-dom";

// Lazy-load DND modal to keep it out of the critical root bundle on public routes
const OsDndGuideModal = dynamic(
  () => import("@/components/student/focus/OsDndGuideModal").then((m) => m.OsDndGuideModal)
);

let API_ORIGIN: string | undefined = undefined;
try {
  if (process.env.NEXT_PUBLIC_API_URL) {
    API_ORIGIN = new URL(process.env.NEXT_PUBLIC_API_URL).origin;
  }
} catch {
  API_ORIGIN = undefined;
}

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});
const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-jakarta",
  display: "swap",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://nesmastery.com';

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#102D40" },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "NES Mastery | Nepal's Leading Engineering & Public Service Exam Preparation",
    template: "%s | NES Mastery",
  },
  description:
    "Nepal's premier examination preparation platform for IOE Entrance, NEC Engineering License, Loksewa Technical & Civil Services. Real exam questions, live mock tests, verified syllabus notes, and instant performance analytics.",
  keywords: [
    "NES Mastery",
    "Loksewa Nepal",
    "IOE Entrance Preparation",
    "NEC License Exam",
    "Nepal Engineering Council",
    "Public Service Commission Nepal",
    "Engineering Exam Nepal",
    "Sub-engineer preparation",
    "Civil Engineering Loksewa",
    "Mock Tests Nepal",
  ],
  authors: [{ name: "NES Mastery Academic Team", url: SITE_URL }],
  creator: "NES Mastery",
  publisher: "NES Mastery",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/brand/icon-32.png", type: "image/png", sizes: "32x32" },
      { url: "/brand/icon-192.png", type: "image/png", sizes: "192x192" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
  },
  manifest: "/site.webmanifest",
  openGraph: {
    title: "NES Mastery | Nepal's Leading Engineering & Public Service Exam Preparation",
    description:
      "Master IOE Entrance, NEC Engineering License, and Loksewa PSC examinations with authentic mock tests, expert-curated notes, and performance analytics.",
    url: SITE_URL,
    siteName: "NES Mastery",
    locale: "en_NP",
    type: "website",
    images: [
      {
        url: "/images/og-card.png",
        width: 1200,
        height: 630,
        alt: "NES Mastery - Smart Exam Preparation for Nepal Engineering & Public Service",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "NES Mastery | Smart Exam Preparation Platform",
    description:
      "Nepal's premier examination preparation platform for IOE Entrance, NEC License, and Loksewa PSC examinations.",
    images: ["/images/og-card.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Hoist dns-prefetch directly into document head without opening an unused TCP/TLS socket on static pages
  if (API_ORIGIN) prefetchDNS(API_ORIGIN);

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "EducationalOrganization",
                  "@id": `${SITE_URL}/#organization`,
                  "name": "NES Mastery",
                  "url": SITE_URL,
                  "logo": {
                    "@type": "ImageObject",
                    "@id": `${SITE_URL}/#logo`,
                    "url": `${SITE_URL}/brand/logo.png`,
                    "caption": "NES Mastery",
                  },
                  "description":
                    "Nepal's premier examination preparation platform for IOE Entrance, NEC Engineering License, and Public Service Commission (Loksewa) technical services.",
                  "sameAs": [
                    "https://www.facebook.com/nesmastery",
                    "https://www.youtube.com/@nesmastery",
                  ],
                },
                {
                  "@type": "WebSite",
                  "@id": `${SITE_URL}/#website`,
                  "url": SITE_URL,
                  "name": "NES Mastery",
                  "description":
                    "Smart examination preparation platform for Nepal engineering and civil service students.",
                  "publisher": {
                    "@id": `${SITE_URL}/#organization`,
                  },
                  "inLanguage": "en-US",
                },
              ],
            }),
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var storageKey = 'theme';
                  var theme = localStorage.getItem(storageKey);
                  var supportDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches === true;
                  if (theme === 'dark') {
                    document.documentElement.classList.remove('light');
                    document.documentElement.classList.add('dark');
                  } else if (theme === 'system') {
                    document.documentElement.classList.remove('light', 'dark');
                    document.documentElement.classList.add(supportDarkMode ? 'dark' : 'light');
                  } else {
                    document.documentElement.classList.remove('dark');
                    document.documentElement.classList.add('light');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body
        suppressHydrationWarning
        className={`${inter.variable} ${jakarta.variable} font-sans antialiased bg-background text-foreground min-h-screen flex flex-col`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={true}
          disableTransitionOnChange
        >
          <Providers>
            <AuthProvider>
              <FocusModeProvider>
                <PublicSiteShell>{children}</PublicSiteShell>
                {/* OS DND guide — loaded dynamically only when needed */}
                <OsDndGuideModal />
              </FocusModeProvider>
            </AuthProvider>
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
