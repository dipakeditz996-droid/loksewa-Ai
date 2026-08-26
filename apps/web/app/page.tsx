import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

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
import { NotesSection } from "./home/NotesSection";
import { MarketplaceSection } from "./home/MarketplaceSection";
import { PricingSection } from "./home/PricingSection";
import { TeacherSection } from "./home/TeacherSection";
import { FinalCTASection } from "./home/FinalCTASection";

export const metadata = {
  title: "LoksewaAI | Nepal's Most Intelligent Loksewa Preparation Platform",
  description: "Prepare smarter with AI-powered personalized study plans, dynamic mock exams, targeted practice, and premium notes for PSC Nepal exams.",
};

export default async function Home() {
  // Fetch data concurrently for API-driven sections
  // Note: These use the publicApi adapter which gracefully catches errors and returns null
  // The components handle the null case by falling back to curated static showcase data.
  const [
    examCategories,
    notes,
    products,
    packages,
    testimonials
  ] = await Promise.all([
    publicApi.getExamCategories(),
    publicApi.getNotesMaterials(),
    publicApi.getProducts(),
    publicApi.getPackages(),
    publicApi.getTestimonials(),
  ]);

  return (
    <>
      <Navbar />
      
      <main className="flex-1 bg-slate-50 dark:bg-[#020611] bg-aurora min-h-screen">
        <HeroSection />
        <FeatureStrip />
        <SocialProofSection testimonials={testimonials} />
        <AIPreparationSection />
        <AILearningNetworkSection />
        <StudyPlanSection />
        <CoursesSection examCategories={examCategories} />
        <SyllabusSection examCategories={examCategories} />
        <PracticeSection />
        <MockExamSection />
        <AnalyticsSection />
        <LeaderboardStreakSection />
        <NotesSection notes={notes} />
        <MarketplaceSection products={products} />
        <PricingSection packages={packages} />
        <TeacherSection />
        <FinalCTASection />
      </main>

      <Footer />
    </>
  );
}
