import { useState } from "react";
import { Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Users, Info, Clock, ExternalLink, MonitorCheck, ShieldCheck } from "lucide-react";
import maktabImage from "@/assets/maktab-students.jpg";
import { MaktabRegistrationForm } from "@/components/MaktabRegistrationForm";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { useStudentCount } from "@/hooks/useStudentCount";
const Maktab = () => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const { ref: headerRef, isVisible: headerVisible } = useScrollAnimation();
  const { ref: contentRef, isVisible: contentVisible } = useScrollAnimation();
  const { data: studentCount } = useStudentCount();

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <section className="py-16 bg-background">
          <div className="container">
            <div 
              ref={headerRef as React.RefObject<HTMLDivElement>}
              className={`text-center mb-12 transition-all duration-500 ease-out ${
                headerVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
            >
              <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Maktab Programme
              </h1>
              <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                Nurturing the next generation with comprehensive Islamic education, 
                Quranic studies, and Arabic language instruction for boys and girls.
              </p>
              <p className="mt-4 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary/10 rounded-full">
                  <Users className="h-3.5 w-3.5 text-primary" />
                  Join <span className="font-medium text-foreground">{Math.floor((studentCount?.total ?? 70) / 10) * 10}+</span> students
                </span>
              </p>
            </div>

            <div 
              ref={contentRef as React.RefObject<HTMLDivElement>}
              className={`transition-all duration-500 delay-150 ease-out ${
                contentVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
            >
            <div className="flex justify-center mb-8">
              <Button 
                className="bg-primary hover:bg-primary/90"
                size="lg"
                onClick={() => setIsFormOpen(true)}
              >
                Register Interest
              </Button>
            </div>

            <div className="flex justify-center mb-8">
              <Button 
                variant="outline"
                className="gap-2 text-sm border-primary text-primary hover:bg-primary/10"
                size="sm"
                asChild
              >
                <a
                  href="https://app.masjidirshad.co.uk/portal"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-4 w-4" />
                  Student Portal
                </a>
              </Button>
            </div>

            <div className="max-w-4xl mx-auto mb-8">
              <img 
                src={maktabImage} 
                alt="Children reading Quran in Maktab" 
                className="w-full h-[400px] object-cover rounded-lg shadow-lg"
              />
            </div>

            <div className="max-w-3xl mx-auto">
              <Card className="p-8 hover:shadow-xl hover:-translate-y-2 transition-all duration-300 group hover:border-primary/50 shimmer-card">
                <div className="flex flex-col items-center text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6 transition-all duration-300 group-hover:bg-primary/20 group-hover:scale-110">
                    <BookOpen className="h-8 w-8 text-primary transition-transform duration-300 group-hover:rotate-12" />
                  </div>
                  
                  <h3 className="text-2xl font-semibold mb-3 text-foreground">
                    Maktab for Boys & Girls
                  </h3>
                  
                  <p className="text-muted-foreground mb-4">
                    Comprehensive Quranic education and Islamic studies programme
                  </p>
                  
                  <div className="space-y-4 mb-6 w-full">
                    <div className="flex items-center justify-center gap-2">
                      <Users className="h-5 w-5 text-primary" />
                      <span className="font-medium text-foreground">Ages 5+</span>
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <Clock className="h-5 w-5 text-primary" />
                      <span className="text-muted-foreground">Mon - Weds: Qaidah / Quran & Tajweed</span>
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <Clock className="h-5 w-5 text-primary" />
                      <span className="text-muted-foreground">Thursday: Islamic Studies</span>
                    </div>
                    <div className="text-center text-muted-foreground">
                      <p className="font-medium">5:00 PM - 6:00 PM</p>
                    </div>
                  </div>
                  
                  <Button 
                    className="w-full bg-primary hover:bg-primary/90 transition-all duration-300 group-hover:scale-105"
                    size="lg"
                    onClick={() => setIsFormOpen(true)}
                  >
                    Register Interest
                  </Button>

                  <div className="flex justify-center mt-3">
                    <Button 
                      variant="outline"
                      className="gap-1.5 text-xs border-primary/40 text-primary hover:bg-primary/5 py-2 h-auto px-4"
                      asChild
                    >
                      <a
                        href="https://app.masjidirshad.co.uk/portal"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Student Portal
                      </a>
                    </Button>
                  </div>
                  
                  <div className="mt-6 pt-6 border-t border-border/50 flex flex-col items-center gap-3">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Info className="h-5 w-5 text-primary" />
                      <span className="text-sm">Female staff for girls and younger boys</span>
                    </div>
                    <Link 
                      to="/terms" 
                      className="text-xs text-muted-foreground hover:text-primary underline transition-colors"
                    >
                      Terms and Conditions
                    </Link>
                  </div>
                </div>
              </Card>
            </div>

            {/* Why Choose Our Maktab Section */}
            <div className="mt-16 max-w-4xl mx-auto">
              <h2 className="text-3xl font-bold text-center text-foreground mb-8">
                Why Choose Our Maktab?
              </h2>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="p-6 bg-secondary/10 rounded-lg hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
                    <MonitorCheck className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2 text-foreground">Student Portal</h3>
                  <p className="text-muted-foreground">
                    Track student attendance and progress through our dedicated online portal
                  </p>
                </div>

                <div className="p-6 bg-secondary/10 rounded-lg hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
                    <ShieldCheck className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2 text-foreground">Qualified Teachers</h3>
                  <p className="text-muted-foreground">
                    All our teachers are qualified and DBS certified for child safety
                  </p>
                </div>

                <div className="p-6 bg-secondary/10 rounded-lg hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2 text-foreground">Small Classes</h3>
                  <p className="text-muted-foreground">
                    Intimate class sizes ensuring personalised attention for every student
                  </p>
                </div>
              </div>
            </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
      <MaktabRegistrationForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
      />
    </div>
  );
};

export default Maktab;
