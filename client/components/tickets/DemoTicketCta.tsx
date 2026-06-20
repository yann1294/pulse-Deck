import { Button, Input, Select, Textarea } from "@/components/ui";

export function DemoTicketCta() {
  return (
    <form className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-5 shadow-panel">
      <div>
        <h3 className="text-base font-semibold text-white">Submit a demo ticket</h3>
        <p className="mt-1 text-sm leading-6 text-zinc-400">
          Frontend-only preview. API wiring comes after auth and dashboard screens.
        </p>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Input aria-label="Name" placeholder="Customer name" />
        <Input aria-label="Email" placeholder="Email" type="email" />
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Select aria-label="Category" defaultValue="">
          <option disabled value="">
            Category
          </option>
          <option>Billing</option>
          <option>Technical</option>
          <option>Bug</option>
          <option>Feature request</option>
        </Select>
        <Input aria-label="Subject" placeholder="Ticket subject" />
      </div>
      <Textarea className="mt-3" aria-label="Description" placeholder="Describe the issue..." />
      <Button className="mt-4 w-full sm:w-auto" type="button">
        Submit Demo Ticket
      </Button>
    </form>
  );
}
