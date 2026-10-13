import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

interface LoadingStateProps {
  messages: string[];
}

export function LoadingState({ messages }: LoadingStateProps) {
  const [index, setIndex] = useState(0);
  const messageCount = messages.length;

  useEffect(() => {
    if (messageCount <= 1) return;
    const interval = setInterval(() => {
      setIndex((i) => Math.min(i + 1, messageCount - 1));
    }, 2200);
    return () => clearInterval(interval);
  }, [messageCount]);

  const messageIndex = Math.min(index, Math.max(0, messageCount - 1));

  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-line bg-paper-raised px-6 py-16 text-center">
      <Loader2 className="h-7 w-7 animate-spin text-forest" />
      <p className="mt-4 text-sm font-medium text-ink">{messages[messageIndex]}</p>
      <p className="mt-1 text-xs text-ink-soft">This usually takes a few seconds.</p>
    </div>
  );
}
