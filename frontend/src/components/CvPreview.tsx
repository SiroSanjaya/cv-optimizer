import { useState } from "react";
import { Download, FileText } from "lucide-react";
import type { StructuredCv } from "../types/cv";
import { downloadCvFile } from "../lib/api";
import { Button } from "./Button";

interface CvPreviewProps {
  cv: StructuredCv;
}

function triggerBrowserDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function CvPreview({ cv }: CvPreviewProps) {
  const [downloading, setDownloading] = useState<"pdf" | "docx" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async (format: "pdf" | "docx") => {
    setDownloading(format);
    setError(null);
    try {
      const blob = await downloadCvFile(cv, format);
      const name = (cv.personalInfo.name || "CV").replace(/\s+/g, "_");
      triggerBrowserDownload(blob, `${name}_Optimized.${format}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Download failed.");
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="rounded-lg border border-line bg-paper-raised p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-5">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-forest" />
          <h3 className="font-semibold text-ink">Your tailored CV</h3>
        </div>
        <div className="flex gap-3">
          <Button
            variant="secondary"
            onClick={() => handleDownload("docx")}
            disabled={downloading !== null}
          >
            <Download className="h-4 w-4" />
            {downloading === "docx" ? "Preparing..." : "Download DOCX"}
          </Button>
          <Button onClick={() => handleDownload("pdf")} disabled={downloading !== null}>
            <Download className="h-4 w-4" />
            {downloading === "pdf" ? "Preparing..." : "Download PDF"}
          </Button>
        </div>
      </div>
      {error && <p className="mt-3 text-sm text-rust">{error}</p>}

      <div className="mt-6 max-h-[600px] overflow-y-auto pr-1">
        <h2 className="font-serif text-xl font-semibold text-ink">
          {cv.personalInfo.name || "Your Name"}
        </h2>
        <p className="mt-1 text-xs text-ink-soft">
          {[
            cv.personalInfo.email,
            cv.personalInfo.phone,
            cv.personalInfo.location,
            cv.personalInfo.linkedin,
            cv.personalInfo.github,
          ]
            .filter(Boolean)
            .join("  •  ")}
        </p>

        {cv.summary && (
          <Section title="Professional Summary">
            <p className="text-sm leading-relaxed text-ink-soft">{cv.summary}</p>
          </Section>
        )}

        {cv.skills.length > 0 && (
          <Section title="Skills">
            <p className="text-sm leading-relaxed text-ink-soft">
              {cv.skills.join(" • ")}
            </p>
          </Section>
        )}

        {cv.experience.length > 0 && (
          <Section title="Work Experience">
            <div className="space-y-4">
              {cv.experience.map((exp, i) => (
                <div key={i}>
                  <p className="text-sm font-semibold text-ink">
                    {exp.position} — {exp.company}
                  </p>
                  <p className="text-xs text-ink-soft">
                    {exp.startDate} - {exp.endDate}
                  </p>
                  <ul className="mt-1.5 space-y-1">
                    {exp.bullets.map((b, j) => (
                      <li key={j} className="text-sm leading-relaxed text-ink-soft">
                        • {b}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </Section>
        )}

        {cv.projects.length > 0 && (
          <Section title="Projects">
            <div className="space-y-4">
              {cv.projects.map((proj, i) => (
                <div key={i}>
                  <p className="text-sm font-semibold text-ink">{proj.name}</p>
                  {proj.technologies.length > 0 && (
                    <p className="text-xs text-ink-soft">
                      {proj.technologies.join(", ")}
                    </p>
                  )}
                  {proj.description && (
                    <p className="mt-1 text-sm leading-relaxed text-ink-soft">
                      {proj.description}
                    </p>
                  )}
                  <ul className="mt-1.5 space-y-1">
                    {proj.bullets.map((b, j) => (
                      <li key={j} className="text-sm leading-relaxed text-ink-soft">
                        • {b}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </Section>
        )}

        {cv.education.length > 0 && (
          <Section title="Education">
            <div className="space-y-3">
              {cv.education.map((edu, i) => (
                <div key={i}>
                  <p className="text-sm font-semibold text-ink">
                    {edu.degree}
                    {edu.field ? `, ${edu.field}` : ""}
                  </p>
                  <p className="text-sm text-ink-soft">{edu.institution}</p>
                  <p className="text-xs text-ink-soft">
                    {edu.startDate} - {edu.endDate}
                  </p>
                </div>
              ))}
            </div>
          </Section>
        )}

        {cv.certifications.length > 0 && (
          <Section title="Certifications">
            <p className="text-sm leading-relaxed text-ink-soft">
              {cv.certifications.join(", ")}
            </p>
          </Section>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-5 border-t border-line pt-4">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-forest">
        {title}
      </h4>
      <div className="mt-2">{children}</div>
    </div>
  );
}
