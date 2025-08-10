// src/app/api/document/crypto/encryptFile/route.ts

import { NextRequest, NextResponse } from "next/server";
import forge from 'node-forge';
import fs from 'fs';
import { writeFileSync, unlinkSync, readFileSync } from "fs";
import path from "path";
import nodeCrypto from 'crypto';           // встроенный модуль Node.js
import gostCrypto1 from 'gost-crypto/lib/index.js';
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { log } from "@/lib/logger"
import { authOptions }       from "@/lib/auth";
import { decodeCiphertext }      from "@/lib/crypto/keys";
import { verifyShare, reconstructSecretVSS }      from "@/lib/crypto/shamir";
import { signGost, verifyGost, generateGostKeyPair }      from "@/lib/crypto/gost3410";
import { fileToBitString }      from "@/lib/crypto/file_to_bits";
import { loadPrivateJwk }   from "@/lib/crypto/secure-storage";
import os from "os";
import { spawn } from "child_process";
import BN from 'bn.js';
import jwkToPem from 'jwk-to-pem';
import type { ECPrivate } from "jwk-to-pem"; 
import asn1 from "asn1.js";
import { execSync } from 'child_process'
import * as asn1js from 'asn1js';
import { Certificate, PrivateKeyInfo } from 'pkijs';
import { Crypto } from "@peculiar/webcrypto";
import gostEngine from 'gost-crypto/lib/gostEngine'
import { gostCrypto } from 'node-gost-crypto';

export const runtime = 'nodejs';  // убедитесь, что это nodejs роут


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
        const { r, s } = signGost(new TextDecoder().decode(bytes), hexData);
        
        await prisma.documentSignSession.update({
            where: { recoveryId: recovery!.id },
            data: {
                publicKeyId: recovery?.shareSession.publicKey?.id,
                r,
                s
            }
        });

        console.log(verifyGost(recovery?.shareSession.publicKey?.publicKey!, hexData, r, s));

        const privPem = new TextDecoder().decode(bytes);
        
        console.log('asdada', privPem, recovery?.shareSession.publicKey?.publicKey!, r, s);

        const dHex = Buffer.from(bytes).toString("hex");

        const coordLen = recovery?.shareSession.publicKey?.publicKey!.length! / 2;
        const xHex = recovery?.shareSession.publicKey?.publicKey!.slice(0, coordLen);
        const yHex = recovery?.shareSession.publicKey?.publicKey!.slice(coordLen);

        const idGostR3410_2012_256 = [1,2,643,7,1,1,1,1];
        const gostParamSetA        = [1,2,643,2,2,35,1]; 

        // 5) Собираем буферы
        // --- константы-OID-ы ---------------------------------------------------------
        const id_tc26_gost3410_12_256   = [1, 2, 643, 7, 1, 1, 1, 1];  // id-tc26-gost3410-12-256
        const id_GostR3410_2001_CPA     = [1, 2, 643, 2, 2, 35, 1];     // CryptoPro A
        const id_tc26_gost3411_12_256   = [1, 2, 643, 7, 1, 1, 2, 2];  // id-tc26-gost3411-12-256

        // --- Схема чистого GOST ECPrivateKey без PKCS#8 и без publicKey ----------------
        const GOSTPrivateKey = asn1.define('GOSTPrivateKey', function(this: any) {
        this.seq().obj(
            this.key('version').int(),                               // INTEGER, чаще 0 или 1
            this.key('algorithm').seq().obj(                         // AlgorithmIdentifier
            this.key('algorithm').objid(),                        // id-tc26-gost3410-12-256
            this.key('parameters').seq().obj(
                this.key('publicKeyParamSet').objid(),              // id-GostR3410-2001-CryptoPro-A-ParamSet
                this.key('digestParamSet').objid()                  // id-tc26-gost3411-12-256
            )
            ),
            this.key('privateKey').octstr()                         // OCTET STRING (32 байта)
        );
        });

        // --- Входные данные ---------------------------------------------------------
        const privateKeyHex = '0953067fd9c7f34adb91a8e65179b32e6c486ce8759630ad241c9e85b1b52ba4';
        const dBuf = Buffer.from(privateKeyHex, 'hex');
        console.log(dBuf);

        // --- Кодируем GOST ECPrivateKey → DER --------------------------------------
        const gostDer = GOSTPrivateKey.encode({
        version:     0,
        algorithm: {
            algorithm:  id_tc26_gost3410_12_256,
            parameters: {
            publicKeyParamSet: id_GostR3410_2001_CPA,
            digestParamSet:    id_tc26_gost3411_12_256
            }
        },
        privateKey: dBuf
        }, 'der');

        // --- Собираем PEM -----------------------------------------------------------
        const pemLines = gostDer.toString('base64').match(/.{1,64}/g)!;
        const pem = [
        '-----BEGIN PRIVATE KEY-----',
        ...pemLines,
        '-----END PRIVATE KEY-----',
        ''
        ].join('\n');
        const tmpKeyPath = path.join('C:\\Users\\svyto', `gostkey-${Date.now()}.pem`);
        writeFileSync(tmpKeyPath, pem, 'utf8');
// --- Записываем файл под WSL в Windows-папку --------------------------------
// --- 4) Записываем в Windows-папку через WSL-путь ---------------------------

        return new NextResponse(pem, {
            status: 201,
            headers: {
            "Content-Type":        "application/pkcs7-signature",
            "Content-Disposition": `attachment; filename="${original.fileName}.p7s"`
            }
        });
    }

}