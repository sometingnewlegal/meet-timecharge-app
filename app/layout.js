import { Inter } from "next/font/google";
import "./globals.css";
import SettingsMenu from "./SettingsMenu";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata = {
  title: "タイムチャージ相談アプリ",
  description: "相談時間の計測・料金計算・決済",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <body className={inter.variable}>
        <SettingsMenu />
        {children}
      </body>
    </html>
  );
}
