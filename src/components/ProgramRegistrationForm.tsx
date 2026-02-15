import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getBackendClient } from "@/lib/backendClient";
import { toast } from "sonner";
import { TurnstileWidget } from "@/components/TurnstileWidget";
import { AddressLookup } from "@/components/AddressLookup";

interface ProgramRegistrationFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  programName: string;
}

export const ProgramRegistrationForm = ({
  open,
  onOpenChange,
  programName,
}: ProgramRegistrationFormProps) => {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [studentAge, setStudentAge] = useState("");
  const [educationLevel, setEducationLevel] = useState("");
  const [parentName, setParentName] = useState("");
  const [address, setAddress] = useState("");
  const [town, setTown] = useState("");
  const [postcode, setPostcode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string>("");
  const supabase = getBackendClient();

  const isMinor = studentAge ? parseInt(studentAge) < 18 : false;
  const isGirlsProgram = programName.toLowerCase().includes("girl");
  const parentLabel = isGirlsProgram ? "Mother's/Guardian's" : "Father's/Guardian's";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all required fields
    if (!firstName.trim() || !lastName.trim() || !studentAge) {
      toast.error("Please fill in all required fields.");
      return;
    }

    // Check if age field has at least 2 digits for progressive disclosure
    if (studentAge.length < 2) {
      toast.error("Please enter a valid student age.");
      return;
    }

    // Validate conditional fields shown after age is entered
    if (!phone.trim() || !email.trim() || !educationLevel.trim()) {
      toast.error("Please fill in all required fields.");
      return;
    }

    // Validate additional fields for minors
    if (isMinor) {
      if (!parentName.trim() || !address.trim() || !town.trim() || !postcode.trim()) {
        toast.error("Please fill in all required parent/guardian and address information.");
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

      const { error } = await supabase.functions.invoke("send-program-registration", {
        body: {
          formSource: "Program Registration",
          firstName,
          lastName,
          email,
          phone,
          studentAge,
          educationLevel,
          programName,
          parentName: isMinor ? parentName : undefined,
          address: isMinor ? address : undefined,
          town: isMinor ? town : undefined,
          postcode: isMinor ? postcode : undefined,
        },
      });

      if (error) throw error;

      toast.success("Registration submitted! We'll be in touch soon.");

      // Reset form and close dialog
      setFirstName("");
      setLastName("");
      setEmail("");
      setPhone("");
      setStudentAge("");
      setEducationLevel("");
      setParentName("");
      setAddress("");
      setTown("");
      setPostcode("");
      setTurnstileToken("");
      onOpenChange(false);
    } catch (error) {
      console.error("Error submitting registration:", error);
      toast.error("Failed to submit registration. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] w-[calc(100vw-2rem)] p-0">
        <DialogHeader className="px-4 pt-6 sm:px-6">
          <DialogTitle>Register Interest</DialogTitle>
          <DialogDescription>
            Complete this form to register your interest in {programName}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] px-4 sm:px-6">
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 sm:gap-6 py-4">
            <div className="grid gap-2">
              <Label htmlFor="firstName">
                Student First Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="lastName">
                Student Last Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="studentAge">
                Student Age <span className="text-red-500">*</span>
              </Label>
              <Input
                id="studentAge"
                type="number"
                value={studentAge}
                onChange={(e) => setStudentAge(e.target.value)}
                required
              />
            </div>
            {studentAge.length >= 2 && (
              <>
                {isMinor && (
                  <>
                    <div className="grid gap-2">
                      <Label htmlFor="parentName">
                        {parentLabel} Name <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="parentName"
                        value={parentName}
                        onChange={(e) => setParentName(e.target.value)}
                        required
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
                )}
                <div className="grid gap-2">
                  <Label htmlFor="phone">
                    {isMinor ? `${parentLabel} Contact Number` : "Contact Number"} <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">
                    {isMinor ? `${parentLabel} Email` : "Email"} <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="educationLevel">
                    Current Level of Islamic Education <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="educationLevel"
                    value={educationLevel}
                    onChange={(e) => setEducationLevel(e.target.value)}
                    placeholder="(e.g. Maktab, Arabic courses, Islamic studies)"
                    required
                  />
                </div>
              </>
            )}
          </div>
            <div className="flex justify-center py-4">
              <TurnstileWidget onVerify={setTurnstileToken} />
            </div>
          </form>
        </ScrollArea>
        <DialogFooter className="px-4 pb-6 sm:px-6">
          <Button type="submit" disabled={isSubmitting || !turnstileToken} className="w-full sm:w-auto min-h-[44px]" onClick={(e) => {
            e.preventDefault();
            const form = e.currentTarget.closest('form');
            if (form) {
              form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
            }
          }}>
            {isSubmitting ? "Submitting..." : "Submit Registration"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
