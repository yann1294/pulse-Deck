import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AiSuggestionsModule } from "./ai-suggestions/ai-suggestions.module";
import { AiModule } from "./ai/ai.module";
import { AuthModule } from "./auth/auth.module";
import { CustomersModule } from "./customers/customers.module";
import { HealthController } from "./health.controller";
import { KnowledgeBaseModule } from "./knowledge-base/knowledge-base.module";
import { PrismaModule } from "./prisma/prisma.module";
import { QueueModule } from "./queue/queue.module";
import { RealtimeModule } from "./realtime/realtime.module";
import { TicketsModule } from "./tickets/tickets.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true
    }),
    AuthModule,
    PrismaModule,
    TicketsModule,
    AiSuggestionsModule,
    CustomersModule,
    KnowledgeBaseModule,
    AiModule,
    QueueModule,
    RealtimeModule
  ],
  controllers: [HealthController]
})
export class AppModule {}
