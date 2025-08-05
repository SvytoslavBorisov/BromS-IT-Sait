import type { NextApiRequest, NextApiResponse,  } from 'next';
import { notificationEmitter } from '@/lib/events';
import { getServerSession }     from "next-auth/next";
import { authOptions }          from "@/app/api/auth/[...nextauth]/route";
import { NextResponse }         from "next/server";


export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // 1. Аутентификация
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Заголовки для SSE
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  // 3. Отправляем «пинг», чтобы клиент понял, что коннект жив
  res.write(`: connected\n\n`);

  // 4. Функция-слушатель для этого пользователя
  const onNotif = (notif: any) => {
    // В формате SSE: data: <payload>\n\n
    res.write(`data: ${JSON.stringify(notif)}\n\n`);
  };

  // 5. Подписываемся на события только для своего user.id
  notificationEmitter.on(session?.user.id, onNotif);

  // 6. Отписка при закрытии соединения
  req.on('close', () => {
    notificationEmitter.off(session?.user.id, onNotif);
  });
}

export const GET = async (req: NextApiRequest) => {
  // 1) Аутентификация
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2) Создаём ReadableStream для SSE
  const stream = new ReadableStream({
    start(controller) {
      // helper: отправка события
      const send = (notif: any) => {
        const s = `data: ${JSON.stringify(notif)}\n\n`;
        controller.enqueue(new TextEncoder().encode(s));
      };

      // ping, чтобы клиент понял, что всё живо
      controller.enqueue(new TextEncoder().encode(': connected\n\n'));

      // подписка на события именно этого пользователя
      notificationEmitter.on(session?.user.id, send);

    }
  });

  // 3) Возвращаем ответ с нужными заголовками
  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
};