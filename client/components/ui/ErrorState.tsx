import { Button } from "./Button";
import { Card } from "./Card";
import { getUserFriendlyErrorMessage } from "@/lib/api-errors";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
  title?: string;
  message?: string;
  error?: unknown;
  actionLabel?: string;
  className?: string;
  onAction?: () => void;
}

export function ErrorState({
  title = "Something went wrong",
  message,
  error,
  actionLabel,
  className,
  onAction
}: ErrorStateProps) {
  const userMessage = message ?? getUserFriendlyErrorMessage(error);

  return (
    <Card className={cn("border-rose-900/60 bg-rose-950/20 px-5 py-5", className)}>
      <h3 className="text-sm font-semibold text-rose-100">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-rose-200/80">{userMessage}</p>
      {actionLabel && onAction ? (
        <Button className="mt-4" size="sm" variant="secondary" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </Card>
  );
}
