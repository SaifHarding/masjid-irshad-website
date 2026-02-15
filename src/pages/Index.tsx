import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import PrayerTimes from "@/components/PrayerTimes";
import MasjidLiveEmbed from "@/components/MasjidLiveEmbed";
import AnnouncementsSection from "@/components/AnnouncementsSection";
import About from "@/components/About";
import Footer from "@/components/Footer";
import { useEventNotifications } from "@/hooks/useEventNotifications";

const Index = () => {
  const location = useLocation();
  
  // Initialize event notifications (will notify when new events are added)
  useEventNotifications();

  // Handle scroll to live section when navigating from another page
  useEffect(() => {
    if (location.state?.scrollToLive) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        const embedSection = document.getElementById("masjid-live");
        if (embedSection) {
          const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
          embedSection.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth" });
        }
      }, 100);
      
      // Clear the state to prevent re-scrolling on subsequent renders
      window.history.replaceState({}, document.title);
      
      return () => clearTimeout(timer);
    }
  }, [location.state]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Hero />
      <PrayerTimes />
      <AnnouncementsSection />
      <MasjidLiveEmbed station="masjidirshad" />
      <About />
      <Footer />
    </div>
  );
};

export default Index;
