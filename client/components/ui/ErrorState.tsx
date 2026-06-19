import { Button } from "./Button";
import { Card } from "./Card";
import { getUserFriendlyErrorMessage } from "@/lib/api-errors";

interface ErrorStateProps {
  title?: string;
  message?: string;
  error?: unknown;
  actionLabel?: string;
  onAction?: () => void;
}

export function ErrorState({
  title = "Something went wrong",
  message,
  error,
  actionLabel,
  onAction
}: ErrorStateProps) {
  const userMessage = message ?? getUserFriendlyErrorMessage(error);

  return (
    <Card className="border-red-900/60 bg-red-950/20 px-5 py-5">
      <h3 className="text-sm font-semibold text-red-100">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-red-200/80">{userMessage}</p>
      {actionLabel && onAction ? (
        <Button className="mt-4" size="sm" variant="secondary" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </Card>
  );
}
