import type { Server as HTTPServer } from "http";
import type { Server as IOServer } from "socket.io";
import type { NextApiResponse } from "next";

export type HTTPServerWithIO = HTTPServer & { io?: IOServer };

export type NextApiResponseWithSocket = NextApiResponse & {
  socket: NextApiResponse["socket"] & {
    server: HTTPServerWithIO;
  };
};