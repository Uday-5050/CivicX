import { mkdirSync } from "node:fs";
import { extname, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import multer, { MulterError } from "multer";
import type { NextFunction, Request, Response } from "express";
import { ValidationError } from "../../utils/errors";

export const uploadDirectory = resolve(process.cwd(), "uploads");
mkdirSync(uploadDirectory, { recursive: true });

const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]);
const uploader = multer({
  storage: multer.diskStorage({
    destination: uploadDirectory,
    filename: (_req, file, callback) => callback(null, `${randomUUID()}${extname(file.originalname).toLowerCase()}`),
  }),
  limits: { files: 5, fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    if (!allowedMimeTypes.has(file.mimetype)) return callback(ValidationError("Only images, PDFs, and Word documents are allowed"));
    callback(null, true);
  },
});

export function uploadAttachments(req: Request, res: Response, next: NextFunction): void {
  uploader.array("attachments", 5)(req, res, (error: unknown) => {
    if (error instanceof MulterError) return next(ValidationError(error.code === "LIMIT_FILE_SIZE" ? "Each attachment must be 10 MB or smaller" : "A maximum of five attachments is allowed"));
    if (error) return next(error);
    next();
  });
}
