// src/utils/sellaVoice.js
// Voice for Sella on the web: record the vendor's voice as WAV, and read
// replies aloud.
//
// WHY WAV and not MediaRecorder: MediaRecorder gives WebM/Opus on Chrome and
// MP4 on Safari, and not every audio model accepts those. 16kHz mono 16-bit
// WAV is accepted by all of them (see src/api-handlers/_lib/sella-voice.js),
// and 90 seconds of it fits comfortably under the 4.5MB request limit.
//
// Reading aloud uses the browser's own speech synthesis: free, instant, no
// server round trip. It needs microphone permission only for recording, which
// vercel.json allows for this site alone (Permissions-Policy microphone=(self)).

export const MAX_RECORD_SECONDS = 90
const TARGET_RATE = 16000
// About -46 dBFS averaged over the whole recording: well below normal speech,
// above the hiss of an idle phone or laptop microphone.
const SILENCE_RMS = 0.005

export const canRecord = () =>
  typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia &&
  typeof window !== "undefined" && !!(window.AudioContext || window.webkitAudioContext);

function downsample(buffer, fromRate, toRate) {
  if (fromRate === toRate) return buffer;
  const ratio = fromRate / toRate;
  const out = new Float32Array(Math.floor(buffer.length / ratio));
  for (let i = 0; i < out.length; i++) {
    // Average the samples being merged: a cheap low-pass that avoids the
    // harsh aliasing of simply dropping samples.
    const start = Math.floor(i * ratio);
    const end = Math.min(Math.floor((i + 1) * ratio), buffer.length);
    let sum = 0;
    for (let j = start; j < end; j++) sum += buffer[j];
    out[i] = sum / Math.max(end - start, 1);
  }
  return out;
}

function encodeWav(samples, rate) {
  const view = new DataView(new ArrayBuffer(44 + samples.length * 2));
  const str = (o, s) => { for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i)); };
  str(0, "RIFF"); view.setUint32(4, 36 + samples.length * 2, true); str(8, "WAVE");
  str(12, "fmt "); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, rate, true); view.setUint32(28, rate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  str(36, "data"); view.setUint32(40, samples.length * 2, true);
  for (let i = 0, o = 44; i < samples.length; i++, o += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([view], { type: "audio/wav" });
}

const blobToBase64 = (blob) => new Promise((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(String(r.result).split(",")[1] || "");
  r.onerror = () => reject(new Error("Could not read the recording."));
  r.readAsDataURL(blob);
});

/**
 * Starts recording. Resolves to a handle with stop() -> { base64, seconds }
 * and cancel(). Throws a readable Error if the microphone is unavailable.
 */
export async function startRecording({ onTick } = {}) {
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } });
  } catch {
    throw new Error("Microphone access was blocked. Allow it in your browser's site settings, then try again.");
  }
  const Ctx = window.AudioContext || window.webkitAudioContext;
  const ctx = new Ctx();
  const source = ctx.createMediaStreamSource(stream);
  // ScriptProcessor is deprecated but supported everywhere, including older
  // Android browsers many vendors use; AudioWorklet is not.
  const proc = ctx.createScriptProcessor(4096, 1, 1);
  const chunks = [];
  proc.onaudioprocess = (e) => chunks.push(new Float32Array(e.inputBuffer.getChannelData(0)));
  source.connect(proc);
  proc.connect(ctx.destination);

  const started = Date.now();
  const timer = setInterval(() => onTick?.((Date.now() - started) / 1000), 250);

  const teardown = async () => {
    clearInterval(timer);
    try { proc.disconnect(); source.disconnect(); } catch { /* already disconnected */ }
    stream.getTracks().forEach((t) => t.stop());
    const rate = ctx.sampleRate;
    try { await ctx.close(); } catch { /* ignore */ }
    return rate;
  };

  return {
    async stop() {
      const rate = await teardown();
      const length = chunks.reduce((n, c) => n + c.length, 0);
      const merged = new Float32Array(length);
      let off = 0;
      for (const c of chunks) { merged.set(c, off); off += c.length; }
      const maxSamples = MAX_RECORD_SECONDS * rate;
      const clipped = merged.length > maxSamples ? merged.subarray(0, maxSamples) : merged;
      // Loudness check. Audio models can "hear" a whole sentence in silence,
      // so a recording with no real sound in it is never sent at all.
      let sq = 0;
      for (let i = 0; i < clipped.length; i++) sq += clipped[i] * clipped[i];
      const rms = Math.sqrt(sq / Math.max(clipped.length, 1));
      const seconds = clipped.length / rate;
      if (rms < SILENCE_RMS) return { silent: true, base64: "", seconds };
      const wav = encodeWav(downsample(clipped, rate, TARGET_RATE), TARGET_RATE);
      return { base64: await blobToBase64(wav), seconds, silent: false };
    },
    async cancel() { await teardown(); },
  };
}

// ------------------------------------------------------------------ read aloud
export const canSpeak = () => typeof window !== "undefined" && "speechSynthesis" in window;

function pickVoice() {
  const voices = window.speechSynthesis.getVoices();
  return voices.find((v) => /en[-_]NG/i.test(v.lang)) ||
    voices.find((v) => /en[-_]GB/i.test(v.lang)) ||
    voices.find((v) => /^en/i.test(v.lang)) || null;
}

export function speak(text, { onEnd } = {}) {
  if (!canSpeak()) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(String(text || "").slice(0, 4000));
  const v = pickVoice();
  if (v) { u.voice = v; u.lang = v.lang; }
  u.onend = () => onEnd?.();
  u.onerror = () => onEnd?.();
  window.speechSynthesis.speak(u);
}

export function stopSpeaking() {
  if (canSpeak()) window.speechSynthesis.cancel();
}
