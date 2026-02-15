import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Users, GraduationCap } from "lucide-react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const Education = () => {
  const { ref: headerRef, isVisible: headerVisible } = useScrollAnimation();
  const { ref: cardsRef, isVisible: cardsVisible } = useScrollAnimation();
  const { ref: whyRef, isVisible: whyVisible } = useScrollAnimation();
  const classes = [
    {
      title: "Maktab for Boys",
      description: "Quran recitation, Arabic language, and Islamic studies for young boys",
      age: "Ages 5-16",
      schedule: "Monday - Friday, 5:00 PM - 7:00 PM",
      icon: BookOpen,
      emailSubject: "Maktab Registration - Maktab for Boys",
    },
    {
      title: "Maktab for Girls",
      description: "Quran recitation, Arabic language, and Islamic studies for young girls",
      age: "Ages 5-16",
      schedule: "Monday - Friday, 5:00 PM - 7:00 PM",
      icon: GraduationCap,
      emailSubject: "Maktab Registration - Maktab for Girls",
    },
    {
      title: "Islamic Sciences for Boys",
      description: "Sarf (Morphology), Nahwa (Syntax), Qasas al-Anbiya & Zad ut-Talibeen",
      age: "Ages 11+",
      schedule: "Mondays & Thursdays, 8:00 PM - 9:00 PM",
      icon: BookOpen,
      location: "Online & Onsite",
      teacher: "Taught by Shaykh Zubair",
      emailSubject: "Islamic Sciences Interest",
      buttonText: "Register Interest",
    },
    {
      title: "Alimiyyah Programme for Girls",
      description: "Arabic (basic grammar), Usul al-Hadith, Zad ut-Talibeen",
      age: "Ages 11+",
      schedule: "Tuesdays & Wednesdays, 5:00 PM - 6:00 PM",
      icon: GraduationCap,
      location: "Online & Onsite",
      teacher: "Taught by Ustadha Nurulain",
      emailSubject: "Alimiyyah Programme Interest",
      buttonText: "Register Interest",
    },
  ];

  const handleRegister = (emailSubject: string) => {
    window.location.href = `mailto:info@masjidirshad.co.uk?subject=${emailSubject}`;
  };

  return (
    <section id="education" className="py-16 bg-background">
      <div className="container">
        <div 
          ref={headerRef as React.RefObject<HTMLDivElement>}
          className={`text-center mb-12 transition-all duration-1000 ease-out ${
            headerVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
          }`}
        >
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Islamic Education
          </h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            Nurturing the next generation with comprehensive Islamic education, 
            Quranic studies, and Arabic language instruction.
          </p>
        </div>

        <div 
          ref={cardsRef as React.RefObject<HTMLDivElement>}
          className={`grid md:grid-cols-2 gap-8 max-w-5xl mx-auto transition-all duration-1000 delay-300 ease-out ${
            cardsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
          }`}
        >
          {classes.map((classInfo) => {
            const Icon = classInfo.icon;
            return (
              <Card key={classInfo.title} className="p-8 hover:shadow-xl hover:-translate-y-2 transition-all duration-300 group hover:border-primary/50 shimmer-card">
                <div className="flex flex-col items-center text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6 transition-all duration-300 group-hover:bg-primary/20 group-hover:scale-110">
                    <Icon className="h-8 w-8 text-primary transition-transform duration-300 group-hover:rotate-12" />
                  </div>
                  
                  <h3 className="text-2xl font-semibold mb-3 text-foreground">
                    {classInfo.title}
                  </h3>
                  
                  <p className="text-muted-foreground mb-4">
                    {classInfo.description}
                  </p>
                  
                  <div className="space-y-2 mb-6 w-full">
                    <div className="flex items-center justify-center gap-2 text-sm">
                      <Users className="h-4 w-4 text-primary" />
                      <span className="font-medium text-foreground">{classInfo.age}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{classInfo.schedule}</p>
                    {classInfo.location && (
                      <p className="text-sm text-muted-foreground">{classInfo.location}</p>
                    )}
                    {classInfo.teacher && (
                      <p className="text-sm font-medium text-foreground">{classInfo.teacher}</p>
                    )}
                  </div>
                  
                  <Button 
                    className="w-full bg-primary hover:bg-primary/90 transition-all duration-300 group-hover:scale-105"
                    size="lg"
                    onClick={() => handleRegister(classInfo.emailSubject)}
                  >
                    {classInfo.buttonText || "Register Now"}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>

        <div 
          ref={whyRef as React.RefObject<HTMLDivElement>}
          className={`mt-12 text-center transition-all duration-1000 delay-500 ease-out ${
            whyVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
          }`}
        >
          <Card className="p-8 max-w-2xl mx-auto bg-secondary/30">
            <h3 className="text-xl font-semibold mb-3 text-foreground">
              Why Choose Our Maktab?
            </h3>
            <div className="space-y-2 text-muted-foreground">
              <p>✓ Qualified and experienced teachers</p>
              <p>✓ Small class sizes for personalized attention</p>
              <p>✓ Comprehensive curriculum based on authentic sources</p>
              <p>✓ Safe and nurturing learning environment</p>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default Education;
