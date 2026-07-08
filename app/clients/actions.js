"use server";
import { addClient, createInviteClient } from "@/lib/store";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function addClientAction(formData) {
  const name = formData.get("name")?.toString().trim();
  const email = formData.get("email")?.toString().trim();
  const companyName = formData.get("companyName")?.toString().trim();
  if (!name) return;
  await addClient({ name, email, companyName });
  revalidatePath("/clients");
  revalidatePath("/start");
}

// 招待リンクを発行する（氏名・会社名・メール・カードは相手本人に入力してもらう）
export async function createInviteAction() {
  const client = await createInviteClient();
  redirect(`/clients/${client.id}/invite-link`);
}
