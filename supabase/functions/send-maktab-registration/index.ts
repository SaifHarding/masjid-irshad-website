import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
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

interface MaktabRegistrationRequest {
  forename: string;
  middlename: string;
  surname: string;
  dateOfBirth: string;
  placeOfBirth: string;
  age: string;
  gender: string;
  address: string;
  townCity: string;
  postcode: string;
  homeTelephone: string;
  parentsMobile: string;
  email: string;
  fatherGuardianName: string;
  ethnicOrigin: string;
}

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

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const clientIP = getClientIP(req);
    const body = await req.json();
    const {
      forename,
      middlename,
      surname,
      dateOfBirth,
      placeOfBirth,
      age,
      gender,
      address,
      townCity,
      postcode,
      homeTelephone,
      parentsMobile,
      email,
      fatherGuardianName,
      ethnicOrigin,
    }: MaktabRegistrationRequest = body;

    // Rate limit by IP
    if (isRateLimited(`ip:${clientIP}`)) {
      console.log(`Rate limited IP: ${clientIP}`);
      return new Response(
        JSON.stringify({ error: "Too many requests. Please try again later." }),
        { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Rate limit by email
    const normalizedEmail = email.toLowerCase().trim();
    if (isRateLimited(`email:${normalizedEmail}`)) {
      console.log(`Rate limited email: ${normalizedEmail}`);
      return new Response(
        JSON.stringify({ error: "Too many requests from this email. Please try again later." }),
        { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Processing Maktab registration for:", { forename, surname, email, ip: clientIP });

    // Escape all user inputs for HTML
    const safeForename = escapeHtml(forename);
    const safeMiddlename = escapeHtml(middlename);
    const safeSurname = escapeHtml(surname);
    const safeDateOfBirth = escapeHtml(dateOfBirth);
    const safePlaceOfBirth = escapeHtml(placeOfBirth);
    const safeAge = escapeHtml(age);
    const safeGender = escapeHtml(gender);
    const safeAddress = escapeHtml(address);
    const safeTownCity = escapeHtml(townCity);
    const safePostcode = escapeHtml(postcode);
    const safeHomeTelephone = escapeHtml(homeTelephone);
    const safeParentsMobile = escapeHtml(parentsMobile);
    const safeEmail = escapeHtml(email);
    const safeFatherGuardianName = escapeHtml(fatherGuardianName);
    const safeEthnicOrigin = escapeHtml(ethnicOrigin);

    // Send notification email to admin
    const emailResponse = await resend.emails.send({
      from: "Masjid Irshad <noreply@masjidirshad.co.uk>",
      to: ["info@masjidirshad.co.uk"],
      replyTo: email,
      subject: `New Maktab Registration: ${safeForename} ${safeSurname}`,
      html: `
        <h2>New Maktab Registration Received</h2>
        <p>A new student has registered for the Maktab programme.</p>
        
        <table style="border-collapse: collapse; width: 100%; max-width: 600px; margin-top: 20px;">
          <tr style="background-color: #f3f4f6;">
            <th style="border: 1px solid #d1d5db; padding: 12px; text-align: left;">Field</th>
            <th style="border: 1px solid #d1d5db; padding: 12px; text-align: left;">Information</th>
          </tr>
          <tr>
            <td style="border: 1px solid #d1d5db; padding: 12px;"><strong>Forename</strong></td>
            <td style="border: 1px solid #d1d5db; padding: 12px;">${safeForename}</td>
          </tr>
          <tr style="background-color: #f9fafb;">
            <td style="border: 1px solid #d1d5db; padding: 12px;"><strong>Middlename</strong></td>
            <td style="border: 1px solid #d1d5db; padding: 12px;">${safeMiddlename || "N/A"}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #d1d5db; padding: 12px;"><strong>Surname</strong></td>
            <td style="border: 1px solid #d1d5db; padding: 12px;">${safeSurname}</td>
          </tr>
          <tr style="background-color: #f9fafb;">
            <td style="border: 1px solid #d1d5db; padding: 12px;"><strong>Date of Birth</strong></td>
            <td style="border: 1px solid #d1d5db; padding: 12px;">${safeDateOfBirth}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #d1d5db; padding: 12px;"><strong>Place of Birth</strong></td>
            <td style="border: 1px solid #d1d5db; padding: 12px;">${safePlaceOfBirth}</td>
          </tr>
          <tr style="background-color: #f9fafb;">
            <td style="border: 1px solid #d1d5db; padding: 12px;"><strong>Age</strong></td>
            <td style="border: 1px solid #d1d5db; padding: 12px;">${safeAge}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #d1d5db; padding: 12px;"><strong>Gender</strong></td>
            <td style="border: 1px solid #d1d5db; padding: 12px;">${safeGender}</td>
          </tr>
          <tr style="background-color: #f9fafb;">
            <td style="border: 1px solid #d1d5db; padding: 12px;"><strong>Address</strong></td>
            <td style="border: 1px solid #d1d5db; padding: 12px;">${safeAddress}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #d1d5db; padding: 12px;"><strong>Town/City</strong></td>
            <td style="border: 1px solid #d1d5db; padding: 12px;">${safeTownCity}</td>
          </tr>
          <tr style="background-color: #f9fafb;">
            <td style="border: 1px solid #d1d5db; padding: 12px;"><strong>Postcode</strong></td>
            <td style="border: 1px solid #d1d5db; padding: 12px;">${safePostcode}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #d1d5db; padding: 12px;"><strong>Home Telephone</strong></td>
            <td style="border: 1px solid #d1d5db; padding: 12px;">${safeHomeTelephone || "N/A"}</td>
          </tr>
          <tr style="background-color: #f9fafb;">
            <td style="border: 1px solid #d1d5db; padding: 12px;"><strong>Parent's Mobile</strong></td>
            <td style="border: 1px solid #d1d5db; padding: 12px;">${safeParentsMobile}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #d1d5db; padding: 12px;"><strong>Email</strong></td>
            <td style="border: 1px solid #d1d5db; padding: 12px;">${safeEmail}</td>
          </tr>
          <tr style="background-color: #f9fafb;">
            <td style="border: 1px solid #d1d5db; padding: 12px;"><strong>Father/Guardian Name</strong></td>
            <td style="border: 1px solid #d1d5db; padding: 12px;">${safeFatherGuardianName}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #d1d5db; padding: 12px;"><strong>Ethnic Origin</strong></td>
            <td style="border: 1px solid #d1d5db; padding: 12px;">${safeEthnicOrigin}</td>
          </tr>
        </table>
        
        <p style="margin-top: 20px; color: #6b7280;">This email was sent automatically from the Masjid Irshad website.</p>
      `,
    });

    console.log("Admin notification email sent successfully:", emailResponse);

    // Send data to Google Sheets (Maktab specific spreadsheet)
    const googleSheetsUrl = Deno.env.get("MAKTAB_GOOGLE_SHEETS_WEBHOOK_URL");
    if (googleSheetsUrl) {
      try {
        const now = new Date();
        const day = String(now.getDate()).padStart(2, '0');
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const year = now.getFullYear();
        const timestamp = `${day}/${month}/${year}`;
        
        const sheetData = {
          timestamp,
          forename,
          middlename,
          surname,
          dateOfBirth,
          placeOfBirth,
          age,
          gender,
          address,
          townCity,
          postcode,
          homeTelephone,
          parentsMobile,
          email,
          fatherGuardianName,
          ethnicOrigin,
        };

        const sheetsResponse = await fetch(googleSheetsUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(sheetData),
        });

        if (!sheetsResponse.ok) {
          console.error("Google Sheets error:", await sheetsResponse.text());
        } else {
          console.log("Data logged to Google Sheets successfully");
        }
      } catch (sheetError: any) {
        console.error("Failed to log to Google Sheets:", sheetError.message);
        // Don't fail the request if Sheets fails - email was still sent
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Registration submitted successfully" 
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-maktab-registration function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
