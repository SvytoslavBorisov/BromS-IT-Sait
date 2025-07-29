"use client";
import { signIn, signOut, useSession } from "next-auth/react";

export default function AuthPage() {
  const { data: session, status } = useSession();

  if (status === "loading") return <p>Загрузка...</p>;

  if (!session) {
    return (
      <div>
        <h1>Вход</h1>
        <button onClick={() => signIn("github")}>Войти через GitHub</button>
      </div>
    );
  }

  return (
    <div>
      <h1>Привет, {session.user?.name}</h1>
      <button onClick={() => signOut()}>Выйти</button>
    </div>
  );
}
