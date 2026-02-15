import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getBackendClient } from "@/lib/backendClient";
import { getErrorMessage } from "@/lib/errorUtils";
import { toast } from "sonner";
import { TurnstileWidget } from "@/components/TurnstileWidget";
import { AddressLookup } from "@/components/AddressLookup";

interface HifzRegistrationFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const HifzRegistrationForm = ({ open, onOpenChange }: HifzRegistrationFormProps) => {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [studentAge, setStudentAge] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [email, setEmail] = useState("");
  const [previousExperience, setPreviousExperience] = useState<string>("");
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [guardianName, setGuardianName] = useState("");
  const [guardianContact, setGuardianContact] = useState("");
  const [guardianEmail, setGuardianEmail] = useState("");
  const [address, setAddress] = useState("");
  const [town, setTown] = useState("");
  const [postcode, setPostcode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string>("");
  const supabase = getBackendClient();

  const parsedAge = parseInt(studentAge);
  const isMinor = !isNaN(parsedAge) && parsedAge < 18;
  const showAdditionalFields = !isNaN(parsedAge) && parsedAge > 0;

  const resetForm = () => {
    setFirstName("");
    setLastName("");
    setStudentAge("");
    setContactNumber("");
    setEmail("");
    setPreviousExperience("");
    setAdditionalNotes("");
    setGuardianName("");
    setGuardianContact("");
    setGuardianEmail("");
    setAddress("");
    setTown("");
    setPostcode("");
    setTurnstileToken("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate basic required fields
    if (!firstName.trim() || !lastName.trim() || !studentAge) {
      toast.error("Please fill in all required fields.");
      return;
    }

    if (isNaN(parsedAge) || parsedAge < 1) {
      toast.error("Please enter a valid student age.");
      return;
    }

    // Validate previous experience field
    if (!previousExperience) {
      toast.error("Please select previous Quran memorization experience.");
      return;
    }

    // Validate conditional fields based on age
    if (isMinor) {
      if (!guardianName.trim() || !guardianContact.trim() || !guardianEmail.trim() || 
          !address.trim() || !town.trim() || !postcode.trim()) {
        toast.error("Please fill in all required guardian and address information.");
        return;
      }
    } else {
      if (!contactNumber.trim() || !email.trim()) {
        toast.error("Please fill in all required contact information.");
        return;
      }
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

      // Prepare form data based on age
      const formData = isMinor
        ? {
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            studentAge: parsedAge,
            previousExperience: previousExperience === "yes",
            guardianName: guardianName.trim(),
            guardianContact: guardianContact.trim(),
            guardianEmail: guardianEmail.trim(),
            address: address.trim(),
            town: town.trim(),
            postcode: postcode.trim().toUpperCase(),
            additionalNotes: additionalNotes.trim() || undefined,
          }
        : {
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            studentAge: parsedAge,
            previousExperience: previousExperience === "yes",
            contactNumber: contactNumber.trim(),
            email: email.trim(),
            additionalNotes: additionalNotes.trim() || undefined,
          };

      const { error } = await supabase.functions.invoke("register-hifz-student", {
        body: formData,
      });

      if (error) {
        console.error("Registration error:", error);
        throw new Error(error.message || "Registration failed");
      }

      const fullName = `${firstName.trim()} ${lastName.trim()}`;
      toast.success(`Registration for ${fullName} submitted successfully! A confirmation email has been sent. You will be notified upon acceptance with further steps.`, {
        duration: 8000,
      });
      
      resetForm();
      onOpenChange(false);
    } catch (error) {
      console.error("Error submitting form:", error);
      toast.error(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] w-[calc(100vw-2rem)] p-0">
        <DialogHeader className="px-4 pt-6 sm:px-6">
          <DialogTitle>Register for Hifdh al-Qur'an</DialogTitle>
          <DialogDescription>
            Fill in the details below to register your interest
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] px-4 sm:px-6">
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  autoComplete="given-name"
                  enterKeyHint="next"
                  className="min-h-[44px] text-base"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  autoComplete="family-name"
                  enterKeyHint="next"
                  className="min-h-[44px] text-base"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="studentAge">Student Age *</Label>
              <Input
                id="studentAge"
                type="number"
                inputMode="numeric"
                pattern="[0-9]*"
                value={studentAge}
                onChange={(e) => setStudentAge(e.target.value)}
                required
                min="1"
                max="99"
                enterKeyHint="next"
                className="min-h-[44px] text-base"
              />
            </div>

            {showAdditionalFields && (
              <>
                <div className="space-y-3">
                  <Label>Previous Quran Memorization Experience *</Label>
                  <RadioGroup 
                    value={previousExperience} 
                    onValueChange={setPreviousExperience}
                    className="flex flex-row gap-6"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="yes" id="exp-yes" className="min-w-[20px] min-h-[20px]" />
                      <Label htmlFor="exp-yes" className="font-normal cursor-pointer text-base py-2">Yes</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="no" id="exp-no" className="min-w-[20px] min-h-[20px]" />
                      <Label htmlFor="exp-no" className="font-normal cursor-pointer text-base py-2">No</Label>
                    </div>
                  </RadioGroup>
                </div>

                {isMinor ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="guardianName">Guardian Name *</Label>
                      <Input
                        id="guardianName"
                        value={guardianName}
                        onChange={(e) => setGuardianName(e.target.value)}
                        required
                        autoComplete="name"
                        enterKeyHint="next"
                        className="min-h-[44px] text-base"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="guardianContact">Guardian Contact Number *</Label>
                      <Input
                        id="guardianContact"
                        type="tel"
                        inputMode="tel"
                        value={guardianContact}
                        onChange={(e) => setGuardianContact(e.target.value)}
                        required
                        autoComplete="tel"
                        enterKeyHint="next"
                        className="min-h-[44px] text-base"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="guardianEmail">Guardian Email *</Label>
                      <Input
                        id="guardianEmail"
                        type="email"
                        inputMode="email"
                        value={guardianEmail}
                        onChange={(e) => setGuardianEmail(e.target.value)}
                        required
                        autoComplete="email"
                        enterKeyHint="next"
                        className="min-h-[44px] text-base"
                      />
                    </div>

                    <AddressLookup
                      address={address}
                      town={town}
                      postcode={postcode}
                      onAddressChange={setAddress}
                      onTownChange={setTown}
                      onPostcodeChange={setPostcode}
                      required={true}
                      townLabel="Town"
                    />
                  </>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="contactNumber">Contact Number *</Label>
                      <Input
                        id="contactNumber"
                        type="tel"
                        inputMode="tel"
                        value={contactNumber}
                        onChange={(e) => setContactNumber(e.target.value)}
                        required
                        autoComplete="tel"
                        enterKeyHint="next"
                        className="min-h-[44px] text-base"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        inputMode="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoComplete="email"
                        enterKeyHint="next"
                        className="min-h-[44px] text-base"
                      />
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <Label htmlFor="additionalNotes">Additional Notes (Optional)</Label>
                  <Textarea
                    id="additionalNotes"
                    value={additionalNotes}
                    onChange={(e) => setAdditionalNotes(e.target.value)}
                    placeholder="Any additional information you'd like to share..."
                    rows={3}
                    enterKeyHint="done"
                    className="min-h-[88px] text-base resize-none"
                  />
                </div>

                <div className="flex justify-center pt-4">
                  <TurnstileWidget onVerify={setTurnstileToken} />
                </div>
              </>
            )}

            <Button 
              type="submit" 
              className="w-full min-h-[48px] mt-4 text-base font-medium" 
              disabled={isSubmitting || !turnstileToken || !showAdditionalFields}
              tabIndex={0}
            >
              {isSubmitting ? "Submitting..." : "Submit Registration"}
            </Button>
          </form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
