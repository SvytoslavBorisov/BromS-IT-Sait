// Воркёр: принимает { stateBytes: Uint8Array, difficulty } и подбирает nonce (u64 BE)
self.onmessage = async (e: MessageEvent) => {
  const { stateBytes, difficulty, yieldEvery = 4096 } = e.data as {
    stateBytes: Uint8Array; difficulty: number; yieldEvery?: number;
  };

  const leadingZeroBits = (buf: Uint8Array) => {
    let c = 0;
    for (let i = 0; i < buf.length; i++) {
      const b = buf[i];
      if (b === 0) { c += 8; continue; }
      for (let k = 7; k >= 0; k--) {
        if (((b >> k) & 1) === 0) c++; else return c;
      }
      break;
    }
    return c;
  };

  const concat = (a: Uint8Array, b: Uint8Array) => {
    const out = new Uint8Array(a.length + b.length);
    out.set(a, 0);
    out.set(b, a.length);
    return out;
  };

  const nonce = new Uint8Array(8);
  const view = new DataView(nonce.buffer);
  let nHi = 0 >>> 0, nLo = 0 >>> 0;

  const start = performance.now();
  let iters = 0;

  while (true) {
    // u64++ (BE)
    nLo = (nLo + 1) >>> 0;
    if (nLo === 0) nHi = (nHi + 1) >>> 0;
    view.setUint32(0, nHi, false);
    view.setUint32(4, nLo, false);

    // SHA-256(state || nonce)
    const input = concat(stateBytes, nonce);
    const hashBuf = await crypto.subtle.digest("SHA-256", input);
    const hash = new Uint8Array(hashBuf);

    if (leadingZeroBits(hash) >= difficulty) {
      const nonceHex = [...nonce].map(b => b.toString(16).padStart(2, "0")).join("");
      const hashHex = [...hash].map(b => b.toString(16).padStart(2, "0")).join("");
      const ms = performance.now() - start;
      (self as any).postMessage({ ok: true, nonceHex, hashHex, ms });
      return;
    }

    if ((++iters % yieldEvery) === 0) {
      await new Promise(r => setTimeout(r, 0)); // уступим UI
    }
  }
};
