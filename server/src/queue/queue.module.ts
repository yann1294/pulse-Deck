import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { BullModule } from "@nestjs/bullmq";
import { QueueService } from "./queue.service";

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>("REDIS_HOST", "localhost"),
          port: parseRedisPort(configService.get<string>("REDIS_PORT", "6379"))
        }
      })
    }),
    BullModule.registerQueue({
      name: "ticket-ai"
    })
  ],
  providers: [QueueService],
  exports: [QueueService]
})
export class QueueModule {}

function parseRedisPort(rawPort: string): number {
  const port = Number.parseInt(rawPort, 10);

  if (!Number.isInteger(port) || port <= 0) {
    throw new Error(`Invalid REDIS_PORT value: ${rawPort}`);
  }

  return port;
}
