"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { checkPassword, clearSession, setSession } from "@/lib/auth";

export async function login(formData: FormData) {
  const password = String(formData.get("password") ?? "");

  if (!checkPassword(password)) {
    redirect(`/login?error=${encodeURIComponent("Mot de passe incorrect")}`);
  }

  await setSession();
  revalidatePath("/", "layout");
  redirect("/");
}

export async function signOut() {
  await clearSession();
  redirect("/login");
}
