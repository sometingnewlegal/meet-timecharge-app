"use server";
import { createScheduleRequest } from "@/lib/store";
import { redirect } from "next/navigation";

export async function createScheduleRequestAction(formData) {
  const title = formData.get("title")?.toString().trim();
  const durationMinutes = Number(formData.get("durationMinutes")) || 30;
  const unitMinutes = Number(formData.get("unitMinutes")) || 15;
  const pricePerUnit = Number(formData.get("pricePerUnit"));
  const freeFirst30 = formData.get("freeFirst30") === "on";
  const candidates = [1, 2, 3, 4, 5]
    .map((i) => formData.get(`candidate${i}`)?.toString())
    .filter(Boolean)
    .map((local) => new Date(local).toISOString());
  if (!title || !Number.isFinite(pricePerUnit) || candidates.length === 0) return;

  const rate = {
    unitMinutes,
    pricePerUnit,
    taxRate: 0.10,
    freeMinutes: freeFirst30 ? 30 : 0,
  };

  const client = await createScheduleRequest({ title, rate, durationMinutes, candidates });
  redirect(`/clients/${client.id}/invite-link`);
}
