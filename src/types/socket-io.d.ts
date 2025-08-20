// types/socket-io.d.ts
import "socket.io";

declare module "socket.io" {
  interface SocketData {
    user?: {
      sub: string;
      name?: string;
      email?: string;
      picture?: string;
    };
  }
}
