// src/lib/captcha/pow-worker.ts
// Воркёр подбирает nonce для SHA-256(stateBody || nonce)
// Сообщение-вход: { stateBytes: Uint8Array, difficulty: number, yieldEvery?: number, timeBudgetMs?: number }
self.onmessage = async (e: MessageEvent) => {
  const { stateBytes, difficulty, yieldEvery = 8192, timeBudgetMs = 20000 } = e.data as {
    stateBytes: Uint8Array; difficulty: number; yieldEvery?: number; timeBudgetMs?: number;
  };

  if (!(self.crypto && self.crypto.subtle)) {
    (self as any).postMessage({ ok:false, error: "webcrypto_unavailable" });
    return;
  }

  const concat = new Uint8Array(stateBytes.length + 8);
  concat.set(stateBytes, 0);

  const nonce = new Uint8Array(8);
  const writeU64BE = (hi:number, lo:number) => {
    nonce[0]=(hi>>>24)&255; nonce[1]=(hi>>>16)&255; nonce[2]=(hi>>>8)&255; nonce[3]=(hi>>>0)&255;
    nonce[4]=(lo>>>24)&255; nonce[5]=(lo>>>16)&255; nonce[6]=(lo>>>8)&255; nonce[7]=(lo>>>0)&255;
  };
  const toHex = (arr: Uint8Array) => [...arr].map(b=>b.toString(16).padStart(2,"0")).join("");
  const leadingZeroBits = (arr: Uint8Array) => {
    let c=0;
    for (let i=0;i<arr.length;i++){ const b=arr[i];
      if (b===0){c+=8;continue;}
      for (let k=7;k>=0;k--){ if(((b>>k)&1)===0) c++; else return c; }
      break;
    } return c;
  };

  // лёгкий LCG для сканирования nonce
  let hi = (Math.random() * 0x100000000) >>> 0;
  let lo = (Math.random() * 0x100000000) >>> 0;

  const start = performance.now();
  let iters = 0;

  while (true) {
    if (performance.now() - start > timeBudgetMs) {
      (self as any).postMessage({ ok:false, error: "pow_timeout" });
      return;
    }

    writeU64BE(hi, lo);
    concat.set(nonce, stateBytes.length);

    const hash = new Uint8Array(await self.crypto.subtle.digest("SHA-256", concat));
    const zeros = leadingZeroBits(hash);
    if (zeros >= difficulty) {
      (self as any).postMessage({ ok:true, nonceHex: toHex(nonce), hashHex: toHex(hash), zeros, ms: performance.now() - start });
      return;
    }

    // дешёвый LCG шаг
    lo = (lo + 0x9e3779b9) >>> 0;
    if (lo === 0) hi = (hi + 1) >>> 0;

    if ((++iters % yieldEvery) === 0) await new Promise(r => setTimeout(r, 0));
  }
};
