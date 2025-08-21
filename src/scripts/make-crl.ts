import { buildGost256Crl } from "@/lib/crypto/gost-crl";
import { streebog256 } from "@/lib/crypto/streebog";
import { CryptoProA_2012_256, gostSigner256 } from "@/lib/crypto/espoint";
import { promises as fs } from "fs";

async function main() {
  // 1. читаем CA
  const caCertPem = await fs.readFile("/opt/ca/secure/ca.pem", "utf8");
  const caPrivHex = (await fs.readFile("/opt/ca/secure/ca.keyhex", "utf8")).trim();

  // 2. список отозванных сертификатов (по серийникам)
  const revoked = [
    // { serial: "0x1234abcd...", reason: 1, revocationDate: new Date() }
  ];

  // 3. номер CRL (инкрементируется при каждом выпуске)
  const crlNumber = 1;

  // 4. генерация
  const { der, pem } = await buildGost256Crl({
    issuerCertDerOrPem: caCertPem,
    issuerPrivateKeyHex: caPrivHex,
    curve: CryptoProA_2012_256 as any,
    streebog256,
    gost3410_2012_256_sign: (e, d, curve) => gostSigner256(e, d, curve as any),
    thisUpdate: new Date(),
    nextUpdate: new Date(Date.now() + 7 * 24 * 3600 * 1000), // неделя
    crlNumber,
    revoked,
  });

  // 5. сохраняем
  await fs.writeFile("ca.crl", Buffer.from(der));
  await fs.writeFile("ca-crl.pem", pem);

  console.log("CRL готов: ca.crl (DER), ca-crl.pem (PEM)");
}

main().catch(console.error);
