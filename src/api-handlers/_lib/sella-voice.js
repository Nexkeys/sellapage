// src/api-handlers/_lib/sella-voice.js
// Voice input for Sella: the vendor holds the mic, speaks, and the recording
// comes back as text in the message box for them to check and send.
//
// Transcription only. Reading answers ALOUD is done on the device (the
// browser's speech synthesis on the web, the phone's text-to-speech in the
// app): it is free, instant and works offline, and a server voice would add
// cost and a round trip to every reply for little gain.
//
// Clients send 16-bit mono WAV. WAV is accepted by every audio model listed in
// the `audio` tier, while the browser's default recording format (WebM/Opus)
// is not accepted by all of them.

import { callModel } from './openrouter.js'

// 90 seconds of 16kHz mono 16-bit WAV is about 2.9MB, 3.8MB as base64: inside
// Vercel's 4.5MB request limit with room to spare.
export const MAX_AUDIO_SECONDS = 90
export const MAX_AUDIO_BYTES = 3 * 1024 * 1024
const FORMATS = new Set(['wav', 'mp3', 'm4a', 'aac', 'ogg', 'flac'])
// Audio models will happily "hear" a sentence in silence or noise (tested: a
// plain tone came back as "Hello. Good morning. I'm so sorry..."). Asking for
// an exact marker when there is no speech, and treating it as empty, stops
// invented words landing in the vendor's message box. The web client also
// skips near-silent recordings before sending them.
const NO_SPEECH = '[NO_SPEECH]'

/**
 * @returns {Promise<{ok: true, text: string, costUsd: number} | {ok: false, message: string}>}
 */
export async function transcribe({ audioBase64, format = 'wav' }) {
  const fmt = String(format || 'wav').toLowerCase()
  if (!FORMATS.has(fmt)) return { ok: false, message: 'That recording format is not supported.' }
  const data = String(audioBase64 || '').replace(/^data:[^,]*,/, '')
  const bytes = Math.floor((data.length * 3) / 4)
  if (!bytes) return { ok: false, message: 'The recording was empty. Try again.' }
  if (bytes > MAX_AUDIO_BYTES) return { ok: false, message: `Keep voice messages under ${MAX_AUDIO_SECONDS} seconds.` }

  const json = await callModel({
    tier: 'audio',
    maxTokens: 1500,
    temperature: 0,
    timeoutMs: 45000,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'text',
          text:
            'Transcribe this voice note from a Nigerian business owner exactly as spoken. It may be English, ' +
            'Nigerian Pidgin, or mixed with Yoruba, Igbo or Hausa words: keep their words, do not translate or ' +
            'correct their grammar. Write numbers and prices as digits (5000, not five thousand). Reply with ' +
            'ONLY the transcript. Transcribe only words that are clearly spoken by a human voice in this ' +
            'recording. Never guess, never complete a sentence, and never write words you did not hear. If there ' +
            `is no clear human speech (silence, noise, a tone, music), reply with exactly ${NO_SPEECH}`,
        },
        { type: 'input_audio', input_audio: { data, format: fmt } },
      ],
    }],
  })
  let text = String(json?.choices?.[0]?.message?.content || '').trim()
    .replace(/^["']|["']$/g, '')
    .replace(/[–—]/g, ',')
  if (text.toUpperCase().includes(NO_SPEECH)) text = ''
  return { ok: true, text, costUsd: Number(json?.usage?.cost || 0) }
}
