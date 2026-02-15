import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ScrollToTop } from "@/components/ScrollToTop";
import ErrorBoundary from "@/components/ErrorBoundary";
import { LiveStatusProvider } from "@/contexts/LiveStatusContext";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

// Lazy load pages that use supabase client to avoid initialization errors
const Education = lazy(() => import("./pages/Education"));
const Maktab = lazy(() => import("./pages/Maktab"));
const MaktabTerms = lazy(() => import("./pages/MaktabTerms"));
const IslamicEducation = lazy(() => import("./pages/IslamicEducation"));
const Hifz = lazy(() => import("./pages/Hifz"));
const Contact = lazy(() => import("./pages/Contact"));
const FAQ = lazy(() => import("./pages/FAQ"));
const Feedback = lazy(() => import("./pages/Feedback"));
const Install = lazy(() => import("./pages/Install"));
const PrayerCalendar = lazy(() => import("./pages/PrayerCalendar"));
const PosterCreator = lazy(() => import("./pages/PosterCreator"));

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

const App = () => (
  <TooltipProvider>
    <Toaster />
    <Sonner />
    <BrowserRouter>
      <LiveStatusProvider>
        <ScrollToTop />
        <ErrorBoundary>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/education" element={<Education />} />
              <Route path="/maktab" element={<Maktab />} />
              <Route path="/terms" element={<MaktabTerms />} />
              <Route path="/alimiyyah" element={<IslamicEducation />} />
              <Route path="/hifz" element={<Hifz />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/faq" element={<FAQ />} />
              <Route path="/feedback" element={<Feedback />} />
              <Route path="/install" element={<Install />} />
              <Route path="/prayer-calendar" element={<PrayerCalendar />} />
              <Route path="/poster-creator" element={<PosterCreator />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </LiveStatusProvider>
    </BrowserRouter>
  </TooltipProvider>
);

export default App;
