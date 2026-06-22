import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  AiSuggestionStatus,
  Prisma,
  PrismaClient,
  TicketCategory,
  TicketMessageAuthorType,
  TicketPriority,
  TicketStatus,
  UserRole
} from "@prisma/client";

loadLocalEnv();

const prisma = new PrismaClient();

const adminUser = {
  id: "demo_admin_user",
  clerkUserId: "user_demo_admin",
  email: "admin@pulsedesk.dev",
  name: "Avery Brooks",
  role: UserRole.ADMIN
};

const customers = [
  {
    id: "demo_customer_northstar",
    name: "Maya Chen",
    email: "maya.chen@northstarcommerce.example",
    companyName: "Northstar Commerce",
    externalId: "demo-customer-northstar"
  },
  {
    id: "demo_customer_apex",
    name: "Jordan Patel",
    email: "jordan.patel@apexanalytics.example",
    companyName: "Apex Analytics",
    externalId: "demo-customer-apex"
  },
  {
    id: "demo_customer_riverline",
    name: "Elena Rodriguez",
    email: "elena.rodriguez@riverlinehealth.example",
    companyName: "Riverline Health",
    externalId: "demo-customer-riverline"
  },
  {
    id: "demo_customer_harbor",
    name: "Samir Okafor",
    email: "samir.okafor@harborlogistics.example",
    companyName: "Harbor Logistics",
    externalId: "demo-customer-harbor"
  }
];

const knowledgeDocuments = [
  {
    id: "demo_kb_billing_faq",
    title: "Billing FAQ",
    fileName: "billing-faq.md",
    mimeType: "text/markdown",
    sourceType: "demo",
    sourceName: "demo-billing-faq.md",
    sourceUrl: "https://docs.pulsedesk.dev/demo/billing-faq",
    content: `# Billing FAQ

Plan upgrades apply immediately and are prorated for the remaining billing period. Downgrades take effect at the next renewal date.

Invoices are emailed to workspace owners and can be downloaded from the billing portal. If a payment fails, PulseDesk retries the card and keeps the workspace active for seven days before limiting new ticket intake.`
  },
  {
    id: "demo_kb_account_security",
    title: "Account Security Guide",
    fileName: "account-security-guide.md",
    mimeType: "text/markdown",
    sourceType: "demo",
    sourceName: "demo-account-security-guide.md",
    sourceUrl: "https://docs.pulsedesk.dev/demo/account-security",
    content: `# Account Security Guide

For suspected account compromise, ask the customer to rotate passwords, review active sessions, enable MFA, and rotate API keys.

Support may help an admin revoke sessions, but should not make ownership changes without identity verification. Never ask users to share one-time passwords, backup codes, access tokens, or full API keys.`
  },
  {
    id: "demo_kb_csv_export",
    title: "CSV Export Troubleshooting",
    fileName: "csv-export-troubleshooting.md",
    mimeType: "text/markdown",
    sourceType: "demo",
    sourceName: "demo-csv-export-troubleshooting.md",
    sourceUrl: "https://docs.pulsedesk.dev/demo/csv-export",
    content: `# CSV Export Troubleshooting

Admins can export tickets from Reports > Exports. Large exports are processed asynchronously and emailed when ready.

If an export remains queued for more than thirty minutes, support should check the workspace size, date range, and retry the export job. CSV exports use UTC timestamps and UTF-8 encoding.`
  },
  {
    id: "demo_kb_webhooks",
    title: "Webhook Troubleshooting",
    fileName: "webhook-troubleshooting.md",
    mimeType: "text/markdown",
    sourceType: "demo",
    sourceName: "demo-webhook-troubleshooting.md",
    sourceUrl: "https://docs.pulsedesk.dev/demo/webhooks",
    content: `# Webhook Troubleshooting

Webhook endpoints must return a 2xx response within ten seconds. PulseDesk retries failed deliveries with exponential backoff for up to twenty-four hours.

Common failures include invalid signing secrets, endpoint timeouts, redirects, and firewalls blocking delivery IPs. Ask customers to verify response timing, final status code, and signature validation.`
  },
  {
    id: "demo_kb_workspace_invitations",
    title: "Workspace Invitations Guide",
    fileName: "workspace-invitations-guide.md",
    mimeType: "text/markdown",
    sourceType: "demo",
    sourceName: "demo-workspace-invitations-guide.md",
    sourceUrl: "https://docs.pulsedesk.dev/demo/workspace-invitations",
    content: `# Workspace Invitations Guide

Workspace admins can invite teammates from Settings > Members. Invitations expire after seven days.

If an invite is not received, ask the admin to confirm the email address, resend the invitation, and have the recipient check spam filters. Expired invitations should be revoked and reissued.`
  },
  {
    id: "demo_kb_uploads",
    title: "Upload Troubleshooting",
    fileName: "upload-troubleshooting.md",
    mimeType: "text/markdown",
    sourceType: "demo",
    sourceName: "demo-upload-troubleshooting.md",
    sourceUrl: "https://docs.pulsedesk.dev/demo/uploads",
    content: `# Upload Troubleshooting

The maximum upload size for a single file is 25 MB. Knowledge-base uploads support PDF, TXT, and Markdown files.

For PDFs, text extraction works best when the PDF contains selectable text rather than scanned images. If an upload fails, ask for file type, file size, browser, and whether the issue happens in an incognito window.`
  },
  {
    id: "demo_kb_api_key_rotation",
    title: "API Key Rotation Guide",
    fileName: "api-key-rotation-guide.md",
    mimeType: "text/markdown",
    sourceType: "demo",
    sourceName: "demo-api-key-rotation-guide.md",
    sourceUrl: "https://docs.pulsedesk.dev/demo/api-key-rotation",
    content: `# API Key Rotation Guide

API keys are created by workspace admins from Developer Settings. Keys are shown once and should be stored in a secrets manager.

To rotate a key, create a replacement key, update the integration, confirm traffic is healthy, and revoke the old key. For suspected exposure, rotate immediately and review webhook signing secrets.`
  }
];

const tickets = [
  ticket("demo_ticket_billing_proration", "demo_customer_northstar", "Invoice total looks higher after upgrading plan", "We upgraded from Starter to Growth this morning and the invoice total looks higher than expected. Can you explain whether this includes proration for the current billing cycle?", TicketStatus.OPEN, TicketPriority.MEDIUM, TicketCategory.BILLING, "2026-06-18T09:20:00.000Z", "demo_admin_user"),
  ticket("demo_ticket_mfa_reset", "demo_customer_apex", "Team member lost access to MFA device", "One of our analysts replaced their phone and can no longer complete MFA. They still have access to company email. What is the safest reset process?", TicketStatus.IN_PROGRESS, TicketPriority.HIGH, TicketCategory.ACCOUNT, "2026-06-18T10:10:00.000Z", "demo_admin_user"),
  ticket("demo_ticket_webhook_retries", "demo_customer_riverline", "Webhook deliveries are retrying despite 200 responses", "Our endpoint logs show 200 responses, but PulseDesk still marks several webhook deliveries as retrying. We need help understanding what headers or timing requirements might be missing.", TicketStatus.OPEN, TicketPriority.HIGH, TicketCategory.TECHNICAL, "2026-06-18T11:05:00.000Z", "demo_admin_user"),
  ticket("demo_ticket_pdf_upload_bug", "demo_customer_northstar", "PDF knowledge-base upload fails at 80 percent", "A 14 MB PDF upload consistently fails near 80 percent in Chrome. Smaller Markdown files work fine. The PDF has selectable text and no password protection.", TicketStatus.OPEN, TicketPriority.HIGH, TicketCategory.BUG, "2026-06-18T12:05:00.000Z"),
  ticket("demo_ticket_export_timeout", "demo_customer_apex", "Monthly ticket CSV export has been queued for an hour", "Our compliance team needs the May ticket export today, but the CSV export has been queued for more than an hour. The workspace has about 18,000 tickets.", TicketStatus.WAITING_CUSTOMER, TicketPriority.MEDIUM, TicketCategory.TECHNICAL, "2026-06-18T13:05:00.000Z"),
  ticket("demo_ticket_security_sessions", "demo_customer_riverline", "Urgent: possible compromised admin account", "We noticed an admin login from an unexpected location and want to revoke active sessions, rotate API keys, and confirm the account is secure.", TicketStatus.IN_PROGRESS, TicketPriority.URGENT, TicketCategory.ACCOUNT, "2026-06-18T12:40:00.000Z", "demo_admin_user"),
  ticket("demo_ticket_sla_dashboard", "demo_customer_northstar", "Feature request: SLA countdown on dashboard", "Our support leads would like a visible SLA countdown for each open ticket so urgent conversations do not get missed during shift handoff.", TicketStatus.OPEN, TicketPriority.LOW, TicketCategory.FEATURE_REQUEST, "2026-06-19T08:30:00.000Z"),
  ticket("demo_ticket_api_key_scope", "demo_customer_apex", "Can API keys be limited to read-only access?", "We want to connect PulseDesk ticket data to an internal reporting tool, but security asked whether the API key can be read-only.", TicketStatus.OPEN, TicketPriority.MEDIUM, TicketCategory.TECHNICAL, "2026-06-19T09:15:00.000Z", "demo_admin_user"),
  ticket("demo_ticket_login_link_expired", "demo_customer_riverline", "Passwordless login link expires before user can sign in", "A remote team member says the email link is expired by the time they open it. They are using the correct email address and workspace URL.", TicketStatus.RESOLVED, TicketPriority.LOW, TicketCategory.ACCOUNT, "2026-06-17T14:30:00.000Z", undefined, "2026-06-17T15:30:00.000Z"),
  ticket("demo_ticket_invoice_recipient", "demo_customer_northstar", "Need to change invoice recipient email", "Our finance mailbox changed and future invoices should go to billing@northstarcommerce.example. I do not see where to update this.", TicketStatus.RESOLVED, TicketPriority.LOW, TicketCategory.BILLING, "2026-06-16T10:00:00.000Z", undefined, "2026-06-16T10:45:00.000Z"),
  ticket("demo_ticket_markdown_rendering", "demo_customer_apex", "Markdown checklist formatting is broken in replies", "When agents paste a Markdown checklist into a reply, the preview looks correct but the sent message collapses the line breaks.", TicketStatus.OPEN, TicketPriority.MEDIUM, TicketCategory.BUG, "2026-06-19T10:20:00.000Z"),
  ticket("demo_ticket_audit_log_retention", "demo_customer_riverline", "Question about audit log retention", "How long are ticket status changes and admin assignment events retained? We need to document this for our annual compliance review.", TicketStatus.WAITING_CUSTOMER, TicketPriority.MEDIUM, TicketCategory.OTHER, "2026-06-19T11:10:00.000Z", "demo_admin_user"),
  ticket("demo_ticket_workspace_invites", "demo_customer_harbor", "Invited teammate never received workspace invite", "We invited a new operations lead yesterday, but they never received the email. Can we resend or generate a new invitation?", TicketStatus.OPEN, TicketPriority.MEDIUM, TicketCategory.ACCOUNT, "2026-06-19T12:15:00.000Z"),
  ticket("demo_ticket_api_rotation", "demo_customer_harbor", "Need to rotate API key after vendor offboarding", "A vendor had access to one of our API keys and their contract ended. We need the safest way to rotate the key without downtime.", TicketStatus.IN_PROGRESS, TicketPriority.HIGH, TicketCategory.TECHNICAL, "2026-06-19T13:05:00.000Z", "demo_admin_user"),
  ticket("demo_ticket_unsupported_integration", "demo_customer_harbor", "Do you support direct Salesforce case sync?", "We want to sync PulseDesk tickets directly into Salesforce Cases. I cannot find this in the integration settings.", TicketStatus.OPEN, TicketPriority.LOW, TicketCategory.OTHER, "2026-06-19T14:00:00.000Z")
];

const suggestions = [
  suggestion("demo_suggestion_billing_proration", "demo_ticket_billing_proration", "demo_kb_billing_faq", AiSuggestionStatus.GENERATED, TicketCategory.BILLING, TicketPriority.MEDIUM, 0.89, "The invoice increase is likely from prorated plan upgrade charges.", "Thanks for reaching out. Plan upgrades apply immediately, so the invoice can include prorated charges for the remaining billing period. If you share the workspace name and invoice month, I can help confirm the line items."),
  suggestion("demo_suggestion_mfa_reset", "demo_ticket_mfa_reset", "demo_kb_account_security", AiSuggestionStatus.APPROVED, TicketCategory.ACCOUNT, TicketPriority.HIGH, 0.86, "The user needs a verified MFA reset flow.", "We can help reset MFA after verifying the request through an account owner or workspace admin. Please have the affected user try a backup code first. We will never ask for one-time passwords or backup codes.", "We can help reset MFA after verifying the request through an account owner or workspace admin. Please have the affected user try a backup code first. We will never ask for one-time passwords or backup codes.", false, "2026-06-18T10:45:00.000Z"),
  suggestion("demo_suggestion_security_sessions", "demo_ticket_security_sessions", "demo_kb_account_security", AiSuggestionStatus.EDITED, TicketCategory.ACCOUNT, TicketPriority.URGENT, 0.93, "Possible account compromise requires urgent containment.", "This should be treated as urgent. Please rotate the affected user's password, review active sessions, enable or confirm MFA, and rotate any API keys that may have been exposed.", "Thanks for flagging this. Please rotate the affected user's password, confirm MFA is enabled, review active sessions, and rotate any API keys that could have been exposed. We can revoke active sessions after identity verification. Please avoid posting tokens, API keys, or sensitive logs in this ticket.", true, "2026-06-18T12:20:00.000Z"),
  suggestion("demo_suggestion_webhook_retries", "demo_ticket_webhook_retries", "demo_kb_webhooks", AiSuggestionStatus.GENERATED, TicketCategory.TECHNICAL, TicketPriority.HIGH, 0.82, "Webhook retries may be caused by timing, redirects, or signature validation.", "PulseDesk expects webhook endpoints to return a 2xx response within ten seconds without redirects. Please check response timing, signing-secret validation, and whether a proxy is returning a redirect or timeout before the final 200."),
  suggestion("demo_suggestion_pdf_upload_bug", "demo_ticket_pdf_upload_bug", "demo_kb_uploads", AiSuggestionStatus.GENERATED, TicketCategory.BUG, TicketPriority.HIGH, 0.78, "The PDF is below the size limit, so browser or PDF-processing details matter.", "A 14 MB PDF is below the 25 MB upload limit. Please confirm browser version, whether incognito succeeds, and whether the PDF contains selectable text. If it still fails, we should escalate as an upload bug."),
  suggestion("demo_suggestion_export_timeout", "demo_ticket_export_timeout", "demo_kb_csv_export", AiSuggestionStatus.GENERATED, TicketCategory.TECHNICAL, TicketPriority.MEDIUM, 0.81, "Large CSV exports may need a queued job retry.", "Large exports are processed asynchronously and emailed when ready. Since this export has been queued for more than thirty minutes, please share the workspace name and export date range so we can check the queued job and retry it if needed."),
  suggestion("demo_suggestion_api_rotation", "demo_ticket_api_rotation", "demo_kb_api_key_rotation", AiSuggestionStatus.GENERATED, TicketCategory.TECHNICAL, TicketPriority.HIGH, 0.88, "The customer needs a no-downtime API key rotation plan.", "Create a replacement key, update the integration, confirm traffic is healthy, then revoke the old key. If the old key may be exposed, rotate immediately and review webhook signing secrets."),
  suggestion("demo_suggestion_unsupported_integration", "demo_ticket_unsupported_integration", null, AiSuggestionStatus.FAILED, TicketCategory.OTHER, TicketPriority.LOW, undefined, "No verified knowledge-base context was available.", undefined, undefined, false, undefined, "No matching knowledge-base context found for direct Salesforce case sync. Manual verification required.")
];

const ticketMessages = [
  message("demo_msg_billing_customer_1", "demo_ticket_billing_proration", TicketMessageAuthorType.CUSTOMER, "Maya Chen", "maya.chen@northstarcommerce.example", "We upgraded from Starter to Growth this morning and the invoice total looks higher than expected. Can you confirm whether this includes proration for the current billing cycle?", false, "2026-06-18T09:20:00.000Z"),
  message("demo_msg_billing_ai_1", "demo_ticket_billing_proration", TicketMessageAuthorType.AI, "PulseDesk AI", undefined, "Draft prepared: explain immediate upgrades, prorated billing, and ask for workspace name plus invoice month before confirming exact totals.", true, "2026-06-18T09:22:00.000Z"),
  message("demo_msg_billing_admin_1", "demo_ticket_billing_proration", TicketMessageAuthorType.ADMIN, "Avery Brooks", "admin@pulsedesk.dev", "Thanks, Maya. Upgrades apply immediately, so the invoice can include prorated charges for the remaining billing period. Please send the workspace name and invoice month and I can verify the line items.", false, "2026-06-18T09:27:00.000Z"),
  message("demo_msg_mfa_customer_1", "demo_ticket_mfa_reset", TicketMessageAuthorType.CUSTOMER, "Jordan Patel", "jordan.patel@apexanalytics.example", "One of our analysts replaced their phone and cannot complete MFA. They still have access to company email. What is the safest reset process?", false, "2026-06-18T10:10:00.000Z"),
  message("demo_msg_mfa_internal_1", "demo_ticket_mfa_reset", TicketMessageAuthorType.ADMIN, "Avery Brooks", "admin@pulsedesk.dev", "Internal note: verify the request through an account owner before resetting MFA. Do not ask the user to share backup codes or one-time passwords.", true, "2026-06-18T10:14:00.000Z"),
  message("demo_msg_mfa_admin_1", "demo_ticket_mfa_reset", TicketMessageAuthorType.ADMIN, "Avery Brooks", "admin@pulsedesk.dev", "Please have the analyst try a backup code first. If that is unavailable, a workspace admin can reset MFA from the team member profile after confirming the user's identity.", false, "2026-06-18T10:18:00.000Z"),
  message("demo_msg_webhook_customer_1", "demo_ticket_webhook_retries", TicketMessageAuthorType.CUSTOMER, "Elena Rodriguez", "elena.rodriguez@riverlinehealth.example", "Our endpoint logs show 200 responses, but PulseDesk still marks several webhook deliveries as retrying.", false, "2026-06-18T11:05:00.000Z"),
  message("demo_msg_webhook_system_1", "demo_ticket_webhook_retries", TicketMessageAuthorType.SYSTEM, "PulseDesk", undefined, "Ticket priority changed from MEDIUM to HIGH after AI prioritization found delivery reliability impact.", true, "2026-06-18T11:06:00.000Z"),
  message("demo_msg_webhook_admin_1", "demo_ticket_webhook_retries", TicketMessageAuthorType.ADMIN, "Avery Brooks", "admin@pulsedesk.dev", "Please confirm whether the endpoint responds within ten seconds and whether any proxy or redirect sits in front of the final 200 response.", false, "2026-06-18T11:12:00.000Z"),
  message("demo_msg_security_customer_1", "demo_ticket_security_sessions", TicketMessageAuthorType.CUSTOMER, "Elena Rodriguez", "elena.rodriguez@riverlinehealth.example", "We noticed an admin login from an unexpected location and want to revoke active sessions, rotate API keys, and confirm the account is secure.", false, "2026-06-18T12:40:00.000Z"),
  message("demo_msg_security_ai_1", "demo_ticket_security_sessions", TicketMessageAuthorType.AI, "PulseDesk AI", undefined, "High-risk account security request. Recommend password rotation, session review, MFA confirmation, API key rotation, and escalation.", true, "2026-06-18T12:41:00.000Z"),
  message("demo_msg_security_admin_1", "demo_ticket_security_sessions", TicketMessageAuthorType.ADMIN, "Avery Brooks", "admin@pulsedesk.dev", "We are treating this as urgent. Please rotate the affected password, confirm MFA is enabled, and rotate API keys. I can help revoke active sessions after identity verification.", false, "2026-06-18T12:45:00.000Z"),
  message("demo_msg_export_customer_1", "demo_ticket_export_timeout", TicketMessageAuthorType.CUSTOMER, "Jordan Patel", "jordan.patel@apexanalytics.example", "Our compliance team needs the May ticket export today, but the CSV export has been queued for more than an hour.", false, "2026-06-18T13:05:00.000Z"),
  message("demo_msg_export_admin_1", "demo_ticket_export_timeout", TicketMessageAuthorType.ADMIN, "Avery Brooks", "admin@pulsedesk.dev", "Please send the workspace name and export date range so I can check the queued job and retry it if needed.", false, "2026-06-18T13:12:00.000Z"),
  message("demo_msg_invite_customer_1", "demo_ticket_workspace_invites", TicketMessageAuthorType.CUSTOMER, "Samir Okafor", "samir.okafor@harborlogistics.example", "We invited a new operations lead yesterday, but they never received the email. Can we resend or generate a new invitation?", false, "2026-06-19T12:15:00.000Z"),
  message("demo_msg_api_rotation_customer_1", "demo_ticket_api_rotation", TicketMessageAuthorType.CUSTOMER, "Samir Okafor", "samir.okafor@harborlogistics.example", "A vendor had access to one of our API keys and their contract ended. We need the safest way to rotate the key without downtime.", false, "2026-06-19T13:05:00.000Z"),
  message("demo_msg_api_rotation_admin_1", "demo_ticket_api_rotation", TicketMessageAuthorType.ADMIN, "Avery Brooks", "admin@pulsedesk.dev", "Create a replacement key first, update the integration, confirm traffic is healthy, and then revoke the old key.", false, "2026-06-19T13:20:00.000Z"),
  message("demo_msg_login_resolved_system_1", "demo_ticket_login_link_expired", TicketMessageAuthorType.SYSTEM, "PulseDesk", undefined, "Ticket marked resolved after the customer confirmed the new sign-in link worked.", true, "2026-06-17T15:30:00.000Z")
];

async function main(): Promise<void> {
  await prisma.user.upsert({
    where: { id: adminUser.id },
    create: adminUser,
    update: adminUser
  });

  for (const customer of customers) {
    await prisma.customer.upsert({
      where: { id: customer.id },
      create: customer,
      update: customer
    });
  }

  for (const document of knowledgeDocuments) {
    await prisma.knowledgeDocument.upsert({
      where: { id: document.id },
      create: document,
      update: document
    });
  }

  for (const item of tickets) {
    await prisma.ticket.upsert({
      where: { id: item.id },
      create: item,
      update: item
    });
  }

  for (const item of suggestions) {
    await prisma.ticketAiSuggestion.upsert({
      where: { id: item.id },
      create: item,
      update: item
    });
  }

  for (const item of ticketMessages) {
    await prisma.ticketMessage.upsert({
      where: { id: item.id },
      create: item,
      update: item
    });
  }
}

main()
  .then(async () => {
    const [customerCount, ticketCount, messageCount, suggestionCount, documentCount] =
      await Promise.all([
        prisma.customer.count({ where: { id: { in: customers.map(({ id }) => id) } } }),
        prisma.ticket.count({ where: { id: { in: tickets.map(({ id }) => id) } } }),
        prisma.ticketMessage.count({ where: { id: { in: ticketMessages.map(({ id }) => id) } } }),
        prisma.ticketAiSuggestion.count({ where: { id: { in: suggestions.map(({ id }) => id) } } }),
        prisma.knowledgeDocument.count({ where: { id: { in: knowledgeDocuments.map(({ id }) => id) } } })
      ]);

    console.info("Demo seed complete", {
      customers: customerCount,
      tickets: ticketCount,
      messages: messageCount,
      aiSuggestions: suggestionCount,
      knowledgeDocuments: documentCount
    });
  })
  .catch((error: unknown) => {
    console.error("Demo seed failed");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

function ticket(
  id: string,
  customerId: string,
  subject: string,
  description: string,
  status: TicketStatus,
  priority: TicketPriority,
  category: TicketCategory,
  createdAt: string,
  assignedAdminId?: string,
  resolvedAt?: string
) {
  return {
    id,
    customerId,
    subject,
    description,
    status,
    priority,
    category,
    assignedAdminId: assignedAdminId ?? null,
    createdAt: new Date(createdAt),
    updatedAt: new Date(resolvedAt ?? createdAt),
    resolvedAt: resolvedAt ? new Date(resolvedAt) : null
  };
}

function suggestion(
  id: string,
  ticketId: string,
  knowledgeDocumentId: string | null,
  status: AiSuggestionStatus,
  category: TicketCategory,
  priority: TicketPriority,
  confidenceScore: number | undefined,
  summary: string,
  suggestedReply?: string,
  finalApprovedReply?: string,
  editedBeforeApproval = false,
  approvedAt?: string,
  errorMessage?: string
) {
  const snippets = knowledgeDocumentId
    ? [
        {
          id: knowledgeDocumentId,
          title: knowledgeDocuments.find((document) => document.id === knowledgeDocumentId)?.title ?? "Demo document",
          sourceName: knowledgeDocuments.find((document) => document.id === knowledgeDocumentId)?.sourceName ?? "demo",
          content: knowledgeDocuments.find((document) => document.id === knowledgeDocumentId)?.content.slice(0, 240) ?? "",
          score: confidenceScore ?? 0
        }
      ]
    : [];

  return {
    id,
    ticketId,
    knowledgeDocumentId,
    status,
    suggestedCategory: category,
    suggestedPriority: priority,
    confidenceScore,
    suggestedReply,
    originalSuggestedReply: suggestedReply,
    finalApprovedReply,
    approvedAt: approvedAt ? new Date(approvedAt) : null,
    approvedByUserId: approvedAt ? adminUser.clerkUserId : null,
    editedBeforeApproval,
    errorMessage,
    ragSnippets: toJson(snippets),
    retrievedContext: toJson({
      snippets,
      reply: {
        summary,
        contextSufficient: snippets.length > 0,
        insufficientContextReason: snippets.length > 0 ? null : "No matching demo knowledge-base context was found.",
        citations: snippets.map((snippet) => ({
          id: snippet.id,
          title: snippet.title,
          sourceName: snippet.sourceName
        })),
        internalNotes: "Demo AI output requires human review.",
        humanReviewRequired: true
      }
    })
  };
}

function message(
  id: string,
  ticketId: string,
  authorType: TicketMessageAuthorType,
  authorName: string,
  authorEmail: string | undefined,
  body: string,
  isInternal: boolean,
  createdAt: string
) {
  return {
    id,
    ticketId,
    authorType,
    authorName,
    authorEmail,
    body,
    isInternal,
    createdAt: new Date(createdAt),
    updatedAt: new Date(createdAt)
  };
}

function toJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

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
