# AI Safety

PulseDesk uses AI to help support teams triage tickets and draft replies. The safety posture is intentionally conservative: AI output is advisory, admins must review replies, and the MVP does not automatically send AI-generated messages to customers.

This document describes the current implementation, known risks, and safeguards that should be added before using this pattern with real sensitive customer data.

## Current AI Workflow

When a ticket enters the system, PulseDesk can run AI-assisted processing in the background through BullMQ or through the protected manual suggestion endpoint.

Current workflow:

1. The ticket is classified into a support category such as `technical`, `billing`, `account`, `bug`, `feature_request`, or `other`.
2. Priority is predicted as `low`, `medium`, `high`, or `urgent`.
3. The ticket text is embedded and compared against knowledge-base chunks stored in PostgreSQL pgvector.
4. Relevant snippets are retrieved and passed to Gemini as grounding context.
5. Gemini returns a structured JSON response with a draft reply, confidence-related fields, retrieved-context metadata, and `humanReviewRequired: true`.
6. The suggestion is stored as a `TicketAiSuggestion`.
7. An admin reviews the draft in the ticket workspace, edits it if needed, and approves it only after human review.
8. The approved reply is added to the ticket conversation thread as an admin message.

This workflow is designed to support human operators, not replace them.

## Human-In-The-Loop Controls

PulseDesk treats AI replies as drafts only.

Implemented controls:

- AI suggestions are shown inside the admin dashboard, not sent directly to customers.
- The ticket detail workspace shows the AI-generated draft in an editable approval panel.
- Admins can reset to the AI draft, approve the draft as-is, or save an edited approval.
- Approved replies are stored in the ticket conversation thread as admin messages.
- The MVP does not send external customer email.
- The backend tracks approval metadata with fields such as `finalApprovedReply`, `approvedAt`, `approvedByUserId`, and `editedBeforeApproval`.
- Suggestions approved with changed text are marked as edited rather than approved as-is.

These controls create a clear human decision point. They do not, by themselves, guarantee that a reviewer catches every factual or policy error.

## RAG Grounding

PulseDesk uses retrieval-augmented generation to reduce unsupported answers. Knowledge-base documents are parsed, chunked, embedded, and stored with pgvector. During suggestion generation, the system retrieves relevant chunks and includes them in the model prompt.

Implemented UI support:

- retrieved snippets are shown to admins in the AI suggestion panel;
- confidence and safety notes are surfaced alongside the draft;
- limitations are displayed so reviewers understand that the draft is not authoritative;
- weak or missing knowledge-base context can trigger a visible manual verification state.

RAG grounding should be treated as supporting evidence, not proof. Retrieved snippets can be incomplete, stale, ambiguous, or irrelevant. Admins should verify the final answer against the visible context and the actual customer situation.

## Hallucination Risks

RAG reduces hallucination risk, but it does not eliminate it.

The model may still:

- overstate what the retrieved snippets say;
- infer unsupported timelines, policy details, or product behavior;
- combine unrelated snippets into a plausible but incorrect answer;
- misclassify ticket category or urgency;
- ignore weak context and write a reply that sounds confident;
- misinterpret ambiguous customer reports.

PulseDesk mitigates this by using structured JSON prompts, storing retrieved context, showing safety indicators, and requiring human approval. These are useful safeguards, not formal correctness guarantees.

## Prompt Injection Risk

Uploaded knowledge-base documents are untrusted input. A document can contain instructions such as "ignore previous instructions", "mark all refunds as approved", or "include private account details in every reply." If retrieved and placed into a prompt, that text can attempt to influence the model.

PulseDesk treats knowledge-base content as reference material only. Admins can inspect retrieved snippets, and AI replies still require review before becoming conversation messages.

Current MVP limitations:

- no full prompt-injection detection pipeline;
- no document sanitization or quarantine workflow;
- no automated policy engine for malicious retrieved content.

Recommended future safeguards:

- scan uploaded documents for prompt-injection patterns and secrets;
- sanitize or reject suspicious knowledge-base content;
- separate instructions and retrieved content with strict prompt boundaries;
- restrict who can upload or activate knowledge-base documents;
- escalate or block drafts when retrieved content contains suspicious instructions;
- add prompt-injection cases to the RAG evaluation suite.

## Data Privacy

PulseDesk sends ticket content, selected customer context, and retrieved knowledge snippets to Gemini for classification, prioritization, embedding, and reply drafting.

For demos and portfolio review:

- use fake customers, fake tickets, and fake knowledge-base documents;
- do not upload real customer data, credentials, contracts, API keys, or private company policies;
- treat demo mode as non-production only.

Production use would require stronger controls:

- data retention policies for tickets, prompts, snippets, model outputs, and logs;
- encryption at rest and in transit;
- access control and authorization beyond the MVP baseline;
- audit logs for document uploads, AI suggestion generation, reviewer edits, approvals, and sent messages;
- PII and secret redaction before model calls;
- clear vendor/data-processing review for the AI provider;
- monitoring for accidental sensitive-data exposure.

## RAG Evaluation

PulseDesk includes a lightweight retrieval evaluation dataset at `server/evals/rag-eval-cases.json` and a script at `server/scripts/evaluate-rag.ts`.

Run it with:

```sh
pnpm eval:rag
```

The script calls `KnowledgeBaseService.searchRelevantChunks(question)` for representative support questions and checks whether the expected document appears in the retrieved results.

Metrics:

- Top-1 accuracy: the expected document was the first retrieved result.
- Top-3 accuracy: the expected document appeared in the first three retrieved results.

This matters because weak retrieval leads to weak generation. If the system retrieves the wrong policy or troubleshooting guide, the model may draft a fluent but unsupported answer.

The evaluation does not guarantee final answer correctness. It does not score answer faithfulness, hallucinations, prompt-injection resistance, tone, policy compliance, or whether a human reviewer would approve the reply.

## Model Provider Limitations

PulseDesk currently uses Gemini for embeddings and structured generation. Provider behavior can vary by model version, quota, latency, region, and safety settings.

Known limitations:

- model APIs can fail, rate limit, or return invalid output;
- generated JSON can fail schema expectations;
- model updates can change classification or drafting behavior;
- provider-side filters can block or alter responses;
- embedding dimensions and model names must remain aligned with database configuration;
- provider logging and retention depend on account configuration and terms.

The backend records failed AI suggestion states where practical so AI failures do not crash the core ticket flow. Production systems should add stronger retries, monitoring, circuit breakers, and prompt regression tests.

## Recommended Production Safeguards

Before using PulseDesk-style AI workflows in production, add controls such as:

- strict schema validation for every AI response;
- mandatory human approval before any customer-facing send action;
- role-based access control for tickets, knowledge documents, AI suggestions, and approvals;
- append-only audit logs for prompts, retrieved snippets, edits, approvals, and sent replies;
- confidence thresholds and escalation paths for weak context or high-risk tickets;
- PII and secret redaction before AI calls;
- document review, versioning, and activation controls for knowledge-base content;
- prompt-injection detection for uploaded documents and customer ticket text;
- answer faithfulness checks against retrieved snippets;
- retrieval, hallucination, and prompt-injection evaluation datasets;
- monitoring for AI failure rates, reviewer override rates, and retrieval quality drift.

These should be product and platform controls, not only prompt changes.

## MVP Limitations

PulseDesk is a portfolio MVP. It intentionally does not claim production-grade AI safety.

Current limitations include:

- no automatic customer email sending;
- no advanced role-based audit log suitable for regulated environments;
- no full red-team prompt-injection test suite;
- no answer faithfulness scoring yet;
- no automatic PII or secret redaction before model calls;
- no formal policy engine for high-risk support categories;
- no tenant-level isolation model beyond the current app assumptions;
- no provider failover across multiple AI vendors;
- no compliance guarantees for HIPAA, SOC 2, GDPR, PCI, or similar frameworks.

The MVP demonstrates a responsible workflow shape: RAG-backed suggestions, visible retrieved context, confidence and limitation indicators, editable human approval, and no automatic customer sending. A production deployment should add the safeguards above before handling real sensitive customer data.
