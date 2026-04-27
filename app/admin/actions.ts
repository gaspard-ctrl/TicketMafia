"use server";

import { revalidatePath } from "next/cache";
import { isAuthenticated } from "@/lib/auth";
import { generateTitlesBatch } from "@/lib/ai/title";
import { createServiceClient } from "@/lib/supabase/service";

export type RenameResult = {
  total: number;
  processed: number;
};

// Generate Claude titles for tickets that have never been AI-titled yet.
// Skips tickets that already have title_ai_generated_at set so we don't
// overwrite either past Claude titles or manual edits the user made afterward.
export async function regenerateMissingTitles(): Promise<RenameResult> {
  if (!(await isAuthenticated())) throw new Error("unauthenticated");

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("tickets")
    .select("id, body")
    .is("title_ai_generated_at", null)
    .is("archived_at", null);

  if (error) {
    console.error("regenerateMissingTitles select failed", error);
    return { total: 0, processed: 0 };
  }

  const targets = (data ?? []).filter((t) => t.body && t.body.trim().length > 0);
  if (targets.length === 0) return { total: 0, processed: 0 };

  const titles = await generateTitlesBatch(
    targets.map((t) => ({ id: t.id, body: t.body as string }))
  );

  const now = new Date().toISOString();
  let processed = 0;
  for (const [id, title] of titles) {
    const { error: updErr } = await supabase
      .from("tickets")
      .update({ title, title_ai_generated_at: now })
      .eq("id", id);
    if (!updErr) processed++;
  }

  revalidatePath("/");
  revalidatePath("/admin");
  return { total: targets.length, processed };
}
