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
    // Autorisation : uniquement le secret cron (la clé anon est publique, elle ne suffit pas)
    const authHeader = req.headers.get("Authorization");
    const cronSecret = Deno.env.get("CRON_SECRET");
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    // Find lessons starting between 55 min and 65 min from now
    // (gives a 10-min window so cron runs every 5-10 min without duplicates)
    const now = new Date();
    const in55min = new Date(now.getTime() + 55 * 60 * 1000);
    const in65min = new Date(now.getTime() + 65 * 60 * 1000);

    const { data: lessons, error: lessonsError } = await supabaseAdmin
      .from("lessons")
      .select("id, subject, topic, scheduled_at, student_id, tutor_id, duration_minutes, status")
      .eq("status", "confirmed")
      .gte("scheduled_at", in55min.toISOString())
      .lte("scheduled_at", in65min.toISOString());

    if (lessonsError) throw lessonsError;

    if (!lessons || lessons.length === 0) {
      return new Response(
        JSON.stringify({ message: "No upcoming lessons to remind (1h window)", sent: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let emailCount = 0;
    let notifCount = 0;

    for (const lesson of lessons) {
      const userIds = [lesson.student_id, lesson.tutor_id];

      const { data: profiles } = await supabaseAdmin
        .from("profiles")
        .select("user_id, first_name, last_name, notify_lesson_reminder")
        .in("user_id", userIds);

      const scheduledDate = new Date(lesson.scheduled_at);
      const dateStr = scheduledDate.toLocaleDateString("fr-FR", {
        weekday: "long", day: "numeric", month: "long",
        timeZone: "Europe/Paris",
      });
      const timeStr = scheduledDate.toLocaleTimeString("fr-FR", {
        hour: "2-digit", minute: "2-digit",
        timeZone: "Europe/Paris",
      });

      for (const userId of userIds) {
        const profile = profiles?.find((p) => p.user_id === userId);

        // Respect notification preference
        if (profile && !profile.notify_lesson_reminder) continue;

        const isStudent = userId === lesson.student_id;
        const partnerProfile = profiles?.find(
          (p) => p.user_id === (isStudent ? lesson.tutor_id : lesson.student_id)
        );
        const partnerName = partnerProfile
          ? `${partnerProfile.first_name || ""} ${partnerProfile.last_name || ""}`.trim()
          : isStudent ? "votre professeur" : "votre élève";

        const firstName = profile?.first_name || (isStudent ? "Élève" : "Professeur");

        // ── In-app notification ──────────────────────────────────────────────
        const notifTitle = `Rappel — cours dans 1h : ${lesson.subject}`;
        const notifMessage = `Votre cours de ${lesson.subject}${lesson.topic ? ` (${lesson.topic})` : ""} avec ${partnerName} commence à ${timeStr}. Pensez à rejoindre la salle à temps !`;

        const { error: notifErr } = await supabaseAdmin.from("notifications").insert({
          user_id: userId,
          title: notifTitle,
          message: notifMessage,
          type: "lesson",
          read: false,
        });

        if (!notifErr) notifCount++;
        else console.error(`Failed to create in-app notif for ${userId}:`, notifErr);

        // ── Email ────────────────────────────────────────────────────────────
        if (!resendApiKey) continue;

        const { data: { user: authUser }, error: userErr } = await supabaseAdmin.auth.admin.getUserById(userId);
        if (userErr || !authUser?.email) {
          console.error(`Email not found for user ${userId}:`, userErr);
          continue;
        }

        const emailHtml = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a2e;">
            <div style="background: linear-gradient(135deg, #7c3aed, #a855f7); padding: 32px; border-radius: 16px 16px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">⏰ Rappel — cours dans 1 heure</h1>
            </div>
            <div style="background: #f9fafb; padding: 32px; border-radius: 0 0 16px 16px; border: 1px solid #e5e7eb; border-top: none;">
              <p style="font-size: 16px;">Bonjour <strong>${firstName}</strong>,</p>
              <p style="font-size: 15px; color: #4b5563;">
                Votre cours de <strong>${lesson.subject}</strong>${lesson.topic ? ` (${lesson.topic})` : ""} avec <strong>${partnerName}</strong> commence dans <strong>1 heure</strong>.
              </p>
              <div style="background: white; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; margin: 20px 0;">
                <p style="margin: 0 0 6px; font-size: 16px; font-weight: bold;">📚 ${lesson.subject}${lesson.topic ? ` — ${lesson.topic}` : ""}</p>
                <p style="margin: 0 0 6px; font-size: 14px; color: #4b5563;">📅 ${dateStr} à <strong>${timeStr}</strong></p>
                <p style="margin: 0; font-size: 14px; color: #4b5563;">⏱ ${lesson.duration_minutes} minutes avec <strong>${partnerName}</strong></p>
              </div>
              <p style="font-size: 14px; color: #4b5563;">Connectez-vous quelques minutes avant l'heure pour rejoindre la salle de cours.</p>
              <p style="color: #9ca3af; font-size: 13px; margin-top: 24px;">À tout de suite,<br/>L'équipe Prof en Ligne</p>
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
            to: [authUser.email],
            subject: `⏰ Rappel : cours de ${lesson.subject} à ${timeStr} (dans 1h)`,
            html: emailHtml,
          }),
        });

        if (emailRes.ok) {
          emailCount++;
          console.log(`1h reminder email sent to ${authUser.email} for lesson ${lesson.id}`);
        } else {
          const errBody = await emailRes.text();
          console.error(`Failed to send reminder to ${authUser.email}:`, errBody);
        }
      }
    }

    return new Response(
      JSON.stringify({
        message: "1-hour reminders processed",
        lessonsFound: lessons.length,
        emailsSent: emailCount,
        inAppNotifications: notifCount,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in send-lesson-reminders:", error);
    return new Response(
      JSON.stringify({ error: "Erreur interne" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
