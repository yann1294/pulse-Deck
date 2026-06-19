import { Button } from "./Button";
import { Card } from "./Card";

interface ErrorStateProps {
  title?: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function ErrorState({
  title = "Something went wrong",
  message,
  actionLabel,
  onAction
}: ErrorStateProps) {
  return (
    <Card className="border-red-900/60 bg-red-950/20 px-5 py-5">
      <h3 className="text-sm font-semibold text-red-100">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-red-200/80">{message}</p>
      {actionLabel && onAction ? (
        <Button className="mt-4" size="sm" variant="secondary" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </Card>
  );
}
