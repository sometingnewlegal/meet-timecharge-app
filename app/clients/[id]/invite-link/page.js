import Link from "next/link";
import { getClient } from "@/lib/store";
import { baseUrl } from "@/lib/baseUrl";

export default async function InviteLinkPage({ params }) {
  const { id } = await params;
  const client = await getClient(id);

  if (!client) {
    return (
      <main>
        <p>顧客が見つかりません。</p>
        <Link href="/">トップへ戻る</Link>
      </main>
    );
  }

  const url = `${await baseUrl()}/register/${client.inviteToken}`;

  return (
    <main>
      <div className="nav">
        <Link href="/">トップへ戻る</Link>
      </div>
      <h1>招待リンク</h1>
      <p className="muted">
        このリンクをメールやチャットで相談者ご本人に送ってください。
        {client.pendingRequest
          ? "まず候補日時から都合の良いものを選んでもらい、続けて氏名・会社名・メールアドレスの入力とカード登録を、相手側の画面で行っていただけます。"
          : "氏名・会社名・メールアドレスの入力とカード登録を、相手側の画面で行っていただけます。"}
      </p>
      <div className="card">
        <input type="text" readOnly value={url} />
      </div>
      <p className="muted">
        {client.pendingRequest
          ? "まだ日程が選ばれていません。"
          : client.status === "pending"
          ? "まだ相手が入力していません。"
          : `${client.name} 様は既に登録済みです。カードの再登録にもこのリンクを使えます。`}
      </p>
    </main>
  );
}
