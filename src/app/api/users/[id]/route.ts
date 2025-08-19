import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // подключение к базе

// GET /api/users/[id]?view=basic
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const { searchParams } = new URL(req.url);
  const view = searchParams.get("view") ?? "full";

  try {
    // запрос к базе
    const user = await prisma.user.findUnique({
      where: { id },
      select:
        view === "basic"
          ? {
              id: true,
              name: true,
              surname: true,
              email: true,
              image: true,
              company: { select: { id: true, title: true } },
              department: { select: { id: true, title: true } },
              position: { select: { id: true, title: true } },
            }
          : {
              id: true,
              name: true,
              surname: true,
              email: true,
              image: true,
              company: { select: { id: true, title: true } },
              department: { select: { id: true, title: true } },
              position: { select: { id: true, title: true } },
            },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
