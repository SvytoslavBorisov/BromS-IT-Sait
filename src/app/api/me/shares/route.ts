import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface Share {
  id: number;
  x: string;
  ciphertext: number[];
  status: "ACTIVE" | "USED" | "EXPIRED";
  comment: string;
  encryptionAlgorithm: string;
  createdAt: string;
  expiresAt?: string | null;
  createdAtISO: string;
  expiresAtISO: string | null;
  session: {
    id: string;
    dealerId: string;
    p: string; q: string; g: string;
    commitments: string[];
    threshold: number;
    type: "CUSTOM" | "ASYMMETRIC";
    title?: string | null;
  };
}
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const rows = await prisma.share.findMany({
    where: { userId },
    select: {
      id: true,
      x: true,
      ciphertext: true,
      status: true,
      comment: true,
      encryptionAlgorithm: true,
      createdAt: true,
      expiresAt: true,
      session: {
        select: {
          id: true,
          dealerId: true,
          p: true,
          q: true,
          g: true,
          commitments: true,
          threshold: true,
          type: true,
          title: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const data: Share[] = rows.map(r => ({
    id: r.id,
    x: r.x,
    ciphertext: r.ciphertext,
    status: (r.status ?? "ACTIVE") as Share["status"],
    comment: r.comment ?? "",
    encryptionAlgorithm: r.encryptionAlgorithm ?? "RSA-OAEP-256",
    createdAtISO: r.createdAt.toISOString(),
    expiresAtISO: r.expiresAt ? r.expiresAt.toISOString() : null,
    session: {
      id: r.session.id,
      dealerId: r.session.dealerId,
      p: r.session.p,
      q: r.session.q,
      g: r.session.g,
      commitments: r.session.commitments,
      threshold: r.session.threshold,
      type: r.session.type as "CUSTOM" | "ASYMMETRIC",
      title: r.session.title,
    },
  }));

  return NextResponse.json(data);
}
