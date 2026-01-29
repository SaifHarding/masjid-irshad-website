import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getBackendClient } from "@/lib/backendClient";
import { getErrorMessage } from "@/lib/errorUtils";
import { toast } from "sonner";
import { TurnstileWidget } from "@/components/TurnstileWidget";
import { AddressLookup } from "@/components/AddressLookup";

interface StudentRegistrationFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const StudentRegistrationForm = ({ open, onOpenChange }: StudentRegistrationFormProps) => {
  const supabase = getBackendClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  // Form fields
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [placeOfBirth, setPlaceOfBirth] = useState("");
  const [gender, setGender] = useState("");
  const [address, setAddress] = useState("");
  const [townCity, setTownCity] = useState("");
  const [postcode, setPostcode] = useState("");
  
  const [fatherMobile, setFatherMobile] = useState("");
  const [email, setEmail] = useState("");
  const [guardianName, setGuardianName] = useState("");
  const [ethnicOrigin, setEthnicOrigin] = useState("");

  const resetForm = () => {
    setFirstName("");
    setMiddleName("");
    setLastName("");
    setDateOfBirth("");
    setPlaceOfBirth("");
    setGender("");
    setAddress("");
    setTownCity("");
    setPostcode("");
    
    setFatherMobile("");
    setEmail("");
    setGuardianName("");
    setEthnicOrigin("");
    setTurnstileToken(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!firstName || !lastName || !dateOfBirth || !placeOfBirth || !gender || 
        !address || !townCity || !postcode || !fatherMobile || !email || !guardianName) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!turnstileToken) {
      toast.error("Please complete the CAPTCHA verification");
      return;
    }

    setIsSubmitting(true);

    try {
      // Verify turnstile token first
      const { data: turnstileData, error: turnstileError } = await supabase.functions.invoke('verify-turnstile', {
        body: { token: turnstileToken }
      });

      if (turnstileError || !turnstileData?.success) {
        toast.error("CAPTCHA verification failed. Please try again.");
        setTurnstileToken(null);
        setIsSubmitting(false);
        return;
      }

      // Submit registration
      const { data, error } = await supabase.functions.invoke('register-student', {
        body: {
          firstName,
          middleName: middleName || undefined,
          lastName,
          dateOfBirth,
          placeOfBirth,
          gender,
          address,
          townCity,
          postcode,
          
          fatherMobile,
          email,
          guardianName,
          ethnicOrigin: ethnicOrigin || undefined,
        }
      });

      if (error) {
        console.error('Registration error:', error);
        toast.error(error.message || "Registration failed. Please try again.");
        return;
      }

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      const fullName = middleName ? `${firstName} ${middleName} ${lastName}` : `${firstName} ${lastName}`;
      toast.success(`Registration for ${fullName} submitted successfully! A confirmation email has been sent. You will be notified upon acceptance with further steps.`, {
        duration: 8000,
      });
      resetForm();
      onOpenChange(false);
    } catch (error) {
      console.error('Registration error:', error);
      toast.error(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[95vh] sm:max-h-[90vh] p-4 sm:p-6">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-xl sm:text-2xl font-bold text-primary">Student Registration</DialogTitle>
          <DialogDescription className="text-sm">
            Please fill in all required fields to register a new student.
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="max-h-[calc(95vh-120px)] sm:max-h-[70vh] pr-2 sm:pr-4">
          <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6 py-2 sm:py-4">
            {/* Personal Information */}
            <div className="space-y-3 sm:space-y-4">
              <h3 className="font-semibold text-base sm:text-lg border-b pb-2">Student Information</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="firstName" className="text-sm">First Name *</Label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    className="h-10 sm:h-9"
                  />
                </div>
                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="middleName" className="text-sm">Middle Name</Label>
                  <Input
                    id="middleName"
                    value={middleName}
                    onChange={(e) => setMiddleName(e.target.value)}
                    className="h-10 sm:h-9"
                  />
                </div>
                <div className="space-y-1.5 sm:space-y-2 sm:col-span-2 md:col-span-1">
                  <Label htmlFor="lastName" className="text-sm">Last Name *</Label>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    className="h-10 sm:h-9"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="dateOfBirth" className="text-sm">Date of Birth *</Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    required
                    className="h-10 sm:h-9"
                  />
                </div>
                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="gender" className="text-sm">Gender *</Label>
                  <Select value={gender} onValueChange={setGender} required>
                    <SelectTrigger className="h-10 sm:h-9">
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="placeOfBirth" className="text-sm">Place of Birth *</Label>
                <Select value={placeOfBirth} onValueChange={setPlaceOfBirth} required>
                  <SelectTrigger className="h-10 sm:h-9">
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[40vh]">
                    <SelectItem value="United Kingdom">United Kingdom</SelectItem>
                    <SelectItem value="Pakistan">Pakistan</SelectItem>
                    <SelectItem value="Bangladesh">Bangladesh</SelectItem>
                    <SelectItem value="Afghanistan">Afghanistan</SelectItem>
                    <SelectItem value="Albania">Albania</SelectItem>
                    <SelectItem value="Algeria">Algeria</SelectItem>
                    <SelectItem value="Argentina">Argentina</SelectItem>
                    <SelectItem value="Australia">Australia</SelectItem>
                    <SelectItem value="Austria">Austria</SelectItem>
                    <SelectItem value="Belgium">Belgium</SelectItem>
                    <SelectItem value="Bosnia and Herzegovina">Bosnia and Herzegovina</SelectItem>
                    <SelectItem value="Brazil">Brazil</SelectItem>
                    <SelectItem value="Canada">Canada</SelectItem>
                    <SelectItem value="China">China</SelectItem>
                    <SelectItem value="Egypt">Egypt</SelectItem>
                    <SelectItem value="France">France</SelectItem>
                    <SelectItem value="Germany">Germany</SelectItem>
                    <SelectItem value="Ghana">Ghana</SelectItem>
                    <SelectItem value="India">India</SelectItem>
                    <SelectItem value="Indonesia">Indonesia</SelectItem>
                    <SelectItem value="Iran">Iran</SelectItem>
                    <SelectItem value="Iraq">Iraq</SelectItem>
                    <SelectItem value="Ireland">Ireland</SelectItem>
                    <SelectItem value="Italy">Italy</SelectItem>
                    <SelectItem value="Jamaica">Jamaica</SelectItem>
                    <SelectItem value="Japan">Japan</SelectItem>
                    <SelectItem value="Jordan">Jordan</SelectItem>
                    <SelectItem value="Kenya">Kenya</SelectItem>
                    <SelectItem value="Kuwait">Kuwait</SelectItem>
                    <SelectItem value="Lebanon">Lebanon</SelectItem>
                    <SelectItem value="Libya">Libya</SelectItem>
                    <SelectItem value="Malaysia">Malaysia</SelectItem>
                    <SelectItem value="Morocco">Morocco</SelectItem>
                    <SelectItem value="Netherlands">Netherlands</SelectItem>
                    <SelectItem value="New Zealand">New Zealand</SelectItem>
                    <SelectItem value="Nigeria">Nigeria</SelectItem>
                    <SelectItem value="Norway">Norway</SelectItem>
                    <SelectItem value="Oman">Oman</SelectItem>
                    <SelectItem value="Palestine">Palestine</SelectItem>
                    <SelectItem value="Philippines">Philippines</SelectItem>
                    <SelectItem value="Poland">Poland</SelectItem>
                    <SelectItem value="Portugal">Portugal</SelectItem>
                    <SelectItem value="Qatar">Qatar</SelectItem>
                    <SelectItem value="Romania">Romania</SelectItem>
                    <SelectItem value="Russia">Russia</SelectItem>
                    <SelectItem value="Saudi Arabia">Saudi Arabia</SelectItem>
                    <SelectItem value="Somalia">Somalia</SelectItem>
                    <SelectItem value="South Africa">South Africa</SelectItem>
                    <SelectItem value="Spain">Spain</SelectItem>
                    <SelectItem value="Sri Lanka">Sri Lanka</SelectItem>
                    <SelectItem value="Sudan">Sudan</SelectItem>
                    <SelectItem value="Sweden">Sweden</SelectItem>
                    <SelectItem value="Switzerland">Switzerland</SelectItem>
                    <SelectItem value="Syria">Syria</SelectItem>
                    <SelectItem value="Tunisia">Tunisia</SelectItem>
                    <SelectItem value="Turkey">Turkey</SelectItem>
                    <SelectItem value="Uganda">Uganda</SelectItem>
                    <SelectItem value="Ukraine">Ukraine</SelectItem>
                    <SelectItem value="United Arab Emirates">United Arab Emirates</SelectItem>
                    <SelectItem value="United States">United States</SelectItem>
                    <SelectItem value="Yemen">Yemen</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="ethnicOrigin" className="text-sm">Ethnic Origin</Label>
                <Input
                  id="ethnicOrigin"
                  value={ethnicOrigin}
                  onChange={(e) => setEthnicOrigin(e.target.value)}
                  placeholder="Optional"
                  className="h-10 sm:h-9"
                />
              </div>
            </div>

            {/* Address Information */}
            <div className="space-y-3 sm:space-y-4">
              <h3 className="font-semibold text-base sm:text-lg border-b pb-2">Address</h3>
              
              <AddressLookup
                address={address}
                town={townCity}
                postcode={postcode}
                onAddressChange={setAddress}
                onTownChange={setTownCity}
                onPostcodeChange={setPostcode}
                required={true}
              />
            </div>

            {/* Contact Information */}
            <div className="space-y-3 sm:space-y-4">
              <h3 className="font-semibold text-base sm:text-lg border-b pb-2">Contact Information</h3>
              
              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="guardianName" className="text-sm">
                  {gender === "Female" ? "Mother/Guardian Name *" : "Father/Guardian Name *"}
                </Label>
                <Input
                  id="guardianName"
                  value={guardianName}
                  onChange={(e) => setGuardianName(e.target.value)}
                  required
                  className="h-10 sm:h-9"
                />
              </div>

              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="fatherMobile" className="text-sm">
                  {gender === "Female" ? "Mother/Guardian Mobile *" : "Father/Guardian Mobile *"}
                </Label>
                <Input
                  id="fatherMobile"
                  type="tel"
                  value={fatherMobile}
                  onChange={(e) => setFatherMobile(e.target.value)}
                  required
                  className="h-10 sm:h-9"
                />
              </div>

              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="email" className="text-sm">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-10 sm:h-9"
                />
              </div>
            </div>

            {/* CAPTCHA */}
            <div className="flex justify-center overflow-x-auto py-2">
              <TurnstileWidget onVerify={setTurnstileToken} />
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full h-11 sm:h-10 text-base sm:text-sm"
              disabled={isSubmitting || !turnstileToken}
            >
              {isSubmitting ? "Submitting..." : "Register Student"}
            </Button>
          </form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default StudentRegistrationForm;
