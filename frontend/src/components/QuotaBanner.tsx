interface QuotaBannerProps {
  used: number;
  limit: number;
  bonusCredits?: number;
}

export function QuotaBanner({ used, limit, bonusCredits = 0 }: QuotaBannerProps) {
  const monthlyRemaining = Math.max(0, limit - used);
  const remaining = monthlyRemaining + bonusCredits;
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
          Kuota AI kamu ({limit} penggunaan) sudah habis.
        </span>
      ) : (
        <span>
          Sisa kredit AI:{" "}
          <span className="font-semibold text-ink">
            {remaining}
          </span>{" "}
          penggunaan ({monthlyRemaining}/{limit} kuota bulanan
          {bonusCredits > 0 ? ` + ${bonusCredits} bonus` : ""}).
        </span>
      )}
    </div>
  );
}
