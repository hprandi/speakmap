import { InterpretationError } from "../domain/Interpreter";
import { TranscriptionError, type TranscriptionErrorReason } from "../domain/Transcriber";

const TRANSCRIPTION_MESSAGES: Record<TranscriptionErrorReason, string> = {
  unsupported: "This browser cannot transcribe speech. Use Chrome, Edge or Safari.",
  "microphone-denied": "Microphone access is required. Allow it in your browser and try again.",
  "microphone-unavailable": "No microphone was found. Connect one and try again.",
  network: "Speech recognition needs a network connection. Check it and try again.",
  unknown: "Speech recognition failed. Please try again.",
};

const UNEXPECTED_ERROR_MESSAGE = "Something went wrong. Please try again.";

/** Turns any failure of a cycle into the message shown to the user. */
export class ErrorMessages {
  of(error: unknown): string {
    if (error instanceof TranscriptionError) return TRANSCRIPTION_MESSAGES[error.reason];
    if (error instanceof InterpretationError) return error.message;
    return UNEXPECTED_ERROR_MESSAGE;
  }
}
