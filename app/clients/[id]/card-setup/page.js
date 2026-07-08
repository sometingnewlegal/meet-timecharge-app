import Link from "next/link";
import { getClient } from "@/lib/store";
import CardSetupButton from "./CardSetupButton";

export default async function CardSetupPage({ params }) {
  const { id } = await params;
  const client = await getClient(id);

  if (!client) {
    return (
      <main>
        <p>顧客が見つかりません。</p>
        <Link href="/clients">戻る</Link>
      </main>
    );
  }

  return (
    <main>
      <div className="nav">
        <Link href="/clients">顧客管理へ戻る</Link>
      </div>
      <h1>カード登録: {client.name} 様</h1>
      <p className="muted">
        「カード登録ページへ進む」を押すと、Stripe（決済代行会社）の安全な入力画面に移動します。
        カード番号はStripe側で管理され、当アプリのサーバーには一切保存されません。
      </p>
      {client.stripeCustomerId ? (
        <p className="muted">※ 既にカードが登録されています。再登録すると新しいカードに置き換わります。</p>
      ) : null}
      <CardSetupButton clientId={client.id} />
    </main>
  );
}
