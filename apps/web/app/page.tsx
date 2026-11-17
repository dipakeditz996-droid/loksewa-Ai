import { LoksewaExamCountdown } from "@/components/student/countdown/LoksewaExamCountdown";

// Public API Adapter
import { publicApi } from "@/lib/api/public-api";

// Homepage Sections
import { HeroSection } from "./home/HeroSection";
import { FeatureStrip } from "./home/FeatureStrip";
import { SocialProofSection } from "./home/SocialProofSection";
import { AIPreparationSection } from "./home/AIPreparationSection";
import { AILearningNetworkSection } from "./home/AILearningNetworkSection";
import { StudyPlanSection } from "./home/StudyPlanSection";
import { CoursesSection } from "./home/CoursesSection";
import { SyllabusSection } from "./home/SyllabusSection";
import { PracticeSection } from "./home/PracticeSection";
import { MockExamSection } from "./home/MockExamSection";
import { AnalyticsSection } from "./home/AnalyticsSection";
import { LeaderboardStreakSection } from "./home/LeaderboardStreakSection";
import { MarketplaceSection } from "./home/MarketplaceSection";
import { TeacherSection } from "./home/TeacherSection";
import { FinalCTASection } from "./home/FinalCTASection";

export const metadata = {
  title: "NES Mastery | Engineering Entrance & License Examination Preparation Platform",
  description: "Master your engineering examinations with comprehensive study plans, dynamic mock tests, targeted engineering question banks, and official syllabus.",
};

// Revalidate homepage every 5 minutes (ISR) to deliver instant edge TTFB (<100ms)
export const revalidate = 300;

export default async function Home() {
  // Fetch data concurrently for API-driven sections
  // Note: These use the publicApi adapter which gracefully catches errors and returns null
  // The components handle the null case by falling back to curated static showcase data.
  const [
    categories,
    notes,
    products,
    testimonials,
    stats,
    examinations,
  ] = await Promise.all([
    publicApi.getCategories(),
    publicApi.getNotesMaterials(),
    publicApi.getProducts(),
    publicApi.getTestimonials(),
    publicApi.getStats(),
    publicApi.getExaminations(),
  ]);

  return (
    // The site-wide theme toggle (next-themes) controls the dark mode via the <html> tag.
    // We remove the hardcoded `dark` class so the toggle button actually works.
    <div className="w-full flex flex-col min-h-screen overflow-x-clip">
      <main className="flex-1 bg-slate-50 dark:bg-[#020611] bg-aurora min-h-screen overflow-x-clip">
        <HeroSection />
        <section className="py-4 sm:py-5 relative z-20">
          <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
            <LoksewaExamCountdown />
          </div>
        </section>
        <FeatureStrip />
        <SocialProofSection testimonials={testimonials} stats={stats} />
        <AIPreparationSection />
        <AILearningNetworkSection />
        <StudyPlanSection />
        <CoursesSection categories={categories} />
        <SyllabusSection notes={notes} />
        <PracticeSection />
        <MockExamSection examinations={examinations} />
        <AnalyticsSection />
        <LeaderboardStreakSection />
        <MarketplaceSection products={products} />
        <TeacherSection />
        <FinalCTASection />
      </main>
    </div>
  );
}
