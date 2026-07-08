import { getClientByToken } from "@/lib/store";
import RegisterForm from "./RegisterForm";
import UpcomingMeetings from "./UpcomingMeetings";
import { chooseCandidateAction } from "./actions";

export default async function RegisterPage({ params }) {
  const { token } = await params;
  const client = await getClientByToken(token);

  if (!client) {
    return (
      <main>
        <p>このリンクは無効です。送付元にご確認ください。</p>
      </main>
    );
  }

  // 候補日時がまだ選ばれていなければ、カード登録済みかどうかに関わらず先に日程を選んでもらう
  if (client.pendingRequest) {
    return (
      <main>
        <h1>ご都合の良い日時をお選びください</h1>
        <p className="muted">相談の長さ: {client.pendingRequest.durationMinutes}分</p>
        {client.pendingRequest.candidates.map((iso) => (
          <form action={chooseCandidateAction} key={iso} className="card">
            <input type="hidden" name="token" value={token} />
            <input type="hidden" name="chosenIso" value={iso} />
            <button type="submit">{new Date(iso).toLocaleString("ja-JP")}</button>
          </form>
        ))}
      </main>
    );
  }

  // カード登録まで完了している場合だけ、フォームを出さず予約情報を直接表示する
  // （statusではなくdefaultPaymentMethodIdの有無で判定＝カード登録前にMeetリンクが見えてしまうことを防ぐ）
  if (client.defaultPaymentMethodId) {
    return (
      <main>
        <h1>ご相談のご案内</h1>
        <p className="muted">{client.name} 様、ご登録ありがとうございます。</p>
        <UpcomingMeetings clientId={client.id} />
      </main>
    );
  }

  return (
    <main>
      <h1>ご登録のお願い</h1>
      <p className="muted">
        タイムチャージ相談のご利用にあたり、お客様情報とお支払いカードのご登録をお願いいたします。
        ご登録が完了すると、このページにご相談用のMeetリンクが表示されます。
        カード番号は決済代行会社（Stripe）が管理し、当方のサーバーには保存されません。
      </p>
      <RegisterForm
        token={token}
        initialName={client.name}
        initialCompanyName={client.companyName}
        initialEmail={client.email}
      />
    </main>
  );
}
