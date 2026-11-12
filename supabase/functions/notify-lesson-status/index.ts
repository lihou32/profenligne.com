import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { escapeHtml } from "../_shared/html.ts";

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
    // Authenticate the caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use anon client to verify user identity
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

    // Admin client for trusted operations (insert notification, send email)
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { lessonId, newStatus } = await req.json() as {
      lessonId: string;
      newStatus: "confirmed" | "cancelled";
    };

    if (!lessonId || !["confirmed", "cancelled"].includes(newStatus)) {
      return new Response(JSON.stringify({ error: "Invalid payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch lesson details
    const { data: lesson, error: lessonError } = await supabaseAdmin
      .from("lessons")
      .select("id, subject, topic, scheduled_at, student_id, tutor_id, duration_minutes, status")
      .eq("id", lessonId)
      .single();

    if (lessonError || !lesson) {
      return new Response(JSON.stringify({ error: "Lesson not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Only the tutor of the lesson can trigger this notification
    if (lesson.tutor_id !== callerId) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // L'e-mail doit refléter l'état réel du cours (pas de faux « annulé » / « confirmé »)
    if (lesson.status !== newStatus) {
      return new Response(JSON.stringify({ error: "Statut du cours incohérent" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch tutor & student profiles
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("user_id, first_name, last_name, notify_lesson_cancelled, notify_new_message")
      .in("user_id", [lesson.student_id, lesson.tutor_id]);

    const studentProfile = profiles?.find((p) => p.user_id === lesson.student_id);
    const tutorProfile = profiles?.find((p) => p.user_id === lesson.tutor_id);

    const tutorName = tutorProfile
      ? `${tutorProfile.first_name || ""} ${tutorProfile.last_name || ""}`.trim()
      : "Votre tuteur";

    const studentFirstName = studentProfile?.first_name || "Étudiant";

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

    // La notification in-app est créée côté base par la RPC (book_lesson / confirm_lesson / cancel_lesson).
    // Cette fonction ne s'occupe plus que de l'email.
    const isConfirmed = newStatus === "confirmed";

    // ─── 2. Email notification via Resend ─────────────────────────────────────
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured — skipping email");
      return new Response(
        JSON.stringify({ success: true, emailSent: false, reason: "RESEND_API_KEY missing" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check student's notification preferences (notify_lesson_cancelled = also covers confirmations in this context)
    // We'll only skip email if notify_lesson_cancelled is explicitly false for cancellations
    const shouldEmail = isConfirmed ? true : (studentProfile?.notify_lesson_cancelled !== false);

    // Get student's email
    const { data: { user: studentUser }, error: userError } = await supabaseAdmin.auth.admin.getUserById(lesson.student_id);

    if (userError || !studentUser?.email) {
      console.error("Could not fetch student email:", userError);
      return new Response(
        JSON.stringify({ success: true, emailSent: false, reason: "Student email not found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let emailSent = false;

    if (shouldEmail) {
      const emailSubject = isConfirmed
        ? `✅ Cours confirmé : ${lesson.subject} le ${dateStr} à ${timeStr}`
        : `❌ Cours annulé : ${lesson.subject} le ${dateStr} à ${timeStr}`;

      const emailHtml = isConfirmed
        ? `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a2e;">
            <div style="background: linear-gradient(135deg, #7c3aed, #4f46e5); padding: 32px; border-radius: 16px 16px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">✅ Cours confirmé !</h1>
            </div>
            <div style="background: #f9fafb; padding: 32px; border-radius: 0 0 16px 16px; border: 1px solid #e5e7eb; border-top: none;">
              <p style="font-size: 16px;">Bonjour <strong>${escapeHtml(studentFirstName)}</strong>,</p>
              <p style="font-size: 15px; color: #4b5563;">
                Bonne nouvelle ! <strong>${escapeHtml(tutorName)}</strong> a accepté votre demande de cours.
              </p>
              <div style="background: white; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; margin: 20px 0;">
                <p style="margin: 0 0 8px; font-size: 14px; color: #6b7280;">Détails du cours</p>
                <p style="margin: 0 0 6px; font-size: 16px; font-weight: bold;">📚 ${escapeHtml(lesson.subject)}${lesson.topic ? ` — ${escapeHtml(lesson.topic)}` : ""}</p>
                <p style="margin: 0 0 6px; font-size: 14px; color: #4b5563;">📅 ${dateStr} à ${timeStr}</p>
                <p style="margin: 0; font-size: 14px; color: #4b5563;">⏱ ${escapeHtml(lesson.duration_minutes)} minutes</p>
              </div>
              <p style="font-size: 14px; color: #6b7280;">Connectez-vous à la plateforme quelques minutes avant l'heure pour rejoindre la salle de cours.</p>
              <p style="color: #6b7280; font-size: 13px; margin-top: 24px;">À bientôt,<br/>L'équipe Ton Prof en Ligne</p>
            </div>
          </div>
        `
        : `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a2e;">
            <div style="background: linear-gradient(135deg, #dc2626, #b91c1c); padding: 32px; border-radius: 16px 16px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">Cours annulé</h1>
            </div>
            <div style="background: #f9fafb; padding: 32px; border-radius: 0 0 16px 16px; border: 1px solid #e5e7eb; border-top: none;">
              <p style="font-size: 16px;">Bonjour <strong>${escapeHtml(studentFirstName)}</strong>,</p>
              <p style="font-size: 15px; color: #4b5563;">
                Nous sommes désolés, <strong>${escapeHtml(tutorName)}</strong> n'est pas disponible pour votre cours de <strong>${escapeHtml(lesson.subject)}</strong> prévu le <strong>${dateStr} à ${timeStr}</strong>.
              </p>
              <p style="font-size: 14px; color: #6b7280;">Vous pouvez réserver un nouveau cours avec un autre tuteur depuis votre espace.</p>
              <p style="color: #6b7280; font-size: 13px; margin-top: 24px;">Cordialement,<br/>L'équipe Ton Prof en Ligne</p>
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
          from: "Ton Prof en Ligne <onboarding@resend.dev>",
          to: [studentUser.email],
          subject: emailSubject,
          html: emailHtml,
        }),
      });

      if (emailRes.ok) {
        emailSent = true;
        console.log(`Notification email sent to ${studentUser.email} for lesson ${lessonId}`);
      } else {
        const errBody = await emailRes.text();
        console.error(`Failed to send email to ${studentUser.email}:`, errBody);
      }
    }

    return new Response(
      JSON.stringify({ success: true, emailSent }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in notify-lesson-status:", error);
    return new Response(
      JSON.stringify({ error: "Erreur interne" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
