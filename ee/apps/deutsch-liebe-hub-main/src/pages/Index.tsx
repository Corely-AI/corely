import StickyNav from "@/components/landing/StickyNav";
import HeroSection from "@/components/landing/HeroSection";
import SocialProofStrip from "@/components/landing/SocialProofStrip";
import PASSection from "@/components/landing/PASSection";
import MethodSection from "@/components/landing/MethodSection";
import ProgramHighlights from "@/components/landing/ProgramHighlights";
import GroupLearningSection from "@/components/landing/GroupLearningSection";
import CoursePackages from "@/components/landing/CoursePackages";
import ScheduleSection from "@/components/landing/ScheduleSection";
import InstructorSection from "@/components/landing/InstructorSection";
import TestimonialsSection from "@/components/landing/TestimonialsSection";
import ScholarshipSection from "@/components/landing/ScholarshipSection";
import FAQSection from "@/components/landing/FAQSection";
import LeadForm from "@/components/landing/LeadForm";
import Footer from "@/components/landing/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <StickyNav />
      <main>
        <HeroSection />
        <SocialProofStrip />
        <PASSection />
        <MethodSection />
        <ProgramHighlights />
        <GroupLearningSection />
        <CoursePackages />
        <ScheduleSection />
        <InstructorSection />
        <TestimonialsSection />
        <ScholarshipSection />
        <FAQSection />
        <LeadForm />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
