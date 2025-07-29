"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const res = await signIn("credentials", {
      redirect: false,        // отключаем авто-редирект
      email,
      password,
      callbackUrl: "/",       // <-- сюда
    });

    if (res?.error) {
      setError("Неверный логин или пароль");
    } else {
      // если NextAuth вернул url, то на него, иначе на '/'
      router.push(res?.url ?? "/");
    }
  };
  
  return (
    <div className="max-w-md mx-auto p-4">
      <h1 className="text-2xl mb-4">Вход</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="text-red-500">{error}</p>}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="w-full p-2 border rounded"
          required
        />
        <input
          type="password"
          placeholder="Пароль"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="w-full p-2 border rounded"
          required
        />
        <button type="submit" className="w-full py-2 bg-green-600 text-white rounded">
          Войти
        </button>
      </form>
    </div>
  );
}
