import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/contexts/AuthContext";
import { FocusModeProvider } from "@/contexts/FocusModeContext";
import { PublicSiteShell } from "@/components/layout/PublicSiteShell";
import Providers from "./providers";

import { preconnect, prefetchDNS } from "react-dom";

// Lazy-load DND modal to keep it out of the critical root bundle on public routes
const OsDndGuideModal = dynamic(
  () => import("@/components/student/focus/OsDndGuideModal").then((m) => m.OsDndGuideModal)
);

const API_ORIGIN = process.env.NEXT_PUBLIC_API_URL
  ? new URL(process.env.NEXT_PUBLIC_API_URL).origin
  : "https://loksewa-ai-production.up.railway.app";

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

export const metadata: Metadata = {
  title: "Loksewa Examination & Learning Ecosystem",
  description:
    "Comprehensive preparation platform for Nepal Public Service Commission examinations.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Hoist preconnect and dns-prefetch directly into document head without manual <head> JSX tag
  preconnect(API_ORIGIN, { crossOrigin: "anonymous" });
  prefetchDNS(API_ORIGIN);

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${inter.variable} ${jakarta.variable} font-sans antialiased bg-background text-foreground min-h-screen flex flex-col`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
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
