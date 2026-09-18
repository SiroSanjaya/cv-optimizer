interface JobDescriptionInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

const MIN_LENGTH = 30;

export function JobDescriptionInput({
  value,
  onChange,
  error,
}: JobDescriptionInputProps) {
  return (
    <div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Paste the full job description here — responsibilities, requirements, and preferred qualifications all help us match you more accurately."
        rows={10}
        className="w-full resize-y rounded-lg border border-line bg-paper-raised px-4 py-3 text-sm leading-relaxed text-ink placeholder:text-ink-soft/70 focus:border-forest"
      />
      <div className="mt-1.5 flex items-center justify-between text-xs text-ink-soft">
        <span>{value.length < MIN_LENGTH ? `Minimum ${MIN_LENGTH} characters` : " "}</span>
        <span>{value.length} characters</span>
      </div>
      {error && <p className="mt-1 text-sm text-rust">{error}</p>}
    </div>
  );
}
