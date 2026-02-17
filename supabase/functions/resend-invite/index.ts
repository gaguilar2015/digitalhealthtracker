import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Authenticate the caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing Authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Client with caller's JWT to verify identity
    const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: caller }, error: userError } = await callerClient.auth.getUser();
    if (userError || !caller) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Check caller is admin
    const { data: callerMember, error: memberError } = await callerClient
      .from("team_members")
      .select("permission_level")
      .eq("id", caller.id)
      .single();

    if (memberError || !callerMember || callerMember.permission_level !== "admin") {
      return new Response(
        JSON.stringify({ error: "Only admins can resend invites" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 2. Parse request body
    const { email } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Missing required field: email" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 3. Admin client with service role key
    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Look up user ID from team_members
    const { data: teamMember } = await adminClient
      .from("team_members")
      .select("id")
      .eq("email", email)
      .single();

    if (teamMember) {
      // Always reset email_confirmed_at first (harmless if already null).
      // This ensures inviteUserByEmail won't fail with "already registered".
      const { error: rpcError } = await adminClient.rpc('reset_email_confirmation', {
        target_user_id: teamMember.id,
      });
      if (rpcError) {
        console.error("reset_email_confirmation RPC failed:", rpcError.message);
      }
    }

    // Single invite call — only one rate-limit slot consumed
    const { error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
      redirectTo: 'https://bz-health-tracker.netlify.app',
    });

    if (inviteError) {
      console.error("inviteUserByEmail failed:", inviteError.message);
      return new Response(
        JSON.stringify({ error: inviteError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("Unexpected error:", err.message);
    return new Response(
      JSON.stringify({ error: err.message ?? "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
