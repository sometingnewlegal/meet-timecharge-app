"use client";
import { useState, useTransition } from "react";
import { submitRegistrationAction } from "./actions";

export default function RegisterForm({ token, initialName, initialCompanyName, initialEmail }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(null);

  function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        const url = await submitRegistrationAction(token, formData);
        window.location.href = url;
      } catch (err) {
        setError(err?.message || String(err));
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="card">
      <label>
        氏名
        <input type="text" name="name" required defaultValue={initialName} placeholder="例: 山田 太郎" />
      </label>
      <label>
        会社名（任意）
        <input type="text" name="companyName" defaultValue={initialCompanyName} placeholder="例: 株式会社サンプル" />
      </label>
      <label>
        メールアドレス（任意・領収書の送付先になります）
        <input type="email" name="email" defaultValue={initialEmail} placeholder="例: yamada@example.com" />
      </label>
      <button type="submit" disabled={pending}>
        {pending ? "処理中…" : "次へ（カード登録画面へ進む）"}
      </button>
      {error && <p className="muted">エラー: {error}</p>}
    </form>
  );
}
