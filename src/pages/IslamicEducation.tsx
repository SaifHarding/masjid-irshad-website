import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  GraduationCap,
  Users,
  Clock,
  MapPin,
  CheckCircle2,
  UserCheck,
  School,
  HelpCircle,
  CreditCard,
  ExternalLink,
} from "lucide-react";
import islamicEducationImage from "@/assets/islamic-education.jpg";
import { ProgramRegistrationForm } from "@/components/ProgramRegistrationForm";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
 
const IslamicEducation = () => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState("");
  const [isBillingDialogOpen, setIsBillingDialogOpen] = useState(false);
  const { ref: headerRef, isVisible: headerVisible } = useScrollAnimation();
  const { ref: contentRef, isVisible: contentVisible } = useScrollAnimation();
  const { ref: whyChooseRef, isVisible: whyChooseVisible } = useScrollAnimation();
  const { ref: faqRef, isVisible: faqVisible } = useScrollAnimation();

  const handleRegister = (programName: string) => {
    setSelectedProgram(programName);
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
                headerVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
            >
              <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Alimiyyah Programme</h1>
              <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                Comprehensive Islamic studies and Arabic language education for students aged 11 and above
              </p>
            </div>

            <div className="flex justify-center mb-8">
              <Dialog open={isBillingDialogOpen} onOpenChange={setIsBillingDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    variant="outline"
                    className="gap-2 text-sm border-primary text-primary hover:bg-primary/10"
                    size="sm"
                  >
                    <CreditCard className="h-4 w-4" />
                    Existing Students - Billing
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Select Payment Portal</DialogTitle>
                    <DialogDescription>
                      Choose the appropriate payment portal for your student
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <Button
                      asChild
                      className="w-full h-auto py-4 bg-primary/5 hover:bg-primary/10 border-primary/20 hover:border-primary/40"
                      variant="outline"
                    >
                      <a
                        href="https://billing.stripe.com/p/login/3cI3cw2f4eH6bkk1yJ7EQ01"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2"
                      >
                        <CreditCard className="h-5 w-5 text-primary" />
                        <span className="font-semibold">Boys Alimiyyah Payment Portal</span>
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                    <Button
                      asChild
                      className="w-full h-auto py-4 bg-pink-500/5 hover:bg-pink-500/10 border-pink-500/20 hover:border-pink-500/40"
                      variant="outline"
                    >
                      <a
                        href="https://billing.stripe.com/p/login/fZu7sM7Ab2L63q48UD0kE00"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2"
                      >
                        <CreditCard className="h-5 w-5 text-pink-500" />
                        <span className="font-semibold">Girls Alimiyyah Payment Portal</span>
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="max-w-5xl mx-auto mb-12">
              <img
                src={islamicEducationImage}
                alt="Islamic education with Quran and traditional study materials"
                className="w-full h-[400px] object-cover rounded-lg shadow-lg"
              />
            </div>

            <div 
              ref={contentRef as React.RefObject<HTMLDivElement>}
              className={`transition-all duration-500 delay-150 ease-out ${
                contentVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
            >
              <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto items-start">
                {/* Alimiyyah Programme for Boys Card */}
                <Card className="p-8 hover:shadow-xl hover:-translate-y-2 transition-all duration-300 group hover:border-primary/50 shimmer-card h-full flex flex-col">
                  <div className="flex flex-col items-center text-center flex-1">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6 transition-all duration-300 group-hover:bg-primary/20 group-hover:scale-110">
                      <BookOpen className="h-8 w-8 text-primary transition-transform duration-300 group-hover:rotate-12" />
                    </div>

                    <h2 className="text-2xl font-semibold mb-3 text-foreground">Alimiyyah Programme for Boys</h2>

                    <p className="text-muted-foreground mb-6">
                      In-depth study of Arabic morphology, syntax, and Islamic sciences
                    </p>

                    <div className="space-y-4 mb-8 w-full">
                      <div className="flex items-center justify-center gap-2">
                        <Users className="h-5 w-5 text-primary" />
                        <span className="font-medium text-foreground">Ages 16+</span>
                      </div>
                      <div className="flex items-center justify-center gap-2">
                        <Clock className="h-5 w-5 text-primary" />
                        <span className="text-muted-foreground">Mon & Thur, 8:00 PM - 9:00 PM</span>
                      </div>
                      <div className="flex items-center justify-center gap-2">
                        <MapPin className="h-5 w-5 text-primary" />
                        <span className="text-muted-foreground">Online & Onsite</span>
                      </div>
                    </div>

                    <div className="w-full mb-auto">
                      <h3 className="text-xl font-semibold mb-4 text-foreground">Subjects Covered</h3>
                      <div className="space-y-2 text-left">
                        <div className="p-3 bg-secondary/20 rounded-md">
                          <p className="font-medium text-foreground">Sarf (Morphology)</p>
                          <p className="text-sm text-muted-foreground">
                            Understanding the formation and transformation of Arabic words
                          </p>
                        </div>
                        <div className="p-3 bg-secondary/20 rounded-md">
                          <p className="font-medium text-foreground">Nahwa (Syntax)</p>
                          <p className="text-sm text-muted-foreground">
                            Mastering Arabic grammar and sentence structure
                          </p>
                        </div>
                        <div className="p-3 bg-secondary/20 rounded-md">
                          <p className="font-medium text-foreground">Qasas al-Anbiya</p>
                          <p className="text-sm text-muted-foreground">
                            Stories of the Prophets from authentic Islamic sources
                          </p>
                        </div>
                        <div className="p-3 bg-secondary/20 rounded-md">
                          <p className="font-medium text-foreground">Zad ut-Talibeen</p>
                          <p className="text-sm text-muted-foreground">
                            Essential provisions for seekers of Islamic knowledge
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-auto w-full space-y-6 pt-8">
                      <div className="w-full text-center min-h-[3.5rem] flex items-center justify-center">
                        <p className="text-lg font-medium text-foreground">Taught by Shaykh Zubair</p>
                      </div>

                      <Button
                        className="w-full rounded-full bg-primary hover:bg-primary/90 transition-all duration-300 group-hover:scale-105"
                        size="lg"
                        onClick={() => handleRegister("Alimiyyah Programme for Boys")}
                      >
                        Register Interest
                      </Button>

                      <Button
                        asChild
                        variant="outline"
                        className="w-full gap-2 text-sm"
                        size="sm"
                      >
                        <a
                          href="https://billing.stripe.com/p/login/3cI3cw2f4eH6bkk1yJ7EQ01"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <CreditCard className="h-4 w-4" />
                          Existing Students - Billing
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </Button>
                    </div>
                  </div>
                </Card>

                {/* Alimiyyah Programme for Girls Card */}
                <Card className="p-8 hover:shadow-xl hover:-translate-y-2 transition-all duration-300 group hover:border-pink-accent/50 shimmer-card h-full flex flex-col">
                  <div className="flex flex-col items-center text-center flex-1">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-pink-pale/50 mb-6 transition-all duration-300 group-hover:bg-pink-pale group-hover:scale-110">
                      <GraduationCap className="h-8 w-8 text-pink-accent transition-transform duration-300 group-hover:rotate-12" />
                    </div>

                    <h2 className="text-2xl font-semibold mb-3 text-foreground">Alimiyyah Programme for Girls</h2>

                    <p className="text-muted-foreground mb-6">
                      Structured learning in Arabic grammar and Islamic sciences
                    </p>

                    <div className="space-y-4 mb-8 w-full">
                      <div className="flex items-center justify-center gap-2">
                        <Users className="h-5 w-5 text-pink-accent" />
                        <span className="font-medium text-foreground">Ages 11+</span>
                      </div>
                      <div className="flex items-center justify-center gap-2">
                        <Clock className="h-5 w-5 text-pink-accent" />
                        <span className="text-muted-foreground">Tues & Wed, 5:30 PM - 6:30 PM</span>
                      </div>
                      <div className="flex items-center justify-center gap-2">
                        <MapPin className="h-5 w-5 text-pink-accent" />
                        <span className="text-muted-foreground">Online & Onsite</span>
                      </div>
                    </div>

                    <div className="w-full mb-auto">
                      <h3 className="text-xl font-semibold mb-4 text-foreground">Subjects Covered</h3>
                      <div className="space-y-2 text-left">
                        <div className="p-3 bg-pink-pale/20 rounded-md">
                          <p className="font-medium text-foreground">Arabic (Basic Grammar)</p>
                          <p className="text-sm text-muted-foreground">
                            Foundation in Arabic language and essential grammar rules
                          </p>
                        </div>
                        <div className="p-3 bg-pink-pale/20 rounded-md">
                          <p className="font-medium text-foreground">Beshti Zewar</p>
                          <p className="text-sm text-muted-foreground">Detailed fiqh (rulings) for everyday life</p>
                        </div>
                        <div className="p-3 bg-pink-pale/20 rounded-md">
                          <p className="font-medium text-foreground">Zad ut-Talibeen</p>
                          <p className="text-sm text-muted-foreground">
                            Beginner friendly hadith book covering important essentials
                          </p>
                        </div>
                        <div className="p-3 bg-pink-pale/20 rounded-md">
                          <p className="font-medium text-foreground">Qasas al-Anbiya</p>
                          <p className="text-sm text-muted-foreground">
                            Stories of the Prophets from authentic Islamic sources
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-auto w-full space-y-6 pt-8">
                      <div className="w-full text-center min-h-[3.5rem] flex items-center justify-center">
                        <p className="text-lg font-medium text-foreground">Taught by Ustadha Nurulain Zubair</p>
                      </div>

                      <Button
                        className="w-full rounded-full bg-pink-accent hover:bg-pink-accent/90 text-white transition-all duration-300 group-hover:scale-105"
                        size="lg"
                        onClick={() => handleRegister("Alimiyyah Programme for Girls")}
                      >
                        Register Interest
                      </Button>

                      <Button
                        asChild
                        variant="outline"
                        className="w-full gap-2 text-sm border-pink-500/20 hover:bg-pink-500/5 hover:border-pink-500/40"
                        size="sm"
                      >
                        <a
                          href="https://billing.stripe.com/p/login/fZu7sM7Ab2L63q48UD0kE00"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <CreditCard className="h-4 w-4 text-pink-500" />
                          Existing Students - Billing
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </Button>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Why Choose Section */}
              <div 
                ref={whyChooseRef as React.RefObject<HTMLDivElement>}
                className={`mt-16 max-w-4xl mx-auto transition-all duration-500 delay-200 ease-out ${
                  whyChooseVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                }`}
              >
                <h2 className="text-3xl font-bold text-center text-foreground mb-8">
                  Why Choose Our Alimiyyah Programme?
                </h2>
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="p-6 bg-secondary/10 rounded-lg hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
                      <UserCheck className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2 text-foreground">Qualified Teachers</h3>
                    <p className="text-muted-foreground">
                      Professional and qualified instructors with deep knowledge of Islamic sciences
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
                    <h3 className="text-lg font-semibold mb-2 text-foreground">Comprehensive Curriculum</h3>
                    <p className="text-muted-foreground">
                      Structured program covering essential Islamic sciences and Arabic grammar
                    </p>
                  </div>
                </div>
              </div>

              {/* FAQ Section */}
              <div 
                ref={faqRef as React.RefObject<HTMLDivElement>}
                className={`mt-16 max-w-3xl mx-auto transition-all duration-500 delay-300 ease-out ${
                  faqVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                }`}
              >
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
                    <HelpCircle className="h-6 w-6 text-primary" />
                  </div>
                  <h2 className="text-3xl font-bold text-foreground">Frequently Asked Questions</h2>
                </div>

                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="item-1">
                    <AccordionTrigger className="text-lg font-semibold text-left">
                      Are the classes segregated?
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">
                      Yes, our classes are fully segregated. Boys and girls attend classes in separate rooms within the
                      mosque and are scheduled on different days to ensure complete privacy and focus on learning.
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-2">
                    <AccordionTrigger className="text-lg font-semibold text-left">
                      How long does the programme take to complete?
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">
                      The duration varies based on the student's learning goals and pace. For foundational knowledge,
                      students typically complete the basics within 1-2 years. Students who wish to graduate with an
                      Alim/Alimah degree, must complete the full 6 year programme.
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-3">
                    <AccordionTrigger className="text-lg font-semibold text-left">
                      Are online classes available?
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">
                      Yes, we offer online classes for students who cannot attend in person. Additionally, class
                      recordings are available upon request, allowing students to review lessons at their own pace.
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
      <ProgramRegistrationForm open={isFormOpen} onOpenChange={setIsFormOpen} programName={selectedProgram} />
    </div>
  );
};

export default IslamicEducation;
