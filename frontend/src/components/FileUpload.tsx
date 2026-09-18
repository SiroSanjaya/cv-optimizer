import { useCallback, useRef, useState } from "react";
import { FileText, UploadCloud, X } from "lucide-react";

const ACCEPTED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

interface FileUploadProps {
  file: File | null;
  onChange: (file: File | null) => void;
  error?: string;
}

export function FileUpload({ file, onChange, error }: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const validateAndSet = useCallback(
    (candidate: File | undefined) => {
      if (!candidate) return;
      if (!ACCEPTED_TYPES.includes(candidate.type)) {
        setLocalError("Only .pdf and .docx files are supported.");
        return;
      }
      if (candidate.size > MAX_SIZE_BYTES) {
        setLocalError("File is too large. Maximum size is 5MB.");
        return;
      }
      setLocalError(null);
      onChange(candidate);
    },
    [onChange]
  );

  const shownError = error || localError;

  return (
    <div>
      {!file ? (
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            validateAndSet(e.dataTransfer.files?.[0]);
          }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors ${
            isDragging
              ? "border-forest bg-forest-tint"
              : "border-line bg-paper-raised hover:border-ink-soft"
          }`}
        >
          <UploadCloud className="h-8 w-8 text-ink-soft" />
          <p className="mt-3 text-sm font-medium text-ink">
            Drag & drop your CV here, or click to browse
          </p>
          <p className="mt-1 text-xs text-ink-soft">
            PDF or DOCX, up to 5MB
          </p>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.docx"
            className="hidden"
            onChange={(e) => validateAndSet(e.target.files?.[0])}
          />
        </div>
      ) : (
        <div className="flex items-center justify-between rounded-lg border border-line bg-paper-raised px-4 py-3">
          <div className="flex items-center gap-3 overflow-hidden">
            <FileText className="h-5 w-5 shrink-0 text-forest" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-ink">
                {file.name}
              </p>
              <p className="text-xs text-ink-soft">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              onChange(null);
              if (inputRef.current) inputRef.current.value = "";
            }}
            className="rounded-full p-1.5 text-ink-soft hover:bg-line hover:text-ink"
            aria-label="Remove file"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      {shownError && <p className="mt-2 text-sm text-rust">{shownError}</p>}
    </div>
  );
}
