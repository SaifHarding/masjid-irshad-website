import { Card } from "@/components/ui/card";
import { MapPin, Phone, Mail, Clock } from "lucide-react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const Contact = () => {
  const { ref: headerRef, isVisible: headerVisible } = useScrollAnimation();
  const { ref: cardsRef, isVisible: cardsVisible } = useScrollAnimation();

  return (
    <section id="contact" className="py-16 bg-secondary/30">
      <div className="container">
        <div 
          ref={headerRef as React.RefObject<HTMLDivElement>}
          className={`text-center mb-12 transition-all duration-1000 ease-out ${
            headerVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
          }`}
        >
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Contact Us
          </h2>
          <p className="text-lg text-muted-foreground">
            We'd love to hear from you. Feel free to reach out with any questions.
          </p>
        </div>

        <div 
          ref={cardsRef as React.RefObject<HTMLDivElement>}
          className={`max-w-4xl mx-auto grid md:grid-cols-2 gap-8 transition-all duration-1000 delay-300 ease-out ${
            cardsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
          }`}
        >
          <Card className="p-8">
            <h3 className="text-xl font-semibold mb-6 text-foreground">Get in Touch</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <MapPin className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                <div>
                  <p className="font-medium text-foreground">Address</p>
                  <p className="text-muted-foreground">
                    123 Mosque Street<br />
                    City, Postcode
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <Phone className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                <div>
                  <p className="font-medium text-foreground">Phone</p>
                  <p className="text-muted-foreground">+44 123 456 7890</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <Mail className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                <div>
                  <p className="font-medium text-foreground">Email</p>
                  <p className="text-muted-foreground">info@masjidirshad.org</p>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-8">
            <h3 className="text-xl font-semibold mb-6 text-foreground">Opening Hours</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <Clock className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-medium text-foreground mb-3">Daily Prayer Times</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Fajr - Isha</span>
                      <span className="font-medium text-foreground">Open for all prayers</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Friday</span>
                      <span className="font-medium text-foreground">Jumu'ah 12:30 & 01:15</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default Contact;
