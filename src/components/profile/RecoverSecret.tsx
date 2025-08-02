"use client";

import { useEffect, useState } from "react";
import { reconstructSecret } from "@/lib/crypto/shamir";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardHeader, CardContent } from "@/components/ui/cards";
import { Button } from "@/components/ui/button";

interface SharePayload {
  x: string;
  ciphertext: number[];
}

interface RecoverSecretProps {
  sessionId: string;
}

export default function RecoverSecret({ sessionId }: RecoverSecretProps) {
  const [prime, setPrime]         = useState<bigint | null>(null);
  const [threshold, setThreshold] = useState<number>(0);
  const [shares, setShares]       = useState<SharePayload[]>([]);
  const [selected, setSelected]   = useState<Set<string>>(new Set());
  const [loading, setLoading]     = useState(false);
  const [secret, setSecret]       = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/shares/recover?sessionId=${sessionId}`)
      .then((r) => r.json())
      .then((data: { prime: string; threshold: number; shares: SharePayload[] }) => {
        setPrime(BigInt(data.prime));
        setThreshold(data.threshold);
        setShares(data.shares);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [sessionId]);

  const toggle = (x: string) => {
    setSelected((s) => {
      const c = new Set(s);
      c.has(x) ? c.delete(x) : c.add(x);
      return c;
    });
  };

  const handleRecover = () => {
    if (!prime) return;
    const pts = shares
      .filter((s) => selected.has(s.x))
      .map((s) => [BigInt(s.x), BigInt(s.ciphertext.join(""))] as [bigint, bigint]); // assuming ciphertext encodes y
    try {
      const bytes = reconstructSecret(pts, prime);
      setSecret(new TextDecoder().decode(bytes));
    } catch (e: any) {
      setSecret("Ошибка восстановления: " + e.message);
    }
  };

  if (loading) {
    return <p>Восстановление… это может занять несколько секунд.</p>;
  }

  return (
    <Card>
      <CardHeader title="Выберите доли" />
      <CardContent>
        <ScrollArea className="h-48">
          <ul className="space-y-2">
            {shares.map((s) => {
              const sel = selected.has(s.x);
              return (
                <li
                  key={s.x}
                  onClick={() => toggle(s.x)}
                  className={`p-2 border rounded cursor-pointer ${
                    sel ? "bg-green-50 border-green-600" : "border-gray-200"
                  }`}
                >
                  x = {s.x}, шифротекст:{" "}
                  <code>[{s.ciphertext.slice(0, 10).join(",")}…]</code>
                </li>
              );
            })}
          </ul>
        </ScrollArea>

        <Button onClick={handleRecover} disabled={selected.size < threshold}>
          Восстановить секрет
        </Button>

        {secret !== null && (
          <div className="mt-4 p-4 bg-gray-100 rounded">
            <p className="font-medium mb-2">Секрет:</p>
            <code className="break-all">{secret}</code>
          </div>
        )}
      </CardContent>
    </Card>
  );
}