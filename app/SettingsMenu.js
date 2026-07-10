"use client";
import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Menu, X } from "lucide-react";

// 弁護士側ページ全体で使う設定メニュー。依頼者向けの画面（招待リンク・ログイン）には出さない。
export default function SettingsMenu() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  if (pathname?.startsWith("/register") || pathname === "/login") return null;

  return (
    <>
      <button
        type="button"
        className="settings-trigger"
        aria-label={open ? "設定を閉じる" : "設定を開く"}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <X size={22} /> : <Menu size={22} />}
      </button>

      {open && (
        <>
          <div className="settings-overlay" onClick={() => setOpen(false)} />
          <div className="settings-panel">
            <h2>設定</h2>
            {/* 今後増える設定項目はここにdetailsを追加していく */}
            <div className="settings-accordion">
              <details className="settings-group" open>
                <summary>単価</summary>
                <div className="settings-group-body">
                  <Link href="/rate-templates" className="settings-item" onClick={() => setOpen(false)}>
                    テンプレート登録
                  </Link>
                </div>
              </details>
            </div>
          </div>
        </>
      )}
    </>
  );
}
