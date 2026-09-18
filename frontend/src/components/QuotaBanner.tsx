interface QuotaBannerProps {
  used: number;
  limit: number;
}

export function QuotaBanner({ used, limit }: QuotaBannerProps) {
  const remaining = Math.max(0, limit - used);
  const exhausted = remaining === 0;

  return (
    <div
      className={`rounded-md border px-4 py-3 text-sm ${
        exhausted
          ? "border-rust/30 bg-rust-tint text-rust"
          : "border-line bg-paper-raised text-ink-soft"
      }`}
    >
      {exhausted ? (
        <span className="font-medium">
          You've used your free CV optimizations.
        </span>
      ) : (
        <span>
          Free during beta — you have{" "}
          <span className="font-semibold text-ink">
            {remaining} of {limit}
          </span>{" "}
          optimizations left.
        </span>
      )}
    </div>
  );
}
