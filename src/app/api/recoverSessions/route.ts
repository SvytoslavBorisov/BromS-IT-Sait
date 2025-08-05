import { NextResponse } from 'next/server';
import { prisma }       from '@/lib/prisma';
import { getServerSession }  from "next-auth/next";
import { authOptions }       from "@/app/api/auth/[...nextauth]/route";


export async function GET(req: Request, { params }: { params: { id: string } }) {

    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session?.user.id!;

    const mySessions = await prisma.recoverySession.findMany({
    where: {
        OR: [
        { receipts: { some: { shareholderId: userId } } },  // участник
        { dealerId: userId },               // дилер
        ],
    },
    select: {
        id: true,
        shareSessionId: true,
        dealerId: true,
        createdAt: true,
        finishedAt: true,
        status: true,
        receipts: {
            select: { shareholderId: true },
        }
    },
    });

    console.log('mySessions', mySessions);
    if (!mySessions) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(mySessions, { status: 200 });
}
