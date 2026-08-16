import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Permanently deletes the signed-in user's account and all their data. */
export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Purge app data first, then the auth identity.
    for (const table of [
      "set_logs",
      "workout_sessions",
      "exercise_notes",
      "custom_workout_days",
      "ai_usage_events",
    ] as const) {
      const { error } = await supabaseAdmin.from(table).delete().eq("user_id", userId);
      if (error) throw new Error(`Failed to delete ${table}: ${error.message}`);
    }

    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw new Error(`Failed to delete account: ${error.message}`);

    return { ok: true as const };
  });
