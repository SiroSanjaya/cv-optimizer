import { ArrowUpRight, Check, FileText } from "lucide-react";

export function HeroDocument() {
  return (
    <div className="relative mx-auto w-full max-w-lg">
      <div className="overflow-hidden rounded-2xl border border-line bg-paper-raised shadow-xl">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-forest-tint">
              <img src="/icons.png" alt="" className="h-8 w-9 object-cover object-top" />
            </span>
            <div>
              <p className="text-sm font-extrabold text-ink">
                satset<span className="text-forest">CV</span>
              </p>
              <p className="text-[11px] text-ink-soft">Ruang persiapan lamaran</p>
            </div>
          </div>
          <span className="rounded-full bg-forest-tint px-2.5 py-1 text-[10px] font-semibold text-forest">
            Contoh alur
          </span>
        </div>

        <div className="space-y-5 p-5 sm:p-6">
          <div className="rounded-xl border border-line bg-paper p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-forest">
                  Posisi yang dituju
                </p>
                <h3 className="mt-1 font-serif text-lg font-bold text-ink">
                  Lowongan pilihanmu
                </h3>
                <p className="mt-0.5 text-xs text-ink-soft">Posisi yang ingin kamu incar</p>
              </div>
              <ArrowUpRight className="mt-1 h-4 w-4 shrink-0 text-ink-soft" aria-hidden="true" />
            </div>
          </div>

          <div className="rounded-xl border border-line bg-white p-4">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-forest" aria-hidden="true" />
              <p className="text-xs font-bold text-ink">Contoh review 7 perspektif</p>
            </div>
            <div className="mt-4 space-y-3">
              <div className="flex gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-forest-tint text-forest">
                  <Check className="h-3 w-3" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-xs font-semibold text-ink">HR: pengalaman relevan terlihat jelas</p>
                  <p className="mt-0.5 text-[11px] leading-5 text-ink-soft">
                    CV menyebutkan dampak project secara spesifik dan mudah dipindai.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-forest-tint text-forest">
                  <Check className="h-3 w-3" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-xs font-semibold text-ink">Hiring manager: tambahkan angka dampak</p>
                  <p className="mt-0.5 text-[11px] leading-5 text-ink-soft">
                    Ubah “memimpin tim” menjadi hasil terukur agar lebih kredibel.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {["HR", "ATS", "Hiring Manager", "Rekruter", "Career Coach", "Rekan Kerja", "Kandidat"].map((item) => (
              <span
                key={item}
                className="rounded-full border border-line bg-paper px-3 py-1.5 text-[10px] font-medium text-ink-soft"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
