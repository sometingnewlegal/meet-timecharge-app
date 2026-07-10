import { headers } from "next/headers";

// このアプリ自身の公開URL（プロトコル+ホスト）を組み立てる。
// Stripe Checkoutの success_url/cancel_url や、招待リンクの表示に使う。
export async function baseUrl() {
  const h = await headers();
  const host = h.get("host");
  const protocol = host?.startsWith("localhost") ? "http" : "https";
  return `${protocol}://${host}`;
}
