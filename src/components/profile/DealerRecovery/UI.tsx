"use client";

import React from "react";
import type { DealerRecoveryProps } from "./types";

interface LogicProps {
  recoveryId:      string | null;
  error:           string | null;
  statusMessage:   string;
  secret:          string | null;
  returnedShares:  any[] | null;
  start:           () => void;
  checkStatus:     () => void;
}

export function DealerRecoveryUI(
  props: DealerRecoveryProps & LogicProps
) {
  const {
    sessionId, recoveryId, error, statusMessage, secret, start, checkStatus
  } = props;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Восстановление секрета</h2>
      <p>Session: <code>{sessionId}</code></p>
      {error && <p className="text-red-500">{error}</p>}

      {!recoveryId ? (
        <button onClick={start} className="btn">Начать восстановление</button>
      ) : (
        <div className="space-y-2">
          <p>{statusMessage}</p>
          {!secret && (
            <button onClick={checkStatus} className="btn-outline">
              Проверить статус
            </button>
          )}
          {secret && (
            <div className="p-4 bg-gray-50 rounded">
              <p className="font-medium">Секрет:</p>
              <code className="break-all">{secret}</code>
            </div>
          )}
        </div>
      )}
    </div>
  );
}