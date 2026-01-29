import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// HTML escape function to prevent XSS in emails
const escapeHtml = (text: string): string => {
  if (!text) return '';
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
};

interface Under18RegistrationData {
  firstName: string;
  lastName: string;
  studentAge: number;
  previousExperience: boolean;
  guardianName: string;
  guardianContact: string;
  guardianEmail: string;
  address: string;
  town: string;
  postcode: string;
  additionalNotes?: string;
}

interface AdultRegistrationData {
  firstName: string;
  lastName: string;
  studentAge: number;
  previousExperience: boolean;
  contactNumber: string;
  email: string;
  additionalNotes?: string;
}

type RegistrationData = Under18RegistrationData | AdultRegistrationData;

const isUnder18Data = (data: RegistrationData): data is Under18RegistrationData => {
  return 'guardianEmail' in data;
};

// In-memory rate limiting store (resets on function cold start)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

const RATE_LIMIT = {
  maxRequests: 3, // Max requests per window
  windowMs: 60 * 60 * 1000, // 1 hour window
};

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const record = rateLimitStore.get(key);

  if (!record || now > record.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + RATE_LIMIT.windowMs });
    return false;
  }

  if (record.count >= RATE_LIMIT.maxRequests) {
    return true;
  }

  record.count++;
  return false;
}

function getClientIP(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    req.headers.get("cf-connecting-ip") ||
    "unknown";
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const clientIP = getClientIP(req);
    const registrationData: RegistrationData = await req.json();
    const recipientEmail = isUnder18Data(registrationData) ? registrationData.guardianEmail : registrationData.email;

    // Rate limit by IP
    if (isRateLimited(`ip:${clientIP}`)) {
      console.log(`Rate limited IP: ${clientIP}`);
      return new Response(
        JSON.stringify({ error: "Too many requests. Please try again later." }),
        { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Rate limit by email
    const normalizedEmail = recipientEmail.toLowerCase().trim();
    if (isRateLimited(`email:${normalizedEmail}`)) {
      console.log(`Rate limited email: ${normalizedEmail}`);
      return new Response(
        JSON.stringify({ error: "Too many requests from this email. Please try again later." }),
        { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Received Hifz registration data:", JSON.stringify(registrationData, null, 2), "IP:", clientIP);

    const apiKey = Deno.env.get("REGISTRATION_API_KEY");
    if (!apiKey) {
      console.error("REGISTRATION_API_KEY not configured");
      throw new Error("API key not configured");
    }

    const externalApiUrl = "https://kqezxvivoddnqmylsuwd.supabase.co/functions/v1/register-hifz-student";
    
    console.log("Forwarding request to external API:", externalApiUrl);

    const response = await fetch(externalApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify(registrationData),
    });

    const responseText = await response.text();
    console.log("External API response status:", response.status);
    console.log("External API response body:", responseText);

    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { message: responseText };
    }

    if (!response.ok) {
      console.error("External API error:", responseData);
      return new Response(
        JSON.stringify({ 
          error: responseData.error || responseData.message || "Registration failed",
          details: responseData 
        }),
        {
          status: response.status,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log("Hifz registration successful:", responseData);

    // Send confirmation email to registrant with escaped values
    const safeFirstName = escapeHtml(registrationData.firstName);
    const safeLastName = escapeHtml(registrationData.lastName);
    const fullName = `${safeFirstName} ${safeLastName}`;
    const isMinor = isUnder18Data(registrationData);

    try {
      const confirmationResponse = await resend.emails.send({
        from: "Masjid Irshad <noreply@masjidirshad.co.uk>",
        to: [recipientEmail],
        subject: "Hifdh al-Qur'an Registration Confirmed - Masjid Irshad",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2c5f2d;">Assalamu Alaikum,</h2>
            
            <p>Thank you for registering ${isMinor ? `<strong>${fullName}</strong>` : ''} for the Hifdh al-Qur'an programme at Masjid Irshad.</p>
            
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #2c5f2d;">Registration Details</h3>
              <p><strong>Student Name:</strong> ${fullName}</p>
              <p><strong>Age:</strong> ${escapeHtml(String(registrationData.studentAge))}</p>
              <p><strong>Previous Quran Memorization Experience:</strong> ${registrationData.previousExperience ? 'Yes' : 'No'}</p>
              ${isMinor ? `
                <p><strong>Guardian:</strong> ${escapeHtml(registrationData.guardianName)}</p>
                <p><strong>Contact:</strong> ${escapeHtml(registrationData.guardianContact)}</p>
                <p><strong>Address:</strong> ${escapeHtml(registrationData.address)}, ${escapeHtml(registrationData.town)}, ${escapeHtml(registrationData.postcode)}</p>
              ` : `
                <p><strong>Contact:</strong> ${escapeHtml((registrationData as AdultRegistrationData).contactNumber)}</p>
              `}
              ${registrationData.additionalNotes ? `<p><strong>Additional Notes:</strong> ${escapeHtml(registrationData.additionalNotes)}</p>` : ''}
            </div>
            
            <div style="background-color: #ecfdf5; padding: 15px; border-left: 4px solid #16a34a; margin: 20px 0;">
              <p style="margin: 0; color: #16a34a; font-weight: 500;">Your registration has been successfully received!</p>
            </div>
            
            <h3 style="color: #2c5f2d;">What Happens Next?</h3>
            <div style="background-color: #fef3c7; padding: 15px; border-left: 4px solid #d97706; margin: 20px 0;">
              <p style="margin: 0; color: #92400e;"><strong>Important:</strong> Your application is now under review. You will be notified via email upon acceptance to the Hifdh programme with further steps including:</p>
              <ul style="margin: 10px 0 0 0; padding-left: 20px; color: #92400e;">
                <li>Confirmation of ${isMinor ? "your child's" : 'your'} place</li>
                <li>Start date and assessment details</li>
                <li>Programme schedule and expectations</li>
                <li>Required materials and fees information</li>
              </ul>
            </div>
            
            <h3 style="color: #2c5f2d;">About the Hifdh Programme</h3>
            <p>Our Hifdh al-Qur'an programme provides structured memorization of the Holy Quran with qualified teachers and regular progress tracking.</p>
            
            <p>Please allow up to 5-7 working days for your application to be reviewed. If you have any urgent queries, please contact us.</p>
            
            <p style="margin-top: 30px;">
              JazakAllah Khair,<br>
              <strong>Masjid Irshad Team</strong>
            </p>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            
            <p style="font-size: 12px; color: #6b7280;">
              Masjid Irshad<br>
              This email was sent automatically from our website.
            </p>
          </div>
        `,
      });

      console.log("Confirmation email sent to registrant:", confirmationResponse);
    } catch (emailError: any) {
      console.error("Failed to send confirmation email:", emailError.message);
      // Don't fail the request if email fails - registration was still successful
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Registration submitted successfully" 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in register-hifz-student function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
