// создать: src/types/participants.ts
export interface ParticipantNode {
  id: string;
  name: string | null;
  publicKey: unknown;
  managerId: string | null;
  children?: ParticipantNode[];
}

// заменить в OrgChart.tsx (строка 6)

