import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getBackendClient } from "@/lib/backendClient";
import { toast } from "sonner";
import { TurnstileWidget } from "@/components/TurnstileWidget";
import { useRateLimitRetry } from "@/hooks/useRateLimitRetry";
import { RateLimitAlert } from "@/components/RateLimitAlert";

const Feedback = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [type, setType] = useState("");
  const [comment, setComment] = useState("");
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
    if (!name.trim() || !email.trim() || !type || !comment.trim()) {
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

      const { error } = await supabase.functions.invoke("send-feedback", {
        body: {
          name,
          email,
          type,
          comment,
        },
      });

      if (error) {
        if (handleRateLimitError(error)) {
          toast.error("Too many requests. Please wait before trying again.");
          return;
        }
        throw error;
      }

      toast.success("Feedback submitted! Check your email for confirmation.");
      
      // Reset form
      setName("");
      setEmail("");
      setType("");
      setComment("");
      setTurnstileToken("");
    } catch (error) {
      console.error("Error submitting feedback:", error);
      if (!handleRateLimitError(error)) {
        toast.error("Failed to submit feedback. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-20">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-4xl font-bold mb-4 text-center">Report Bug / Suggest Feature</h1>
          <p className="text-muted-foreground text-center mb-8">
            Help us improve by reporting bugs or suggesting new features
          </p>
          
          <div className="bg-card border rounded-lg p-6 shadow-sm">
            <form onSubmit={handleSubmit} className="space-y-6">
              {isRateLimited && (
                <RateLimitAlert 
                  timeRemaining={formatTimeRemaining(retryAfterSeconds)} 
                  message={errorMessage}
                />
              )}
              <div className="space-y-2">
                <Label htmlFor="name">
                  Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  tabIndex={0}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">
                  Email <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  tabIndex={0}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">
                  Type <span className="text-red-500">*</span>
                </Label>
                <Select value={type} onValueChange={setType} required>
                  <SelectTrigger id="type" tabIndex={0}>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bug" tabIndex={0}>Bug Report</SelectItem>
                    <SelectItem value="feature" tabIndex={0}>Feature Request</SelectItem>
                    <SelectItem value="other" tabIndex={0}>Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="comment">
                  Comment <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={6}
                  placeholder="Please describe your bug report or feature suggestion..."
                  required
                  tabIndex={0}
                />
              </div>

              <div className="flex justify-center">
                <TurnstileWidget onVerify={setTurnstileToken} />
              </div>

              <Button 
                type="submit" 
                className="w-full min-h-[44px]" 
                disabled={isSubmitting || !turnstileToken}
              >
                {isSubmitting ? "Submitting..." : "Submit Feedback"}
              </Button>
            </form>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Feedback;
