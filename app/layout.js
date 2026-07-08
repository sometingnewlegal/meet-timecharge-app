import "./globals.css";

export const metadata = {
  title: "タイムチャージ相談アプリ",
  description: "相談時間の計測・料金計算・承認",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
