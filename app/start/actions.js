"use server";
import { createScheduleRequest } from "@/lib/store";
import { redirect } from "next/navigation";

export async function createScheduleRequestAction(formData) {
  const email = formData.get("email")?.toString().trim();
  const rateTemplateId = formData.get("rateTemplateId");
  const durationMinutes = Number(formData.get("durationMinutes")) || 30;
  const candidates = [1, 2, 3]
    .map((i) => formData.get(`candidate${i}`)?.toString())
    .filter(Boolean)
    .map((local) => new Date(local).toISOString());
  if (!email || !rateTemplateId || candidates.length === 0) return;

  const client = await createScheduleRequest({ email, rateTemplateId, durationMinutes, candidates });
  redirect(`/clients/${client.id}/invite-link`);
}
