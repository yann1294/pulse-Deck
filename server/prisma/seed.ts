import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  AiSuggestionStatus,
  PrismaClient,
  TicketCategory,
  TicketMessageAuthorType,
  TicketPriority,
  TicketStatus,
  UserRole
} from "@prisma/client";

loadLocalEnv();

const prisma = new PrismaClient();
const isDemoMode = process.env.DEMO_MODE === "true";

function loadLocalEnv(): void {
  const envPaths = [
    join(process.cwd(), ".env"),
    join(process.cwd(), "server", ".env")
  ];

  for (const envPath of envPaths) {
    if (!existsSync(envPath)) {
      continue;
    }

    const lines = readFileSync(envPath, "utf8").split(/\r?\n/);

    for (const line of lines) {
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
  }
];

const knowledgeDocuments = [
  {
    id: "demo_kb_billing_plan_changes",
    title: "Billing FAQ: Plan changes, invoices, and failed payments",
    fileName: "billing-faq.md",
    mimeType: "text/markdown",
    sourceUrl: "https://docs.pulsedesk.dev/demo/billing-faq",
    content: `# Billing FAQ

Customers can change plans from Workspace Settings > Billing. Plan upgrades apply immediately and the remaining billing period is prorated. Downgrades take effect at the next renewal date.

Invoices are emailed to workspace owners and can also be downloaded from the billing portal. If a payment fails, PulseDesk retries the card and keeps the workspace active for seven days before limiting new ticket intake.

Support agents should confirm the workspace name, invoice month, and the last four digits of the card before escalating billing questions.`
  },
  {
    id: "demo_kb_login_mfa",
    title: "Login and multi-factor authentication troubleshooting",
    fileName: "login-mfa-guide.md",
    mimeType: "text/markdown",
    sourceUrl: "https://docs.pulsedesk.dev/demo/login-mfa",
    content: `# Login and MFA Troubleshooting

If a user cannot sign in, ask them to confirm they are using the correct workspace URL and email address. Passwordless sign-in links expire after ten minutes.

For MFA issues, users should try a backup code first. If they changed phones, an admin can reset MFA from the team member profile after verifying the request through the account owner.

Never ask users to share one-time passwords, backup codes, or full screenshots containing session tokens.`
  },
  {
    id: "demo_kb_api_webhooks",
    title: "API keys and webhook delivery guide",
    fileName: "api-webhooks-guide.md",
    mimeType: "text/markdown",
    sourceUrl: "https://docs.pulsedesk.dev/demo/api-webhooks",
    content: `# API Keys and Webhooks

API keys are created by workspace admins from Developer Settings. Keys are shown once and should be stored in a secrets manager.

Webhook endpoints must return a 2xx response within ten seconds. PulseDesk retries failed deliveries with exponential backoff for up to twenty-four hours.

Common webhook failures include invalid signing secrets, endpoint timeouts, redirects, and firewalls blocking PulseDesk delivery IPs.`
  },
  {
    id: "demo_kb_uploads",
    title: "Attachment upload limits and supported file types",
    fileName: "uploads-support.txt",
    mimeType: "text/plain",
    sourceUrl: "https://docs.pulsedesk.dev/demo/uploads",
    content: `PulseDesk supports PDF, PNG, JPG, TXT, and Markdown uploads for support conversations and knowledge-base documents.

The maximum upload size for a single file is 25 MB. For PDFs, text extraction works best when the PDF contains selectable text rather than scanned images.

If an upload fails, ask the customer for the file type, file size, browser, and whether the issue happens in an incognito window.`
  },
  {
    id: "demo_kb_exports",
    title: "Data export and reporting FAQ",
    fileName: "exports-reporting.md",
    mimeType: "text/markdown",
    sourceUrl: "https://docs.pulsedesk.dev/demo/exports",
    content: `# Data Exports

Admins can export tickets from Reports > Exports. Exports include ticket metadata, customer email, status history, and public replies.

Large exports are processed asynchronously and emailed when ready. If an export remains queued for more than thirty minutes, support should check the workspace size and retry the export job.

CSV exports use UTC timestamps and UTF-8 encoding.`
  },
  {
    id: "demo_kb_security",
    title: "Account security response checklist",
    fileName: "account-security-checklist.md",
    mimeType: "text/markdown",
    sourceUrl: "https://docs.pulsedesk.dev/demo/security",
    content: `# Account Security Checklist

For suspected account compromise, ask the customer to rotate passwords, review active sessions, enable MFA, and rotate API keys.

Support may help an admin revoke sessions, but should not make ownership changes without identity verification. Escalate urgent security reports to the on-call admin queue.

Do not include sensitive logs, access tokens, or full API keys in ticket replies.`
  }
];

const tickets = [
  {
    id: "demo_ticket_billing_proration",
    customerId: "demo_customer_northstar",
    assignedAdminId: "demo_admin_user",
    subject: "Invoice total looks higher after upgrading plan",
    description:
      "We upgraded from Starter to Growth this morning and the invoice total looks higher than expected. Can you explain whether this includes proration for the current billing cycle?",
    status: TicketStatus.OPEN,
    priority: TicketPriority.MEDIUM,
    category: TicketCategory.BILLING
  },
  {
    id: "demo_ticket_login_mfa_reset",
    customerId: "demo_customer_apex",
    assignedAdminId: "demo_admin_user",
    subject: "Team member lost access to MFA device",
    description:
      "One of our analysts replaced their phone and can no longer complete MFA. They still have access to their company email. What is the safest reset process?",
    status: TicketStatus.IN_PROGRESS,
    priority: TicketPriority.HIGH,
    category: TicketCategory.ACCOUNT
  },
  {
    id: "demo_ticket_webhook_retries",
    customerId: "demo_customer_riverline",
    assignedAdminId: "demo_admin_user",
    subject: "Webhook deliveries are retrying despite 200 responses",
    description:
      "Our endpoint logs show 200 responses, but PulseDesk still marks several webhook deliveries as retrying. We need help understanding what headers or timing requirements might be missing.",
    status: TicketStatus.OPEN,
    priority: TicketPriority.HIGH,
    category: TicketCategory.TECHNICAL
  },
  {
    id: "demo_ticket_pdf_upload_bug",
    customerId: "demo_customer_northstar",
    assignedAdminId: null,
    subject: "PDF knowledge-base upload fails at 80 percent",
    description:
      "A 14 MB PDF upload consistently fails near 80 percent in Chrome. Smaller Markdown files work fine. The PDF has selectable text and no password protection.",
    status: TicketStatus.OPEN,
    priority: TicketPriority.HIGH,
    category: TicketCategory.BUG
  },
  {
    id: "demo_ticket_export_timeout",
    customerId: "demo_customer_apex",
    assignedAdminId: null,
    subject: "Monthly ticket CSV export has been queued for an hour",
    description:
      "Our compliance team needs the May ticket export today, but the CSV export has been queued for more than an hour. The workspace has about 18,000 tickets.",
    status: TicketStatus.WAITING_CUSTOMER,
    priority: TicketPriority.MEDIUM,
    category: TicketCategory.TECHNICAL
  },
  {
    id: "demo_ticket_security_sessions",
    customerId: "demo_customer_riverline",
    assignedAdminId: "demo_admin_user",
    subject: "Urgent: possible compromised admin account",
    description:
      "We noticed an admin login from an unexpected location and want to revoke active sessions, rotate API keys, and confirm the account is secure.",
    status: TicketStatus.IN_PROGRESS,
    priority: TicketPriority.URGENT,
    category: TicketCategory.ACCOUNT
  },
  {
    id: "demo_ticket_feature_sla_dashboard",
    customerId: "demo_customer_northstar",
    assignedAdminId: null,
    subject: "Feature request: SLA countdown on dashboard",
    description:
      "Our support leads would like a visible SLA countdown for each open ticket so urgent conversations do not get missed during shift handoff.",
    status: TicketStatus.OPEN,
    priority: TicketPriority.LOW,
    category: TicketCategory.FEATURE_REQUEST
  },
  {
    id: "demo_ticket_api_key_scope",
    customerId: "demo_customer_apex",
    assignedAdminId: "demo_admin_user",
    subject: "Can API keys be limited to read-only access?",
    description:
      "We want to connect PulseDesk ticket data to an internal reporting tool, but security asked whether the API key can be read-only.",
    status: TicketStatus.OPEN,
    priority: TicketPriority.MEDIUM,
    category: TicketCategory.TECHNICAL
  },
  {
    id: "demo_ticket_login_link_expired",
    customerId: "demo_customer_riverline",
    assignedAdminId: null,
    subject: "Passwordless login link expires before user can sign in",
    description:
      "A remote team member says the email link is expired by the time they open it. They are using the correct email address and workspace URL.",
    status: TicketStatus.RESOLVED,
    priority: TicketPriority.LOW,
    category: TicketCategory.ACCOUNT,
    resolvedAt: new Date("2026-06-17T15:30:00.000Z")
  },
  {
    id: "demo_ticket_invoice_recipient",
    customerId: "demo_customer_northstar",
    assignedAdminId: null,
    subject: "Need to change invoice recipient email",
    description:
      "Our finance mailbox changed and future invoices should go to billing@northstarcommerce.example. I do not see where to update this.",
    status: TicketStatus.RESOLVED,
    priority: TicketPriority.LOW,
    category: TicketCategory.BILLING,
    resolvedAt: new Date("2026-06-16T10:15:00.000Z")
  },
  {
    id: "demo_ticket_markdown_rendering",
    customerId: "demo_customer_apex",
    assignedAdminId: null,
    subject: "Markdown checklist formatting is broken in replies",
    description:
      "When agents paste a Markdown checklist into a reply, the preview looks correct but the sent message collapses the line breaks.",
    status: TicketStatus.OPEN,
    priority: TicketPriority.MEDIUM,
    category: TicketCategory.BUG
  },
  {
    id: "demo_ticket_audit_log_export",
    customerId: "demo_customer_riverline",
    assignedAdminId: "demo_admin_user",
    subject: "Question about audit log retention",
    description:
      "How long are ticket status changes and admin assignment events retained? We need to document this for our annual compliance review.",
    status: TicketStatus.WAITING_CUSTOMER,
    priority: TicketPriority.MEDIUM,
    category: TicketCategory.OTHER
  }
];

const suggestions = [
  {
    id: "demo_suggestion_billing_proration",
    ticketId: "demo_ticket_billing_proration",
    knowledgeDocumentId: "demo_kb_billing_plan_changes",
    status: AiSuggestionStatus.GENERATED,
    suggestedCategory: TicketCategory.BILLING,
    suggestedPriority: TicketPriority.MEDIUM,
    confidenceScore: 0.89,
    suggestedReply:
      "Thanks for reaching out. The higher invoice is likely due to prorated charges from the Starter-to-Growth upgrade. Upgrades apply immediately, and the invoice includes the remaining billing period at the new plan rate minus unused time from the previous plan. If you share the workspace name and invoice month, I can help confirm the calculation.",
    ragSnippets: [
      {
        documentId: "demo_kb_billing_plan_changes",
        title: "Billing FAQ: Plan changes, invoices, and failed payments",
        excerpt: "Plan upgrades apply immediately and the remaining billing period is prorated."
      }
    ]
  },
  {
    id: "demo_suggestion_mfa_reset",
    ticketId: "demo_ticket_login_mfa_reset",
    knowledgeDocumentId: "demo_kb_login_mfa",
    status: AiSuggestionStatus.GENERATED,
    suggestedCategory: TicketCategory.ACCOUNT,
    suggestedPriority: TicketPriority.HIGH,
    confidenceScore: 0.86,
    suggestedReply:
      "We can help reset MFA after verifying the request through an account owner or workspace admin. Please have the affected user try a backup code first. If that is not available, an admin can reset MFA from the team member profile after confirming the user's identity. We will never ask for one-time passwords or backup codes.",
    ragSnippets: [
      {
        documentId: "demo_kb_login_mfa",
        title: "Login and multi-factor authentication troubleshooting",
        excerpt: "If they changed phones, an admin can reset MFA from the team member profile after verifying the request."
      }
    ]
  },
  {
    id: "demo_suggestion_security_sessions",
    ticketId: "demo_ticket_security_sessions",
    knowledgeDocumentId: "demo_kb_security",
    status: AiSuggestionStatus.GENERATED,
    suggestedCategory: TicketCategory.ACCOUNT,
    suggestedPriority: TicketPriority.URGENT,
    confidenceScore: 0.93,
    suggestedReply:
      "This should be treated as urgent. Please rotate the affected user's password, review active sessions, enable or confirm MFA, and rotate any API keys that may have been exposed. We can help revoke active sessions after identity verification, and we should avoid sharing tokens or sensitive logs in this ticket.",
    ragSnippets: [
      {
        documentId: "demo_kb_security",
        title: "Account security response checklist",
        excerpt: "For suspected account compromise, ask the customer to rotate passwords, review active sessions, enable MFA, and rotate API keys."
      }
    ]
  },
  {
    id: "demo_suggestion_webhook_retries",
    ticketId: "demo_ticket_webhook_retries",
    knowledgeDocumentId: "demo_kb_api_webhooks",
    status: AiSuggestionStatus.GENERATED,
    suggestedCategory: TicketCategory.TECHNICAL,
    suggestedPriority: TicketPriority.HIGH,
    confidenceScore: 0.82,
    suggestedReply:
      "Thanks for the detailed logs. PulseDesk expects webhook endpoints to return a 2xx response within ten seconds without redirects. If your endpoint logs show 200 responses, please also check response timing, signing-secret validation, and whether an upstream proxy is returning a redirect or timeout before the final 200.",
    ragSnippets: [
      {
        documentId: "demo_kb_api_webhooks",
        title: "API keys and webhook delivery guide",
        excerpt: "Webhook endpoints must return a 2xx response within ten seconds. PulseDesk retries failed deliveries with exponential backoff."
      }
    ]
  },
  {
    id: "demo_suggestion_pdf_upload_bug",
    ticketId: "demo_ticket_pdf_upload_bug",
    knowledgeDocumentId: "demo_kb_uploads",
    status: AiSuggestionStatus.GENERATED,
    suggestedCategory: TicketCategory.BUG,
    suggestedPriority: TicketPriority.HIGH,
    confidenceScore: 0.78,
    suggestedReply:
      "A 14 MB PDF is below the 25 MB upload limit, so this may be browser, network, or PDF-processing related. Please confirm the browser version, whether the upload succeeds in an incognito window, and whether the PDF contains selectable text. If it still fails, we should capture the file metadata and escalate as an upload bug.",
    ragSnippets: [
      {
        documentId: "demo_kb_uploads",
        title: "Attachment upload limits and supported file types",
        excerpt: "The maximum upload size for a single file is 25 MB. For PDFs, text extraction works best when the PDF contains selectable text."
      }
    ]
  },
  {
    id: "demo_suggestion_export_timeout",
    ticketId: "demo_ticket_export_timeout",
    knowledgeDocumentId: "demo_kb_exports",
    status: AiSuggestionStatus.GENERATED,
    suggestedCategory: TicketCategory.TECHNICAL,
    suggestedPriority: TicketPriority.MEDIUM,
    confidenceScore: 0.81,
    suggestedReply:
      "Large ticket exports are processed asynchronously and emailed when ready. Since this export has been queued for more than thirty minutes, please share the workspace name and export date range so we can check the queued job and retry it if needed.",
    ragSnippets: [
      {
        documentId: "demo_kb_exports",
        title: "Data export and reporting FAQ",
        excerpt: "If an export remains queued for more than thirty minutes, support should check the workspace size and retry the export job."
      }
    ]
  },
  {
    id: "demo_suggestion_api_key_scope",
    ticketId: "demo_ticket_api_key_scope",
    knowledgeDocumentId: "demo_kb_api_webhooks",
    status: AiSuggestionStatus.GENERATED,
    suggestedCategory: TicketCategory.TECHNICAL,
    suggestedPriority: TicketPriority.MEDIUM,
    confidenceScore: 0.74,
    suggestedReply:
      "API keys are created by workspace admins from Developer Settings and should be stored in a secrets manager. I can confirm the current key options for your workspace and help identify the safest integration path for a reporting tool.",
    ragSnippets: [
      {
        documentId: "demo_kb_api_webhooks",
        title: "API keys and webhook delivery guide",
        excerpt: "API keys are created by workspace admins from Developer Settings. Keys are shown once and should be stored in a secrets manager."
      }
    ]
  }
];

const ticketMessages = [
  {
    id: "demo_message_billing_proration_customer_1",
    ticketId: "demo_ticket_billing_proration",
    authorType: TicketMessageAuthorType.CUSTOMER,
    authorName: "Maya Chen",
    authorEmail: "maya.chen@northstarcommerce.example",
    body:
      "We upgraded from Starter to Growth this morning and the invoice total looks higher than expected. Can you confirm whether this includes proration for the current billing cycle?",
    createdAt: new Date("2026-06-18T09:20:00.000Z"),
    updatedAt: new Date("2026-06-18T09:20:00.000Z")
  },
  {
    id: "demo_message_billing_proration_ai_1",
    ticketId: "demo_ticket_billing_proration",
    authorType: TicketMessageAuthorType.AI,
    authorName: "PulseDesk AI",
    body:
      "Draft prepared: explain immediate plan upgrades and prorated charges, then ask for workspace name and invoice month before confirming exact totals.",
    isInternal: true,
    createdAt: new Date("2026-06-18T09:22:00.000Z"),
    updatedAt: new Date("2026-06-18T09:22:00.000Z")
  },
  {
    id: "demo_message_billing_proration_admin_1",
    ticketId: "demo_ticket_billing_proration",
    authorType: TicketMessageAuthorType.ADMIN,
    authorName: "Avery Brooks",
    authorEmail: "admin@pulsedesk.dev",
    body:
      "Thanks, Maya. Upgrades apply immediately, so the invoice can include prorated charges for the remaining billing period. Please send the workspace name and invoice month and I can verify the line items.",
    createdAt: new Date("2026-06-18T09:27:00.000Z"),
    updatedAt: new Date("2026-06-18T09:27:00.000Z")
  },
  {
    id: "demo_message_mfa_customer_1",
    ticketId: "demo_ticket_login_mfa_reset",
    authorType: TicketMessageAuthorType.CUSTOMER,
    authorName: "Jordan Patel",
    authorEmail: "jordan.patel@apexanalytics.example",
    body:
      "One of our analysts replaced their phone and cannot complete MFA. They still have access to company email. What is the safest reset process?",
    createdAt: new Date("2026-06-18T10:10:00.000Z"),
    updatedAt: new Date("2026-06-18T10:10:00.000Z")
  },
  {
    id: "demo_message_mfa_admin_internal_1",
    ticketId: "demo_ticket_login_mfa_reset",
    authorType: TicketMessageAuthorType.ADMIN,
    authorName: "Avery Brooks",
    authorEmail: "admin@pulsedesk.dev",
    body:
      "Internal note: verify the request through an account owner before resetting MFA. Do not ask the user to share backup codes or one-time passwords.",
    isInternal: true,
    createdAt: new Date("2026-06-18T10:14:00.000Z"),
    updatedAt: new Date("2026-06-18T10:14:00.000Z")
  },
  {
    id: "demo_message_mfa_admin_1",
    ticketId: "demo_ticket_login_mfa_reset",
    authorType: TicketMessageAuthorType.ADMIN,
    authorName: "Avery Brooks",
    authorEmail: "admin@pulsedesk.dev",
    body:
      "Please have the analyst try a backup code first. If that is unavailable, a workspace admin can reset MFA from the team member profile after confirming the user's identity.",
    createdAt: new Date("2026-06-18T10:18:00.000Z"),
    updatedAt: new Date("2026-06-18T10:18:00.000Z")
  },
  {
    id: "demo_message_webhook_customer_1",
    ticketId: "demo_ticket_webhook_retries",
    authorType: TicketMessageAuthorType.CUSTOMER,
    authorName: "Elena Rodriguez",
    authorEmail: "elena.rodriguez@riverlinehealth.example",
    body:
      "Our endpoint logs show 200 responses, but PulseDesk still marks several webhook deliveries as retrying. We need help understanding what headers or timing requirements might be missing.",
    createdAt: new Date("2026-06-18T11:05:00.000Z"),
    updatedAt: new Date("2026-06-18T11:05:00.000Z")
  },
  {
    id: "demo_message_webhook_system_1",
    ticketId: "demo_ticket_webhook_retries",
    authorType: TicketMessageAuthorType.SYSTEM,
    authorName: "PulseDesk",
    body: "Ticket priority changed from MEDIUM to HIGH after AI prioritization found delivery reliability impact.",
    isInternal: true,
    createdAt: new Date("2026-06-18T11:06:00.000Z"),
    updatedAt: new Date("2026-06-18T11:06:00.000Z")
  },
  {
    id: "demo_message_webhook_admin_1",
    ticketId: "demo_ticket_webhook_retries",
    authorType: TicketMessageAuthorType.ADMIN,
    authorName: "Avery Brooks",
    authorEmail: "admin@pulsedesk.dev",
    body:
      "Thanks for the logs. Please confirm whether the endpoint responds within ten seconds and whether any proxy or redirect sits in front of the final 200 response.",
    createdAt: new Date("2026-06-18T11:12:00.000Z"),
    updatedAt: new Date("2026-06-18T11:12:00.000Z")
  },
  {
    id: "demo_message_security_customer_1",
    ticketId: "demo_ticket_security_sessions",
    authorType: TicketMessageAuthorType.CUSTOMER,
    authorName: "Elena Rodriguez",
    authorEmail: "elena.rodriguez@riverlinehealth.example",
    body:
      "We noticed an admin login from an unexpected location and want to revoke active sessions, rotate API keys, and confirm the account is secure.",
    createdAt: new Date("2026-06-18T12:40:00.000Z"),
    updatedAt: new Date("2026-06-18T12:40:00.000Z")
  },
  {
    id: "demo_message_security_ai_1",
    ticketId: "demo_ticket_security_sessions",
    authorType: TicketMessageAuthorType.AI,
    authorName: "PulseDesk AI",
    body:
      "High-risk account security request. Recommend password rotation, session review, MFA confirmation, API key rotation, and escalation to on-call admin queue.",
    isInternal: true,
    createdAt: new Date("2026-06-18T12:41:00.000Z"),
    updatedAt: new Date("2026-06-18T12:41:00.000Z")
  },
  {
    id: "demo_message_security_admin_1",
    ticketId: "demo_ticket_security_sessions",
    authorType: TicketMessageAuthorType.ADMIN,
    authorName: "Avery Brooks",
    authorEmail: "admin@pulsedesk.dev",
    body:
      "We are treating this as urgent. Please rotate the affected password, confirm MFA is enabled, and rotate API keys. I can help revoke active sessions after identity verification.",
    createdAt: new Date("2026-06-18T12:45:00.000Z"),
    updatedAt: new Date("2026-06-18T12:45:00.000Z")
  },
  {
    id: "demo_message_export_customer_1",
    ticketId: "demo_ticket_export_timeout",
    authorType: TicketMessageAuthorType.CUSTOMER,
    authorName: "Jordan Patel",
    authorEmail: "jordan.patel@apexanalytics.example",
    body:
      "Our compliance team needs the May ticket export today, but the CSV export has been queued for more than an hour. The workspace has about 18,000 tickets.",
    createdAt: new Date("2026-06-18T13:05:00.000Z"),
    updatedAt: new Date("2026-06-18T13:05:00.000Z")
  },
  {
    id: "demo_message_export_admin_1",
    ticketId: "demo_ticket_export_timeout",
    authorType: TicketMessageAuthorType.ADMIN,
    authorName: "Avery Brooks",
    authorEmail: "admin@pulsedesk.dev",
    body:
      "Large exports are processed asynchronously. Please send the workspace name and export date range so I can check the queued job and retry it if needed.",
    createdAt: new Date("2026-06-18T13:12:00.000Z"),
    updatedAt: new Date("2026-06-18T13:12:00.000Z")
  },
  {
    id: "demo_message_login_link_customer_1",
    ticketId: "demo_ticket_login_link_expired",
    authorType: TicketMessageAuthorType.CUSTOMER,
    authorName: "Elena Rodriguez",
    authorEmail: "elena.rodriguez@riverlinehealth.example",
    body:
      "A remote team member says the email link is expired by the time they open it. They are using the correct email address and workspace URL.",
    createdAt: new Date("2026-06-17T14:30:00.000Z"),
    updatedAt: new Date("2026-06-17T14:30:00.000Z")
  },
  {
    id: "demo_message_login_link_admin_1",
    ticketId: "demo_ticket_login_link_expired",
    authorType: TicketMessageAuthorType.ADMIN,
    authorName: "Avery Brooks",
    authorEmail: "admin@pulsedesk.dev",
    body:
      "Passwordless sign-in links expire after ten minutes. Ask the user to request a fresh link and open it from the same browser session.",
    createdAt: new Date("2026-06-17T14:44:00.000Z"),
    updatedAt: new Date("2026-06-17T14:44:00.000Z")
  },
  {
    id: "demo_message_login_link_system_1",
    ticketId: "demo_ticket_login_link_expired",
    authorType: TicketMessageAuthorType.SYSTEM,
    authorName: "PulseDesk",
    body: "Ticket marked resolved after the customer confirmed the new sign-in link worked.",
    isInternal: true,
    createdAt: new Date("2026-06-17T15:30:00.000Z"),
    updatedAt: new Date("2026-06-17T15:30:00.000Z")
  }
];

async function seed(): Promise<void> {
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

  for (const ticket of tickets) {
    await prisma.ticket.upsert({
      where: { id: ticket.id },
      create: ticket,
      update: ticket
    });
  }

  for (const suggestion of suggestions) {
    await prisma.ticketAiSuggestion.upsert({
      where: { id: suggestion.id },
      create: suggestion,
      update: suggestion
    });
  }

  for (const message of ticketMessages) {
    await prisma.ticketMessage.upsert({
      where: { id: message.id },
      create: message,
      update: message
    });
  }
}

seed()
  .then(async () => {
    const [userCount, customerCount, ticketCount, documentCount, suggestionCount, messageCount] =
      await Promise.all([
        prisma.user.count(),
        prisma.customer.count(),
        prisma.ticket.count(),
        prisma.knowledgeDocument.count(),
        prisma.ticketAiSuggestion.count(),
        prisma.ticketMessage.count()
      ]);

    console.info(isDemoMode ? "Demo seed complete" : "Seed complete", {
      demoMode: isDemoMode,
      users: userCount,
      customers: customerCount,
      tickets: ticketCount,
      knowledgeDocuments: documentCount,
      aiSuggestions: suggestionCount,
      ticketMessages: messageCount
    });
  })
  .catch((error: unknown) => {
    console.error("Seed failed");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
