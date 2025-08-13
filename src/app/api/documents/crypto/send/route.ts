// src/app/api/document/crypto/encryptFile/route.ts

import { NextRequest, NextResponse } from "next/server";
import forge from 'node-forge';
import fs from 'fs';
import { writeFileSync, unlinkSync, readFileSync } from "fs";
import path from "path";
import nodeCrypto from 'crypto';  
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { log } from "@/lib/logger"
import { authOptions }       from "@/lib/auth";
import { decodeCiphertext }      from "@/lib/crypto/keys";
import { verifyShare, reconstructSecretVSS }      from "@/lib/crypto/shamir";
import { signGost, verifyGost, generateGostKeyPair }      from "@/lib/crypto/gost3410";
import { fileToBitString }      from "@/lib/crypto/file_to_bits";
import { loadPrivateJwk }   from "@/lib/crypto/secure-storage";
import asn1 from "asn1.js";
export const runtime = 'nodejs';  // убедитесь, что это nodejs роут


interface Asn1DefinitionContext {
  seq(): any;
  obj(items: Record<string, any>): any;
  key(name: string): {
    int(): void;
    // Добавьте другие методы по необходимости
  };
}


export async function POST(req: NextRequest) {
  // 1) Авторизация
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
        return NextResponse.json({ error: "Неавторизован" }, { status: 401 });
    }

    // 2) Параметры
    const { documentId, sessionId, privJwk } = await req.json();
    console.log('privKeyRef', privJwk);

    const recovery = await prisma.recoverySession.findUnique({
        where: { id: sessionId },
        include: {
            shareSession: {
                select: {
                    p: true,
                    q: true,
                    g: true,
                    commitments: true,
                    threshold: true,
                    publicKey: {
                        select: {
                            id: true,
                            publicKey: true
                        }
                    },
                    shares: {
                        select: {
                            x:      true,
                            userId: true,
                        }
                    }
                }
            },
            receipts: {
                where: { ciphertext: { not: [] as any } },
                select: { shareholderId: true, ciphertext: true },
            }
        },
    });

    console.log(recovery, documentId, sessionId, privJwk)

    if (recovery!.status != 'DONE') {
        return NextResponse.json({ error: "Сессия не готова" }, { status: 404 });
    }
    else {

        const shares = recovery!.receipts.map((r) => {
            const point = recovery!.shareSession.shares.find(
                (sh) => sh.userId === r.shareholderId
                  );
            if (!point) {
                throw new Error(`Не найдена исходная доля для пользователя ${r.shareholderId}`);
            }
            return {
                x:          point.x,
                ciphertext: r.ciphertext as string,
            };
        });

        // Дешифруем и собираем (x,y)
        const points: [bigint, bigint][] = [];

        const privateKey: CryptoKey = await nodeCrypto.subtle.importKey(
            "jwk",               // формат
            privJwk,             // сам JWK-объект
            { 
                name: "RSA-OAEP",  // алгоритм
                hash: "SHA-256" 
            },
            false,               // extractable: ключ нельзя экспортировать обратно
            ["decrypt"]          // какие операции разрешены
        );

        for (const { x, ciphertext } of shares) {

            const cipherBuf = decodeCiphertext(ciphertext);
            const plainBuf = await nodeCrypto.subtle.decrypt(
                { name: "RSA-OAEP" },
                privateKey,
                cipherBuf
            );

            const hex = new TextDecoder().decode(plainBuf).replace(/^0x/i, "");
            points.push([BigInt(x), BigInt(hex)]);
        }
                
        const rawCommitments = recovery!.shareSession.commitments as (string | number)[];

        // 2. Теперь map есть
        const commitmentsBigInt: bigint[] = rawCommitments.map(item =>
            BigInt(item)
        );

        const valid = points.filter(pt =>
            verifyShare(pt, BigInt(recovery!.shareSession.p), BigInt(recovery!.shareSession.g), commitmentsBigInt, BigInt(recovery!.shareSession.q))
        );

        if (valid.length < recovery!.shareSession.threshold) {
        throw new Error(
            `Найдены только ${valid.length} валидных долей из ${recovery!.shareSession.threshold}`
        );

        }
        console.log("ℹ️ Используемый модуль q:", recovery!.shareSession.q);
        // Восстановление секретa по модулю q
        const secretInt = reconstructSecretVSS(valid, BigInt(recovery!.shareSession.q));

        console.log("secretInt:", recovery!.shareSession.q);
        // bigint → hex → Uint8Array → строка
        let hex = secretInt.toString(16);
        console.log("hex:", recovery!.shareSession.q);
        if (hex.length % 2) hex = "0" + hex;
        const bytes = Uint8Array.from(
            hex.match(/.{1,2}/g)!.map(b => parseInt(b, 16))
        );
        console.log("bytes:", recovery!.shareSession.q);
        console.log();

        const original = await prisma.document.findUnique({
            where: { id: documentId },
            select: { filePath: true, fileName: true, fileType: true },
        });
        
        if (!original) {
            return NextResponse.json({ error: "Документ не найден" }, { status: 404 });
        }

        const absPath = path.join(process.cwd(), original.filePath);

        const hexData = await fileToBitString(absPath)
        const privPem = new TextDecoder().decode(bytes);
        const { r, s } = signGost(privPem, hexData);
        
        await prisma.documentSignSession.update({
            where: { recoveryId: recovery!.id },
            data: {
                publicKeyId: recovery?.shareSession.publicKey?.id,
                r,
                s
            }
        });

        console.log(verifyGost(recovery?.shareSession.publicKey?.publicKey!, hexData, r, s));

        
        console.log('privPem', privPem)
        console.log('r', r)
        console.log('s', s)
        console.log('recovery?.shareSession.publicKey?.publicKey!', recovery?.shareSession.publicKey?.publicKey!)
        // const GOSTSignature = asn1.define('GOSTSignature', function(this: Asn1DefinitionContext) {
        // // Главный SEQUENCE содержит один элемент - другой SEQUENCE
        //     this.seq().obj(
        //         this.key('signature').seq().obj(
        //         this.key('r').int(),
        //         this.key('s').int()
        //         )
        //     );
        // });

        // // Кодируем в DER
        // const derSignature = GOSTSignature.encode({ r, s }, 'der');
        // fs.writeFileSync('signature.sig', derSignature);

        return new NextResponse('', {
            status: 201,
            headers: {
            "Content-Type":        "application/pkcs7-signature",
            "Content-Disposition": `attachment; filename="${original.fileName}.sig"`
            }
        });
    }

}