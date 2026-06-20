"use client";

import { useId, useMemo, useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { createTicket, type CreateTicketInput } from "@/lib/api";
import { Badge, Button, Card, ErrorState, Input, Textarea } from "@/components/ui";
import { cn } from "@/lib/utils";

type TicketFormValues = {
  customerName: string;
  customerEmail: string;
  company: string;
  title: string;
  description: string;
  attachmentUrl: string;
};

type TicketFormErrors = Partial<Record<keyof TicketFormValues, string>>;

const initialValues: TicketFormValues = {
  customerName: "",
  customerEmail: "",
  company: "",
  title: "",
  description: "",
  attachmentUrl: ""
};

export function CustomerTicketForm() {
  const formId = useId();
  const [values, setValues] = useState<TicketFormValues>(initialValues);
  const [errors, setErrors] = useState<TicketFormErrors>({});
  const ticketMutation = useMutation({
    mutationFn: createTicket
  });
  const hasSubmitted = ticketMutation.isSuccess;
  const descriptionCount = values.description.length;
  const canSubmit = useMemo(() => !ticketMutation.isPending, [ticketMutation.isPending]);
  const hasValidationErrors = Object.values(errors).some(Boolean);

  function updateField(field: keyof TicketFormValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));

    if (errors[field]) {
      setErrors((current) => ({ ...current, [field]: undefined }));
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submitCurrentValues();
  }

  function submitCurrentValues() {
    const validationErrors = validateTicketForm(values);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    ticketMutation.mutate(toCreateTicketInput(values));
  }

  if (hasSubmitted) {
    return (
      <Card aria-live="polite" className="p-5 sm:p-8" role="status">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-400 text-2xl font-bold text-zinc-950">
          <span aria-hidden="true">✓</span>
        </div>
        <Badge className="mt-6" tone="emerald">Ticket received</Badge>
        <h2 className="mt-4 text-xl font-semibold tracking-tight text-white sm:text-2xl">
          Your ticket was submitted. Our team will review it shortly.
        </h2>
        <p className="mt-3 text-sm leading-6 text-zinc-400">
          We created your support request and queued it for triage. AI may help route the ticket,
          but a human reviews replies before anything is sent.
        </p>
        <Button
          className="mt-6 w-full sm:w-auto"
          onClick={() => {
            ticketMutation.reset();
            setValues(initialValues);
            setErrors({});
          }}
          type="button"
          variant="secondary"
        >
          Submit another ticket
        </Button>
      </Card>
    );
  }

  return (
    <Card className="p-5 sm:p-6">
      <div className="mb-6">
        <Badge tone="teal">Customer support</Badge>
        <h2 className="mt-4 text-2xl font-semibold tracking-tight text-white">
          Tell us what happened
        </h2>
        <p className="mt-2 text-sm leading-6 text-zinc-400">
          Include the workflow, error message, and urgency. AI may help triage the ticket, but
          humans review customer replies.
        </p>
      </div>

      {ticketMutation.isError ? (
        <ErrorState
          actionLabel="Try again"
          className="mb-5"
          error={ticketMutation.error}
          onAction={submitCurrentValues}
          title="Ticket submission failed"
        />
      ) : null}

      <form className="space-y-5" onSubmit={handleSubmit} noValidate>
        {hasValidationErrors ? (
          <div
            aria-live="assertive"
            className="rounded-2xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm leading-6 text-rose-100"
            role="alert"
          >
            Fix the highlighted fields before submitting your ticket.
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            error={errors.customerName}
            id={`${formId}-customer-name`}
            label="Name"
            required
          >
            <Input
              aria-describedby={getDescribedBy(formId, "customerName", errors.customerName)}
              aria-invalid={Boolean(errors.customerName)}
              autoComplete="name"
              className={getFieldClassName(errors.customerName)}
              id={`${formId}-customer-name`}
              onChange={(event) => updateField("customerName", event.target.value)}
              placeholder="Mara Chen"
              required
              value={values.customerName}
            />
          </Field>
          <Field
            error={errors.customerEmail}
            id={`${formId}-customer-email`}
            label="Email"
            required
          >
            <Input
              aria-describedby={getDescribedBy(formId, "customerEmail", errors.customerEmail)}
              aria-invalid={Boolean(errors.customerEmail)}
              autoComplete="email"
              className={getFieldClassName(errors.customerEmail)}
              id={`${formId}-customer-email`}
              onChange={(event) => updateField("customerEmail", event.target.value)}
              placeholder="mara@company.com"
              required
              type="email"
              value={values.customerEmail}
            />
          </Field>
        </div>

        <Field
          label="Company"
          error={errors.company}
          helperText="Optional, but useful for workspace-specific issues."
          id={`${formId}-company`}
        >
          <Input
            aria-describedby={getDescribedBy(formId, "company", errors.company, true)}
            aria-invalid={Boolean(errors.company)}
            autoComplete="organization"
            className={getFieldClassName(errors.company)}
            id={`${formId}-company`}
            onChange={(event) => updateField("company", event.target.value)}
            placeholder="BrightLedger"
            value={values.company}
          />
        </Field>

        <Field error={errors.title} id={`${formId}-title`} label="Title" required>
          <Input
            aria-describedby={getDescribedBy(formId, "title", errors.title)}
            aria-invalid={Boolean(errors.title)}
            className={getFieldClassName(errors.title)}
            id={`${formId}-title`}
            onChange={(event) => updateField("title", event.target.value)}
            placeholder="CSV export is stuck in queue"
            required
            value={values.title}
          />
        </Field>

        <Field
          label="Description"
          error={errors.description}
          helperText={`${descriptionCount}/5000 characters. Minimum 10 characters.`}
          id={`${formId}-description`}
          required
        >
          <Textarea
            aria-describedby={getDescribedBy(formId, "description", errors.description, true)}
            aria-invalid={Boolean(errors.description)}
            className={getFieldClassName(errors.description)}
            id={`${formId}-description`}
            onChange={(event) => updateField("description", event.target.value)}
            placeholder="Describe the issue, what you expected, and what you already tried."
            required
            value={values.description}
          />
        </Field>

        <Field
          label="Attachment URL"
          error={errors.attachmentUrl}
          helperText="Optional. Paste a link to a screenshot, log, or recording."
          id={`${formId}-attachment-url`}
        >
          <Input
            aria-describedby={getDescribedBy(formId, "attachmentUrl", errors.attachmentUrl, true)}
            aria-invalid={Boolean(errors.attachmentUrl)}
            className={getFieldClassName(errors.attachmentUrl)}
            id={`${formId}-attachment-url`}
            onChange={(event) => updateField("attachmentUrl", event.target.value)}
            placeholder="https://example.com/screenshot.png"
            type="url"
            value={values.attachmentUrl}
          />
        </Field>

        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4">
          <p className="text-sm leading-6 text-emerald-50/90">
            PulseDesk may use AI to classify and prioritize this request. A support teammate reviews
            any suggested reply before responding.
          </p>
        </div>

        <Button
          aria-busy={ticketMutation.isPending}
          className="w-full"
          disabled={!canSubmit}
          size="lg"
          type="submit"
        >
          {ticketMutation.isPending ? "Submitting ticket..." : "Submit ticket"}
        </Button>
      </form>
    </Card>
  );
}

interface FieldProps {
  children: React.ReactNode;
  label: string;
  id: string;
  error?: string;
  helperText?: string;
  required?: boolean;
}

function Field({ children, label, id, error, helperText, required }: FieldProps) {
  const errorId = `${id}-error`;
  const helperId = `${id}-helper`;

  return (
    <div className="block">
      <label className="flex items-center justify-between gap-3 text-sm font-medium text-zinc-200" htmlFor={id}>
        <span>
          {label}
          {required ? <span aria-hidden="true" className="text-emerald-300"> *</span> : null}
        </span>
      </label>
      <span className="mt-2 block">{children}</span>
      {error ? (
        <span className="mt-2 block text-sm text-rose-300" id={errorId}>
          {error}
        </span>
      ) : helperText ? (
        <span className="mt-2 block text-xs leading-5 text-zinc-400" id={helperId}>
          {helperText}
        </span>
      ) : null}
    </div>
  );
}

function getDescribedBy(
  formId: string,
  field: keyof TicketFormValues,
  error?: string,
  hasHelperText = false
): string | undefined {
  const fieldIds: Record<keyof TicketFormValues, string> = {
    customerName: "customer-name",
    customerEmail: "customer-email",
    company: "company",
    title: "title",
    description: "description",
    attachmentUrl: "attachment-url"
  };
  const id = `${formId}-${fieldIds[field]}`;

  if (error) {
    return `${id}-error`;
  }

  return hasHelperText ? `${id}-helper` : undefined;
}

function validateTicketForm(values: TicketFormValues): TicketFormErrors {
  const nextErrors: TicketFormErrors = {};

  if (!values.customerName.trim()) {
    nextErrors.customerName = "Enter your name.";
  } else if (values.customerName.trim().length > 120) {
    nextErrors.customerName = "Name must be 120 characters or fewer.";
  }

  if (!values.customerEmail.trim()) {
    nextErrors.customerEmail = "Enter your email.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.customerEmail.trim())) {
    nextErrors.customerEmail = "Enter a valid email address.";
  }

  if (values.company.trim().length > 120) {
    nextErrors.company = "Company must be 120 characters or fewer.";
  }

  if (!values.title.trim()) {
    nextErrors.title = "Enter a short ticket title.";
  } else if (values.title.trim().length > 180) {
    nextErrors.title = "Title must be 180 characters or fewer.";
  }

  if (values.description.trim().length < 10) {
    nextErrors.description = "Description must be at least 10 characters.";
  } else if (values.description.trim().length > 5000) {
    nextErrors.description = "Description must be 5000 characters or fewer.";
  }

  if (values.attachmentUrl.trim()) {
    try {
      const parsedUrl = new URL(values.attachmentUrl.trim());

      if (!["http:", "https:"].includes(parsedUrl.protocol)) {
        nextErrors.attachmentUrl = "Attachment URL must start with http:// or https://.";
      }
    } catch {
      nextErrors.attachmentUrl = "Enter a valid attachment URL.";
    }
  }

  return nextErrors;
}

function toCreateTicketInput(values: TicketFormValues): CreateTicketInput {
  return {
    customerName: values.customerName.trim(),
    customerEmail: values.customerEmail.trim(),
    ...(values.company.trim() ? { company: values.company.trim() } : {}),
    title: values.title.trim(),
    description: values.description.trim(),
    ...(values.attachmentUrl.trim() ? { attachmentUrl: values.attachmentUrl.trim() } : {})
  };
}

function getFieldClassName(error: string | undefined): string {
  return cn(error && "border-rose-400/70 focus-visible:ring-rose-300");
}
