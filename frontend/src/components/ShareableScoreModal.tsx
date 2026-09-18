import { useState, useRef, useEffect } from "react";
import {
  X,
  Download,
  Share2,
  Copy,
  Check,
  Award,
  MessageCircle,
  ExternalLink,
} from "lucide-react";
import { Button } from "./Button";
import { fireConfetti } from "../lib/confetti";
import type { StructuredCv } from "../types/cv";

interface ShareableScoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  score: number;
  cv: StructuredCv | null;
  jobDescription: string;
}

export function ShareableScoreModal({
  isOpen,
  onClose,
  score,
  cv,
  jobDescription,
}: ShareableScoreModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // Extract role/position from JD or fallback
  const candidateName = cv?.personalInfo?.name || "Job Seeker";
  const firstLine = jobDescription.split("\n")[0] || "Software Engineer";
  const targetRole = firstLine.replace(/^(Posisi|Role|Job Title|Lowongan):\s*/i, "").slice(0, 45);

  const validScore = Math.min(100, Math.max(0, Math.round(score)));
  const matchedSkills = (cv?.skills || []).slice(0, 6);

  const viralCaption = `🚀 Baru aja audit dan optimasi CV saya menggunakan AI di CV Optimizer!

Hasil skor kecocokan ATS untuk posisi ${targetRole} tembus ${validScore}% dengan status kualifikasi sangat tinggi! 🔥

Alat ini beneran ngebantu banget memetakan celah skill, merekomendasikan keyword yang dicari recruiter, dan memformat ulang pencapaian kerja sesuai standar ATS internasional.

Buat teman-teman yang lagi aktif job hunting atau mau tes seberapa siap CV-nya lolos screening, wajib coba gratis di sini:
👉 ${window.location.origin}/optimize

#CareerGrowth #JobHunting #CVReview #TechTalent #ATSResume #JobOpportunity #CVOptimizer`;

  // Draw card on canvas whenever modal opens
  useEffect(() => {
    if (!isOpen) return;

    // Fire confetti on open
    fireConfetti(2500);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 1200 x 630 (Standard LinkedIn/OG Image dimension)
    const W = 1200;
    const H = 630;
    canvas.width = W;
    canvas.height = H;

    // 1. Background gradient (Dark Obsidian & Deep Emerald Glow)
    const bgGrad = ctx.createLinearGradient(0, 0, W, H);
    bgGrad.addColorStop(0, "#080D14");
    bgGrad.addColorStop(0.5, "#0A161E");
    bgGrad.addColorStop(1, "#05110E");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // 2. Radial ambient glow behind score ring
    const glowGrad = ctx.createRadialGradient(260, 315, 10, 260, 315, 260);
    glowGrad.addColorStop(0, "rgba(16, 185, 129, 0.25)");
    glowGrad.addColorStop(0.6, "rgba(5, 150, 105, 0.08)");
    glowGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(260, 315, 260, 0, Math.PI * 2);
    ctx.fill();

    // 3. Elegant border frame
    ctx.strokeStyle = "rgba(16, 185, 129, 0.35)";
    ctx.lineWidth = 4;
    ctx.strokeRect(24, 24, W - 48, H - 48);

    // Inner subtle border
    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    ctx.lineWidth = 1;
    ctx.strokeRect(34, 34, W - 68, H - 68);

    // 4. Header Badge: "CV OPTIMIZER AI"
    ctx.fillStyle = "#10B981";
    ctx.font = "bold 16px 'Plus Jakarta Sans', sans-serif";
    ctx.letterSpacing = "2px";
    ctx.fillText("✦ CV OPTIMIZER AI  |  OFFICIAL ATS READINESS REPORT ✦", 70, 80);

    // 5. Draw Left Circle Score Ring
    const centerX = 260;
    const centerY = 320;
    const radius = 130;

    // Track circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    ctx.lineWidth = 18;
    ctx.stroke();

    // Progress circle
    const progressEnd = -Math.PI / 2 + (validScore / 100) * (Math.PI * 2);
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, -Math.PI / 2, progressEnd);
    const ringGrad = ctx.createLinearGradient(centerX - radius, centerY, centerX + radius, centerY);
    ringGrad.addColorStop(0, "#10B981");
    ringGrad.addColorStop(1, "#34D399");
    ctx.strokeStyle = ringGrad;
    ctx.lineWidth = 18;
    ctx.lineCap = "round";
    ctx.stroke();

    // Score text
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 68px 'Plus Jakarta Sans', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`${validScore}%`, centerX, centerY + 16);

    ctx.fillStyle = "#A7F3D0";
    ctx.font = "bold 15px 'Plus Jakarta Sans', sans-serif";
    ctx.letterSpacing = "1.5px";
    ctx.fillText("MATCH SCORE", centerX, centerY + 48);

    // 6. Right Side Candidate Info
    ctx.textAlign = "left";

    // Candidate Name
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 44px 'Plus Jakarta Sans', sans-serif";
    ctx.fillText(candidateName, 460, 200);

    // Target Role
    ctx.fillStyle = "#94A3B8";
    ctx.font = "500 22px 'Plus Jakarta Sans', sans-serif";
    ctx.fillText(`Target Role: ${targetRole}`, 460, 240);

    // Status Badge Pill
    const badgeText = validScore >= 80 ? "STATUS: TOP CANDIDATE (HIGH PROBABILITY)" : "STATUS: COMPETITIVE CANDIDATE";
    ctx.fillStyle = "rgba(16, 185, 129, 0.15)";
    ctx.strokeStyle = "rgba(16, 185, 129, 0.5)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(460, 270, 480, 38, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#34D399";
    ctx.font = "bold 14px 'Plus Jakarta Sans', sans-serif";
    ctx.fillText(`✓ ${badgeText}`, 478, 295);

    // 7. Top Matched Skills Section
    ctx.fillStyle = "#E2E8F0";
    ctx.font = "bold 16px 'Plus Jakarta Sans', sans-serif";
    ctx.fillText("VERIFIED QUALIFICATIONS & CORE SKILLS:", 460, 360);

    let skillX = 460;
    let skillY = 385;
    ctx.font = "bold 14px 'Plus Jakarta Sans', sans-serif";

    for (const skill of matchedSkills) {
      const tagWidth = ctx.measureText(skill).width + 24;
      if (skillX + tagWidth > W - 70) {
        skillX = 460;
        skillY += 40;
      }
      ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
      ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(skillX, skillY, tagWidth, 30, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#F1F5F9";
      ctx.fillText(skill, skillX + 12, skillY + 20);

      skillX += tagWidth + 10;
    }

    // 8. Footer Section
    ctx.fillStyle = "#64748B";
    ctx.font = "400 13px 'Plus Jakarta Sans', sans-serif";
    const dateStr = new Date().toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    ctx.fillText(`Audited on ${dateStr}  •  Tested against Workday, Taleo & Greenhouse ATS algorithms`, 70, H - 55);

    ctx.textAlign = "right";
    ctx.fillStyle = "#10B981";
    ctx.font = "bold 15px 'Plus Jakarta Sans', sans-serif";
    ctx.fillText("cv-optimizer.app", W - 70, H - 55);
  }, [isOpen, validScore, candidateName, targetRole, matchedSkills]);

  if (!isOpen) return null;

  const handleDownloadPng = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setDownloading(true);
    try {
      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `CV_Optimizer_Score_${validScore}pct_${candidateName.replace(/\s+/g, "_")}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setDownloading(false);
    }
  };

  const handleCopyCaption = async () => {
    try {
      await navigator.clipboard.writeText(viralCaption);
      setCopiedCaption(true);
      setTimeout(() => setCopiedCaption(false), 2500);
    } catch {}
  };

  const handleShareLinkedIn = () => {
    handleCopyCaption();
    const url = encodeURIComponent(window.location.origin);
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(
      `Halo! Saya baru saja menguji CV saya untuk posisi ${targetRole} di CV Optimizer dan mendapat skor ATS ${validScore}%! 🚀 Coba cek skor CV kamu juga di sini: ${window.location.origin}/optimize`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-3xl rounded-2xl border border-line bg-paper-raised p-6 sm:p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 rounded-lg p-1.5 text-ink-soft hover:bg-paper hover:text-ink transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-2 text-forest font-bold text-xs uppercase tracking-wider">
          <Award className="h-4 w-4 text-forest" />
          <span>Viral Social Readiness Card</span>
        </div>
        <h3 className="mt-1 font-serif text-2xl font-bold text-ink">
          Pamerkan Skor Kesiapan Kerjamu di LinkedIn! 🚀
        </h3>
        <p className="mt-1 text-xs text-ink-soft">
          Download kartu skor bersertifikat beresolusi tinggi ini atau bagikan langsung dengan template viral siap pakai.
        </p>

        {/* Canvas Visual Card Preview */}
        <div className="mt-6 overflow-hidden rounded-xl border border-line/80 shadow-lg bg-black">
          <canvas
            ref={canvasRef}
            className="w-full h-auto block rounded-xl cursor-pointer hover:opacity-95 transition-opacity"
            onClick={handleDownloadPng}
            title="Klik untuk download gambar kartu ini"
          />
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              onClick={handleDownloadPng}
              disabled={downloading}
              className="gap-2 text-xs py-2.5 px-4 bg-forest hover:bg-forest-dark shadow-sm"
            >
              <Download className="h-4 w-4" />
              Download Gambar (.PNG)
            </Button>

            <button
              type="button"
              onClick={handleShareLinkedIn}
              className="inline-flex items-center gap-2 rounded-md bg-[#0A66C2] px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-[#084e96] shadow-sm"
            >
              <Share2 className="h-4 w-4" />
              Bagikan ke LinkedIn
              <ExternalLink className="h-3 w-3 opacity-70" />
            </button>

            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="inline-flex items-center gap-2 rounded-md bg-[#25D366] px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-[#1faa53] shadow-sm"
            >
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </button>
          </div>

          <button
            type="button"
            onClick={handleCopyCaption}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-paper px-3.5 py-2 text-xs font-semibold text-ink hover:border-forest/60 transition-all"
          >
            {copiedCaption ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-600" />
                <span className="text-emerald-700 font-medium">Caption Tersalin!</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                Salin Caption Viral
              </>
            )}
          </button>
        </div>

        {/* Caption Preview Accordion */}
        <div className="mt-4 rounded-xl border border-line bg-paper p-3.5 text-xs">
          <div className="flex items-center justify-between text-ink-soft mb-1.5">
            <span className="font-semibold text-ink">Preview Caption Post:</span>
            <span className="text-[11px] text-forest font-medium">Auto-copied saat klik Bagikan</span>
          </div>
          <p className="text-ink-soft leading-relaxed line-clamp-3 text-[11px] whitespace-pre-line">
            {viralCaption}
          </p>
        </div>
      </div>
    </div>
  );
}
