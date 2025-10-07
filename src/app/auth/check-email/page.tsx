// Server Component (App Router)
// В Next 15+ searchParams — это Promise: его нужно await'ить

type SP =
  | Record<string, string | string[] | undefined>
  | undefined;

function pickEmail(sp: SP) {
  const raw = sp?.email;
  const v = Array.isArray(raw) ? raw[0] : raw;
  return v ?? "указанную почту";
}

export default async function CheckEmailPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const email = pickEmail(sp);

  return (
    <main className="mx-auto max-w-xl p-6 flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Проверьте почту</h1>

      <p>
        Мы отправили письмо для подтверждения аккаунта на адрес{" "}
        <span className="font-medium">{email}</span>.
      </p>

      <ul className="list-disc pl-6 text-sm text-gray-600">
        <li>Откройте письмо и перейдите по ссылке подтверждения.</li>
        <li>Если письма нет — проверьте папку «Спам» или «Промоакции».</li>
      </ul>

      <div className="flex items-center gap-3 text-sm">
        <a href="/auth/login" className="underline">Вернуться ко входу</a>
        <span className="text-gray-400">•</span>
        <a
          href={`/auth/resend?email=${encodeURIComponent(email)}`}
          className="underline"
        >
          Отправить письмо ещё раз
        </a>
      </div>
    </main>
  );
}
