export function HeroDocument() {
  return (
    <div className="relative mx-auto w-full max-w-sm">
      {/* Match score card, offset behind the CV sheet */}
      <div className="absolute -right-4 -top-6 z-0 w-40 rotate-3 rounded-lg border border-line bg-paper-raised p-4 shadow-sm">
        <p className="text-xs font-medium text-ink-soft">Contoh ilustrasi skor</p>
        <p className="mt-1 font-serif text-3xl font-semibold text-forest">87%</p>
        <div className="mt-2 h-1.5 w-full rounded-full bg-forest-tint">
          <div className="h-1.5 w-[87%] rounded-full bg-forest" />
        </div>
      </div>

      {/* CV sheet */}
      <div className="relative z-10 -rotate-2 rounded-lg border border-line bg-paper-raised p-6 shadow-md">
        <div className="h-3 w-2/3 rounded-sm bg-ink" />
        <div className="mt-2 h-2 w-1/3 rounded-sm bg-line" />

        <div className="mt-5 h-2 w-20 rounded-sm bg-forest" />
        <div className="mt-2 space-y-1.5">
          <div className="h-1.5 w-full rounded-sm bg-line" />
          <div className="h-1.5 w-11/12 rounded-sm bg-line" />
          <div className="h-1.5 w-4/5 rounded-sm bg-line" />
        </div>

        <div className="mt-4 h-2 w-24 rounded-sm bg-forest" />
        <div className="mt-2 flex flex-wrap gap-1.5">
          {["React", "Node.js", "SQL", "Git"].map((skill) => (
            <span
              key={skill}
              className="rounded-full border border-forest/30 bg-forest-tint px-2 py-0.5 text-[10px] font-medium text-forest-dark"
            >
              {skill}
            </span>
          ))}
        </div>

        <div className="mt-4 h-2 w-28 rounded-sm bg-forest" />
        <div className="mt-2 space-y-1.5">
          <div className="h-1.5 w-full rounded-sm bg-line" />
          <div className="h-1.5 w-10/12 rounded-sm bg-line" />
        </div>
      </div>
    </div>
  );
}
