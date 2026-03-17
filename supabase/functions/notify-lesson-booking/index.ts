import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate the caller (must be the student who booked)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseUser.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerId = claimsData.claims.sub;

    // Admin client for trusted operations
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { lessonId } = await req.json() as { lessonId: string };

    if (!lessonId) {
      return new Response(JSON.stringify({ error: "Missing lessonId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch lesson details
    const { data: lesson, error: lessonError } = await supabaseAdmin
      .from("lessons")
      .select("id, subject, topic, scheduled_at, student_id, tutor_id, duration_minutes")
      .eq("id", lessonId)
      .single();

    if (lessonError || !lesson) {
      return new Response(JSON.stringify({ error: "Lesson not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Only the student of this lesson can trigger this notification
    if (lesson.student_id !== callerId) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch student & tutor profiles
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("user_id, first_name, last_name, notify_new_message")
      .in("user_id", [lesson.student_id, lesson.tutor_id]);

    const studentProfile = profiles?.find((p) => p.user_id === lesson.student_id);
    const tutorProfile = profiles?.find((p) => p.user_id === lesson.tutor_id);

    const studentName = studentProfile
      ? `${studentProfile.first_name || ""} ${studentProfile.last_name || ""}`.trim()
      : "Un élève";
    const tutorFirstName = tutorProfile?.first_name || "Tuteur";

    const scheduledDate = new Date(lesson.scheduled_at);
    const dateStr = scheduledDate.toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      timeZone: "Europe/Paris",
    });
    const timeStr = scheduledDate.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Paris",
    });

    // ─── 1. In-app notification for the tutor ────────────────────────────────
    const notifTitle = `Nouvelle demande de cours — ${lesson.subject}`;
    const notifMessage = `${studentName} a demandé un cours de ${lesson.subject}${lesson.topic ? ` (${lesson.topic})` : ""} le ${dateStr} à ${timeStr} (${lesson.duration_minutes} min). Acceptez ou refusez depuis votre tableau de bord.`;

    const { error: notifError } = await supabaseAdmin.from("notifications").insert({
      user_id: lesson.tutor_id,
      title: notifTitle,
      message: notifMessage,
      type: "lesson",
      read: false,
    });

    if (notifError) {
      console.error("Failed to create in-app notification:", notifError);
    }

    // ─── 2. Email notification to tutor via Resend ───────────────────────────
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ success: true, emailSent: false, reason: "RESEND_API_KEY missing" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check tutor notification preference (using notify_new_message as proxy for new booking alerts)
    if (tutorProfile?.notify_new_message === false) {
      return new Response(
        JSON.stringify({ success: true, inAppNotification: !notifError, emailSent: false, reason: "Tutor disabled notifications" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get tutor's email
    const { data: { user: tutorUser }, error: userError } = await supabaseAdmin.auth.admin.getUserById(lesson.tutor_id);
    if (userError || !tutorUser?.email) {
      console.error("Could not fetch tutor email:", userError);
      return new Response(
        JSON.stringify({ success: true, inAppNotification: !notifError, emailSent: false, reason: "Tutor email not found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const emailHtml = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a2e;">
        <div style="background: linear-gradient(135deg, #7c3aed, #a855f7); padding: 32px; border-radius: 16px 16px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">📚 Nouvelle demande de cours</h1>
        </div>
        <div style="background: #f9fafb; padding: 32px; border-radius: 0 0 16px 16px; border: 1px solid #e5e7eb; border-top: none;">
          <p style="font-size: 16px;">Bonjour <strong>${tutorFirstName}</strong>,</p>
          <p style="font-size: 15px; color: #4b5563;">
            <strong>${studentName}</strong> souhaite réserver un cours avec vous.
          </p>
          <div style="background: white; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; margin: 20px 0;">
            <p style="margin: 0 0 8px; font-size: 14px; color: #6b7280;">Détails de la demande</p>
            <p style="margin: 0 0 6px; font-size: 16px; font-weight: bold;">📖 ${lesson.subject}${lesson.topic ? ` — ${lesson.topic}` : ""}</p>
            <p style="margin: 0 0 6px; font-size: 14px; color: #4b5563;">📅 ${dateStr} à ${timeStr}</p>
            <p style="margin: 0; font-size: 14px; color: #4b5563;">⏱ ${lesson.duration_minutes} minutes</p>
          </div>
          <p style="font-size: 14px; color: #4b5563;">
            Connectez-vous à votre tableau de bord pour <strong>accepter ou refuser</strong> cette demande.
          </p>
          <p style="color: #9ca3af; font-size: 13px; margin-top: 24px;">À bientôt,<br/>L'équipe Prof en Ligne</p>
        </div>
      </div>
    `;

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: "Prof en Ligne <onboarding@resend.dev>",
        to: [tutorUser.email],
        subject: `📚 Nouvelle demande de cours — ${lesson.subject} le ${dateStr}`,
        html: emailHtml,
      }),
    });

    const emailSent = emailRes.ok;
    if (!emailSent) {
      const errBody = await emailRes.text();
      console.error(`Failed to send booking email to tutor ${tutorUser.email}:`, errBody);
    } else {
      console.log(`Booking notification email sent to tutor ${tutorUser.email}`);
    }

    return new Response(
      JSON.stringify({ success: true, inAppNotification: !notifError, emailSent }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in notify-lesson-booking:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
