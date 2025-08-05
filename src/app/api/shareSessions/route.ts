import { NextResponse } from 'next/server';
import { prisma }       from '@/lib/prisma';
import { getServerSession }  from "next-auth/next";
import { authOptions }       from "@/lib/auth";


export async function GET() {

    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // const sessionSelect = {
    // id: true,
    // dealerId: true,
    // p: true,
    // q: true,
    // g: true,
    // commitments: true,
    // threshold: true,
    // createdAt: true,
    // shares: {
    //     select: { x: true, userId: true, ciphertext: true },
    // },
    // recoveries: {
    //     select: { id: true },
    // },
    // };

    // const userId = session?.user.id!;

    // // Запросы
    // const shareSessionsOfParticipant = prisma.shamirSession.findMany({
    //     where: {
    //         shares: { some: { userId } },
    //     },
    //     select: sessionSelect,
    // });

    // const shareSessionsOfDealer = prisma.shamirSession.findMany({
    //     where: {
    //         dealerId: userId,
    //     },
    //     select: sessionSelect,
    // });

    // // Если нужно дождаться обоих:
    // const [participant, dealer] = await Promise.all([
    //     shareSessionsOfParticipant,
    //     shareSessionsOfDealer,
    // ]);

    const userId = session?.user.id!;

    const mySessions = await prisma.shamirSession.findMany({
    where: {
        OR: [
        { shares: { some: { userId } } },  // участник
        { dealerId: userId },               // дилер
        ],
    },
    select: {
        id: true,
        dealerId: true,
        p: true,
        q: true,
        g: true,
        commitments: true,
        threshold: true,
        createdAt: true,
        status: true,
        shares: {
            select: { x: true, userId: true, ciphertext: true },
        },
        recoveries: {
            select: { id: true },
        },
    },
    });

    // 2) Ищем, есть ли уже запущенная сессия восстановления для этой ShamirSession
    // const rec = await prisma.recoverySession.findFirst({
    // where: { shareSessionId: s.id },
    // select: {
    //     dealerId: true,
    //     status:   true,
    // },
    // orderBy: { createdAt: "desc" },  // если их несколько, берём последнюю
    // });

    console.log('mySessions', mySessions);
    if (!mySessions) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(mySessions, { status: 200 });
}
