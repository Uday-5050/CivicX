import { GoogleGenAI } from "@google/genai";
import config from "../../config";
import { logger } from "../../middleware/logger";
import { AppError, ValidationError } from "../../utils/errors";
import { AiProviderError, createVoiceReportDraft } from "../../adapters/ai";

export interface VoiceDraftResult {
  transcript: string;
  languageCode: string;
  languageName: string;
  title: string;
  description: string;
  domain: string;
}

export async function buildVoiceReportDraft(file: Express.Multer.File): Promise<VoiceDraftResult> {
  if (!config.aiApiKey) throw new AppError(503, "VOICE_AI_UNAVAILABLE", "Voice report processing is not configured");
  const ai = new GoogleGenAI({ apiKey: config.aiApiKey });
  let uploadedName: string | undefined;
  try {
    const providerMimeType = file.mimetype === "audio/mp4" ? "audio/m4a" : file.mimetype === "audio/x-wav" ? "audio/wav" : file.mimetype;
    const blob = new Blob([new Uint8Array(file.buffer)], { type: providerMimeType });
    const uploaded = await ai.files.upload({ file: blob, config: { mimeType: providerMimeType, displayName: "civicx-voice-report" } });
    uploadedName = uploaded.name;
    if (!uploaded.uri) throw new AppError(502, "VOICE_TRANSCRIPTION_FAILED", "The transcription service did not accept the recording");
    const interaction = await ai.interactions.create({
      model: config.voiceTranscriptionModel,
      input: [{ type: "audio", uri: uploaded.uri, mime_type: uploaded.mimeType ?? providerMimeType }],
      generation_config: { transcription_config: { language_codes: [], mode: "smart" } },
    });
    const transcript = interaction.output_text?.trim() ?? "";
    if (transcript.length < 10) throw ValidationError("We could not hear enough clear speech. Please record again in a quieter place.");
    const draft = await createVoiceReportDraft(transcript);
    return { transcript, ...draft };
  } catch (error) {
    if (error instanceof AppError) throw error;
    if (error instanceof AiProviderError && error.code === "insufficient_speech") throw ValidationError("We could not hear enough clear speech. Please record again.");
    logger.error({ err: error }, "Voice report processing failed");
    throw new AppError(502, "VOICE_PROCESSING_FAILED", "We could not process this recording. Please try again.");
  } finally {
    if (uploadedName) {
      try { await ai.files.delete({ name: uploadedName }); }
      catch (error) { logger.warn({ err: error, uploadedName }, "Could not delete temporary voice recording from Gemini Files"); }
    }
  }
}
