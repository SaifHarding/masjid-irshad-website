import { Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, GraduationCap, BookMarked, ExternalLink, ArrowRight } from "lucide-react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const Education = () => {
  const { ref: headerRef, isVisible: headerVisible } = useScrollAnimation();
  const { ref: classesRef, isVisible: classesVisible } = useScrollAnimation();
  const { ref: portalRef, isVisible: portalVisible } = useScrollAnimation();

  const programmes = [
    {
      icon: BookOpen,
      title: "Maktab",
      description: "Comprehensive Quranic education and Islamic studies for boys and girls aged 5+. Classes run Monday to Thursday covering Quran, Tajweed, and Islamic Studies.",
      schedule: "Mon - Thurs, 5:00 PM - 6:00 PM",
      link: "/maktab",
    },
    {
      icon: BookMarked,
      title: "Hifdh al-Qur'an",
      description: "Structured Qur'an memorisation programme with experienced teachers. Learn proven memorisation techniques with personalised guidance and regular revision.",
      schedule: "Mon - Thurs, 5:00 PM - 6:30 PM",
      link: "/hifz",
    },
    {
      icon: GraduationCap,
      title: "Alimiyyah Programme",
      description: "Advanced Islamic sciences programme for boys and girls. Study classical Islamic texts including Fiqh, Hadith, Tafsir, and Arabic language.",
      schedule: "Various schedules available",
      link: "/alimiyyah",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-16 bg-background">
          <div className="container">
            <div 
              ref={headerRef as React.RefObject<HTMLDivElement>}
              className={`text-center mb-12 transition-all duration-500 ease-out ${
                headerVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
            >
              <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Islamic Education
              </h1>
              <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                Nurturing the next generation with authentic Islamic knowledge, Quranic studies, 
                and moral values through our comprehensive education programmes.
              </p>
            </div>

            {/* Programmes Grid */}
            <div 
              ref={classesRef as React.RefObject<HTMLDivElement>}
              className={`transition-all duration-500 delay-150 ease-out ${
                classesVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
            >
              <h2 className="text-2xl md:text-3xl font-bold text-center text-foreground mb-8">
                Our Programmes
              </h2>
              
              <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
                {programmes.map((programme) => (
                  <Link key={programme.title} to={programme.link} className="group">
                    <Card className="p-6 h-full hover:shadow-xl hover:-translate-y-2 transition-all duration-300 hover:border-primary/50">
                      <div className="flex flex-col h-full">
                        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-4 transition-all duration-300 group-hover:bg-primary/20 group-hover:scale-110">
                          <programme.icon className="h-7 w-7 text-primary transition-transform duration-300 group-hover:rotate-12" />
                        </div>
                        
                        <h3 className="text-xl font-semibold mb-3 text-foreground group-hover:text-primary transition-colors">
                          {programme.title}
                        </h3>
                        
                        <p className="text-muted-foreground mb-4 flex-grow">
                          {programme.description}
                        </p>
                        
                        <div className="mt-auto">
                          <p className="text-sm text-primary font-medium mb-4">
                            {programme.schedule}
                          </p>
                          
                          <div className="flex items-center gap-2 text-primary font-medium group-hover:gap-3 transition-all">
                            Learn More
                            <ArrowRight className="h-4 w-4" />
                          </div>
                        </div>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>

            {/* Student Portal Section */}
            <div 
              ref={portalRef as React.RefObject<HTMLDivElement>}
              className={`mt-16 max-w-2xl mx-auto transition-all duration-500 delay-300 ease-out ${
                portalVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
            >
              <Card className="p-8 text-center bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/20 mb-6">
                  <ExternalLink className="h-8 w-8 text-primary" />
                </div>
                
                <h2 className="text-2xl font-bold text-foreground mb-3">
                  Student Portal
                </h2>
                
                <p className="text-muted-foreground mb-6">
                  Access your child's attendance records, track their progress, and stay updated 
                  with their Islamic education journey through our dedicated online portal.
                </p>
                
                <Button 
                  size="lg"
                  className="gap-2"
                  asChild
                >
                <a
                    href="https://app.masjidirshad.co.uk/portal"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Access Portal
                  </a>
                </Button>
              </Card>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Education;