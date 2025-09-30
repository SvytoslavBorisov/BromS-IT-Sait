// src/lib/captcha/pow-client.ts
// digest = SHA-256( stateBody_bytes || nonce_bytes )
// СЮДА передаём ТОЛЬКО stateBody (чистый base64url без точки/подписи).

type Action = "login" | "register" | "resend" | "forgot" | "reset";

export async function solvePow(params: {
  stateB64: string;
  action: Action;
  difficulty: number;
  timeoutMs?: number;
  yieldEvery?: number;
  signal?: AbortSignal;
}): Promise<{ nonceHex: string; hashHex: string; difficulty: number; zeros: number }> {

  const clean = (s: string) => {
    if (!/^[A-Za-z0-9\-_]+$/.test(s)) throw new Error("b64url_invalid");
    return s.replace(/=+$/, "");
  };
  const b64urlToBytes = (s: string) => {
    const padLen = (4 - (s.length % 4)) % 4;
    const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + (padLen ? "=".repeat(padLen) : "");
    let bin = ""; try { bin = atob(b64); } catch { throw new Error("b64_atob_failed"); }
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i) & 0xff;
    return out;
  };

  const stateBodyB64 = clean(params.stateB64);
  const timeoutMs = Math.max(3000, params.timeoutMs ?? 20000);
  const yieldEvery = Math.max(512, params.yieldEvery ?? 8192);
  const required = Math.max(1, Math.min(28, params.difficulty | 0));

  const stateBytes = b64urlToBytes(stateBodyB64);

  // 1) Пробуем web-worker (не блокирует UI)
  try {
    // NB: правильное имя файла — pow-worker.ts
    const worker = new Worker(new URL("./pow-worker.ts", import.meta.url), { type: "module" });
    const result = await new Promise<any>((resolve, reject) => {
      const t = setTimeout(() => { worker.terminate(); reject(new Error("pow_timeout")); }, timeoutMs);
      worker.onmessage = (e: MessageEvent) => { clearTimeout(t); resolve(e.data); worker.terminate(); };
      worker.onerror = (err) => { clearTimeout(t); reject(err); worker.terminate(); };
      worker.postMessage({ stateBytes, difficulty: required, yieldEvery, timeBudgetMs: timeoutMs });
    });

    if (result?.ok) {
      return { nonceHex: result.nonceHex, hashHex: result.hashHex, difficulty: required, zeros: result.zeros };
    }
    // если воркёр отверг — падаем на фолбэк
  } catch {
    // no-op, пойдём фолбэком
  }

  // 2) Фолбэк в главном потоке (крутится медленней и блокирует — только если совсем без воркёра)
  if (!(isSecureContext && (crypto as any)?.subtle)) {
    throw new Error("WebCrypto not available: requires HTTPS secure context");
  }

  const concat = new Uint8Array(stateBytes.length + 8);
  concat.set(stateBytes, 0);

  const nonce = new Uint8Array(8);
  const toHex = (arr: Uint8Array) => [...arr].map(b=>b.toString(16).padStart(2,"0")).join("");
  const writeU64BE = (hi:number, lo:number) => {
    nonce[0]=(hi>>>24)&255; nonce[1]=(hi>>>16)&255; nonce[2]=(hi>>>8)&255; nonce[3]=(hi>>>0)&255;
    nonce[4]=(lo>>>24)&255; nonce[5]=(lo>>>16)&255; nonce[6]=(lo>>>8)&255; nonce[7]=(lo>>>0)&255;
  };
  const leadingZeroBits = (arr: Uint8Array) => {
    let c=0; for (let i=0;i<arr.length;i++){ const b=arr[i];
      if (b===0){c+=8;continue;}
      for (let k=7;k>=0;k--){ if(((b>>k)&1)===0) c++; else return c; }
      break;
    } return c;
  };

  let hi = (Math.random()*0x100000000)>>>0;
  let lo = (Math.random()*0x100000000)>>>0;

  const deadline = performance.now() + timeoutMs;
  let yielded = false;
  let iters = 0;

  while (performance.now() < deadline) {
    if (params.signal?.aborted) throw new Error("pow_aborted");
    writeU64BE(hi, lo);
    concat.set(nonce, stateBytes.length);

    const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", concat));
    const zeros = leadingZeroBits(hash);
    if (zeros >= required) {
      return { nonceHex: toHex(nonce), hashHex: toHex(hash), difficulty: required, zeros };
    }

    lo = (lo + 0x9e3779b9) >>> 0;
    if (lo === 0) hi = (hi + 1) >>> 0;

    if ((++iters & (yieldEvery - 1)) === 0) {
      // уступаем главному потоку
      // eslint-disable-next-line no-await-in-loop
      await new Promise(r => setTimeout(r, yielded ? 0 : 1));
      yielded = true;
    }
  }
  throw new Error("pow_timeout");
}
