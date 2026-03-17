import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate cron secret to prevent unauthorized triggers
    const authHeader = req.headers.get("Authorization");
    const cronSecret = Deno.env.get("CRON_SECRET");
    if (cronSecret && (!authHeader || authHeader !== `Bearer ${cronSecret}`)) {
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
      if (!authHeader || !anonKey || authHeader !== `Bearer ${anonKey}`) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get preregistrations from the last 7 days
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const { data: newPreregs, error: preregError } = await supabase
      .from("preregistrations")
      .select("*")
      .gte("created_at", oneWeekAgo.toISOString())
      .order("created_at", { ascending: false });

    if (preregError) throw preregError;

    // Get total count
    const { count: totalCount } = await supabase
      .from("preregistrations")
      .select("*", { count: "exact", head: true });

    const newCount = newPreregs?.length || 0;
    const students = newPreregs?.filter((p) => p.role === "student") || [];
    const tutors = newPreregs?.filter((p) => p.role === "tutor") || [];

    // Build CSV attachment
    const csvHeader = "Email,Role,Date d'inscription";
    const csvRows = (newPreregs || []).map((p) => {
      const role = p.role === "student" ? "Élève" : "Tuteur";
      const date = new Date(p.created_at).toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
      return `${p.email},${role},${date}`;
    });
    const csvContent = [csvHeader, ...csvRows].join("\n");
    const csvBase64 = btoa(unescape(encodeURIComponent("\uFEFF" + csvContent)));

    // Build email HTML
    const tableRows = (newPreregs || [])
      .map(
        (p) => `
        <tr>
          <td style="padding:8px;border-bottom:1px solid #eee">${p.email}</td>
          <td style="padding:8px;border-bottom:1px solid #eee">${p.role === "student" ? "Élève" : "Tuteur"}</td>
          <td style="padding:8px;border-bottom:1px solid #eee">${new Date(p.created_at).toLocaleDateString("fr-FR")}</td>
        </tr>`
      )
      .join("");

    const html = `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#6366f1">📊 Rapport hebdomadaire des préinscrits</h2>
        <p>Voici le récapitulatif de la semaine :</p>
        <div style="display:flex;gap:16px;margin:16px 0">
          <div style="background:#f0f0ff;padding:16px;border-radius:8px;flex:1;text-align:center">
            <div style="font-size:24px;font-weight:bold;color:#6366f1">${newCount}</div>
            <div style="font-size:12px;color:#666">Nouveaux cette semaine</div>
          </div>
          <div style="background:#f0fff0;padding:16px;border-radius:8px;flex:1;text-align:center">
            <div style="font-size:24px;font-weight:bold;color:#22c55e">${students.length}</div>
            <div style="font-size:12px;color:#666">Élèves</div>
          </div>
          <div style="background:#fff0f0;padding:16px;border-radius:8px;flex:1;text-align:center">
            <div style="font-size:24px;font-weight:bold;color:#ef4444">${tutors.length}</div>
            <div style="font-size:12px;color:#666">Tuteurs</div>
          </div>
          <div style="background:#f5f5f5;padding:16px;border-radius:8px;flex:1;text-align:center">
            <div style="font-size:24px;font-weight:bold;color:#333">${totalCount || 0}</div>
            <div style="font-size:12px;color:#666">Total</div>
          </div>
        </div>
        ${
          newCount > 0
            ? `<table style="width:100%;border-collapse:collapse;margin-top:16px">
                <thead>
                  <tr style="background:#f5f5f5">
                    <th style="padding:8px;text-align:left">Email</th>
                    <th style="padding:8px;text-align:left">Rôle</th>
                    <th style="padding:8px;text-align:left">Date</th>
                  </tr>
                </thead>
                <tbody>${tableRows}</tbody>
              </table>`
            : `<p style="color:#999;text-align:center;padding:24px">Aucun nouveau préinscrit cette semaine.</p>`
        }
        <p style="margin-top:24px;font-size:12px;color:#999">Ce rapport est envoyé automatiquement chaque lundi à 9h.</p>
      </div>
    `;

    // Get admin email from body or use default
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const adminEmail = body.admin_email || "onboarding@resend.dev";

    // Send email via Resend
    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Tutorat <onboarding@resend.dev>",
        to: [adminEmail],
        subject: `📊 Rapport hebdo : ${newCount} nouveau(x) préinscrit(s)`,
        html,
        attachments: [
          {
            filename: `preinscrits_semaine_${new Date().toISOString().split("T")[0]}.csv`,
            content: csvBase64,
            content_type: "text/csv",
          },
        ],
      }),
    });

    const emailData = await emailRes.json();
    if (!emailRes.ok) {
      throw new Error(`Resend error [${emailRes.status}]: ${JSON.stringify(emailData)}`);
    }

    return new Response(
      JSON.stringify({ success: true, new_count: newCount, total: totalCount }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Weekly report error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
