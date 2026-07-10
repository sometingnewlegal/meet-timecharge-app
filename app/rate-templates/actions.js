"use server";
import { addRateTemplate, deleteRateTemplate } from "@/lib/store";
import { revalidatePath } from "next/cache";

export async function addRateTemplateAction(formData) {
  const name = formData.get("name")?.toString().trim();
  const unitMinutes = Number(formData.get("unitMinutes"));
  const pricePerUnit = Number(formData.get("pricePerUnit"));
  if (!name || !Number.isFinite(unitMinutes) || !Number.isFinite(pricePerUnit)) return;

  await addRateTemplate({ name, unitMinutes, pricePerUnit });
  revalidatePath("/rate-templates");
  revalidatePath("/start");
}

export async function deleteRateTemplateAction(formData) {
  const id = formData.get("id")?.toString();
  await deleteRateTemplate(id);
  revalidatePath("/rate-templates");
  revalidatePath("/start");
}
