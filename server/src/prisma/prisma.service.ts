import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaClient } from "@prisma/client";

const LOCAL_DATABASE_URL =
  "postgresql://pulsedesk:pulsedesk@localhost:5432/pulsedesk?schema=public";

function resolveDatabaseUrl(configService: ConfigService): string {
  const databaseUrl = configService.get<string>("DATABASE_URL");

  if (databaseUrl) {
    return databaseUrl;
  }

  if (configService.get<string>("NODE_ENV") === "production") {
    throw new Error("DATABASE_URL is required in production");
  }

  return LOCAL_DATABASE_URL;
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(configService: ConfigService) {
    super({
      datasources: {
        db: {
          url: resolveDatabaseUrl(configService)
        }
      }
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
