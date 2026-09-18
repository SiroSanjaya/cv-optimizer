/**
 * freeJobSources.ts
 *
 * Contoh integrasi 3 sumber lowongan GRATIS tambahan:
 * - Jooble (butuh API key gratis, coverage Indonesia bagus)
 * - RemoteOK (gratis, tanpa API key, fokus remote tech global)
 * - Himalayas (gratis, tanpa API key, fokus remote jobs)
 *
 * Cara pakai: copy fungsi-fungsi di bawah ke dalam services/jobs/jobAggregator.ts
 * lo, terus panggil bareng fungsi fetchRemotive/fetchArbeitnow yang udah ada,
 * lalu gabungin hasilnya dengan Promise.allSettled biar kalau satu sumber
 * gagal/timeout, yang lain tetap jalan.
 */

import axios from "axios";

// Tipe minimal biar cocok sama RecommendedJob yang udah ada di api.ts frontend.
// Sesuaikan lagi sama interface asli lo kalau field-nya beda.
interface NormalizedJob {
    id: string;
    title: string;
    company: string;
    location: string;
    salary?: string;
    type?: string;
    source: string;
    url: string;
    description: string;
    skills: string[];
    postedAt?: string;
    remote?: boolean;
}

// ---------------------------------------------------------------------------
// 1) JOOBLE
// Daftar gratis di https://jooble.org/api/about untuk dapet API key.
// Endpoint-nya POST, bukan GET, dan butuh key di URL path.
// ---------------------------------------------------------------------------
const JOOBLE_API_KEY = process.env.JOOBLE_API_KEY || "";

export async function fetchJooble(params: {
    keyword: string;
    location?: string; // contoh: "Indonesia", "Jakarta", kosongkan utk semua lokasi
}): Promise<NormalizedJob[]> {
    if (!JOOBLE_API_KEY) {
        console.warn("[Jooble] JOOBLE_API_KEY belum diset, skip source ini.");
        return [];
    }

    try {
        const url = `https://jooble.org/api/${JOOBLE_API_KEY}`;
        const { data } = await axios.post(
            url,
            {
                keywords: params.keyword,
                location: params.location || "Indonesia",
            },
            { timeout: 10_000 }
        );

        const jobs = Array.isArray(data?.jobs) ? data.jobs : [];

        return jobs.map((j: any, idx: number): NormalizedJob => ({
            id: `jooble-${j.id || idx}-${Date.now()}`,
            title: j.title || "Untitled Position",
            company: j.company || "Perusahaan Tidak Diketahui",
            location: j.location || params.location || "Indonesia",
            salary: j.salary || undefined,
            type: j.type || undefined,
            source: "Jooble",
            url: j.link,
            description: (j.snippet || "").replace(/<[^>]*>/g, ""), // strip HTML tags
            skills: [], // Jooble ga return skills terstruktur, biarin kosong / infer di layer lain
            postedAt: j.updated || undefined,
            remote: /remote/i.test(j.title || "") || /remote/i.test(j.snippet || ""),
        }));
    } catch (err) {
        console.error("[Jooble] fetch error:", (err as Error).message);
        return [];
    }
}

// ---------------------------------------------------------------------------
// 2) REMOTEOK
// Gratis, tanpa API key. https://remoteok.com/api
// Response index [0] biasanya metadata, bukan job — harus di-skip.
// ---------------------------------------------------------------------------
export async function fetchRemoteOK(params: {
    keyword?: string;
}): Promise<NormalizedJob[]> {
    try {
        const { data } = await axios.get("https://remoteok.com/api", {
            timeout: 10_000,
            headers: { "User-Agent": "Mozilla/5.0 (compatible; JobAggregator/1.0)" },
        });

        const jobs = Array.isArray(data) ? data.slice(1) : []; // skip metadata di index 0

        let normalized: NormalizedJob[] = jobs.map((j: any): NormalizedJob => ({
            id: `remoteok-${j.id}`,
            title: j.position || j.title || "Untitled Position",
            company: j.company || "Perusahaan Tidak Diketahui",
            location: j.location || "Remote",
            salary:
                j.salary_min && j.salary_max
                    ? `$${j.salary_min} - $${j.salary_max}`
                    : undefined,
            type: "Full-time",
            source: "RemoteOK",
            url: j.url || `https://remoteok.com/remote-jobs/${j.id}`,
            description: (j.description || "").replace(/<[^>]*>/g, "").slice(0, 500),
            skills: Array.isArray(j.tags) ? j.tags : [],
            postedAt: j.date || undefined,
            remote: true,
        }));

        // Filter manual by keyword kalau ada, karena RemoteOK API-nya ga support query search
        if (params.keyword) {
            const kw = params.keyword.toLowerCase();
            normalized = normalized.filter(
                (j) =>
                    j.title.toLowerCase().includes(kw) ||
                    j.skills.some((s) => s.toLowerCase().includes(kw))
            );
        }

        return normalized;
    } catch (err) {
        console.error("[RemoteOK] fetch error:", (err as Error).message);
        return [];
    }
}

// ---------------------------------------------------------------------------
// 3) HIMALAYAS
// Gratis, tanpa API key. https://himalayas.app/jobs/api
// ---------------------------------------------------------------------------
export async function fetchHimalayas(params: {
    keyword?: string;
    limit?: number;
}): Promise<NormalizedJob[]> {
    try {
        const { data } = await axios.get("https://himalayas.app/jobs/api", {
            timeout: 10_000,
            params: { limit: params.limit || 100 },
        });

        const jobs = Array.isArray(data?.jobs) ? data.jobs : [];

        let normalized: NormalizedJob[] = jobs.map((j: any): NormalizedJob => ({
            id: `himalayas-${j.id || j.guid}`,
            title: j.title || "Untitled Position",
            company: j.companyName || "Perusahaan Tidak Diketahui",
            location:
                Array.isArray(j.locationRestrictions) && j.locationRestrictions.length > 0
                    ? j.locationRestrictions.join(", ")
                    : "Remote",
            salary:
                j.minSalary && j.maxSalary
                    ? `$${j.minSalary} - $${j.maxSalary}`
                    : undefined,
            type: j.employmentType || undefined,
            source: "Himalayas",
            url: j.applicationLink || j.guid,
            description: (j.description || "").replace(/<[^>]*>/g, "").slice(0, 500),
            skills: Array.isArray(j.tags) ? j.tags : Array.isArray(j.skills) ? j.skills : [],
            postedAt: j.pubDate || undefined,
            remote: true,
        }));

        if (params.keyword) {
            const kw = params.keyword.toLowerCase();
            normalized = normalized.filter(
                (j) =>
                    j.title.toLowerCase().includes(kw) ||
                    j.skills.some((s) => s.toLowerCase().includes(kw))
            );
        }

        return normalized;
    } catch (err) {
        console.error("[Himalayas] fetch error:", (err as Error).message);
        return [];
    }
}

// ---------------------------------------------------------------------------
// CONTOH PENGGABUNGAN — tinggal panggil ini di jobAggregator.ts,
// digabung sama fetchRemotive() & fetchArbeitnow() yang udah ada.
// Promise.allSettled dipakai biar 1 sumber down ga bikin semua gagal.
// ---------------------------------------------------------------------------
export async function fetchAllFreeSources(params: {
    keyword: string;
    location?: string;
}): Promise<NormalizedJob[]> {
    const results = await Promise.allSettled([
        fetchJooble({ keyword: params.keyword, location: params.location }),
        fetchRemoteOK({ keyword: params.keyword }),
        fetchHimalayas({ keyword: params.keyword }),
    ]);

    const combined: NormalizedJob[] = [];
    for (const r of results) {
        if (r.status === "fulfilled") {
            combined.push(...r.value);
        }
    }

    // Dedupe kasar berdasarkan title+company biar ga ada listing dobel
    const seen = new Set<string>();
    return combined.filter((j) => {
        const key = `${j.title.toLowerCase()}-${j.company.toLowerCase()}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}