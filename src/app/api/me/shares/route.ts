import { NextResponse }        from "next/server";
import { getServerSession }    from "next-auth/next";
import { authOptions }         from "@/app/api/auth/[...nextauth]/route";
import { prisma }              from "@/lib/prisma";

export async function GET(req: Request) {
  // 1) Проверяем сессию
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  // 2) Достаем из БД все зашифрованные доли этого пользователя
  //    Предполагаем, что таблица Шар имеет поля: userId, x, ciphertext
  const shares = await prisma.share.findMany({
    where: { userId },
    select: {
      x: true,
      ciphertext: true,
    },
    orderBy: { x: "asc" },   // опционально — упорядочим по x
  });

  // 3) Отдаём клиенту JSON-массив
  return NextResponse.json(shares);
}