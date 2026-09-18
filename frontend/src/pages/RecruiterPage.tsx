import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Header } from "../components/Header";
import {
  searchTalentByRequirements,
  bulkScreenCvs,
  generateInterviewInvitation,
  type TalentCandidate,
  type BulkScreenResultItem,
} from "../lib/api";
import {
  Building2,
  Search,
  Sparkles,
  Mail,
  Send,
  Copy,
  Check,
  Filter,
  FileSpreadsheet,
  X,
} from "lucide-react";


export function RecruiterPage() {
  const [activeTab, setActiveTab] = useState<"sourcing" | "bulk" | "invite">("sourcing");

  // Sourcing tab state
  const [requirementText, setRequirementText] = useState(
    "Senior Full Stack Engineer dengan pengalaman React, TypeScript, dan Node.js minimal 3 tahun. Berpengalaman membangun REST API dan database PostgreSQL."
  );
  const [minExp, setMinExp] = useState(0);
  const [candidates, setCandidates] = useState<TalentCandidate[]>([]);
  const [searching, setSearching] = useState(false);
  const [extractedInfo, setExtractedInfo] = useState<{ role: string; skills: string[] } | null>(null);

  // Bulk screener state
  const [bulkRequirement, setBulkRequirement] = useState(
    "Frontend Developer menguasai React, Tailwind CSS, TypeScript, dan performa web."
  );
  const [bulkInputCvs, setBulkInputCvs] = useState(
    `1. Budi Santoso - 3 tahun pengalaman React, TypeScript, Redux, Tailwind. Portfolio: budi.dev\n---\n2. Siti Rahma - 1 tahun pengalaman HTML, CSS, JavaScript dasar, baru belajar React.\n---\n3. Rian Pratama - 5 tahun Full Stack, lead developer di e-commerce, menguasai React, Node.js, Next.js.`
  );
  const [bulkResults, setBulkResults] = useState<BulkScreenResultItem[]>([]);
  const [screening, setScreening] = useState(false);

  // Invitation modal state
  const [inviteCandidate, setInviteCandidate] = useState<TalentCandidate | null>(null);
  const [inviteJobTitle, setInviteJobTitle] = useState("Software Engineer");
  const [inviteCompany, setInviteCompany] = useState("PT Solusi Teknologi");
  const [interviewType, setInterviewType] = useState<"HR Screening" | "Technical Challenge" | "User Interview">("HR Screening");
  const [inviteDate, setInviteDate] = useState("Senin, 14:00 WIB");
  const [invitePlatform, setInvitePlatform] = useState<"Google Meet" | "Zoom" | "Office">("Google Meet");
  const [generatedInvite, setGeneratedInvite] = useState<{ emailSubject: string; emailBody: string; whatsappMessage: string } | null>(null);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedWa, setCopiedWa] = useState(false);


  // Run initial search
  const handleSearchTalent = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!requirementText.trim()) return;

    setSearching(true);
    try {
      const res = await searchTalentByRequirements({
        requirementText,
        minExp: minExp > 0 ? minExp : undefined,
      });
      setCandidates(res.candidates);
      setExtractedInfo(res.extractedRequirements);
    } catch (err: any) {
      alert(err.message || "Gagal mencari talent");
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    handleSearchTalent();
  }, []);

  // Run bulk screening
  const handleRunBulkScreen = async () => {
    if (!bulkRequirement.trim() || !bulkInputCvs.trim()) {
      alert("Mohon masukkan kebutuhan posisi dan daftar CV pelamar.");
      return;
    }

    setScreening(true);
    try {
      const rawCvs = bulkInputCvs.split("---").map((chunk, idx) => ({
        id: `cv-chunk-${idx + 1}`,
        name: chunk.trim().split("\n")[0]?.replace(/^\d+\.\s*/, "").slice(0, 30) || `Pelamar #${idx + 1}`,
        content: chunk.trim(),
      }));

      const results = await bulkScreenCvs({
        requirementText: bulkRequirement,
        rawCvs,
      });
      setBulkResults(results);
    } catch (err: any) {
      alert(err.message || "Gagal melakukan screening CV");
    } finally {
      setScreening(false);
    }
  };

  // Generate invite
  const handleCreateInvite = async (cand: TalentCandidate) => {
    setInviteCandidate(cand);
    try {
      const template = await generateInterviewInvitation({
        candidateName: cand.name,
        jobTitle: inviteJobTitle,
        companyName: inviteCompany,
        interviewType,
        dateSchedule: inviteDate,
        platform: invitePlatform,
      });
      setGeneratedInvite(template);
    } catch (err: any) {
      alert(err.message || "Gagal membuat template undangan");
    }
  };


  return (
    <div className="min-h-screen bg-paper flex flex-col justify-between">
      <Header />

      <main className="mx-auto w-full max-w-6xl px-6 py-8 flex-1 space-y-8">
        {/* Recruiter Hero Banner */}
        <div className="rounded-2xl border border-line bg-gradient-to-r from-blue-900/10 via-paper-raised to-paper-raised p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-blue-800">
              <Building2 className="h-5 w-5" />
              <span className="text-xs font-bold uppercase tracking-wider">
                HR & Recruiter Intelligence Suite
              </span>
            </div>
            <h1 className="mt-2 font-serif text-2xl font-bold text-ink sm:text-3xl">
              Portal Rekruter & AI Talent Sourcing
            </h1>
            <p className="mt-1 max-w-2xl text-xs text-ink-soft leading-relaxed">
              Cari kandidat berdasarkan kebutuhan teknis Anda. AI mencocokkan CV di database, menghitung persentase kecocokan kualifikasi, mendeteksi gap keahlian, dan menyiapkan undangan wawancara resmi seketika.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/dashboard"
              className="rounded-xl border border-line bg-paper-raised px-4 py-2 text-xs font-semibold text-ink hover:border-forest"
            >
              Kembali ke Mode Pencaker
            </Link>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-line pb-2">
          <button
            onClick={() => setActiveTab("sourcing")}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === "sourcing"
                ? "bg-forest text-white shadow-xs"
                : "text-ink-soft hover:text-ink hover:bg-paper-raised"
            }`}
          >
            <Search className="h-4 w-4" />
            <span>AI Talent Sourcing (Cari CV)</span>
          </button>

          <button
            onClick={() => setActiveTab("bulk")}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === "bulk"
                ? "bg-forest text-white shadow-xs"
                : "text-ink-soft hover:text-ink hover:bg-paper-raised"
            }`}
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span>Bulk CV Screener</span>
          </button>

          <button
            onClick={() => setActiveTab("invite")}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === "invite"
                ? "bg-forest text-white shadow-xs"
                : "text-ink-soft hover:text-ink hover:bg-paper-raised"
            }`}
          >
            <Mail className="h-4 w-4" />
            <span>Generator Undangan Interview</span>
          </button>
        </div>

        {/* TAB 1: TALENT SOURCING */}
        {activeTab === "sourcing" && (
          <div className="space-y-6">
            {/* Search Input Box */}
            <form onSubmit={handleSearchTalent} className="rounded-2xl border border-line bg-paper-raised p-6 shadow-sm space-y-4">
              <div>
                <label className="block text-xs font-bold text-ink uppercase tracking-wider mb-1.5">
                  Spesifikasi & Kebutuhan Posisi (Job Requirements)
                </label>
                <textarea
                  rows={3}
                  value={requirementText}
                  onChange={(e) => setRequirementText(e.target.value)}
                  placeholder="Ketikkan kriteria kandidat yang dicari (misal: Senior Frontend Engineer dengan keahlian React, TypeScript, Next.js, dan testing)..."
                  className="w-full rounded-xl border border-line bg-paper p-3 text-xs text-ink outline-none focus:border-forest leading-relaxed"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-line/60">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-ink-soft font-semibold flex items-center gap-1">
                    <Filter className="h-3.5 w-3.5" /> Min Pengalaman:
                  </span>
                  {[0, 2, 4, 6].map((exp) => (
                    <button
                      key={exp}
                      type="button"
                      onClick={() => setMinExp(exp)}
                      className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                        minExp === exp
                          ? "bg-forest-tint text-forest font-bold border border-forest/40"
                          : "border border-line bg-paper text-ink-soft hover:text-ink"
                      }`}
                    >
                      {exp === 0 ? "Semua" : `${exp}+ Thn`}
                    </button>
                  ))}
                </div>

                <button
                  type="submit"
                  disabled={searching}
                  className="flex items-center gap-2 rounded-xl bg-forest px-6 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-forest-dark transition-all disabled:opacity-60 cursor-pointer"
                >
                  {searching ? (
                    <>
                      <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-r-transparent" />
                      <span>Mencocokkan Database CV...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      <span>Cari & Cocokkan Talent</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Extracted Skills Bar */}
            {extractedInfo && (
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-paper p-3 text-xs">
                <span className="font-bold text-ink">Keahlian yang Diprioritaskan HR:</span>
                {extractedInfo.skills.map((sk, i) => (
                  <span key={i} className="rounded bg-forest-tint px-2 py-0.5 text-[11px] font-bold text-forest border border-forest/30">
                    {sk}
                  </span>
                ))}
              </div>
            )}

            {/* Candidate List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-ink-soft">
                  Ditemukan <span className="text-ink font-bold">{candidates.length}</span> kandidat yang cocok
                </p>
                <span className="text-[11px] text-ink-soft">Diurutkan dari Skor Kecocokan Tertinggi</span>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {candidates.map((cand) => (
                  <div
                    key={cand.id}
                    className="rounded-xl border border-line bg-paper-raised p-5 shadow-sm hover:border-forest/60 transition-all flex flex-col justify-between gap-4"
                  >
                    <div>
                      {/* Top Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-serif text-base font-bold text-ink">{cand.name}</h3>
                            {cand.isOpenToWork && (
                              <span className="rounded-full bg-emerald-100 px-2 py-0.2 text-[9px] font-bold text-emerald-800 uppercase">
                                Open to Work
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-medium text-forest mt-0.5">{cand.headline}</p>
                          <p className="text-[11px] text-ink-soft mt-0.5">
                            {cand.location} • {cand.yearsOfExperience} tahun pengalaman
                          </p>
                        </div>

                        {/* Match Score Badge */}
                        <div className="text-right shrink-0">
                          <span className="rounded-lg bg-forest-tint px-2.5 py-1 text-sm font-bold text-forest">
                            {cand.matchScore}% Match
                          </span>
                          <span className="block text-[10px] text-ink-soft mt-1">
                            Prob: <b>{cand.hireProbability}%</b>
                          </span>
                        </div>
                      </div>

                      {/* Salary expectation */}
                      {cand.expectedSalary && (
                        <div className="mt-2 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded inline-block">
                          Ekspektasi: {cand.expectedSalary}
                        </div>
                      )}

                      {/* AI Fit Analysis Summary */}
                      <div className="mt-3 rounded-lg bg-paper p-3 text-xs border border-line/70 text-ink leading-relaxed">
                        <span className="font-bold text-ink block mb-0.5">Analisis Keselarasan AI:</span>
                        {cand.aiFitSummary}
                      </div>

                      {/* Matching vs Missing Skills */}
                      <div className="mt-3 space-y-1.5 text-xs">
                        <div className="flex flex-wrap items-center gap-1">
                          <span className="text-[10px] font-semibold text-emerald-700">Keahlian Cocok:</span>
                          {cand.matchingSkills.map((sk, idx) => (
                            <span key={idx} className="rounded bg-emerald-100/70 px-1.5 py-0.2 text-[10px] font-semibold text-emerald-800">
                              {sk}
                            </span>
                          ))}
                        </div>

                        {cand.missingSkills.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1">
                            <span className="text-[10px] font-semibold text-amber-800">Belum Terdeteksi:</span>
                            {cand.missingSkills.map((sk, idx) => (
                              <span key={idx} className="rounded bg-amber-100/70 px-1.5 py-0.2 text-[10px] font-semibold text-amber-800">
                                {sk}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-3 border-t border-line flex items-center justify-between gap-2">
                      <span className="text-[11px] text-ink-soft truncate">
                        {cand.email || "Hubungi via platform"}
                      </span>

                      <button
                        onClick={() => handleCreateInvite(cand)}
                        className="flex items-center gap-1.5 rounded-lg bg-forest px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-forest-dark transition-all cursor-pointer"
                      >
                        <Send className="h-3.5 w-3.5" />
                        <span>Undang Interview</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: BULK CV SCREENER */}
        {activeTab === "bulk" && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-line bg-paper-raised p-6 shadow-sm space-y-4">
              <div>
                <h3 className="font-serif text-base font-bold text-ink">
                  Screening Massal CV Pelamar (Bulk AI Screener)
                </h3>
                <p className="text-xs text-ink-soft mt-1">
                  Masukkan deskripsi pekerjaan dan tempelkan teks dari beberapa CV pelamar (pisahkan dengan <code className="bg-paper px-1 rounded">---</code>). AI akan meranking dan merekomendasikan kandidat terbaik seketika.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-ink uppercase mb-1">
                  Kriteria Pekerjaan (Job Requirement)
                </label>
                <input
                  type="text"
                  value={bulkRequirement}
                  onChange={(e) => setBulkRequirement(e.target.value)}
                  className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-xs text-ink outline-none focus:border-forest"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-ink uppercase mb-1">
                  Daftar CV Pelamar (Pisahkan per kandidat dengan tanda "---")
                </label>
                <textarea
                  rows={6}
                  value={bulkInputCvs}
                  onChange={(e) => setBulkInputCvs(e.target.value)}
                  className="w-full rounded-lg border border-line bg-paper p-3 text-xs text-ink outline-none focus:border-forest font-mono leading-relaxed"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleRunBulkScreen}
                  disabled={screening}
                  className="flex items-center gap-2 rounded-xl bg-forest px-6 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-forest-dark disabled:opacity-60 cursor-pointer"
                >
                  {screening ? (
                    <>
                      <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-r-transparent" />
                      <span>AI Sedang Meranking CV...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      <span>Mulai Screening Massal</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Results Table */}
            {bulkResults.length > 0 && (
              <div className="rounded-2xl border border-line bg-paper-raised p-6 shadow-sm space-y-4">
                <h3 className="font-serif text-base font-bold text-ink">
                  Hasil Shortlist & Ranking Kandidat
                </h3>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-ink">
                    <thead className="bg-paper text-ink-soft border-b border-line uppercase text-[10px]">
                      <tr>
                        <th className="py-3 px-4">Kandidat</th>
                        <th className="py-3 px-4">Match Score</th>
                        <th className="py-3 px-4">Rekomendasi</th>
                        <th className="py-3 px-4">Kelebihan Utama</th>
                        <th className="py-3 px-4">Kekurangan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {bulkResults.map((item, idx) => (
                        <tr key={idx} className="hover:bg-paper/40">
                          <td className="py-3 px-4 font-bold">{item.candidateName}</td>
                          <td className="py-3 px-4">
                            <span className="font-bold text-forest text-sm">{item.matchScore}%</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                              item.recommendation === "Shortlisted" ? "bg-emerald-100 text-emerald-800" :
                              item.recommendation === "Review Further" ? "bg-amber-100 text-amber-800" :
                              "bg-rose-100 text-rose-800"
                            }`}>
                              {item.recommendation}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-ink-soft max-w-xs">{item.keyStrengths?.join(", ") || "-"}</td>
                          <td className="py-3 px-4 text-ink-soft max-w-xs">{item.missingQualifications?.join(", ") || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: INVITATION GENERATOR */}
        {activeTab === "invite" && (
          <div className="rounded-2xl border border-line bg-paper-raised p-6 shadow-sm space-y-6">
            <div>
              <h3 className="font-serif text-base font-bold text-ink">
                Generator Undangan Wawancara Resmi HR
              </h3>
              <p className="text-xs text-ink-soft mt-1">
                Buat template undangan wawancara formal untuk email dan pesan ringkas WhatsApp dengan cepat.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-xs font-bold text-ink uppercase mb-1">Nama Kandidat</label>
                <input
                  type="text"
                  value={inviteCandidate?.name || "Rian Pratama"}
                  onChange={(e) => setInviteCandidate((prev) => prev ? { ...prev, name: e.target.value } : null)}
                  className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-xs text-ink"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-ink uppercase mb-1">Posisi / Role</label>
                <input
                  type="text"
                  value={inviteJobTitle}
                  onChange={(e) => setInviteJobTitle(e.target.value)}
                  className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-xs text-ink"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-ink uppercase mb-1">Nama Perusahaan</label>
                <input
                  type="text"
                  value={inviteCompany}
                  onChange={(e) => setInviteCompany(e.target.value)}
                  className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-xs text-ink"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-ink uppercase mb-1">Tahap Wawancara</label>
                <select
                  value={interviewType}
                  onChange={(e) => setInterviewType(e.target.value as any)}
                  className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-xs text-ink"
                >
                  <option value="HR Screening">HR Screening (Tahap 1)</option>
                  <option value="Technical Challenge">Technical Challenge / Live Coding</option>
                  <option value="User Interview">User & Architecture Interview</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-ink uppercase mb-1">Jadwal</label>
                <input
                  type="text"
                  value={inviteDate}
                  onChange={(e) => setInviteDate(e.target.value)}
                  className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-xs text-ink"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-ink uppercase mb-1">Media / Platform</label>
                <select
                  value={invitePlatform}
                  onChange={(e) => setInvitePlatform(e.target.value as any)}
                  className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-xs text-ink"
                >
                  <option value="Google Meet">Google Meet</option>
                  <option value="Zoom">Zoom Meeting</option>
                  <option value="Office">Tatap Muka di Kantor</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-line">
              <button
                type="button"
                onClick={() => handleCreateInvite(inviteCandidate || { id: "1", name: "Rian Pratama", headline: "", location: "", yearsOfExperience: 3, skills: [], summary: "", matchScore: 90, hireProbability: 90, matchingSkills: [], missingSkills: [], aiFitSummary: "", isOpenToWork: true })}
                className="flex items-center gap-2 rounded-xl bg-forest px-6 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-forest-dark cursor-pointer"
              >
                <Sparkles className="h-4 w-4" />
                <span>Buat Template Undangan</span>
              </button>
            </div>

            {/* Generated Templates */}
            {generatedInvite && (
              <div className="space-y-4 pt-4 border-t border-line">
                <div className="rounded-xl border border-line bg-paper p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-ink flex items-center gap-1.5">
                      <Mail className="h-4 w-4 text-forest" />
                      Format Email Resmi (Subject & Body):
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`${generatedInvite.emailSubject}\n\n${generatedInvite.emailBody}`);
                        setCopiedEmail(true);
                        setTimeout(() => setCopiedEmail(false), 2000);
                      }}
                      className="flex items-center gap-1 text-[11px] font-semibold text-forest hover:underline"
                    >
                      {copiedEmail ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                      <span>{copiedEmail ? "Tersalin!" : "Salin Email"}</span>
                    </button>
                  </div>

                  <p className="text-xs font-bold text-ink bg-paper-raised p-2 rounded border border-line">
                    Subjek: {generatedInvite.emailSubject}
                  </p>
                  <pre className="whitespace-pre-wrap text-xs text-ink-soft font-sans leading-relaxed bg-paper-raised p-3 rounded border border-line">
                    {generatedInvite.emailBody}
                  </pre>
                </div>

                <div className="rounded-xl border border-line bg-paper p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-ink flex items-center gap-1.5">
                      <Send className="h-4 w-4 text-emerald-600" />
                      Format Singkat (WhatsApp / LinkedIn Message):
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(generatedInvite.whatsappMessage);
                        setCopiedWa(true);
                        setTimeout(() => setCopiedWa(false), 2000);
                      }}
                      className="flex items-center gap-1 text-[11px] font-semibold text-forest hover:underline"
                    >
                      {copiedWa ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                      <span>{copiedWa ? "Tersalin!" : "Salin Pesan WA"}</span>
                    </button>
                  </div>
                  <pre className="whitespace-pre-wrap text-xs text-ink-soft font-sans leading-relaxed bg-paper-raised p-3 rounded border border-line">
                    {generatedInvite.whatsappMessage}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Invitation Pop-up Modal when clicking "Undang Interview" from list */}
      {inviteCandidate && generatedInvite && activeTab === "sourcing" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-2xl rounded-2xl border border-line bg-paper-raised p-6 shadow-2xl overflow-y-auto max-h-[90vh] space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="font-serif text-base font-bold text-ink">
                Undang {inviteCandidate.name} ke Wawancara
              </h3>
              <button
                onClick={() => setInviteCandidate(null)}
                className="rounded-lg p-1.5 text-ink-soft hover:bg-paper hover:text-ink cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="rounded-xl border border-line bg-paper p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-ink">Draft Undangan Email:</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`${generatedInvite.emailSubject}\n\n${generatedInvite.emailBody}`);
                    alert("Email berhasil disalin ke clipboard!");
                  }}
                  className="flex items-center gap-1 text-xs font-semibold text-forest hover:underline"
                >
                  <Copy className="h-3.5 w-3.5" />
                  <span>Salin Draft</span>
                </button>
              </div>
              <p className="text-xs font-bold text-ink bg-paper-raised p-2 rounded">
                {generatedInvite.emailSubject}
              </p>
              <pre className="whitespace-pre-wrap text-xs text-ink-soft font-sans leading-relaxed bg-paper-raised p-3 rounded max-h-60 overflow-y-auto">
                {generatedInvite.emailBody}
              </pre>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-line">
              <button
                onClick={() => setInviteCandidate(null)}
                className="rounded-xl border border-line bg-paper px-4 py-2 text-xs font-semibold text-ink"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
