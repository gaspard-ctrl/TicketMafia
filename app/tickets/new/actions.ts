"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { isAuthenticated } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/service";
import type { TicketCategory } from "@/lib/slack/types";

const CATEGORIES: TicketCategory[] = ["bugs", "features", "super_admin"];

function isCategory(v: unknown): v is TicketCategory {
  return typeof v === "string" && (CATEGORIES as readonly string[]).includes(v);
}

export async function createTicket(formData: FormData) {
  if (!(await isAuthenticated())) throw new Error("unauthenticated");

  const category = formData.get("category");
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const author = String(formData.get("author") ?? "").trim();
  const owner = String(formData.get("owner") ?? "").trim().toLowerCase();
  const deadline = String(formData.get("deadline") ?? "");

  if (!isCategory(category)) {
    redirect(`/tickets/new?error=${encodeURIComponent("Catégorie invalide")}`);
  }
  if (title.length === 0 || title.length > 300) {
    redirect(`/tickets/new?error=${encodeURIComponent("Titre requis (max 300 caractères)")}`);
  }
  if (author.length === 0 || author.length > 60) {
    redirect(`/tickets/new?error=${encodeURIComponent("Auteur requis")}`);
  }

  const insert: Record<string, string | null> = {
    category,
    title,
    body,
    author_name: author,
    status: "todo",
    // Mark as app-created — title is user-provided so don't trigger AI rename
    title_ai_generated_at: new Date().toISOString(),
  };

  if (owner.length > 0 && owner.length <= 40) insert.owner = owner;
  if (/^\d{4}-\d{2}-\d{2}$/.test(deadline)) insert.deadline = deadline;

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("tickets")
    .insert(insert)
    .select("id")
    .single();

  if (error || !data) {
    console.error("createTicket failed", error);
    redirect(
      `/tickets/new?error=${encodeURIComponent("Erreur lors de la création — voir logs")}`
    );
  }

  revalidatePath("/");
  redirect(`/tickets/${data.id}`);
}
