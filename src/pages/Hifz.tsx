import { useState } from "react";
import { Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  Users,
  Clock,
  MapPin,
  CheckCircle2,
  UserCheck,
  School,
  User,
  BookCheck,
  ExternalLink,
} from "lucide-react";
import hifzQuranImage from "@/assets/hifz-quran-reading.jpg";
import { HifzRegistrationForm } from "@/components/HifzRegistrationForm";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const Hifz = () => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const { ref: headerRef, isVisible: headerVisible } = useScrollAnimation();
  const { ref: contentRef, isVisible: contentVisible } = useScrollAnimation();
  const { ref: whyChooseRef, isVisible: whyChooseVisible } = useScrollAnimation();
  const { ref: hadithRef, isVisible: hadithVisible } = useScrollAnimation();

  const handleRegister = () => {
    setIsFormOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <section className="py-16 bg-background">
          <div className="container">
            <div
              ref={headerRef as React.RefObject<HTMLDivElement>}
              className={`text-center mb-12 transition-all duration-500 ease-out ${
                headerVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              }`}
            >
              <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Hifdh al-Qur'an</h1>
              <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                Memorisation of the Holy Qur'an with expert guidance and structured support
              </p>
            </div>

            <div
              ref={contentRef as React.RefObject<HTMLDivElement>}
              className={`transition-all duration-500 delay-150 ease-out ${
                contentVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              }`}
            >
              <div className="max-w-5xl mx-auto mb-12">
                <img
                  src={hifzQuranImage}
                  alt="Man reading the Holy Quran in a mosque"
                  className="w-full h-[400px] object-cover rounded-lg shadow-lg"
                />
              </div>

              <div className="max-w-3xl mx-auto">
                <Card className="p-8 hover:shadow-xl hover:-translate-y-2 transition-all duration-300 group hover:border-primary/50 shimmer-card">
                  <div className="flex flex-col items-center text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6 transition-all duration-300 group-hover:bg-primary/20 group-hover:scale-110">
                      <BookOpen className="h-8 w-8 text-primary transition-transform duration-300 group-hover:rotate-12" />
                    </div>

                    <h2 className="text-2xl font-semibold mb-3 text-foreground">Hifdh al-Qur'an Programme</h2>

                    <p className="text-muted-foreground mb-6">
                      Structured Qur'an memorisation programme with experienced teachers
                    </p>

                    <div className="space-y-4 mb-8 w-full">
                      <div className="flex items-center justify-center gap-2">
                        <Users className="h-5 w-5 text-primary" />
                        <span className="font-medium text-foreground">All Ages</span>
                      </div>
                      <div className="flex items-center justify-center gap-2">
                        <User className="h-5 w-5 text-primary" />
                        <span className="text-muted-foreground">Males Only</span>
                      </div>
                      <div className="flex items-center justify-center gap-2">
                        <Clock className="h-5 w-5 text-primary" />
                        <span className="text-muted-foreground">Mon-Thurs, 5:00 PM - 6:30 PM</span>
                      </div>
                      <div className="flex items-center justify-center gap-2">
                        <MapPin className="h-5 w-5 text-primary" />
                        <span className="text-muted-foreground">Onsite</span>
                      </div>
                      <div className="flex items-center justify-center gap-2">
                        <BookCheck className="h-5 w-5 text-accent" />
                        <span className="text-muted-foreground">Prerequisite: Fluent reading of Qur'an</span>
                      </div>
                    </div>

                    <div className="w-full mb-8">
                      <h3 className="text-xl font-semibold mb-4 text-foreground">What to Expect</h3>
                      <div className="space-y-2 text-left">
                        <div className="p-3 bg-secondary/20 rounded-md">
                          <p className="font-medium text-foreground">Structured Memorisation</p>
                          <p className="text-sm text-muted-foreground">
                            Systematic approach to memorising the Qur'an with daily revision
                          </p>
                        </div>
                        <div className="p-3 bg-secondary/20 rounded-md">
                          <p className="font-medium text-foreground">Expert Guidance</p>
                          <p className="text-sm text-muted-foreground">
                            One-on-one attention and personalized feedback from experienced teachers
                          </p>
                        </div>
                        <div className="p-3 bg-secondary/20 rounded-md">
                          <p className="font-medium text-foreground">Regular Assessment</p>
                          <p className="text-sm text-muted-foreground">
                            Ongoing progress tracking and support throughout your journey
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="w-full space-y-6">
                      <div className="w-full text-center min-h-[3.5rem] flex items-center justify-center">
                        <p className="text-lg font-medium text-foreground">Taught by Maulana Aazib</p>
                      </div>

                      <Button
                        className="w-full rounded-full bg-primary hover:bg-primary/90 transition-all duration-300 group-hover:scale-105"
                        size="lg"
                        onClick={handleRegister}
                      >
                        Register Interest
                      </Button>

                      <Button 
                        variant="outline"
                        className="w-full rounded-full gap-2 text-sm border-primary text-primary hover:bg-primary/10"
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

                      <div className="pt-2">
                        <Link 
                          to="/terms" 
                          className="text-sm text-muted-foreground hover:text-primary hover:underline transition-colors"
                        >
                          Terms & Conditions
                        </Link>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Why Choose Section */}
              <div
                ref={whyChooseRef as React.RefObject<HTMLDivElement>}
                className={`mt-16 max-w-4xl mx-auto transition-all duration-500 delay-200 ease-out ${
                  whyChooseVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                }`}
              >
                <h2 className="text-3xl font-bold text-center text-foreground mb-8">
                  Why Choose Our Hifdh Programme?
                </h2>
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="p-6 bg-secondary/10 rounded-lg hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
                      <UserCheck className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2 text-foreground">Experienced Teacher</h3>
                    <p className="text-muted-foreground">
                      Learn from Maulana Aazib, a qualified and experienced Qur'an teacher
                    </p>
                  </div>

                  <div className="p-6 bg-secondary/10 rounded-lg hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
                      <School className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2 text-foreground">Small Classes</h3>
                    <p className="text-muted-foreground">
                      Intimate class sizes ensuring personalised attention for every student
                    </p>
                  </div>

                  <div className="p-6 bg-secondary/10 rounded-lg hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
                      <CheckCircle2 className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2 text-foreground">Proven Methodology</h3>
                    <p className="text-muted-foreground">
                      Time-tested memorisation techniques combined with regular revision
                    </p>
                  </div>
              </div>
            </div>

            {/* Hadith Quote Section */}
            <div
              ref={hadithRef as React.RefObject<HTMLDivElement>}
              className={`mt-16 max-w-4xl mx-auto transition-all duration-500 delay-300 ease-out ${
                hadithVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              }`}
            >
              <div className="relative p-8 md:p-12 bg-gradient-to-br from-primary/5 to-primary/10 rounded-2xl border border-primary/20 shadow-lg overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-16 translate-x-16"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-primary/5 rounded-full translate-y-12 -translate-x-12"></div>
                
                <div className="relative z-10">
                  <div className="text-6xl text-primary/30 mb-4 font-serif">"</div>
                  <blockquote className="space-y-4">
                    <p className="text-xl md:text-2xl font-medium text-foreground leading-relaxed text-center">
                      Recite the Qur'an, for it will come on the Day of Resurrection as an intercessor for its companions.
                    </p>
                    <div className="pt-4 flex flex-col items-center gap-2">
                      <p className="text-base text-muted-foreground font-medium">
                        — The Prophet ﷺ
                      </p>
                      <p className="text-sm text-muted-foreground italic">
                        Ṣaḥīḥ Muslim, 804
                      </p>
                    </div>
                  </blockquote>
                  <div className="text-6xl text-primary/30 mt-4 font-serif text-right">"</div>
                </div>
              </div>
            </div>

            {/* FAQ Section */}
              <div className="mt-16 max-w-4xl mx-auto">
                <h2 className="text-3xl font-bold text-center text-foreground mb-8">
                  Frequently Asked Questions
                </h2>
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="item-1">
                    <AccordionTrigger className="text-left">
                      Are there Hifdh classes available for females?
                    </AccordionTrigger>
                    <AccordionContent>
                      We currently do not offer Hifdh classes for females. However, if you are interested in joining a future female class, please reach out to us via our <Link to="/contact" className="text-primary hover:underline">contact form</Link> to register your interest.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="item-2">
                    <AccordionTrigger className="text-left">
                      Can I enrol if I only want to memorise Juz ʿAmma (30th Juz)?
                    </AccordionTrigger>
                    <AccordionContent>
                      Yes, absolutely! We offer a dedicated learning path for Juz ʿAmma, the 30th and final section of the Qur'an. This is ideal for beginners as the surahs are shorter, rhythmic, and easier to memorise, making it a perfect starting point for your Hifdh journey.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="item-3">
                    <AccordionTrigger className="text-left">
                      Are online classes available?
                    </AccordionTrigger>
                    <AccordionContent>
                      Online classes are not currently offered for the Hifdh programme. If you would like to express interest in future online classes, please get in touch with us via our <Link to="/contact" className="text-primary hover:underline">contact form</Link>.
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
      <HifzRegistrationForm open={isFormOpen} onOpenChange={setIsFormOpen} />
    </div>
  );
};

export default Hifz;
