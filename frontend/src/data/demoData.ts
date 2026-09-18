import type { StructuredCv } from "../types/cv";

export interface DemoProfile {
  id: "frontend" | "backend";
  label: string;
  badge: string;
  role: string;
  name: string;
  cv: StructuredCv;
  jobDescription: string;
}

export const DEMO_PROFILES: Record<"frontend" | "backend", DemoProfile> = {
  frontend: {
    id: "frontend",
    label: "Frontend React Developer",
    badge: "⚡ Demo Frontend",
    role: "Frontend Engineer",
    name: "Ahmad Fauzi",
    cv: {
      personalInfo: {
        name: "Ahmad Fauzi",
        email: "ahmad.fauzi@example.com",
        phone: "+62 812-3456-7890",
        location: "Bandung, Jawa Barat",
        linkedin: "https://linkedin.com/in/ahmad-fauzi-demo",
        github: "https://github.com/ahmadfauzi-demo",
      },
      summary:
        "Frontend Engineer berpengalaman 3+ tahun dalam membangun aplikasi web modern yang cepat dan responsif menggunakan React, TypeScript, Next.js, dan Tailwind CSS. Terbiasa kolaborasi lintas tim dengan metodologi Agile/Scrum.",
      skills: [
        "React.js",
        "TypeScript",
        "Next.js",
        "Tailwind CSS",
        "Redux Toolkit",
        "RESTful API",
        "Git",
        "HTML5",
        "CSS3",
        "Responsive Web Design",
      ],
      experience: [
        {
          company: "PT Solusi Teknologi Digital",
          position: "Frontend Engineer",
          startDate: "2022-03",
          endDate: "Sekarang",
          bullets: [
            "Mengembangkan dan merawat antarmuka e-commerce berbasis Next.js dan TypeScript yang digunakan oleh lebih dari 50.000 pengguna aktif bulanan.",
            "Mengoptimasi performa loading aplikasi dengan code-splitting dan image optimization, meningkatkan Google Lighthouse score dari 62 menjadi 94.",
            "Bekerja sama dengan tim UI/UX merancang design system berbasis Tailwind CSS yang mempercepat pembuatan fitur baru hingga 40%.",
          ],
        },
        {
          company: "Kreasi Web Nusantara",
          position: "Junior Web Developer",
          startDate: "2020-08",
          endDate: "2022-02",
          bullets: [
            "Membangun dashboard internal menggunakan React.js dan integrasi REST API backend.",
            "Memperbaiki bug layouting dan kompatibilitas lintas browser (Chrome, Safari, Firefox).",
          ],
        },
      ],
      projects: [
        {
          name: "SaaS Analytics Dashboard",
          description: "Web app dashboard analitik visualisasi data penjualan secara real-time.",
          technologies: ["React", "TypeScript", "Chart.js", "Tailwind CSS"],
          bullets: [
            "Mengintegrasikan WebSocket untuk update data penjualan live tanpa refresh halaman.",
          ],
        },
      ],
      education: [
        {
          institution: "Institut Teknologi Bandung",
          degree: "Sarjana Komputer (S.Kom)",
          field: "Teknik Informatika",
          startDate: "2016-08",
          endDate: "2020-07",
        },
      ],
      certifications: ["Meta Front-End Developer Professional Certificate (Coursera)"],
    },
    jobDescription: `Posisi: Senior Frontend Engineer (React / Next.js)
Perusahaan: PT Unicorn Inovasi Nusantara
Lokasi: Jakarta / Remote Friendly

Tentang Pekerjaan:
Kami mencari Senior Frontend Engineer yang bersemangat untuk memimpin pengembangan antarmuka platform fintech generasi terbaru kami. Anda akan bertanggung jawab merancang arsitektur frontend yang skalabel, aman, dan berkinerja tinggi.

Tanggung Jawab Utama:
- Mengembangkan fitur web apps berskala besar dengan React.js, Next.js, dan TypeScript.
- Memastikan performa web optimal (Core Web Vitals, SEO, bundle size minimal).
- Menulis unit test menggunakan Jest dan React Testing Library untuk memastikan reliabilitas kode.
- Berkolaborasi aktif dengan Backend Engineer untuk integrasi GraphQL dan REST API.
- Mentoring engineer junior dalam best practices clean code dan code review.

Kualifikasi yang Dicari:
- Pengalaman minimal 3 tahun dengan ekosistem modern React, TypeScript, dan Next.js.
- Pemahaman mendalam tentang state management (Redux Toolkit, Zustand, atau React Query).
- Pengalaman dengan Automated Testing (Jest, Cypress, atau React Testing Library).
- Pemahaman tentang Micro-frontend architecture dan CI/CD deployment merupakan nilai tambah besar.
- Kemampuan komunikasi yang baik dan mindset berorientasi solusi.`,
  },

  backend: {
    id: "backend",
    label: "Backend & Cloud Engineer",
    badge: "⚡ Demo Backend",
    role: "Backend Engineer",
    name: "Reza Pratama",
    cv: {
      personalInfo: {
        name: "Reza Pratama",
        email: "reza.pratama@example.com",
        phone: "+62 813-9876-5432",
        location: "Jakarta Selatan, DKI Jakarta",
        linkedin: "https://linkedin.com/in/reza-pratama-demo",
        github: "https://github.com/rezapratama-demo",
      },
      summary:
        "Backend Engineer berpengalaman 4+ tahun dalam merancang dan mengoperasikan microservices berkinerja tinggi dengan Golang, PostgreSQL, Docker, dan Redis. Berpengalaman menangani sistem transaksi skala tinggi dengan uptime 99.9%.",
      skills: [
        "Go (Golang)",
        "PostgreSQL",
        "Redis",
        "Docker",
        "RESTful API",
        "Microservices",
        "Git",
        "Linux",
        "SQL Query Optimization",
      ],
      experience: [
        {
          company: "PT Finansial Pintar Indonesia",
          position: "Backend Engineer",
          startDate: "2021-06",
          endDate: "Sekarang",
          bullets: [
            "Merancang dan membangun microservices payment gateway menggunakan Golang yang memproses lebih dari 100.000 transaksi per hari.",
            "Mengoptimasi query PostgreSQL kompleks dan mengimplementasikan multi-layer caching dengan Redis, menurunkan latency endpoint hingga 65%.",
            "Menerapkan containerization aplikasi dengan Docker dan orkestrasi basic untuk mempermudah proses deployment ke staging.",
          ],
        },
        {
          company: "PT Data Solusi Cemerlang",
          position: "Software Engineer",
          startDate: "2019-10",
          endDate: "2021-05",
          bullets: [
            "Mengembangkan backend REST API untuk sistem manajemen logistik inventori gudang.",
            "Melakukan migrasi database relasional dan membuat dokumentasi teknis OpenAPI/Swagger.",
          ],
        },
      ],
      projects: [
        {
          name: "High-Throughput Order Engine",
          description: "Engine antrian pemesanan berbasis event-driven dengan concurrency worker pool.",
          technologies: ["Golang", "PostgreSQL", "Redis", "Docker"],
          bullets: [
            "Mengimplementasikan distributed locking dengan Redis untuk mencegah race condition double-spending.",
          ],
        },
      ],
      education: [
        {
          institution: "Universitas Indonesia",
          degree: "Sarjana Ilmu Komputer (S.Kom)",
          field: "Ilmu Komputer",
          startDate: "2015-08",
          endDate: "2019-08",
        },
      ],
      certifications: ["Docker Certified Associate (DCA)", "Go Developer Certification"],
    },
    jobDescription: `Posisi: Senior Backend Engineer (Golang & Distributed Systems)
Perusahaan: PT Bank Digital Maju Bersama
Lokasi: Jakarta Selatan / Hybrid

Deskripsi Pekerjaan:
Kami membuka kesempatan bagi Senior Backend Engineer untuk bergabung dengan squad Core Banking & Transaction Engine kami. Anda akan membangun sistem keuangan terdistribusi yang membutuhkan keandalan tingkat tinggi, zero-downtime, dan keamanan ketat.

Kualifikasi & Kebutuhan:
- Minimal 3-5 tahun pengalaman backend development dengan bahasa Go (Golang).
- Pengalaman mendalam dengan PostgreSQL, indexing, database tuning, dan sharding/partitioning.
- Terbiasa mengoperasikan Message Broker (Apache Kafka atau RabbitMQ) untuk asynchronous event-driven architecture.
- Pengalaman dengan Docker dan Kubernetes (K8s) dalam lingkungan production cloud (AWS / GCP).
- Memahami konsep Distributed Transactions, ACID, gRPC, dan Observability (Prometheus / Grafana).
- Disiplin dalam unit testing, integration testing, serta arsitektur clean architecture / DDD.`,
  },
};
