"use client";
import { useState, useTransition } from "react";
import { createCardSetupUrl } from "./actions";

export default function CardSetupButton({ clientId }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(null);

  function handleClick() {
    setError(null);
    startTransition(async () => {
      try {
        const url = await createCardSetupUrl(clientId);
        window.location.href = url;
      } catch (err) {
        setError(err?.message || String(err));
      }
    });
  }

  return (
    <>
      <button onClick={handleClick} disabled={pending}>
        {pending ? "処理中…" : "カード登録ページへ進む"}
      </button>
      {error && <p className="muted">エラー: {error}</p>}
    </>
  );
}
