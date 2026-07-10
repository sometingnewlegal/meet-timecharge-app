import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/auth";

// 弁護士側ページ全体を簡易パスワードで保護する。
// /register（依頼者向け招待リンク）はinviteToken単独で守る設計なので対象外にする。
export function proxy(request) {
  const password = process.env.APP_PASSWORD;
  if (!password) {
    // 未設定のまま保護なしで公開されるのを避けるため、設定するまで全面ブロックする
    return new NextResponse("APP_PASSWORD が設定されていません。環境変数を設定してください。", {
      status: 500,
    });
  }

  if (request.cookies.get(AUTH_COOKIE_NAME)?.value === password) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!register|login|_next/static|_next/image|favicon.ico).*)"],
};
