import { ButtonLink } from "@/components/ui";

const navItems = [
  { label: "Product", href: "#product" },
  { label: "Workflow", href: "#workflow" },
  { label: "Stack", href: "#stack" },
  { label: "Safety", href: "#safety" }
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-zinc-950/75 backdrop-blur-xl">
      <div className="page-shell flex h-16 items-center justify-between gap-4">
        <a href="#" className="focus-ring flex items-center gap-3 rounded-full">
          <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-400 text-sm font-black text-zinc-950">
            P
          </span>
          <span className="text-sm font-semibold tracking-tight text-white">PulseDesk</span>
        </a>
        <nav className="hidden items-center gap-6 md:flex">
          {navItems.map((item) => (
            <a
              className="focus-ring rounded-full text-sm font-medium text-zinc-400 transition hover:text-white"
              href={item.href}
              key={item.href}
            >
              {item.label}
            </a>
          ))}
        </nav>
        <ButtonLink href="#dashboard" size="sm" variant="secondary">
          View Dashboard
        </ButtonLink>
      </div>
    </header>
  );
}
