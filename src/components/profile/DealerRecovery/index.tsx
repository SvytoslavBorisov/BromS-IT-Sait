// components/DealerRecovery/index.tsx
"use client";

import React from "react";
import { useSession } from "next-auth/react";

import { decodeCiphertext } from "@/lib/crypto/keys";
import { loadPrivateJwk }   from "@/lib/crypto/secure-storage";
import {
  shareSecretVSS,
  verifyShare,
  reconstructSecretVSS,
} from "@/lib/crypto/shamir";

import { DealerRecoveryUI } from "./UI";
import { useImportKey }     from "./useImportKey";
import { useDealerLogic }   from "./useDealerLogic";

import type { VSSShare }    from "./types";

export interface DealerRecoveryProps {
  sessionId:      string;
  p:              bigint;
  q:              bigint;
  g:              bigint;
  commitments:    bigint[];
  threshold:      number;
  shares:         VSSShare[];
}

export default function DealerRecovery(props: DealerRecoveryProps) {
  const { status, data: session } = useSession();
  const privKeyRef = useImportKey(session, status);
  const logic      = useDealerLogic(props, privKeyRef);

  return <DealerRecoveryUI {...logic} {...props} />;
}
