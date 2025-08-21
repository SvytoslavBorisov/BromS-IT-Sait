export type Message = {
  room: string;
  text: string;
  ts: number;       // unix ms
  userId?: string;
  userName?: string;
  userAvatar?: string;
};

export type TypingPayload = { userName?: string; typing: boolean };
