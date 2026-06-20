# AI Safety

## Overview

PulseDesk uses AI to assist support teams with internal ticket triage and response drafting. The system can classify tickets, estimate priority, retrieve relevant knowledge-base snippets through pgvector search, and generate suggested replies with Gemini.

The important safety boundary is that AI output is advisory. PulseDesk does not treat model output as truth, does not send AI replies directly to customers, and presents generated drafts as material for human review.

This document describes the MVP safety posture, known limitations, and the safeguards that should be added before using this pattern in a production customer-support environment.

## Hallucination Risk

Large language models can produce fluent but incorrect statements. In a support product, this can create several risks:

- inventing product behavior, pricing, policies, deadlines, or account-specific facts;
- overstating confidence when the available context is incomplete;
- recommending troubleshooting steps that do not apply to the customer's environment;
- misclassifying severity, especially for security, billing, or data-loss issues;
- creating a reply that sounds final even though it has not been reviewed.

PulseDesk reduces this risk by asking the model to return structured JSON, using low-temperature generation, requiring `humanReviewRequired: true` for reply suggestions, and instructing the model to say when context is insufficient. These are helpful controls, but they are not guarantees. A human reviewer must still verify every suggested reply before customer use.

## RAG Grounding Limitations

PulseDesk uses retrieval-augmented generation by embedding knowledge-base documents, storing vectors in PostgreSQL pgvector, and retrieving relevant snippets for reply generation.

RAG improves grounding, but it does not eliminate hallucination. Retrieval can fail or be incomplete when:

- the knowledge base is outdated, ambiguous, duplicated, or missing required policy details;
- the user's ticket uses terms that do not closely match the embedded documents;
- the top retrieved snippets are semantically similar but operationally irrelevant;
- the model ignores or misinterprets retrieved snippets;
- the retrieved text contains instructions or claims that should not be trusted.

The MVP stores retrieved context with AI suggestions so reviewers can see what informed a draft. In production, citations should be shown more prominently, snippets should be bounded by source permissions, and replies should be blocked or escalated when retrieval confidence is low.

## Human-In-The-Loop Approval

PulseDesk is designed around human-in-the-loop support operations. AI suggestions are internal drafts and classification aids. They are not customer-facing messages until an admin reviews, edits, and approves them outside the AI generation step.

The current prompts explicitly state that:

- generated replies are suggestions only;
- the model must not imply that a reply has already been sent or approved;
- a human support admin must review the output;
- unsupported claims should be avoided when context is insufficient.

This is a product and safety requirement, not only a prompt instruction. A production version should enforce this in workflow state as well: only approved responses should be sendable, approval should be audited, and high-risk categories should require additional review.

## Data Privacy Considerations

PulseDesk sends ticket details, selected customer context, and retrieved knowledge-base snippets to the configured AI provider for classification, prioritization, embeddings, and reply drafting.

Sensitive data risk exists if tickets or knowledge-base documents contain:

- customer names, emails, company names, and account details;
- credentials, API keys, access tokens, private URLs, or secrets;
- billing data, contracts, or commercial terms;
- health, legal, financial, or other regulated information;
- internal security procedures or incident details.

For a portfolio MVP, demo data should be fake and non-sensitive. For production, data sent to model providers should be minimized, redacted where possible, and governed by a clear data-processing agreement. Logs should avoid storing full prompts, full customer messages, or secrets. Access to AI suggestions and retrieved context should follow the same authorization model as ticket data.

## Prompt Injection Risks From Uploaded Knowledge-Base Documents

Uploaded knowledge-base documents are untrusted input. A document can contain malicious or accidental instructions such as "ignore previous instructions", "send the customer's private data", or "always mark this issue as resolved". If that text is retrieved and placed into the model prompt, it can attempt to influence the model.

PulseDesk prompts tell the model to treat ticket text and retrieved snippets as untrusted input, but prompt instructions alone are not a complete defense.

Production safeguards should include:

- scanning uploaded documents for suspicious instructions and secrets;
- separating system instructions from retrieved content with strict prompt boundaries;
- limiting retrieved snippets to factual support content, not executable instructions;
- showing citations and retrieved text to the reviewer;
- refusing or escalating drafts when retrieved content appears to contain policy-violating instructions;
- restricting who can upload or publish knowledge-base documents.

## Model Provider Limitations

PulseDesk currently uses Gemini for embeddings and JSON generation. Model provider behavior can change over time and may vary by model, region, quota, latency, and safety settings.

Known provider-related limitations include:

- generated JSON can be invalid or fail schema expectations;
- provider APIs can fail, rate limit, or return empty responses;
- embedding dimensions and model names must match database configuration;
- provider-side safety filters can block output unexpectedly;
- provider retention, logging, and training policies depend on account configuration and terms;
- model updates can change output quality or classification behavior.

PulseDesk handles some failure cases by storing failed AI suggestion records and surfacing failed AI status. Production systems should add stronger retries, circuit breakers, monitoring, and regression tests for prompt behavior.

## Recommended Production Safeguards

Before using PulseDesk-style AI support workflows in production, add safeguards such as:

- strict schema validation for every AI response, with rejection on missing or unsafe fields;
- confidence thresholds and automatic escalation for low-confidence or insufficient-context drafts;
- mandatory human approval before any customer-facing response is sent;
- audit logs for prompt inputs, retrieved snippets, reviewer edits, approvals, and sent messages;
- redaction for secrets, credentials, payment data, and regulated personal information before AI calls;
- document upload review, source ownership, and versioning for knowledge-base content;
- prompt-injection detection for tickets and uploaded documents;
- role-based access control for tickets, knowledge documents, AI suggestions, and approval actions;
- provider timeout, retry, and fallback behavior that does not block core ticket creation;
- monitoring for AI failure rates, unsafe output reports, retrieval quality, and reviewer override rates;
- evaluation datasets for common ticket categories, edge cases, security incidents, and policy-sensitive responses;
- clear customer and admin disclosures about where AI is used.

These controls should be treated as application requirements, not only prompt changes.

## What This MVP Intentionally Does Not Do

PulseDesk is a portfolio MVP and intentionally keeps the safety system simple. It does not currently provide:

- automatic PII or secret redaction before model calls;
- a formal policy engine for high-risk tickets;
- tenant-level data isolation beyond the current app assumptions;
- advanced prompt-injection detection for uploaded documents;
- automated factuality scoring against retrieved snippets;
- approval audit trails suitable for regulated environments;
- provider failover across multiple model vendors;
- fine-grained retention controls for prompts, snippets, or generated suggestions;
- compliance guarantees for HIPAA, SOC 2, GDPR, PCI, or similar frameworks;
- automatic sending of AI-generated replies to customers.

The MVP demonstrates the architecture and workflow shape: RAG-backed suggestions, background AI jobs, visible AI status, and human review. A production deployment should add the safeguards above before handling real sensitive customer data.
