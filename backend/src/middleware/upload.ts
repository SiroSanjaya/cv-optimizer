import multer from "multer";
import path from "path";
import fs from "fs";
import { Errors } from "../utils/AppError";

const UPLOAD_DIR = path.resolve(
  process.cwd(),
  process.env.UPLOAD_TMP_DIR || "tmp_uploads"
);

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const MAX_FILE_SIZE_MB = Number(process.env.MAX_FILE_SIZE_MB ?? 5);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

export const uploadCv = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE_MB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(Errors.invalidFileType());
      return;
    }
    cb(null, true);
  },
});

export { UPLOAD_DIR, MAX_FILE_SIZE_MB };
