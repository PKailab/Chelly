import { requireNativeModule, EventEmitter } from "expo-modules-core";

const VoiceInput = requireNativeModule("VoiceInput");
const emitter = new EventEmitter(VoiceInput);

export function startListening(locale?: string): void {
  VoiceInput.startListening(locale ?? "");
}

export function stopListening(): void {
  VoiceInput.stopListening();
}

export function addResultListener(callback: (event: { text: string }) => void) {
  return emitter.addListener("onResult", callback);
}

export function addErrorListener(callback: (event: { message: string }) => void) {
  return emitter.addListener("onError", callback);
}
