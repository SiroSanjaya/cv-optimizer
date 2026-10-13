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
          Kuota AI kamu ({limit} penggunaan) sudah habis.
        </span>
      ) : (
        <span>
          Sisa kuota AI:{" "}
          <span className="font-semibold text-ink">
            {remaining} dari {limit}
          </span>{" "}
          penggunaan.
        </span>
      )}
    </div>
  );
}
