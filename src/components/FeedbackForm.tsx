import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

interface FeedbackFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const FeedbackForm = ({ open, onOpenChange }: FeedbackFormProps) => {
  const supabase = getBackendClient();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [type, setType] = useState("");
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string>("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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
      // Verify Turnstile token
      const { data: verifyData, error: verifyError } = await supabase.functions.invoke('verify-turnstile', {
        body: { token: turnstileToken }
      });

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

      if (error) throw error;

      toast.success("Feedback submitted! Check your email for confirmation.");
      
      // Reset form
      setName("");
      setEmail("");
      setType("");
      setComment("");
      setTurnstileToken("");
      onOpenChange(false);
    } catch (error) {
      console.error("Error submitting feedback:", error);
      toast.error("Failed to submit feedback. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] w-[calc(100vw-2rem)] p-0">
        <DialogHeader className="px-4 pt-6 sm:px-6">
          <DialogTitle>Report Bug / Suggest Feature</DialogTitle>
          <DialogDescription>
            Help us improve by reporting bugs or suggesting new features
          </DialogDescription>
        </DialogHeader>
        <div className="px-4 sm:px-6 py-4 space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
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
      </DialogContent>
    </Dialog>
  );
};
