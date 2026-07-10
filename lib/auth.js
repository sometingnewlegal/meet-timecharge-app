// 弁護士側ページ用の簡易パスワードゲート。個人利用規模なので共有パスワード1つのみ。
// 依頼者向けの招待リンク（/register/[token]）はこの対象外（inviteTokenだけで守る、従来通り）。
export const AUTH_COOKIE_NAME = "app_auth";
