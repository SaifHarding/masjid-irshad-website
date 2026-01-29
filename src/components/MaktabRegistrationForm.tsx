import { useState, useMemo } from "react";
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
import { Plus, Trash2, ChevronLeft, ChevronRight, Check, User, Users, Phone, Loader2, FileText } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";

interface MaktabRegistrationFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ChildData {
  id: string;
  firstName: string;
  middleName: string;
  lastName: string;
  dateOfBirth: string;
  placeOfBirth: string;
  gender: string;
  level: string;
  ethnicOrigin: string;
  medicalNotes: string;
}

const COUNTRIES = [
  "United Kingdom", "Pakistan", "Bangladesh", "Afghanistan", "Albania", "Algeria", 
  "Argentina", "Australia", "Austria", "Belgium", "Bosnia and Herzegovina", "Brazil", 
  "Canada", "China", "Egypt", "France", "Germany", "Ghana", "India", "Indonesia", 
  "Iran", "Iraq", "Ireland", "Italy", "Jamaica", "Japan", "Jordan", "Kenya", 
  "Kuwait", "Lebanon", "Libya", "Malaysia", "Morocco", "Netherlands", "New Zealand", 
  "Nigeria", "Norway", "Oman", "Palestine", "Philippines", "Poland", "Portugal", 
  "Qatar", "Romania", "Russia", "Saudi Arabia", "Somalia", "South Africa", "Spain", 
  "Sri Lanka", "Sudan", "Sweden", "Switzerland", "Syria", "Tunisia", "Turkey", 
  "Uganda", "Ukraine", "United Arab Emirates", "United States", "Yemen", "Other"
];

const ETHNIC_ORIGINS = [
  "Asian - Bangladeshi",
  "Asian - Indian", 
  "Asian - Pakistani",
  "Asian - Other",
  "Black - African",
  "Black - Caribbean",
  "Black - Other",
  "Mixed - White and Asian",
  "Mixed - White and Black African",
  "Mixed - White and Black Caribbean",
  "Mixed - Other",
  "White - British",
  "White - Irish",
  "White - Other",
  "Arab",
  "Other Ethnic Group",
  "Prefer not to say"
];

const createEmptyChild = (): ChildData => ({
  id: crypto.randomUUID(),
  firstName: "",
  middleName: "",
  lastName: "",
  dateOfBirth: "",
  placeOfBirth: "",
  gender: "",
  level: "",
  ethnicOrigin: "",
  medicalNotes: ""
});

export const MaktabRegistrationForm = ({ open, onOpenChange }: MaktabRegistrationFormProps) => {
  const supabase = getBackendClient();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  // Primary Parent / Guardian fields
  const [primaryParentType, setPrimaryParentType] = useState<"father" | "mother" | "">("");
  const [guardianName, setGuardianName] = useState("");
  const [guardianMobile, setGuardianMobile] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [townCity, setTownCity] = useState("");
  const [postcode, setPostcode] = useState("");
  
  // Children
  const [children, setChildren] = useState<ChildData[]>([createEmptyChild()]);
  
  // Secondary parent (required based on conditions)
  const [secondaryParentName, setSecondaryParentName] = useState("");
  const [secondaryParentMobile, setSecondaryParentMobile] = useState("");
  
  // Terms and conditions
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTermsDialog, setShowTermsDialog] = useState(false);

  // Validation patterns
  const UK_POSTCODE_REGEX = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i;
  const UK_MOBILE_REGEX = /^07\d{9}$/;
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const calculateAge = (dateOfBirth: string): number => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const genderRequirement = useMemo(() => {
    const genders = children.filter(c => c.gender).map(c => c.gender);
    if (genders.length === 0) return null;
    
    const hasMale = genders.includes("Male");
    const hasFemale = genders.includes("Female");
    
    if (hasMale && hasFemale) return "both";
    if (hasMale) return "male";
    if (hasFemale) return "female";
    return null;
  }, [children]);

  // Determine if secondary parent is required
  const needsSecondaryParent = useMemo(() => {
    if (!primaryParentType || !genderRequirement) return false;
    
    // If primary is mother and registering boys -> need father
    if (primaryParentType === "mother" && (genderRequirement === "male" || genderRequirement === "both")) {
      return "father";
    }
    // If primary is father and registering girls -> need mother
    if (primaryParentType === "father" && (genderRequirement === "female" || genderRequirement === "both")) {
      return "mother";
    }
    return false;
  }, [primaryParentType, genderRequirement]);

  const getContactMessage = () => {
    const whatsappNote = " Teachers primarily contact via WhatsApp.";
    
    if (!needsSecondaryParent) {
      return "Primary parent contact details have been provided in Step 1." + whatsappNote;
    }
    
    if (needsSecondaryParent === "father") {
      return "As you are registering boys and the primary parent is the mother, we also require the father's name and contact number." + whatsappNote;
    }
    if (needsSecondaryParent === "mother") {
      return "As you are registering girls and the primary parent is the father, we also require the mother's name and contact number." + whatsappNote;
    }
    return "";
  };

  const resetForm = () => {
    setCurrentStep(1);
    setPrimaryParentType("");
    setGuardianName("");
    setGuardianMobile("");
    setEmail("");
    setAddress("");
    setTownCity("");
    setPostcode("");
    
    setChildren([createEmptyChild()]);
    setSecondaryParentName("");
    setSecondaryParentMobile("");
    setTermsAccepted(false);
    setTurnstileToken(null);
    setIsSuccess(false);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const addChild = () => {
    if (children.length < 6) {
      setChildren([...children, createEmptyChild()]);
    }
  };

  const removeChild = (id: string) => {
    if (children.length > 1) {
      setChildren(children.filter(c => c.id !== id));
    }
  };

  const updateChild = (id: string, field: keyof ChildData, value: string) => {
    setChildren(children.map(c => 
      c.id === id ? { ...c, [field]: value } : c
    ));
  };

  const validateStep1 = () => {
    if (!primaryParentType) {
      toast.error("Please select if you are the mother or father");
      return false;
    }
    if (!guardianName.trim()) {
      toast.error("Please enter your full name");
      return false;
    }
    if (/\d/.test(guardianName)) {
      toast.error("Name should not contain numbers");
      return false;
    }
    if (!guardianMobile.trim()) {
      toast.error("Please enter your mobile number");
      return false;
    }
    if (!/^\d+$/.test(guardianMobile.replace(/\s/g, ''))) {
      toast.error("Mobile number should contain numbers only");
      return false;
    }
    if (!UK_MOBILE_REGEX.test(guardianMobile.replace(/\s/g, ''))) {
      toast.error("Please enter a valid UK mobile number (e.g., 07123456789)");
      return false;
    }
    if (!email.trim() || !EMAIL_REGEX.test(email)) {
      toast.error("Please enter a valid email address");
      return false;
    }
    if (!address.trim()) {
      toast.error("Please enter the address");
      return false;
    }
    if (!townCity.trim()) {
      toast.error("Please enter the town/city");
      return false;
    }
    if (!postcode.trim() || !UK_POSTCODE_REGEX.test(postcode.replace(/\s/g, ''))) {
      toast.error("Please enter a valid UK postcode");
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      const childNum = i + 1;
      
      if (!child.firstName.trim()) {
        toast.error(`Please enter first name for child ${childNum}`);
        return false;
      }
      if (!child.lastName.trim()) {
        toast.error(`Please enter last name for child ${childNum}`);
        return false;
      }
      if (!child.dateOfBirth) {
        toast.error(`Please enter date of birth for child ${childNum}`);
        return false;
      }
      
      const age = calculateAge(child.dateOfBirth);
      if (age < 4 || age > 16) {
        toast.error(`Child ${childNum} must be between 4 and 16 years old (current age: ${age})`);
        return false;
      }
      
      if (!child.placeOfBirth) {
        toast.error(`Please select place of birth for child ${childNum}`);
        return false;
      }
      if (!child.gender) {
        toast.error(`Please select gender for child ${childNum}`);
        return false;
      }
      if (!child.level) {
        toast.error(`Please select level for child ${childNum}`);
        return false;
      }
    }
    return true;
  };

  const validateStep3 = () => {
    if (needsSecondaryParent) {
      const parentLabel = needsSecondaryParent === "father" ? "Father" : "Mother";
      
      if (!secondaryParentName.trim()) {
        toast.error(`Please enter the ${parentLabel.toLowerCase()}'s full name`);
        return false;
      }
      if (/\d/.test(secondaryParentName)) {
        toast.error(`${parentLabel}'s name should not contain numbers`);
        return false;
      }
      if (!secondaryParentMobile.trim()) {
        toast.error(`Please enter the ${parentLabel.toLowerCase()}'s mobile number`);
        return false;
      }
      if (!/^\d+$/.test(secondaryParentMobile.replace(/\s/g, ''))) {
        toast.error("Mobile number should contain numbers only");
        return false;
      }
      if (!UK_MOBILE_REGEX.test(secondaryParentMobile.replace(/\s/g, ''))) {
        toast.error("Please enter a valid UK mobile number (e.g., 07123456789)");
        return false;
      }
      // Check for duplicate phone numbers
      if (secondaryParentMobile.replace(/\s/g, '') === guardianMobile.replace(/\s/g, '')) {
        toast.error(`${parentLabel}'s mobile number must be different from the primary parent's number`);
        return false;
      }
    }
    
    if (!termsAccepted) {
      toast.error("Please accept the terms and conditions to continue");
      return false;
    }
    
    if (!turnstileToken) {
      toast.error("Please complete the CAPTCHA verification");
      return false;
    }
    
    return true;
  };

  const handleNext = () => {
    if (currentStep === 1 && validateStep1()) {
      setCurrentStep(2);
    } else if (currentStep === 2 && validateStep2()) {
      setCurrentStep(3);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep3()) return;

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

      // Format children data for API
      const formattedChildren = children.map(child => ({
        firstName: child.firstName.trim(),
        middleName: child.middleName.trim() || undefined,
        lastName: child.lastName.trim(),
        dateOfBirth: child.dateOfBirth,
        placeOfBirth: child.placeOfBirth,
        gender: child.gender,
        level: child.level.toLowerCase(),
        ethnicOrigin: child.ethnicOrigin || undefined,
        medicalNotes: child.medicalNotes.trim() || undefined
      }));

      // Prepare parent contact info based on primary parent type and secondary parent requirement
      const fatherName = primaryParentType === "father" ? guardianName.trim() : (needsSecondaryParent === "father" ? secondaryParentName.trim() : undefined);
      const fatherMobile = primaryParentType === "father" ? guardianMobile.trim() : (needsSecondaryParent === "father" ? secondaryParentMobile.trim() : undefined);
      const motherName = primaryParentType === "mother" ? guardianName.trim() : (needsSecondaryParent === "mother" ? secondaryParentName.trim() : undefined);
      const motherMobile = primaryParentType === "mother" ? guardianMobile.trim() : (needsSecondaryParent === "mother" ? secondaryParentMobile.trim() : undefined);

      // Submit registration via edge function
      const { data, error } = await supabase.functions.invoke('register-student', {
        body: {
          guardianName: guardianName.trim(),
          primaryParentType,
          email: email.trim(),
          address: address.trim(),
          townCity: townCity.trim(),
          postcode: postcode.trim().toUpperCase(),
          
          fatherName,
          fatherMobile,
          motherName,
          motherMobile,
          termsAccepted,
          children: formattedChildren
        }
      });

      if (error) {
        throw new Error(error.message || "Registration failed. Please try again.");
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      setIsSuccess(true);
    } catch (error) {
      console.error('Registration error:', error);
      toast.error(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const stepTitles = ["Guardian Details", "Children", "Contact & Submit"];

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-6">
      {[1, 2, 3].map((step) => (
        <div key={step} className="flex items-center">
          <div 
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
              currentStep === step 
                ? 'bg-primary text-primary-foreground' 
                : currentStep > step 
                  ? 'bg-primary/20 text-primary' 
                  : 'bg-muted text-muted-foreground'
            }`}
          >
            {currentStep > step ? <Check className="h-4 w-4" /> : step}
          </div>
          {step < 3 && (
            <div className={`w-8 sm:w-12 h-0.5 mx-1 ${currentStep > step ? 'bg-primary/50' : 'bg-muted'}`} />
          )}
        </div>
      ))}
    </div>
  );

  const renderStep1 = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <User className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-lg">Primary Parent / Guardian</h3>
      </div>

      <div className="space-y-1.5">
        <Label className="text-sm">I am the... *</Label>
        <Select value={primaryParentType} onValueChange={(v: "father" | "mother") => setPrimaryParentType(v)}>
          <SelectTrigger className="h-11" tabIndex={0}>
            <SelectValue placeholder="Select mother or father" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="father">Father</SelectItem>
            <SelectItem value="mother">Mother</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="guardianName" className="text-sm">Full Name *</Label>
        <Input
          id="guardianName"
          value={guardianName}
          onChange={(e) => setGuardianName(e.target.value)}
          placeholder="Enter your full name"
          className="h-11"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="guardianMobile" className="text-sm">Mobile Number *</Label>
        <Input
          id="guardianMobile"
          type="tel"
          value={guardianMobile}
          onChange={(e) => setGuardianMobile(e.target.value)}
          placeholder="07123456789"
          className="h-11"
        />
        <p className="text-xs text-muted-foreground">Teachers primarily contact via WhatsApp.</p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email" className="text-sm">Email Address *</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="example@email.com"
          className="h-11"
        />
        <p className="text-xs text-muted-foreground">This email will be used for payments and parent portal access.</p>
      </div>

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
  );

  const renderStep2 = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-lg">Children ({children.length}/6)</h3>
        </div>
        {children.length < 6 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addChild}
            className="gap-1"
            tabIndex={-1}
          >
            <Plus className="h-4 w-4" />
            Add Child
          </Button>
        )}
      </div>

      <div className="space-y-4">
        {children.map((child, index) => (
          <Card key={child.id} className="p-4 relative">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-primary">Child {index + 1}</span>
              {children.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeChild(child.id)}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 px-2"
                  tabIndex={-1}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">First Name *</Label>
                  <Input
                    value={child.firstName}
                    onChange={(e) => updateChild(child.id, 'firstName', e.target.value)}
                    className="h-10"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Middle Name</Label>
                  <Input
                    value={child.middleName}
                    onChange={(e) => updateChild(child.id, 'middleName', e.target.value)}
                    className="h-10"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Last Name *</Label>
                  <Input
                    value={child.lastName}
                    onChange={(e) => updateChild(child.id, 'lastName', e.target.value)}
                    className="h-10"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Date of Birth *</Label>
                  <Input
                    type="date"
                    value={child.dateOfBirth}
                    onChange={(e) => updateChild(child.id, 'dateOfBirth', e.target.value)}
                    className="h-10"
                  />
                  {child.dateOfBirth && (
                    <p className="text-xs text-muted-foreground">
                      Age: {calculateAge(child.dateOfBirth)} years
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Place of Birth *</Label>
                  <Select value={child.placeOfBirth} onValueChange={(v) => updateChild(child.id, 'placeOfBirth', v)}>
                    <SelectTrigger className="h-10" tabIndex={0}>
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[40vh]">
                      {COUNTRIES.map(country => (
                        <SelectItem key={country} value={country}>{country}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Gender *</Label>
                  <Select value={child.gender} onValueChange={(v) => updateChild(child.id, 'gender', v)}>
                    <SelectTrigger className="h-10" tabIndex={0}>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Level *</Label>
                  <Select value={child.level} onValueChange={(v) => updateChild(child.id, 'level', v)}>
                    <SelectTrigger className="h-10" tabIndex={0}>
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Qaidah">Qaidah</SelectItem>
                      <SelectItem value="Quran">Quran</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Qaidah: beginners learning Arabic. Quran: can already read.
                  </p>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Ethnic Origin</Label>
                <Select value={child.ethnicOrigin} onValueChange={(v) => updateChild(child.id, 'ethnicOrigin', v)}>
                  <SelectTrigger className="h-10" tabIndex={0}>
                    <SelectValue placeholder="Select (optional)" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[40vh]">
                    {ETHNIC_ORIGINS.map(origin => (
                      <SelectItem key={origin} value={origin}>{origin}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Serious Illness / Disability</Label>
                <Textarea
                  value={child.medicalNotes}
                  onChange={(e) => updateChild(child.id, 'medicalNotes', e.target.value)}
                  placeholder="State any serious illness or disability (optional)"
                  className="min-h-[60px] resize-none text-sm"
                />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Phone className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-lg">Additional Contact Information</h3>
      </div>

      <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
        <p className="text-sm text-foreground">{getContactMessage()}</p>
      </div>

      {needsSecondaryParent && (
        <>
          <div className="space-y-1.5">
            <Label htmlFor="secondaryParentName" className="text-sm">
              {needsSecondaryParent === "father" ? "Father's" : "Mother's"} Full Name *
            </Label>
            <Input
              id="secondaryParentName"
              value={secondaryParentName}
              onChange={(e) => setSecondaryParentName(e.target.value)}
              placeholder={`Enter ${needsSecondaryParent}'s full name`}
              className="h-11"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="secondaryParentMobile" className="text-sm">
              {needsSecondaryParent === "father" ? "Father's" : "Mother's"} Mobile Number *
            </Label>
            <Input
              id="secondaryParentMobile"
              type="tel"
              value={secondaryParentMobile}
              onChange={(e) => setSecondaryParentMobile(e.target.value)}
              placeholder="07123456789"
              className={`h-11 ${secondaryParentMobile.replace(/\s/g, '') === guardianMobile.replace(/\s/g, '') && secondaryParentMobile.trim() !== '' ? 'border-destructive focus-visible:ring-destructive' : ''}`}
            />
            {secondaryParentMobile.replace(/\s/g, '') === guardianMobile.replace(/\s/g, '') && secondaryParentMobile.trim() !== '' && (
              <p className="text-xs text-destructive">
                This number is the same as the primary parent's. Please enter a different mobile number.
              </p>
            )}
          </div>
        </>
      )}

      {!genderRequirement && (
        <p className="text-sm text-muted-foreground italic">
          Please go back and add gender for at least one child to see contact requirements.
        </p>
      )}

      {/* Terms and Conditions */}
      <div className="pt-4 border-t">
        <div className="flex items-start space-x-3">
          <Checkbox
            id="termsAccepted"
            checked={termsAccepted}
            onCheckedChange={(checked) => setTermsAccepted(checked === true)}
            className="mt-1"
          />
          <div className="flex-1">
            <Label htmlFor="termsAccepted" className="text-sm font-normal cursor-pointer">
              I agree to the{" "}
              <button
                type="button"
                onClick={() => setShowTermsDialog(true)}
                className="text-primary underline hover:text-primary/80 font-medium"
              >
                Terms and Conditions
              </button>
              {" "}*
            </Label>
          </div>
        </div>
      </div>

      <div className="pt-4">
        <div className="flex justify-center overflow-x-auto py-2">
          <TurnstileWidget onVerify={setTurnstileToken} />
        </div>
      </div>

      {/* Terms Dialog */}
      <Dialog open={showTermsDialog} onOpenChange={setShowTermsDialog}>
        <DialogContent className="w-[95vw] max-w-xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary">
              <FileText className="h-5 w-5" />
              Terms and Conditions
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] pr-4">
            <div className="space-y-4 text-sm">
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
              
              <div className="pt-4 border-t">
                <h4 className="font-semibold text-base mb-3 text-primary">Rules & Regulations</h4>
                <ul className="space-y-3 list-disc pl-4">
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

              <div className="pt-4 border-t">
                <h4 className="font-semibold text-base mb-3 text-primary">Payment Policy</h4>
                <ul className="space-y-3 list-disc pl-4">
                  <li>A one-time <strong>admission fee of £30 per child</strong> is required upon enrolment for all new students.</li>
                  <li>The monthly tuition fee is <strong>£35.99 per child</strong>, due on the 1st of each month. Alternative payment arrangements may be made by prior agreement with the Masjid administration.</li>
                  <li>Payments are processed securely via <strong>Stripe</strong>, accepting Apple Pay, Google Pay, debit/credit card, or Direct Debit. Alternative payment methods must be agreed with the Masjid administration prior to enrolment.</li>
                  <li>Full fees are payable regardless of teacher holidays, bank holidays, school holidays, or child absence. No refunds or deductions will be made for missed sessions.</li>
                  <li>Failure to pay fees on time may result in temporary suspension or permanent removal from the Maktab.</li>
                </ul>
              </div>
            </div>
          </ScrollArea>
          <div className="flex justify-end pt-4 border-t">
            <Button onClick={() => setShowTermsDialog(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );

  const renderSuccess = () => (
    <div className="text-center py-8 space-y-6">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 text-green-600">
        <Check className="h-8 w-8" />
      </div>
      
      <div>
        <h3 className="text-xl font-semibold text-foreground mb-2">Registration Submitted!</h3>
        <p className="text-muted-foreground">
          Your registration has been submitted successfully.
        </p>
      </div>

      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 text-left">
        <h4 className="font-medium mb-2 text-blue-800 dark:text-blue-200">What happens next?</h4>
        <ul className="space-y-2 text-sm text-blue-700 dark:text-blue-300">
          <li>✉️ A confirmation email has been sent to your email address.</li>
          <li>📞 The Maktab administration will review your application and contact you with further details.</li>
        </ul>
      </div>

      <div className="bg-muted/50 rounded-lg p-4 text-left">
        <h4 className="font-medium mb-2">Children Registered:</h4>
        <ul className="space-y-1">
          {children.map((child, index) => (
            <li key={child.id} className="text-sm text-muted-foreground">
              {index + 1}. {child.firstName} {child.middleName} {child.lastName} ({child.level})
            </li>
          ))}
        </ul>
      </div>

      <Button onClick={handleClose} className="w-full">
        Close
      </Button>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[95vw] max-w-lg max-h-[95vh] sm:max-h-[90vh] p-4 sm:p-6">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-xl sm:text-2xl font-bold text-primary">
            {isSuccess ? "Success" : "Maktab Registration"}
          </DialogTitle>
          {!isSuccess && (
            <DialogDescription className="text-sm">
              {stepTitles[currentStep - 1]}
            </DialogDescription>
          )}
        </DialogHeader>
        
        <ScrollArea className="max-h-[calc(95vh-180px)] sm:max-h-[65vh] pr-2 sm:pr-4">
          {isSuccess ? (
            renderSuccess()
          ) : (
            <div className="py-2">
              {renderStepIndicator()}
              
              {currentStep === 1 && renderStep1()}
              {currentStep === 2 && renderStep2()}
              {currentStep === 3 && renderStep3()}
            </div>
          )}
        </ScrollArea>

        {!isSuccess && (
          <div className="flex gap-3 pt-4 border-t">
            {currentStep > 1 && (
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                className="flex-1 h-11"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            )}
            
            {currentStep < 3 ? (
              <Button
                type="button"
                onClick={handleNext}
                className="flex-1 h-11"
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting || !turnstileToken || !genderRequirement || !termsAccepted}
                className="flex-1 h-11"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Registration"
                )}
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default MaktabRegistrationForm;
