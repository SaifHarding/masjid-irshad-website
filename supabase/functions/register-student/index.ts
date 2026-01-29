import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

interface ChildData {
  firstName: string;
  middleName?: string;
  lastName: string;
  dateOfBirth: string;
  placeOfBirth: string;
  gender: string;
  level: string;
  ethnicOrigin?: string;
  medicalNotes?: string;
}

interface MaktabRegistrationData {
  guardianName: string;
  primaryParentType?: "father" | "mother";
  email: string;
  address: string;
  townCity: string;
  postcode: string;
  homeTelephone?: string;
  fatherName?: string;
  fatherMobile?: string;
  motherName?: string;
  motherMobile?: string;
  termsAccepted?: boolean;
  children: ChildData[];
  // Legacy single-child fields for backwards compatibility
  firstName?: string;
  middleName?: string;
  lastName?: string;
  dateOfBirth?: string;
  placeOfBirth?: string;
  gender?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('REGISTRATION_API_KEY');
    if (!apiKey) {
      console.error('REGISTRATION_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Registration API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: MaktabRegistrationData = await req.json();
    console.log('Received registration request:', JSON.stringify(body, null, 2));

    // Validate termsAccepted for new registrations
    if (body.children && body.children.length > 0 && body.termsAccepted !== true) {
      console.error('Terms not accepted');
      return new Response(
        JSON.stringify({ error: 'You must accept the terms and conditions to register' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Forward the request to the external API
    const response = await fetch('https://kqezxvivoddnqmylsuwd.supabase.co/functions/v1/register-student', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    console.log('External API response:', response.status, JSON.stringify(data, null, 2));

    // If registration was successful, send confirmation email
    if (response.ok && data.success) {
      try {
        // Determine if this is a multi-child or single-child registration
        const isMultiChild = body.children && body.children.length > 0;
        
        let emailHtml: string;
        
        if (isMultiChild) {
          // Multi-child registration email with escaped values
          const childrenListHtml = body.children.map((child, index) => {
            const safeFirstName = escapeHtml(child.firstName);
            const safeMiddleName = child.middleName ? escapeHtml(child.middleName) : '';
            const safeLastName = escapeHtml(child.lastName);
            const fullName = safeMiddleName 
              ? `${safeFirstName} ${safeMiddleName} ${safeLastName}`
              : `${safeFirstName} ${safeLastName}`;
            return `
              <div style="background-color: #f9fafb; padding: 15px; border-radius: 6px; margin-bottom: 10px;">
                <p style="margin: 0 0 5px 0;"><strong>Child ${index + 1}: ${fullName}</strong></p>
                <p style="margin: 0; font-size: 14px; color: #6b7280;">
                  DOB: ${escapeHtml(child.dateOfBirth)} | Gender: ${escapeHtml(child.gender)} | Level: ${escapeHtml(child.level)}
                </p>
              </div>
            `;
          }).join('');

          const contactInfo = [];
          if (body.fatherName) contactInfo.push(`Father: ${escapeHtml(body.fatherName)}${body.fatherMobile ? ` (${escapeHtml(body.fatherMobile)})` : ''}`);
          if (body.motherName) contactInfo.push(`Mother: ${escapeHtml(body.motherName)}${body.motherMobile ? ` (${escapeHtml(body.motherMobile)})` : ''}`);

          emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #2c5f2d;">Assalamu Alaikum,</h2>
              
              <p>Thank you for registering your children for the Maktab programme at Masjid Irshad.</p>
              
              <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #2c5f2d;">Children Registered (${body.children.length})</h3>
                ${childrenListHtml}
              </div>

              <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #2c5f2d;">Guardian Details</h3>
                <p><strong>Guardian:</strong> ${escapeHtml(body.guardianName)}</p>
                <p><strong>Address:</strong> ${escapeHtml(body.address)}, ${escapeHtml(body.townCity)}, ${escapeHtml(body.postcode)}</p>
                <p><strong>Email:</strong> ${escapeHtml(body.email)}</p>
                ${body.homeTelephone ? `<p><strong>Home:</strong> ${escapeHtml(body.homeTelephone)}</p>` : ''}
                <p><strong>Mobile:</strong> ${contactInfo.join(' | ')}</p>
              </div>
              
              <div style="background-color: #ecfdf5; padding: 15px; border-left: 4px solid #16a34a; margin: 20px 0;">
                <p style="margin: 0; color: #16a34a; font-weight: 500;">Your registration has been successfully received!</p>
              </div>
              
              <h3 style="color: #2c5f2d;">What Happens Next?</h3>
              <div style="background-color: #fef3c7; padding: 15px; border-left: 4px solid #d97706; margin: 20px 0;">
                <p style="margin: 0; color: #92400e;"><strong>Important:</strong> Your application is now under review. You will be notified via email upon acceptance to the Maktab with further steps including:</p>
                <ul style="margin: 10px 0 0 0; padding-left: 20px; color: #92400e;">
                  <li>Confirmation of your children's places</li>
                  <li>Start date and class assignments</li>
                  <li>Programme schedule and expectations</li>
                  <li>Required materials and fees information</li>
                </ul>
              </div>
              
              <h3 style="color: #2c5f2d;">About the Maktab Programme</h3>
              <p>Our Maktab provides Islamic education including Quran recitation, Islamic studies, and Arabic for children in a nurturing environment.</p>
              
              <p>Please allow up to 5-7 working days for your application to be reviewed. If you have any urgent queries, please contact us.</p>
              
              <p style="margin-top: 30px;">
                JazakAllah Khair,<br>
                <strong>Masjid Irshad Team</strong>
              </p>
              
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
              
              <p style="font-size: 12px; color: #6b7280;">
                Masjid Irshad<br>
                400b Dallow Rd, Luton, LU1 1UR<br>
                This email was sent automatically from our website.
              </p>
            </div>
          `;
        } else {
          // Legacy single-child format with escaped values
          const safeFirstName = escapeHtml(body.firstName || '');
          const safeMiddleName = body.middleName ? escapeHtml(body.middleName) : '';
          const safeLastName = escapeHtml(body.lastName || '');
          const fullName = safeMiddleName 
            ? `${safeFirstName} ${safeMiddleName} ${safeLastName}`
            : `${safeFirstName} ${safeLastName}`;

          emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #2c5f2d;">Assalamu Alaikum,</h2>
              
              <p>Thank you for registering <strong>${fullName}</strong> for the Maktab programme at Masjid Irshad.</p>
              
              <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #2c5f2d;">Registration Details</h3>
                <p><strong>Student Name:</strong> ${fullName}</p>
                <p><strong>Date of Birth:</strong> ${escapeHtml(body.dateOfBirth || '')}</p>
                <p><strong>Gender:</strong> ${escapeHtml(body.gender || '')}</p>
                <p><strong>Place of Birth:</strong> ${escapeHtml(body.placeOfBirth || '')}</p>
                <p><strong>Address:</strong> ${escapeHtml(body.address)}, ${escapeHtml(body.townCity)}, ${escapeHtml(body.postcode)}</p>
                <p><strong>Guardian:</strong> ${escapeHtml(body.guardianName)}</p>
                <p><strong>Contact:</strong> ${escapeHtml(body.fatherMobile || body.motherMobile || '')}</p>
              </div>
              
              <div style="background-color: #ecfdf5; padding: 15px; border-left: 4px solid #16a34a; margin: 20px 0;">
                <p style="margin: 0; color: #16a34a; font-weight: 500;">Your registration has been successfully received!</p>
              </div>
              
              <h3 style="color: #2c5f2d;">What Happens Next?</h3>
              <div style="background-color: #fef3c7; padding: 15px; border-left: 4px solid #d97706; margin: 20px 0;">
                <p style="margin: 0; color: #92400e;"><strong>Important:</strong> Your application is now under review. You will be notified via email upon acceptance to the Maktab with further steps including:</p>
                <ul style="margin: 10px 0 0 0; padding-left: 20px; color: #92400e;">
                  <li>Confirmation of your child's place</li>
                  <li>Start date and class assignment</li>
                  <li>Programme schedule and expectations</li>
                  <li>Required materials and fees information</li>
                </ul>
              </div>
              
              <h3 style="color: #2c5f2d;">About the Maktab Programme</h3>
              <p>Our Maktab provides Islamic education including Quran recitation, Islamic studies, and Arabic for children in a nurturing environment.</p>
              
              <p>Please allow up to 5-7 working days for your application to be reviewed. If you have any urgent queries, please contact us.</p>
              
              <p style="margin-top: 30px;">
                JazakAllah Khair,<br>
                <strong>Masjid Irshad Team</strong>
              </p>
              
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
              
              <p style="font-size: 12px; color: #6b7280;">
                Masjid Irshad<br>
                400b Dallow Rd, Luton, LU1 1UR<br>
                This email was sent automatically from our website.
              </p>
            </div>
          `;
        }

        const emailResponse = await resend.emails.send({
          from: "Masjid Irshad <noreply@masjidirshad.co.uk>",
          to: [body.email],
          subject: isMultiChild 
            ? `Maktab Registration Confirmed (${body.children.length} ${body.children.length === 1 ? 'child' : 'children'}) - Masjid Irshad`
            : "Maktab Registration Confirmed - Masjid Irshad",
          html: emailHtml,
        });

        console.log("Confirmation email sent to registrant:", emailResponse);
      } catch (emailError: any) {
        console.error("Failed to send confirmation email:", emailError.message);
        // Don't fail the request if email fails - registration was still successful
      }
    }

    return new Response(
      JSON.stringify(data),
      { 
        status: response.status, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error: unknown) {
    console.error('Error in register-student function:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
