import multer, { MulterError } from "multer";
import type { NextFunction, Request, Response } from "express";
import config from "../../config";
import { ValidationError } from "../../utils/errors";

const allowedAudioTypes = new Set(["audio/webm", "audio/ogg", "audio/mpeg", "audio/mp3", "audio/mp4", "audio/m4a", "audio/wav", "audio/x-wav", "audio/aac"]);
const uploader = multer({
  storage: multer.memoryStorage(),
  limits: { files: 1, fileSize: config.voiceMaxBytes },
  fileFilter: (_req, file, callback) => {
    if (!allowedAudioTypes.has(file.mimetype)) return callback(ValidationError("Use a WebM, OGG, MP3, M4A, WAV, or AAC voice recording"));
    callback(null, true);
  },
});

export function uploadVoiceRecording(req: Request, res: Response, next: NextFunction): void {
  uploader.single("audio")(req, res, (error: unknown) => {
    if (error instanceof MulterError) return next(ValidationError(error.code === "LIMIT_FILE_SIZE" ? "Voice recordings must be 15 MB or smaller" : "Upload one voice recording at a time"));
    if (error) return next(error);
    if (!req.file) return next(ValidationError("A voice recording is required"));
    next();
  });
}
