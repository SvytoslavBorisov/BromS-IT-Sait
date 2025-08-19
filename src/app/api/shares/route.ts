import { NextResponse }     from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions }       from "@/lib/auth";
import { prisma }           from "@/lib/prisma";
import { log }              from "@/lib/logger";
import { generateGostKeyPair } from "@/lib/crypto/gost3410"

export async function POST(request: Request) {
  // 1) Авторизация
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  console.log('BIOFAWGBFIUAWBFIWUABDF');

  // 2) Парсим тело VSS-параметров
  const {
    p,
    q,
    g,
    p_as_key,
    a_as_key,
    b_as_key,
    m_as_key,
    q_as_key,
    xp_as_key,
    yp_as_key,
    Q_as_key,
    commitments,
    title,
    threshold,
    type,
    publicKey,
    shares,
  } = (await request.json()) as {
    p: string;
    q: string;
    g: string;
    p_as_key: string;
    a_as_key: string;
    b_as_key: string;
    m_as_key: string;
    q_as_key: string;
    xp_as_key: string;
    yp_as_key: string;
    Q_as_key: string;
    commitments: string[];
    title: string,
    threshold: number;
    type: "CUSTOM" |"ASYMMETRIC";
    publicKey: string;
    shares: Array<{
      recipientId:         string;
      x:                   string;
      ciphertext:          number[];
      status:              "ACTIVE" | "USED" | "EXPIRED";
      comment:             string;
      encryptionAlgorithm: string;
      expiresAt:           string | null;
    }>;
  };

  let vssSession;
  // 3) Создаём новую VSS-сессию в БД
  if (type == 'ASYMMETRIC') {

    vssSession = await prisma.shamirSession.create({
      data: {
        dealerId:   session.user.id,
        p,
        q,
        g,
        commitments,
        threshold,
        type: 'ASYMMETRIC',
        title
      },
    });

    await prisma.asymmetricKey.create({
      data: {
        privateKeySharingId:   vssSession.id,
        publicKey: publicKey,
        p: p_as_key,
        a:  a_as_key,
        b: b_as_key,
        q: q_as_key,
        xp: xp_as_key,
        yp: yp_as_key,
        Q: Q_as_key
      },
    });

  }
  else {

    vssSession = await prisma.shamirSession.create({
      data: {
        dealerId:   session.user.id,
        p,
        q,
        g,
        commitments,
        threshold,
        title,
        type: 'CUSTOM'
      },
    });

  };

  // 4) Сохраняем все зашифрованные доли с новыми полями
  await prisma.share.createMany({
    data: shares.map((s) => ({
      sessionId:           vssSession.id,
      userId:              s.recipientId,
      x:                   s.x,
      ciphertext:          s.ciphertext,            // Prisma JSON поддерживает массивы
      status:              s.status,
      comment:             s.comment,
      encryptionAlgorithm: s.encryptionAlgorithm,
      expiresAt:           s.expiresAt ? new Date(s.expiresAt) : null,
    })),
  });

  return NextResponse.json({ ok: true, sessionId: vssSession.id });
}