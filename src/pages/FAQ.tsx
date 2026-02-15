import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { toast } from "sonner";
import { getBackendClient } from "@/lib/backendClient";
import { getErrorMessage } from "@/lib/errorUtils";
import { Loader2 } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { TurnstileWidget } from "@/components/TurnstileWidget";
import { useRateLimitRetry } from "@/hooks/useRateLimitRetry";
import { RateLimitAlert } from "@/components/RateLimitAlert";

const FAQ = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    question: "",
  });
  const [turnstileToken, setTurnstileToken] = useState<string>("");
  const { 
    isRateLimited, 
    retryAfterSeconds, 
    errorMessage, 
    handleRateLimitError, 
    formatTimeRemaining 
  } = useRateLimitRetry();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isRateLimited) {
      toast.error("Please wait before submitting again.");
      return;
    }

    // Validate all required fields with trimming
    if (!formData.email.trim() || !formData.question.trim()) {
      toast.error("Please provide your email and question.");
      return;
    }

    if (!turnstileToken) {
      toast.error("Please complete the CAPTCHA verification.");
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = getBackendClient();

      // Verify Turnstile token
      const { data: verifyData, error: verifyError } = await supabase.functions.invoke(
        "verify-turnstile",
        {
          body: { token: turnstileToken },
        },
      );

      if (verifyError || !verifyData?.success) {
        throw new Error("CAPTCHA verification failed");
      }

      const { error } = await supabase.functions.invoke("send-imam-query", {
        body: {
          name: formData.name || "Anonymous",
          email: formData.email,
          question: formData.question,
        },
      });

      if (error) {
        if (handleRateLimitError(error)) {
          toast.error("Too many requests. Please wait before trying again.");
          return;
        }
        throw error;
      }

      toast.success("Question sent! The Imam will respond to your email as soon as possible.");

      setFormData({ name: "", email: "", question: "" });
      setTurnstileToken("");
      setIsOpen(false);
    } catch (error) {
      if (!handleRateLimitError(error)) {
        toast.error(getErrorMessage(error));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const faqs = [
    {
      question: "What are the prayer times at Masjid Irshad?",
      answer: "Prayer times vary throughout the year. Please check our homepage for the current prayer timetable which is updated regularly.",
    },
    {
      question: "Do you offer educational programs?",
      answer: "Yes, we offer several programs including Maktab for children, Alimiyyah Programme for both boys and girls, and Hifdh al-Qur'an classes.",
    },
    {
      question: "Is the masjid open for all five daily prayers?",
      answer: "Yes, the masjid is open from 15 minutes before Fajr prayer until after Isha prayer.",
    },
    {
      question: "Can women attend the masjid?",
      answer: "Currently, there is no available space for women except during Tarawih prayers in Ramadan. Once our new masjid building is complete, there will be a dedicated space for women including prayer facilities, education, and activities.",
    },
  ];

  const fatawahs = [
    {
      question: "What is the ruling on missing Jumu'ah prayer?",
      answer: "Jumu'ah prayer is obligatory for men and missing it without a valid excuse is sinful. Valid excuses include illness, travel, or severe weather conditions.",
    },
    {
      question: "Can I pray at home if the masjid is far?",
      answer: "While praying in congregation at the masjid is highly recommended and rewarded, if the masjid is genuinely far or there are valid difficulties, one may pray at home. However, effort should be made to attend the masjid when possible.",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="container py-20 md:py-32">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-20">
              <h1 className="text-4xl md:text-5xl font-bold text-primary mb-6">
                Frequently Asked Questions
              </h1>
              <p className="text-lg text-muted-foreground mb-10">
                Find answers to common questions or ask the Imam directly
              </p>
              
              <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogTrigger asChild>
                  <Button size="lg" className="bg-primary hover:bg-primary/90">
                    Ask Imam
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>Ask the Imam</DialogTitle>
                    <DialogDescription>
                      Submit your question and the Imam will respond via email
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                    {isRateLimited && (
                      <RateLimitAlert 
                        timeRemaining={formatTimeRemaining(retryAfterSeconds)} 
                        message={errorMessage}
                      />
                    )}
                    <div>
                      <Label htmlFor="name">Name (Optional)</Label>
                      <Input
                        id="name"
                        placeholder="Leave blank to remain anonymous"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">
                        Email <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        required
                        placeholder="your.email@example.com"
                        value={formData.email}
                        onChange={(e) =>
                          setFormData({ ...formData, email: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="question">
                        Your Question <span className="text-destructive">*</span>
                      </Label>
                      <Textarea
                        id="question"
                        required
                        placeholder="Please describe your question in detail..."
                        className="min-h-[120px]"
                        value={formData.question}
                        onChange={(e) =>
                          setFormData({ ...formData, question: e.target.value })
                        }
                      />
                    </div>
                    <div className="flex justify-center">
                      <TurnstileWidget onVerify={setTurnstileToken} />
                    </div>
                    <Button type="submit" disabled={isSubmitting || !turnstileToken} className="w-full">
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        "Send Question"
                      )}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {/* FAQ Section */}
            <section className="mb-28">
              <h2 className="text-3xl font-bold text-primary mb-10">General Questions</h2>
              <Accordion type="single" collapsible className="w-full space-y-4">
                {faqs.map((faq, index) => (
                  <AccordionItem key={index} value={`faq-${index}`} className="border rounded-lg px-6 py-2">
                    <AccordionTrigger className="text-left py-6">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="pb-6">{faq.answer}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </section>

            {/* Fatawah Section */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-primary mb-10">
                Fatawahs (Islamic Rulings)
              </h2>
              <Accordion type="single" collapsible className="w-full space-y-4">
                {fatawahs.map((fatawah, index) => (
                  <AccordionItem key={index} value={`fatawah-${index}`} className="border rounded-lg px-6 py-2">
                    <AccordionTrigger className="text-left py-6">
                      {fatawah.question}
                    </AccordionTrigger>
                    <AccordionContent className="pb-6">{fatawah.answer}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default FAQ;
