// src/lib/dkg/types.ts
export type Point = { x: string; y: string }; // hex строки
export type CommitmentMsg = { sessionId: string; from: string; commitments: Point[]; sig: string };
export type ShareMsg = { sessionId: string; from: string; to: string; ct: string; sig: string };
export type ReadyMsg = { sessionId: string; userId: string; Qhash: string; sig: string };
export type ComplaintMsg = { sessionId: string; accuser: string; accused: string; payload: string; sig: string };
