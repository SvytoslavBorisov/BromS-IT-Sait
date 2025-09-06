// src/app/api/org/options/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/org/options?companyId=...&departmentId=...
 * Возвращает справочники:
 * - companies: всегда (id, title)
 * - departments: если передан companyId (или все, если не передан)
 * - positions:   если передан companyId (или все, если не передан)
 * - managers:    если передан companyId и/или departmentId (пользователи в этой компании/отделе)
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const companyId = url.searchParams.get("companyId") || undefined;
    const departmentId = url.searchParams.get("departmentId") || undefined;

    const [companies, departments, positions, managers] = await Promise.all([
      prisma.company.findMany({
        select: { id: true, title: true },
        orderBy: { title: "asc" },
      }),
      prisma.department.findMany({
        where: companyId ? { companyId } : undefined,
        select: { id: true, title: true, companyId: true },
        orderBy: { title: "asc" },
      }),
      prisma.position.findMany({
        where: companyId ? { companyId } : undefined,
        select: { id: true, title: true, companyId: true, rank: true },
        orderBy: [{ rank: "asc" }, { title: "asc" }],
      }),
      prisma.user.findMany({
        where: {
          ...(companyId ? { companyId } : {}),
          ...(departmentId ? { departmentId } : {}),
        },
        select: { id: true, name: true, surname: true, patronymic: true, email: true, positionId: true, departmentId: true },
        orderBy: [{ surname: "asc" }, { name: "asc" }],
        take: 200, // sane limit
      }),
    ]);

    return NextResponse.json({ companies, departments, positions, managers });
  } catch (e) {
    console.error("options GET error:", e);
    return NextResponse.json({ error: "Не удалось получить справочники" }, { status: 500 });
  }
}
