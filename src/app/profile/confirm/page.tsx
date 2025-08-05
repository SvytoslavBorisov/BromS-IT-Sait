// src/app/profile/confirm/page.tsx
"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { generateConfirmationToken, verifyConfirmationToken } from "@/lib/confirmation"

type Status = 
  | "loading" 
  | "no-token" 
  | "resent" 
  | "invalid" 
  | "success"

export default function ConfirmPageClient() {
  const searchParams = useSearchParams()
  const tokenParam = searchParams.get("token")
  const [status, setStatus] = useState<Status>("loading")
  const [errorMsg, setErrorMsg] = useState<string>("")

  useEffect(() => {
    async function run() {
      if (!tokenParam) {
        setStatus("no-token")
        try {
          // TODO: заменить email и userId на реальные из контекста
          await fetch("/api/send-confirmation", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: "sv_borisov03@mail.ru",
              userId: "cmdvnokk7000lt9awzparu4ds",
            }),
          })
          setStatus("resent")
        } catch (err) {
          console.error(err)
          setErrorMsg("Не удалось отправить письмо")
          setStatus("invalid")
        }
        return
      }

      // есть токен — проверяем на клиенте
      const result = verifyConfirmationToken(tokenParam)
      if (!result.valid) {
        setErrorMsg(result.error || "Невалидный токен")
        setStatus("invalid")
      } else {
        setStatus("success")
      }
    }

    run()
  }, [tokenParam])

  if (status === "loading") {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p>Проверяем…</p>
      </main>
    )
  }

  if (status === "no-token" || status === "resent") {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold">
            {status === "no-token" ? "Нет токена" : "Новый код отправлен"}
          </h1>
          <p className="mt-2">
            {status === "no-token"
              ? "Ссылка должна была содержать токен."
              : "Проверьте свою почту и перейдите по присланной ссылке."}
          </p>
        </div>
      </main>
    )
  }

  if (status === "invalid") {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-red-600 text-2xl">Ошибка подтверждения</h1>
          <p className="mt-2">{errorMsg}</p>
        </div>
      </main>
    )
  }

  // success
  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <h1 className="text-green-600 text-2xl">Email успешно подтверждён!</h1>
    </main>
  )
}
