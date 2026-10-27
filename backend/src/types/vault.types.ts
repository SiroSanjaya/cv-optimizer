import { z } from "zod";

export const StarCategoryEnum = z.enum([
  "technical",
  "leadership",
  "architecture",
  "process_improvement",
  "crisis_handling",
  "other",
]);

export type StarCategory = z.infer<typeof StarCategoryEnum>;

export const StarStoryInputSchema = z.object({
  company: z.string().trim().min(2, "Nama perusahaan/organisasi minimal 2 karakter.").max(100),
  role: z.string().trim().min(2, "Posisi/peran minimal 2 karakter.").max(100),
  periodStart: z.string().trim().max(30).optional().default(""),
  periodEnd: z.string().trim().max(30).optional().default(""),
  category: StarCategoryEnum.default("technical"),
  skillsUsed: z.array(z.string().trim().min(1)).min(1, "Sertakan minimal 1 skill/teknologi terkait."),
  situation: z.string().trim().min(15, "Jelaskan situasi/tantangan awal (minimal 15 karakter)."),
  task: z.string().trim().min(10, "Jelaskan tugas/sasaran yang harus diselesaikan (minimal 10 karakter)."),
  action: z.string().trim().min(20, "Jelaskan aksi konkret dan teknologi yang dieksekusi (minimal 20 karakter)."),
  result: z.string().trim().min(15, "Jelaskan hasil terukur/metrik dampak (minimal 15 karakter)."),
  polishedBullet: z.string().trim().optional(),
});

export type StarStoryInput = z.infer<typeof StarStoryInputSchema>;

export const StarStoryUpdateSchema = StarStoryInputSchema.partial();
export type StarStoryUpdate = z.infer<typeof StarStoryUpdateSchema>;

export interface VaultStoryItem {
  id: string;
  userId: string;
  company: string;
  role: string;
  periodStart?: string | null;
  periodEnd?: string | null;
  category: string;
  skillsUsed: string[];
  situation: string;
  task: string;
  action: string;
  result: string;
  polishedBullet?: string | null;
  createdAt: Date;
  updatedAt: Date;
}
