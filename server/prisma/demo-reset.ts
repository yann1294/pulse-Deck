import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";

loadLocalEnv();

const prisma = new PrismaClient();

const DEMO_ID_PREFIX = "demo_";
const DEMO_EXTERNAL_ID_PREFIX = "demo-";
const DEMO_EMAIL_DOMAIN = "@demo.pulsedesk.dev";
const DEMO_SOURCE_PREFIX = "demo/";
const DEMO_TICKET_PREFIX = "[DEMO]";
const DEMO_ADMIN_CLERK_PREFIX = "user_demo_";

async function main(): Promise<void> {
  const demoCustomers = await prisma.customer.findMany({
    where: {
      OR: [
        { id: { startsWith: DEMO_ID_PREFIX } },
        { email: { endsWith: DEMO_EMAIL_DOMAIN } },
        { externalId: { startsWith: DEMO_EXTERNAL_ID_PREFIX } }
      ]
    },
    select: { id: true }
  });

  const demoCustomerIds = demoCustomers.map(({ id }) => id);

  const demoTickets = await prisma.ticket.findMany({
    where: {
      OR: [
        { id: { startsWith: DEMO_ID_PREFIX } },
        { subject: { startsWith: DEMO_TICKET_PREFIX } },
        { customerId: { in: demoCustomerIds } }
      ]
    },
    select: { id: true }
  });

  const demoTicketIds = demoTickets.map(({ id }) => id);

  const demoKnowledgeDocuments = await prisma.knowledgeDocument.findMany({
    where: {
      OR: [
        { id: { startsWith: DEMO_ID_PREFIX } },
        { sourceName: { startsWith: DEMO_SOURCE_PREFIX } },
        { sourceType: "demo" }
      ]
    },
    select: { id: true }
  });

  const demoKnowledgeDocumentIds = demoKnowledgeDocuments.map(({ id }) => id);

  const deletedMessages = await prisma.ticketMessage.deleteMany({
    where: {
      OR: [
        { id: { startsWith: DEMO_ID_PREFIX } },
        { ticketId: { in: demoTicketIds } },
        { authorEmail: { endsWith: DEMO_EMAIL_DOMAIN } }
      ]
    }
  });

  const deletedAiSuggestions = await prisma.ticketAiSuggestion.deleteMany({
    where: {
      OR: [
        { id: { startsWith: DEMO_ID_PREFIX } },
        { ticketId: { in: demoTicketIds } },
        { knowledgeDocumentId: { in: demoKnowledgeDocumentIds } },
        { approvedByUserId: { startsWith: DEMO_ADMIN_CLERK_PREFIX } }
      ]
    }
  });

  const deletedTickets = await prisma.ticket.deleteMany({
    where: { id: { in: demoTicketIds } }
  });

  const deletedKnowledgeDocuments = await prisma.knowledgeDocument.deleteMany({
    where: { id: { in: demoKnowledgeDocumentIds } }
  });

  const deletedCustomers = await prisma.customer.deleteMany({
    where: { id: { in: demoCustomerIds } }
  });

  const deletedUsers = await prisma.user.deleteMany({
    where: {
      OR: [
        { id: { startsWith: DEMO_ID_PREFIX } },
        { clerkUserId: { startsWith: DEMO_ADMIN_CLERK_PREFIX } },
        { email: { endsWith: DEMO_EMAIL_DOMAIN } }
      ]
    }
  });

  console.info("Demo reset complete", {
    messages: deletedMessages.count,
    aiSuggestions: deletedAiSuggestions.count,
    tickets: deletedTickets.count,
    knowledgeDocuments: deletedKnowledgeDocuments.count,
    customers: deletedCustomers.count,
    users: deletedUsers.count
  });
}

main()
  .catch((error: unknown) => {
    console.error("Demo reset failed");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

function loadLocalEnv(): void {
  for (const envPath of [join(process.cwd(), ".env"), join(process.cwd(), "server", ".env")]) {
    if (!existsSync(envPath)) {
      continue;
    }

    for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }

      const separatorIndex = trimmed.indexOf("=");

      if (separatorIndex === -1) {
        continue;
      }

      const key = trimmed.slice(0, separatorIndex).trim();
      const value = trimmed.slice(separatorIndex + 1).trim().replace(/^["']|["']$/g, "");

      if (key && process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  }
}
