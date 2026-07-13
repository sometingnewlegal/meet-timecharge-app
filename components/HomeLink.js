import Link from "next/link";
import { Home } from "lucide-react";

// 各ページ左上の「トップへ戻る」。緑の小さなテキストリンクでは見落とされがちだったため、
// 家アイコン＋本文色のガラスピルにして視認性を上げている
export default function HomeLink() {
  return (
    <div className="nav">
      <Link href="/" className="home-link">
        <Home size={17} strokeWidth={2.2} />
        トップ
      </Link>
    </div>
  );
}
