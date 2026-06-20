import type { INestApplicationContext } from "@nestjs/common";
import { IoAdapter } from "@nestjs/platform-socket.io";
import type { ServerOptions } from "socket.io";

export class SocketIoAdapter extends IoAdapter {
  constructor(
    app: INestApplicationContext,
    private readonly clientUrl: string
  ) {
    super(app);
  }

  override createIOServer(port: number, options?: ServerOptions) {
    return super.createIOServer(port, {
      ...options,
      cors: {
        origin: this.clientUrl,
        credentials: true
      }
    });
  }
}
