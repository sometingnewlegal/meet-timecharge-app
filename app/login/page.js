import { loginAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }) {
  const { next: nextPath, error } = await searchParams;

  return (
    <main>
      <h1>ログイン</h1>
      <form action={loginAction} className="card">
        <input type="hidden" name="next" value={nextPath || "/"} />
        <label>
          パスワード
          <input type="password" name="password" required autoFocus />
        </label>
        {error && <p className="muted">パスワードが違います。</p>}
        <button type="submit">ログイン</button>
      </form>
    </main>
  );
}
