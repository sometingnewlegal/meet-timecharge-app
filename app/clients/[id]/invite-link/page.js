import Link from "next/link";
import { getClient } from "@/lib/store";
import { headers } from "next/headers";

export default async function InviteLinkPage({ params }) {
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

  const h = await headers();
  const host = h.get("host");
  const protocol = host?.startsWith("localhost") ? "http" : "https";
  const url = `${protocol}://${host}/register/${client.inviteToken}`;

  return (
    <main>
      <div className="nav">
        <Link href="/clients">顧客管理へ戻る</Link>
      </div>
      <h1>招待リンク</h1>
      <p className="muted">
        このリンクをメールやチャットで相談者ご本人に送ってください。
        氏名・会社名・メールアドレスの入力とカード登録を、相手側の画面で行っていただけます。
      </p>
      <div className="card">
        <input type="text" readOnly value={url} />
      </div>
      <p className="muted">
        {client.status === "pending"
          ? "まだ相手が入力していません。"
          : `${client.name} 様は既に登録済みです。カードの再登録にもこのリンクを使えます。`}
      </p>
    </main>
  );
}
