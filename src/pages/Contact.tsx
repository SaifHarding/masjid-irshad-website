import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { MapPin, Clock } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getBackendClient } from "@/lib/backendClient";
import { toast } from "sonner";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { TurnstileWidget } from "@/components/TurnstileWidget";
import { useRateLimitRetry } from "@/hooks/useRateLimitRetry";
import { RateLimitAlert } from "@/components/RateLimitAlert";

const Contact = () => {
  const { ref: headerRef, isVisible: headerVisible } = useScrollAnimation();
  const { ref: cardsRef, isVisible: cardsVisible } = useScrollAnimation();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
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
    
    // Validate all required fields
    if (!formData.name.trim() || !formData.email.trim() || !formData.phone.trim() || 
        !formData.subject.trim() || !formData.message.trim()) {
      toast.error("Please fill in all required fields.");
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

      const { error } = await supabase.functions.invoke("send-contact-confirmation", {
        body: formData,
      });

      if (error) {
        if (handleRateLimitError(error)) {
          toast.error("Too many requests. Please wait before trying again.");
          return;
        }
        throw error;
      }

      toast.success("Message sent! Check your email for confirmation.");
      setFormData({ name: "", email: "", phone: "", subject: "", message: "" });
      setTurnstileToken("");
    } catch (error) {
      console.error("Error sending message:", error);
      if (!handleRateLimitError(error)) {
        toast.error("Failed to send message. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-20">
        <div 
          ref={headerRef as React.RefObject<HTMLDivElement>}
          className={`text-center mb-12 transition-all duration-700 ${
            headerVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <h1 className="text-4xl font-bold text-foreground mb-4">Contact Us</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Get in touch with us for any inquiries or questions
          </p>
        </div>

        <div 
          ref={cardsRef as React.RefObject<HTMLDivElement>}
          className={`grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12 transition-all duration-700 delay-200 ${
            cardsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="lg:col-span-2">
            <Card className="h-full">
              <CardHeader>
                <CardTitle>Send us a Message</CardTitle>
                <CardDescription>We'll get back to you as soon as possible</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {isRateLimited && (
                    <RateLimitAlert 
                      timeRemaining={formatTimeRemaining(retryAfterSeconds)} 
                      message={errorMessage}
                    />
                  )}
                  <div>
                    <Label htmlFor="name">
                      Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">
                      Email <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">
                      Phone Number <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="subject">
                      Subject <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="subject"
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="message">
                      Message <span className="text-destructive">*</span>
                    </Label>
                    <Textarea
                      id="message"
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      rows={6}
                      required
                    />
                  </div>
                  <div className="flex justify-center">
                    <TurnstileWidget onVerify={setTurnstileToken} />
                  </div>
                  <Button type="submit" className="w-full" disabled={isSubmitting || !turnstileToken}>
                    {isSubmitting ? "Sending..." : "Send Message"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-1">
            <Card className="h-full">
              <CardHeader>
                <CardTitle>Find Us</CardTitle>
                <CardDescription>Masjid Irshad Location</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="w-full h-[400px] rounded-lg overflow-hidden">
                  <iframe
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d611.3652287717907!2d-0.45487!3d51.8851152!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x4876490050031d1f%3A0x20e2723f48c25348!2sMusallah%20%26%20Community%20Centre!5e0!3m2!1sen!2suk!4v1234567890123!5m2!1sen!2suk"
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title="Masjid Irshad Location"
                  />
                </div>
                <div className="pt-2 grid md:grid-cols-2 gap-6">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <MapPin className="w-4 h-4 text-primary" />
                      <p className="font-semibold text-foreground">Address</p>
                    </div>
                    <p className="text-muted-foreground text-sm">
                      Masjid Irshad<br />
                      400 Dallow Rd<br />
                      Luton, LU1 1UR
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="w-4 h-4 text-primary" />
                      <p className="font-semibold text-foreground">Opening Hours</p>
                    </div>
                    <p className="text-muted-foreground text-sm">
                      Open daily from<br />
                      15 minutes before Fajr<br />
                      until Isha prayer
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Contact;
