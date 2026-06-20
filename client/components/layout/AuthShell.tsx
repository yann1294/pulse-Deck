import Link from "next/link";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui";
import { routes } from "@/lib/routes";

interface AuthShellProps {
  children: ReactNode;
  mode: "sign-in" | "sign-up";
}

export function AuthShell({ children, mode }: AuthShellProps) {
  return (
    <main
      className="relative isolate min-h-screen overflow-hidden bg-zinc-950 px-4 py-6 text-zinc-100 sm:px-6 sm:py-8 lg:px-8"
      id="main-content"
    >
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-zinc-950 to-zinc-900" />
      <div className="pointer-events-none absolute -left-28 top-0 -z-10 h-96 w-96 rounded-full bg-teal-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-28 top-10 -z-10 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl" />
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] w-full max-w-6xl items-center gap-8 lg:min-h-[calc(100vh-4rem)] lg:grid-cols-[0.9fr_1.1fr]">
        <section className="mx-auto w-full max-w-xl text-center lg:text-left">
          <Link className="focus-ring inline-flex items-center gap-3 rounded-full" href={routes.home()}>
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-400 text-sm font-black text-zinc-950">
              P
            </span>
            <span className="text-sm font-semibold tracking-tight text-white">PulseDesk</span>
          </Link>
          <div className="mt-10">
            <Badge tone="emerald">Human-reviewed AI support</Badge>
            <h1 className="mt-5 text-balance text-3xl font-semibold tracking-tight text-white sm:text-5xl">
              AI-powered support operations with human-reviewed replies.
            </h1>
            <p className="mt-5 text-base leading-7 text-zinc-300">
              Triage tickets, retrieve grounded knowledge-base context, and draft replies while
              keeping admins in control of every customer-facing message.
            </p>
          </div>
          <div className="mt-8 grid gap-3 text-left sm:grid-cols-3 lg:grid-cols-1">
            {["Queue-based AI jobs", "RAG snippets from support docs", "No automatic AI replies"].map(
              (item) => (
                <div
                  className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-zinc-200"
                  key={item}
                >
                  {item}
                </div>
              )
            )}
          </div>
        </section>
        <section className="mx-auto w-full max-w-md min-w-0">
          <div className="rounded-[2rem] border border-white/10 bg-zinc-950/70 p-3 shadow-glow backdrop-blur">
            <div className="rounded-[1.5rem] border border-zinc-800 bg-zinc-950 p-4 sm:p-6">
              <div className="mb-5">
                <p className="text-sm font-semibold text-white">
                  {mode === "sign-in" ? "Welcome back" : "Create your workspace"}
                </p>
                <p className="mt-1 text-sm text-zinc-400">
                  {mode === "sign-in"
                    ? "Sign in to review ticket queues and AI drafts."
                    : "Start reviewing AI-assisted support workflows."}
                </p>
              </div>
              {children}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
