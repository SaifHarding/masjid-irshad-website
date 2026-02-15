import { Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, ArrowLeft } from "lucide-react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const MaktabTerms = () => {
  const { ref: headerRef, isVisible: headerVisible } = useScrollAnimation();
  const { ref: contentRef, isVisible: contentVisible } = useScrollAnimation();

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <section className="py-16 bg-background">
          <div className="container">
            <Button
              variant="ghost"
              size="sm"
              className="mb-6 gap-2 text-muted-foreground hover:text-foreground"
              asChild
            >
              <Link to="/education">
                <ArrowLeft className="h-4 w-4" />
                Back to Education
              </Link>
            </Button>
            <div 
              ref={headerRef as React.RefObject<HTMLDivElement>}
              className={`text-center mb-12 transition-all duration-500 ease-out ${
                headerVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
            >
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
                <FileText className="h-8 w-8 text-primary" />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Terms and Conditions
              </h1>
              <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                Please read these terms carefully before registering for our educational programmes.
              </p>
            </div>

            <div 
              ref={contentRef as React.RefObject<HTMLDivElement>}
              className={`max-w-3xl mx-auto transition-all duration-500 delay-150 ease-out ${
                contentVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
            >
              <Card className="p-8">
                <div className="space-y-6 text-foreground">
                  <div className="space-y-4">
                    <p className="font-medium">
                      I confirm that I have provided accurate information as required and agree to inform the Maktab of any changes. I confirm that I have read, understood, and agree to abide by the Rules and Regulations, and I will support my child in following them.
                    </p>
                    
                    <p>
                      I acknowledge that if my child breaches these Rules and Regulations, he/she may be subject to disciplinary action, including suspension or permanent removal from the Maktab.
                    </p>
                    
                    <p>
                      In the event of any concerns or complaints, I agree to contact the Masjid Trustees, who will make reasonable efforts to resolve the matter.
                    </p>
                    
                    <p className="font-medium">
                      I hereby give my consent for Masjid Irshad to educate my child.
                    </p>
                  </div>
                  
                  <div className="pt-6 border-t">
                    <h2 className="text-xl font-semibold mb-4 text-primary">Rules & Regulations</h2>
                    <ul className="space-y-3 list-disc pl-5 text-muted-foreground">
                      <li>Pupils must attend the Maktab regularly and arrive on time. Parents should inform the Maktab of any absence in advance where possible.</li>
                      <li>Pupils are expected to behave respectfully towards teachers, staff, fellow pupils, and Masjid property at all times.</li>
                      <li>Pupils must follow all instructions given by teachers and staff during Maktab hours.</li>
                      <li>Appropriate Islamic conduct, language, and dress are expected at all times while on the premises.</li>
                      <li>Any form of bullying, abusive language, or physical aggression will not be tolerated.</li>
                      <li>Damage to Masjid or Maktab property may result in disciplinary action, and parents may be held responsible for repair or replacement costs.</li>
                      <li>Mobile phones, electronic devices, or other prohibited items must not be brought to the Maktab unless prior permission has been given.</li>
                      <li>Parents are responsible for ensuring their child is collected promptly at the end of the Maktab session.</li>
                      <li>The Maktab reserves the right to take appropriate disciplinary action, including suspension or permanent removal, in cases of serious or repeated misconduct. No refunds will be provided upon removal.</li>
                    </ul>
                  </div>

                  <div className="pt-6 border-t">
                    <h2 className="text-xl font-semibold mb-4 text-primary">Payment Policy</h2>
                    <ul className="space-y-3 list-disc pl-5 text-muted-foreground">
                      <li>A one-time <strong className="text-foreground">admission fee of £30 per child</strong> is required upon enrolment for all new students.</li>
                      <li>The monthly tuition fee is <strong className="text-foreground">£35.99 per child</strong>, due on the 1st of each month. Alternative payment arrangements may be made by prior agreement with the Masjid administration.</li>
                      <li>Payments are processed securely via <strong className="text-foreground">Stripe</strong>, accepting Apple Pay, Google Pay, debit/credit card, or Direct Debit. Alternative payment methods must be agreed with the Masjid administration prior to enrolment.</li>
                      <li>Full fees are payable regardless of teacher holidays, bank holidays, school holidays, or child absence. No refunds or deductions will be made for missed sessions.</li>
                      <li>Failure to pay fees on time may result in temporary suspension or permanent removal from the Maktab.</li>
                    </ul>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default MaktabTerms;