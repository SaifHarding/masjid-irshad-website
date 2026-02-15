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

interface RegistrationRequest {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  studentAge: string;
  educationLevel?: string;
  programName: string;
  parentName?: string;
  address?: string;
  town?: string;
  postcode?: string;
  previousExperience?: string;
  additionalNotes?: string;
  contactNumber?: string;
  studentName?: string;
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
      firstName, 
      lastName, 
      email, 
      phone, 
      contactNumber,
      studentAge, 
      educationLevel, 
      programName, 
      parentName, 
      address, 
      town, 
      postcode,
      previousExperience,
      additionalNotes,
      studentName
    }: RegistrationRequest = body;

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

    const isMinor = parseInt(studentAge) < 18;
    const isHifzProgram = programName === "Hifdh al-Qur'an";
    const actualPhone = phone || contactNumber || '';
    console.log("Processing registration for:", { firstName, lastName, email, programName, isMinor, isHifzProgram, ip: clientIP });

    // Escape all user inputs for HTML
    const safeFirstName = escapeHtml(firstName);
    const safeLastName = escapeHtml(lastName);
    const safeEmail = escapeHtml(email);
    const safePhone = escapeHtml(actualPhone);
    const safeStudentAge = escapeHtml(studentAge);
    const safeEducationLevel = escapeHtml(educationLevel || '');
    const safeProgramName = escapeHtml(programName);
    const safeParentName = escapeHtml(parentName || '');
    const safeAddress = escapeHtml(address || '');
    const safeTown = escapeHtml(town || '');
    const safePostcode = escapeHtml(postcode || '');
    const safePreviousExperience = escapeHtml(previousExperience || '');
    const safeAdditionalNotes = escapeHtml(additionalNotes || '');

    const emailResponse = await resend.emails.send({
      from: "Masjid Irshad <noreply@masjidirshad.co.uk>",
      to: ["info@masjidirshad.co.uk"],
      replyTo: email,
      subject: `New Registration Interest: ${safeProgramName}`,
      html: `
        <h2>New Registration Interest Received</h2>
        <p>A new registration interest has been submitted for <strong>${safeProgramName}</strong>.</p>
        
        <table style="border-collapse: collapse; width: 100%; max-width: 500px; margin-top: 20px;">
          <tr style="background-color: #f3f4f6;">
            <th style="border: 1px solid #d1d5db; padding: 12px; text-align: left;">Field</th>
            <th style="border: 1px solid #d1d5db; padding: 12px; text-align: left;">Information</th>
          </tr>
          <tr>
            <td style="border: 1px solid #d1d5db; padding: 12px;"><strong>Student First Name</strong></td>
            <td style="border: 1px solid #d1d5db; padding: 12px;">${safeFirstName}</td>
          </tr>
          <tr style="background-color: #f9fafb;">
            <td style="border: 1px solid #d1d5db; padding: 12px;"><strong>Student Last Name</strong></td>
            <td style="border: 1px solid #d1d5db; padding: 12px;">${safeLastName}</td>
          </tr>
          <tr style="background-color: #f9fafb;">
            <td style="border: 1px solid #d1d5db; padding: 12px;"><strong>Student Age</strong></td>
            <td style="border: 1px solid #d1d5db; padding: 12px;">${safeStudentAge}</td>
          </tr>
          ${isMinor && parentName ? `
          <tr>
            <td style="border: 1px solid #d1d5db; padding: 12px;"><strong>Parent/Guardian Name</strong></td>
            <td style="border: 1px solid #d1d5db; padding: 12px;">${safeParentName}</td>
          </tr>
          ` : ''}
          ${isMinor && address ? `
          <tr style="background-color: #f9fafb;">
            <td style="border: 1px solid #d1d5db; padding: 12px;"><strong>Address</strong></td>
            <td style="border: 1px solid #d1d5db; padding: 12px;">${safeAddress}</td>
          </tr>
          ` : ''}
          ${isMinor && town ? `
          <tr>
            <td style="border: 1px solid #d1d5db; padding: 12px;"><strong>Town</strong></td>
            <td style="border: 1px solid #d1d5db; padding: 12px;">${safeTown}</td>
          </tr>
          ` : ''}
          ${isMinor && postcode ? `
          <tr style="background-color: #f9fafb;">
            <td style="border: 1px solid #d1d5db; padding: 12px;"><strong>Postcode</strong></td>
            <td style="border: 1px solid #d1d5db; padding: 12px;">${safePostcode}</td>
          </tr>
          ` : ''}
          <tr>
            <td style="border: 1px solid #d1d5db; padding: 12px;"><strong>${isMinor ? 'Parent/Guardian ' : ''}Contact Number</strong></td>
            <td style="border: 1px solid #d1d5db; padding: 12px;">${safePhone}</td>
          </tr>
          <tr style="background-color: #f9fafb;">
            <td style="border: 1px solid #d1d5db; padding: 12px;"><strong>${isMinor ? 'Parent/Guardian ' : ''}Email</strong></td>
            <td style="border: 1px solid #d1d5db; padding: 12px;">${safeEmail}</td>
          </tr>
          ${!isHifzProgram && educationLevel ? `
          <tr>
            <td style="border: 1px solid #d1d5db; padding: 12px;"><strong>Current Education Level</strong></td>
            <td style="border: 1px solid #d1d5db; padding: 12px;">${safeEducationLevel}</td>
          </tr>
          ` : ''}
          ${isHifzProgram && previousExperience ? `
          <tr>
            <td style="border: 1px solid #d1d5db; padding: 12px;"><strong>Previous Quran Memorization Experience</strong></td>
            <td style="border: 1px solid #d1d5db; padding: 12px;">${safePreviousExperience}</td>
          </tr>
          ` : ''}
          ${isHifzProgram && additionalNotes ? `
          <tr style="background-color: #f9fafb;">
            <td style="border: 1px solid #d1d5db; padding: 12px;"><strong>Additional Notes</strong></td>
            <td style="border: 1px solid #d1d5db; padding: 12px;">${safeAdditionalNotes}</td>
          </tr>
          ` : ''}
          <tr${isHifzProgram && additionalNotes ? '' : ' style="background-color: #f9fafb;"'}>
            <td style="border: 1px solid #d1d5db; padding: 12px;"><strong>Program</strong></td>
            <td style="border: 1px solid #d1d5db; padding: 12px;">${safeProgramName}</td>
          </tr>
        </table>
        
        <p style="margin-top: 20px; color: #6b7280;">This email was sent automatically from the Masjid Irshad website.</p>
      `,
    });

    console.log("Admin notification email sent successfully:", emailResponse);

    // Send confirmation email to registrant
    const confirmationResponse = await resend.emails.send({
      from: "Masjid Irshad <noreply@masjidirshad.co.uk>",
      to: [email],
      subject: `Registration Received - ${safeProgramName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2c5f2d;">Assalamu Alaikum ${safeFirstName},</h2>
          
          <p>Thank you for registering your interest in the <strong>${safeProgramName}</strong> at Masjid Irshad.</p>
          
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #2c5f2d;">Registration Details</h3>
            <p><strong>Student Name:</strong> ${safeFirstName} ${safeLastName}</p>
            <p><strong>Age:</strong> ${safeStudentAge}</p>
            ${isMinor && parentName ? `<p><strong>Parent/Guardian Name:</strong> ${safeParentName}</p>` : ''}
            ${isMinor && address ? `<p><strong>Address:</strong> ${safeAddress}</p>` : ''}
            ${isMinor && town ? `<p><strong>Town:</strong> ${safeTown}</p>` : ''}
            ${isMinor && postcode ? `<p><strong>Postcode:</strong> ${safePostcode}</p>` : ''}
            ${!isHifzProgram && educationLevel ? `<p><strong>Current Education Level:</strong> ${safeEducationLevel}</p>` : ''}
            ${isHifzProgram && previousExperience ? `<p><strong>Previous Quran Memorization Experience:</strong> ${safePreviousExperience}</p>` : ''}
            ${isHifzProgram && additionalNotes ? `<p><strong>Additional Notes:</strong> ${safeAdditionalNotes}</p>` : ''}
            <p><strong>Contact Number:</strong> ${safePhone}</p>
            <p><strong>Email:</strong> ${safeEmail}</p>
          </div>
          
          <p style="color: #16a34a; font-weight: 500;">Someone from our team will reach out to you shortly with the next steps.</p>
          
          <p>If you have any questions in the meantime, please don't hesitate to contact us.</p>
          
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

    // Send data to Google Sheets - route to appropriate spreadsheet based on program
    const isIslamicSciencesOrAlimiyyah = 
      programName === "Islamic Sciences for Boys" || 
      programName === "Alimiyyah Programme for Boys" || 
      programName === "Alimiyyah Programme for Girls";
    
    let googleSheetsUrl;
    if (isHifzProgram) {
      googleSheetsUrl = Deno.env.get("HIFZ_GOOGLE_SHEETS_WEBHOOK_URL");
    } else if (isIslamicSciencesOrAlimiyyah) {
      googleSheetsUrl = Deno.env.get("PROGRAM_GOOGLE_SHEETS_WEBHOOK_URL");
    } else {
      googleSheetsUrl = Deno.env.get("GOOGLE_SHEETS_WEBHOOK_URL");
    }
    
    if (googleSheetsUrl) {
      try {
        // Format date as dd/mm/yyyy
        const now = new Date();
        const day = String(now.getDate()).padStart(2, '0');
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const year = now.getFullYear();
        const formattedDate = `${day}/${month}/${year}`;
        
        const sheetData = isHifzProgram ? {
          timestamp: formattedDate,
          firstName,
          lastName,
          studentAge,
          previousExperience: previousExperience || '',
          contactNumber: actualPhone,
          email,
          parentName: parentName || '',
          address: address || '',
          town: town || '',
          postcode: postcode || '',
          additionalNotes: additionalNotes || ''
        } : {
          timestamp: formattedDate,
          formSource: "Program Registration",
          programName,
          firstName,
          lastName,
          studentAge,
          parentName: parentName || '',
          address: address || '',
          town: town || '',
          postcode: postcode || '',
          phone: actualPhone,
          email,
          educationLevel: educationLevel || '',
          status: "Interested"
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

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-program-registration function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
