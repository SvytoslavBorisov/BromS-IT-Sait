"use client";

import React, { useMemo, useRef, useState } from "react";
import { MyDealerlessScheme } from "@/lib/crypto/scheme";
import { bytesConcat, enc } from "@/lib/crypto/bigint-utils";
import type { GroupPolicyConfig } from "@/lib/crypto/groups";
import type { ECPoint } from "@/lib/crypto/gost/ec";
import { ThresholdECIES } from "@/lib/crypto/ecies_threshold";

const td = new TextDecoder();

// helpers
const u8 = (s: string) => enc.encode(s);
const toHex = (u: Uint8Array) => Array.from(u).map(b => b.toString(16).padStart(2, "0")).join("");
const pointToStr = (P?: ECPoint | null) =>
  !P || P.x == null ? "INF" : `(${P.x.toString(16)}, ${P.y!.toString(16)})`;

export default function PlaygroundPage() {
  // === UI state ===
  const [n, setN] = useState(5);
  const [t, setT] = useState(3);
  const [epoch, setEpoch] = useState("2025Q3");

  const [scheme, setScheme] = useState<MyDealerlessScheme | null>(null);
  const [log, setLog] = useState<string>("");

  // ECIES
  const [msg, setMsg] = useState("Threshold ECIES demo: hello from dealerless DKG!");
  const [aad, setAad] = useState("hdr:v1");
  const [ctState, setCtState] = useState<ReturnType<ThresholdECIES["encrypt"]> | null>(null);
  const [selPeople, setSelPeople] = useState<number[]>([2, 3, 4]);
  const [eciesPlain, setEciesPlain] = useState<string>("");

  // Groups
  const defaultCfg: GroupPolicyConfig = useMemo(() => ({
    groups: { G0: [1, 5], G1: [2], G2: [3], G3: [4], G_veto: [1, 2] },
    outer_threshold: 2,
    inner_thresholds: { G0: 1, G1: 1, G2: 1, G3: 1, G_veto: 2 },
    veto_group: "G_veto"
  }), []);
  const [cfgText, setCfgText] = useState(JSON.stringify(defaultCfg, null, 2));
  const [participating, setParticipating] = useState<string[]>(["G0", "G2", "G_veto"]);
  const [aad2, setAad2] = useState("doc:42");
  const [jIdx, setJIdx] = useState(0);

  // выбор членов внутри каждой группы (минимальные подсеты по умолчанию)
  const [membersSel, setMembersSel] = useState<Record<string, number[]>>({
    G0: [5],
    G1: [2],
    G2: [3],
    G3: [4],
    G_veto: [1, 2]
  });

  // Double-lock payload
  const [payload, setPayload] = useState("DOUBLE-LOCK: super secret payload");
  const [payloadCt, setPayloadCt] = useState<Uint8Array | null>(null);
  const [payloadTag, setPayloadTag] = useState<Uint8Array | null>(null);
  const [payloadPt, setPayloadPt] = useState<string>("");

  // === Actions ===
  const appendLog = (s: string) => setLog(prev => (prev ? prev + "\n" : "") + s);

  const initScheme = () => {
    try {
      const sch = new MyDealerlessScheme({
        n, t,
        epoch: u8(epoch),
        veto_threshold: 2,
      });
      setScheme(sch);
      setLog("");
      appendLog(`✔ DKG инициализировано: n=${n}, t=${t}`);
      appendLog(`Q = ${pointToStr(sch.getPublicKeyQ())}`);
    } catch (e: any) {
      appendLog(`ERROR: ${String(e?.message || e)}`);
    }
  };

  const encryptECIES = () => {
    if (!scheme) return;
    try {
      const ct = scheme.eciesEncrypt(u8(msg), u8(aad));
      setCtState(ct);
      setEciesPlain("");
      appendLog(`[ECIES] R=${pointToStr(ct.R)} ct=${ct.ct.length} tag=${ct.tag.length}`);
    } catch (e: any) {
      appendLog(`ERROR: ${String(e?.message || e)}`);
    }
  };

  const decryptECIES = () => {
    if (!scheme || !ctState) return;
    try {
      const parts = selPeople.map(pid => scheme.eciesPartial(pid, ctState, selPeople));
      const pt = scheme.eciesDecryptWithPartials(ctState, parts, u8(aad));
      setEciesPlain(td.decode(pt));
      appendLog(`[ECIES] ✔ decrypted OK`);
    } catch (e: any) {
      setEciesPlain("");
      appendLog(`ERROR: ${String(e?.message || e)}`);
    }
  };

  const initGroups = () => {
    if (!scheme) return;
    try {
      const cfg = JSON.parse(cfgText) as GroupPolicyConfig;
      scheme.initGroupPolicy(cfg);
      appendLog(`✔ Групповая политика инициализирована (t_out=${cfg.outer_threshold}, veto=${cfg.veto_group ?? "—"})`);
    } catch (e: any) {
      appendLog(`ERROR: bad JSON в конфиге групп: ${String(e?.message || e)}`);
    }
  };

  const runDoubleLock = () => {
    if (!scheme || !ctState) return;
    try {
      // 1) точки групп P_g
      const P_g_list = participating.map(name =>
        scheme.groupPartial(
          name,
          (membersSel[name] ?? []).slice(),
          participating.slice(),
          jIdx,
          u8(aad2)
        )
      );
      // 2) S = sum P_g (проверяет вето)
      const S_point = scheme.combineGroups(P_g_list as any, participating);
      appendLog(`[GROUPS] S = ${pointToStr(S_point)}`);

      // 3) Z из кворума людей (можно взять другой кворум, чем для ECIES-раздела)
      const people = selPeople.slice(); // переиспользуем выбранных сверху
      const parts = people.map(pid => scheme.eciesPartial(pid, ctState, people));
      const Z_point = ThresholdECIES.combinePartials(parts as any);
      appendLog(`[ECIES] Z = ${pointToStr(Z_point)}`);

      // 4) CEK из (Z,S) и шифр полезной нагрузки
      const { cek, kMac } = scheme.deriveCEK(Z_point as any, S_point as any, u8(aad2));
      const iv = u8("IV:" + aad2).slice(0, 8); // демо‑nonce
      const ct = scheme.streamEnc(cek, iv, u8(payload));
      const tag = scheme.mac256(kMac, bytesConcat(u8(aad2), ct));
      setPayloadCt(ct);
      setPayloadTag(tag);
      appendLog(`[DL] payload_ct=${ct.length} tag=${tag.length}`);

      // 5) проверка
      const pt = scheme.streamEnc(cek, iv, ct);
      setPayloadPt(td.decode(pt));
      appendLog(`[DL] ✔ payload decrypted OK`);
    } catch (e: any) {
      setPayloadCt(null); setPayloadTag(null); setPayloadPt("");
      appendLog(`ERROR: ${String(e?.message || e)}`);
    }
  };

  // === Render helpers ===
  const renderPeopleChooser = () => {
    const arr = Array.from({ length: n }, (_, i) => i + 1);
    return (
      <div className="flex flex-wrap gap-2">
        {arr.map(pid => {
          const on = selPeople.includes(pid);
          return (
            <label key={pid} className={`px-2 py-1 rounded-md border cursor-pointer ${on ? "bg-black text-white" : "bg-white"}`}>
              <input
                type="checkbox"
                className="hidden"
                checked={on}
                onChange={() =>
                  setSelPeople(prev =>
                    prev.includes(pid) ? prev.filter(x => x !== pid) : [...prev, pid].sort((a, b) => a - b)
                  )
                }
              />
              {pid}
            </label>
          );
        })}
      </div>
    );
  };

  const parsedCfg: GroupPolicyConfig | null = useMemo(() => {
    try { return JSON.parse(cfgText); } catch { return null; }
  }, [cfgText]);

  const renderGroupsChooser = () => {
    if (!parsedCfg) return <p className="text-red-600 text-sm">Некорректный JSON конфигурации</p>;
    const names = Object.keys(parsedCfg.groups);
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {names.map(name => {
            const on = participating.includes(name);
            return (
              <label key={name} className={`px-2 py-1 rounded-md border cursor-pointer ${on ? "bg-black text-white" : "bg-white"}`}>
                <input
                  type="checkbox"
                  className="hidden"
                  checked={on}
                  onChange={() =>
                    setParticipating(prev =>
                      prev.includes(name) ? prev.filter(x => x !== name) : [...prev, name]
                    )
                  }
                />
                {name}
              </label>
            );
          })}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {names.map(name => {
            const members = parsedCfg.groups[name];
            const chosen = membersSel[name] ?? [];
            return (
              <div key={name} className="rounded-lg border p-3">
                <div className="font-medium mb-2">{name} · члены: [{members.join(", ")}] · t_in={parsedCfg.inner_thresholds[name]}</div>
                <div className="flex flex-wrap gap-2">
                  {members.map(pid => {
                    const on = chosen.includes(pid);
                    return (
                      <label key={pid} className={`px-2 py-1 rounded-md border cursor-pointer ${on ? "bg-neutral-900 text-white" : "bg-white"}`}>
                        <input
                          type="checkbox"
                          className="hidden"
                          checked={on}
                          onChange={() =>
                            setMembersSel(prev => {
                              const list = (prev[name] ?? []).slice();
                              const idx = list.indexOf(pid);
                              if (idx >= 0) list.splice(idx, 1); else list.push(pid);
                              return { ...prev, [name]: list.sort((a, b) => a - b) };
                            })
                          }
                        />
                        {pid}
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // === UI ===
  return (
    <div className="max-w-5xl mx-auto px-6 py-10 space-y-10">
      <header>
        <h1 className="text-2xl font-bold">Dealerless DKG + Threshold ECIES + Groups — Playground</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Нажимайте кнопки слева направо: инициализация DKG → ECIES → группы → «двойной замок».
        </p>
      </header>

      {/* DKG init */}
      <section className="rounded-2xl border p-4">
        <h2 className="font-semibold mb-3">1) Инициализация DKG</h2>
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs text-neutral-500">Участники (n)</label>
            <input type="number" value={n} min={2} max={12} onChange={e => setN(+e.target.value)}
                   className="border rounded-md px-2 py-1 w-28"/>
          </div>
          <div>
            <label className="block text-xs text-neutral-500">Порог (t)</label>
            <input type="number" value={t} min={1} max={n} onChange={e => setT(+e.target.value)}
                   className="border rounded-md px-2 py-1 w-28"/>
          </div>
          <div className="grow min-w-[200px]">
            <label className="block text-xs text-neutral-500">Epoch</label>
            <input value={epoch} onChange={e => setEpoch(e.target.value)} className="border rounded-md px-2 py-1 w-full"/>
          </div>
          <button onClick={initScheme} className="px-4 py-2 rounded-xl bg-black text-white">Init DKG</button>
        </div>
      </section>

      {/* ECIES */}
      <section className="rounded-2xl border p-4">
        <h2 className="font-semibold mb-3">2) Пороговый ECIES</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-neutral-500">Сообщение</label>
              <input value={msg} onChange={e => setMsg(e.target.value)} className="border rounded-md px-2 py-1 w-full"/>
            </div>
            <div>
              <label className="block text-xs text-neutral-500">AAD</label>
              <input value={aad} onChange={e => setAad(e.target.value)} className="border rounded-md px-2 py-1 w-full"/>
            </div>
            <div className="flex gap-2">
              <button onClick={encryptECIES} className="px-4 py-2 rounded-xl bg-black text-white">Encrypt</button>
              <button onClick={decryptECIES} className="px-4 py-2 rounded-xl border">Decrypt (кворум)</button>
            </div>
            {ctState && (
              <div className="text-xs text-neutral-600 space-y-1">
                <div>R: <code className="break-all">{pointToStr(ctState.R)}</code></div>
                <div>ct: {ctState.ct.length} / tag: {ctState.tag.length}</div>
                <div>tag(hex): <code className="break-all">{toHex(ctState.tag)}</code></div>
              </div>
            )}
          </div>
          <div>
            <div className="text-xs text-neutral-500 mb-1">Выберите кворум людей (PID):</div>
            {renderPeopleChooser()}
            <div className="mt-3 text-sm">
              {eciesPlain ? <span className="text-green-700">Расшифровано: "{eciesPlain}"</span> :
                <span className="text-neutral-400">Пока не расшифровано</span>}
            </div>
          </div>
        </div>
      </section>

      {/* Groups + double lock */}
      <section className="rounded-2xl border p-4">
        <h2 className="font-semibold mb-3">3) Группы и «двойной замок»</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <label className="block text-xs text-neutral-500">Конфиг групп (JSON)</label>
            <textarea value={cfgText} onChange={e => setCfgText(e.target.value)}
                      className="border rounded-md px-2 py-1 w-full h-52 font-mono text-xs"/>
            <div className="flex gap-2">
              <button onClick={initGroups} className="px-4 py-2 rounded-xl bg-black text-white">Init Groups</button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-neutral-500">AAD (политика)</label>
                <input value={aad2} onChange={e => setAad2(e.target.value)} className="border rounded-md px-2 py-1 w-full"/>
              </div>
              <div>
                <label className="block text-xs text-neutral-500">Индекс ресурса j</label>
                <input type="number" value={jIdx} min={0} onChange={e => setJIdx(+e.target.value)}
                       className="border rounded-md px-2 py-1 w-full"/>
              </div>
            </div>

            <div>
              <div className="text-xs text-neutral-500 mb-1">Участвующие группы:</div>
              {renderGroupsChooser()}
            </div>

            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="block text-xs text-neutral-500">Payload (шифруется через «двойной замок»)</label>
                <input value={payload} onChange={e => setPayload(e.target.value)} className="border rounded-md px-2 py-1 w-full"/>
              </div>
              <button onClick={runDoubleLock} className="px-4 py-2 rounded-xl bg-black text-white">Run Double‑Lock</button>
              {payloadCt && payloadTag && (
                <div className="text-xs text-neutral-600 space-y-1">
                  <div>payload_ct(hex): <code className="break-all">{toHex(payloadCt)}</code></div>
                  <div>tag(hex): <code className="break-all">{toHex(payloadTag)}</code></div>
                  <div className="text-green-700">Расшифровано: "{payloadPt}"</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Log */}
      <section className="rounded-2xl border p-4">
        <h2 className="font-semibold mb-3">Лог</h2>
        <pre className="bg-neutral-900 text-neutral-100 p-4 rounded-lg text-xs whitespace-pre-wrap min-h-[120px]">
          {log || "— лог пуст —"}
        </pre>
      </section>

      <footer className="text-xs text-neutral-500">
        Подсказка: можно менять n/t, состав групп, AAD и выбор участников — и смотреть, где кворума не хватает
        (ошибка в логе), а где всё собирается корректно.
      </footer>
    </div>
  );
}
