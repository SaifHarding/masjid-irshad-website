import { Card } from "@/components/ui/card";
import { Heart, Users, BookOpen } from "lucide-react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const About = () => {
  const { ref: headerRef, isVisible: headerVisible } = useScrollAnimation();
  const { ref: cardsRef, isVisible: cardsVisible } = useScrollAnimation();
  const values = [
    {
      icon: Heart,
      title: "Community",
      description: "Building strong bonds and supporting one another in faith and daily life",
    },
    {
      icon: Users,
      title: "Unity",
      description: "Bringing together Muslims and our wider community in peace and understanding",
    },
    {
      icon: BookOpen,
      title: "Knowledge",
      description: "Promoting Islamic education based on the Quran and Sunnah",
    },
  ];

  return (
    <section id="about" className="py-16">
      <div className="container">
        <div 
          ref={headerRef as React.RefObject<HTMLDivElement>}
          className={`text-center mb-12 transition-all duration-1000 ease-out ${
            headerVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
          }`}
        >
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Welcome to Masjid Irshad
          </h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            Assalamu alaykum! Masjid Irshad is dedicated to serving and educating the Luton Muslim community. 
            We provide a welcoming place of worship, learning, and unity, committed to preserving Islamic 
            identity based on the Holy Quran and the Sunnah of Prophet Muhammad (peace be upon him).
          </p>
        </div>

        <div 
          ref={cardsRef as React.RefObject<HTMLDivElement>}
          className={`grid md:grid-cols-3 gap-6 max-w-5xl mx-auto transition-all duration-1000 delay-300 ease-out ${
            cardsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
          }`}
        >
          {values.map((value) => {
            const Icon = value.icon;
            return (
              <Card key={value.title} className="p-6 text-center hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-4 transition-transform duration-300 group-hover:scale-110">
                  <Icon className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-foreground">{value.title}</h3>
                <p className="text-muted-foreground">{value.description}</p>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default About;
