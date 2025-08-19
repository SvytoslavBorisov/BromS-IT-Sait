"use client";
import { Row } from "../ui/Row";
import { Section } from "../ui/Section";
import { Switch } from "../ui/Switch";
import { NumberInput, Select } from "../ui/Inputs";
import { UserSettings } from "../types";

export function CryptoSection({ s, setS }: { s: UserSettings; setS: (u: UserSettings) => void }) {
  return (
    <Section title="Криптография и подпись">
      <Row label="Хэш по умолчанию">
        <Select value={s.defaultHash} onChange={(e)=>setS({ ...s, defaultHash: e.target.value as UserSettings["defaultHash"] })}>
          <option value="streebog256">Стрибог‑256</option>
          <option value="sha256">SHA‑256</option>
        </Select>
      </Row>
      <Row label="Алгоритм подписи">
        <Select value={s.defaultSignAlgo} onChange={(e)=>setS({ ...s, defaultSignAlgo: e.target.value as UserSettings["defaultSignAlgo"] })}>
          <option value="gost2012_256">ГОСТ Р 34.10‑2012 (256)</option>
          <option value="rsa_pss">RSA‑PSS</option>
          <option value="ecdsa_p256">ECDSA P‑256</option>
        </Select>
      </Row>
      <Row label="Формат подписи" hint="Профиль фиксирован (BES).">
        <Select value={s.cadesProfile} disabled>
          <option value="cades_bes">CAdES‑BES</option>
        </Select>
      </Row>
      <Row label="Вложение подписи">
        <Select value={s.signatureMode} onChange={(e)=>setS({ ...s, signatureMode: e.target.value as UserSettings["signatureMode"] })}>
          <option value="attached">Attached</option>
          <option value="detached">Detached</option>
        </Select>
      </Row>
      <Row label="TSA‑штамп времени">
        <Switch on={s.tsaEnabled} onToggle={() => setS({ ...s, tsaEnabled: !s.tsaEnabled })} />
      </Row>
      <Row label="Проверка OCSP/CRL">
        <Switch on={s.ocspEnabled} onToggle={() => setS({ ...s, ocspEnabled: !s.ocspEnabled })} />
      </Row>
      <Row label="Ротация ключей (дней)">
        <NumberInput min={30} max={3650} value={s.keyRotationDays} onChange={(e)=>setS({ ...s, keyRotationDays:+e.target.value })} className="w-28" />
      </Row>
      <Row label="Требовать аппаратный ключ">
        <Switch on={s.requireHardwareKey} onToggle={() => setS({ ...s, requireHardwareKey: !s.requireHardwareKey })} />
      </Row>
      <Row label="Кворум t / n" hint="Порог для восстановления/расшаривания.">
        <div className="flex gap-2">
          <NumberInput min={1} value={s.quorumT} onChange={(e)=>setS({ ...s, quorumT:+e.target.value })} className="w-20" />
          <NumberInput min={1} value={s.quorumN} onChange={(e)=>setS({ ...s, quorumN:+e.target.value })} className="w-20" />
        </div>
      </Row>
    </Section>
  );
}
