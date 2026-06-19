"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { createTicket, type CreateTicketInput } from "@/lib/api";
import { getUserFriendlyErrorMessage } from "@/lib/api-errors";
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
  const [values, setValues] = useState<TicketFormValues>(initialValues);
  const [errors, setErrors] = useState<TicketFormErrors>({});
  const ticketMutation = useMutation({
    mutationFn: createTicket
  });
  const hasSubmitted = ticketMutation.isSuccess;
  const descriptionCount = values.description.length;
  const canSubmit = useMemo(() => !ticketMutation.isPending, [ticketMutation.isPending]);

  function updateField(field: keyof TicketFormValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));

    if (errors[field]) {
      setErrors((current) => ({ ...current, [field]: undefined }));
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationErrors = validateTicketForm(values);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    ticketMutation.mutate(toCreateTicketInput(values));
  }

  if (hasSubmitted) {
    return (
      <Card className="p-5 sm:p-8">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-400 text-2xl font-bold text-zinc-950">
          ✓
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
        <ErrorState className="mb-5" error={ticketMutation.error} title="Ticket submission failed" />
      ) : null}

      <form className="space-y-5" onSubmit={handleSubmit} noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" error={errors.customerName} required>
            <Input
              aria-invalid={Boolean(errors.customerName)}
              autoComplete="name"
              className={getFieldClassName(errors.customerName)}
              onChange={(event) => updateField("customerName", event.target.value)}
              placeholder="Mara Chen"
              value={values.customerName}
            />
          </Field>
          <Field label="Email" error={errors.customerEmail} required>
            <Input
              aria-invalid={Boolean(errors.customerEmail)}
              autoComplete="email"
              className={getFieldClassName(errors.customerEmail)}
              onChange={(event) => updateField("customerEmail", event.target.value)}
              placeholder="mara@company.com"
              type="email"
              value={values.customerEmail}
            />
          </Field>
        </div>

        <Field
          label="Company"
          error={errors.company}
          helperText="Optional, but useful for workspace-specific issues."
        >
          <Input
            aria-invalid={Boolean(errors.company)}
            autoComplete="organization"
            className={getFieldClassName(errors.company)}
            onChange={(event) => updateField("company", event.target.value)}
            placeholder="BrightLedger"
            value={values.company}
          />
        </Field>

        <Field label="Title" error={errors.title} required>
          <Input
            aria-invalid={Boolean(errors.title)}
            className={getFieldClassName(errors.title)}
            onChange={(event) => updateField("title", event.target.value)}
            placeholder="CSV export is stuck in queue"
            value={values.title}
          />
        </Field>

        <Field
          label="Description"
          error={errors.description}
          helperText={`${descriptionCount}/5000 characters. Minimum 10 characters.`}
          required
        >
          <Textarea
            aria-invalid={Boolean(errors.description)}
            className={getFieldClassName(errors.description)}
            onChange={(event) => updateField("description", event.target.value)}
            placeholder="Describe the issue, what you expected, and what you already tried."
            value={values.description}
          />
        </Field>

        <Field
          label="Attachment URL"
          error={errors.attachmentUrl}
          helperText="Optional. Paste a link to a screenshot, log, or recording."
        >
          <Input
            aria-invalid={Boolean(errors.attachmentUrl)}
            className={getFieldClassName(errors.attachmentUrl)}
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

        <Button className="w-full" disabled={!canSubmit} size="lg" type="submit">
          {ticketMutation.isPending ? "Submitting ticket..." : "Submit ticket"}
        </Button>

        {ticketMutation.isError ? (
          <p className="text-center text-sm text-rose-200">
            {getUserFriendlyErrorMessage(ticketMutation.error)}
          </p>
        ) : null}
      </form>
    </Card>
  );
}

interface FieldProps {
  children: React.ReactNode;
  label: string;
  error?: string;
  helperText?: string;
  required?: boolean;
}

function Field({ children, label, error, helperText, required }: FieldProps) {
  return (
    <label className="block">
      <span className="flex items-center justify-between gap-3 text-sm font-medium text-zinc-200">
        <span>
          {label}
          {required ? <span className="text-emerald-300"> *</span> : null}
        </span>
      </span>
      <span className="mt-2 block">{children}</span>
      {error ? (
        <span className="mt-2 block text-sm text-rose-300">{error}</span>
      ) : helperText ? (
        <span className="mt-2 block text-xs leading-5 text-zinc-500">{helperText}</span>
      ) : null}
    </label>
  );
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
