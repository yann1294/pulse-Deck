import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { BullModule } from "@nestjs/bullmq";
import { AiModule } from "../ai/ai.module";
import { KnowledgeBaseModule } from "../knowledge-base/knowledge-base.module";
import { PrismaModule } from "../prisma/prisma.module";
import { RealtimeModule } from "../realtime/realtime.module";
import { QueueService } from "./queue.service";
import { TicketAiProcessor } from "./ticket-ai.processor";

@Module({
  imports: [
    AiModule,
    KnowledgeBaseModule,
    PrismaModule,
    RealtimeModule,
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
  providers: [QueueService, TicketAiProcessor],
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
