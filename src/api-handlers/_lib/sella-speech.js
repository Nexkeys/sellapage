// src/api-handlers/_lib/sella-speech.js
// Sella's language and voice.
//
// LANGUAGE: English, Nigerian Pidgin, Yoruba, Igbo or Hausa, chosen by each
// person (owner and staff separately, see stores/{id}/sellaPrefs/{uid}).
// Sella answers in it; the confirm cards and error messages built by code stay
// in English.
//
// VOICE: female or male, used when a reply is read aloud.
//   - With SPITCH_API_KEY set, replies are spoken by Spitch, a Nigerian speech
//     provider with natural male and female voices in all five languages.
//     A phone or browser has no Yoruba, Igbo or Hausa voice at all, so this is
//     the only way those languages can be read aloud properly.
//   - Without the key, clients fall back to the device's own voice.
// Spitch bills $0.0014 per second of audio (docs.spitch.app/concepts/pricing),
// charged to the vendor's credits at real cost.

export const LANGUAGES = {
  en: { label: 'English', prompt: 'English (Nigerian business English: warm and clear)', locale: 'en-NG' },
  pcm: { label: 'Nigerian Pidgin', prompt: 'Nigerian Pidgin English', locale: 'en-NG' },
  yo: { label: 'Yorùbá', prompt: 'Yoruba, written with correct tone marks and under-dots (ẹ, ọ, ṣ, á, à)', locale: 'yo-NG' },
  ig: { label: 'Igbo', prompt: 'Igbo, written with correct dotted vowels (ị, ọ, ụ, ṅ) and tone marks where they matter', locale: 'ig-NG' },
  ha: { label: 'Hausa', prompt: 'Hausa, written in Boko (Latin script) with the hooked letters (ɓ, ɗ, ƙ, ƴ) where they belong', locale: 'ha-NG' },
}
export const VOICES = ['female', 'male']
export const DEFAULT_PREFS = { language: 'en', voice: 'female' }

// Spitch voice names per language (docs.spitch.app/concepts/voices).
const SPITCH_VOICES = {
  en: { female: 'lucy', male: 'john' },
  pcm: { female: 'boma', male: 'justice' },
  yo: { female: 'sade', male: 'femi' },
  ig: { female: 'ngozi', male: 'obinna' },
  ha: { female: 'amina', male: 'aliyu' },
}
const SPITCH_USD_PER_SECOND = 0.0014
// Roughly how fast the voices speak, to estimate the bill before audio
// length is known. Deliberately a little slow, so the estimate errs high.
const CHARS_PER_SECOND = 13
export const MAX_SPEAK_CHARS = 1500

export const speechProvider = () => (process.env.SPITCH_API_KEY ? 'spitch' : 'device')

export function cleanPrefs(input = {}) {
  return {
    language: LANGUAGES[input.language] ? input.language : DEFAULT_PREFS.language,
    voice: VOICES.includes(input.voice) ? input.voice : DEFAULT_PREFS.voice,
  }
}

const prefsRef = (db, storeId, uid) => db.collection('stores').doc(storeId).collection('sellaPrefs').doc(String(uid))

export async function getPrefs(db, storeId, uid) {
  const snap = await prefsRef(db, storeId, uid).get()
  return cleanPrefs(snap.exists ? snap.data() : {})
}

export async function setPrefs(db, storeId, uid, input) {
  const prefs = cleanPrefs(input)
  await prefsRef(db, storeId, uid).set({ ...prefs, updatedAt: new Date().toISOString() }, { merge: true })
  return prefs
}

/** The language instruction for the system prompt. */
export function languageForPrompt(prefs) {
  const lang = LANGUAGES[prefs.language] || LANGUAGES.en
  const male = prefs.voice === 'male'
  // Both rules below come from a live test: in Igbo the model spelled
  // N412,000 out in words and got the number wrong, and in Hausa it called
  // itself "ni ce" (a woman) when the vendor had chosen a male voice.
  return `\n\nLANGUAGE AND PERSONA. This person chose to talk with you in ${lang.prompt}. Reply in that language by default. ` +
    'If they write to you in a different language, answer in the language they used. Speak naturally, as a Nigerian ' +
    'business partner would, not like a translation. ' +
    'NUMBERS STAY AS DIGITS in every language: write amounts, prices, quantities, dates and order numbers exactly as ' +
    'digits (N412,000, 23 orders, 9 sold), never spelled out in words, because a number in words is easy to get wrong. ' +
    'Keep names exactly as written, with no tone marks added: your own name, people\'s names, product names and ' +
    'anything copied from their store. ' +
    `You present as ${male ? 'a man' : 'a woman'}.` +
    (prefs.language === 'ha' ? ` In Hausa, refer to yourself with the ${male ? 'masculine forms (say "ni ne", never "ni ce")' : 'feminine forms (say "ni ce", never "ni ne")'}.` : '')
}

/**
 * Speaks text with Spitch. Returns the audio and its estimated cost.
 * @returns {Promise<{ok: true, audio: Buffer, contentType: string, costUsd: number} | {ok: false, message: string, unavailable?: boolean}>}
 */
export async function synthesize({ text, language, voice }) {
  if (!process.env.SPITCH_API_KEY) return { ok: false, unavailable: true, message: 'Server voices are not switched on.' }
  const clean = String(text || '').replace(/\s+/g, ' ').trim().slice(0, MAX_SPEAK_CHARS)
  if (!clean) return { ok: false, message: 'There is nothing to read.' }
  const lang = SPITCH_VOICES[language] ? language : 'en'
  const name = SPITCH_VOICES[lang][voice === 'male' ? 'male' : 'female']
  try {
    const resp = await fetch('https://api.spitch.app/v1/speech', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.SPITCH_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: clean, language: lang, voice: name, format: 'mp3' }),
      signal: AbortSignal.timeout(45000),
    })
    if (!resp.ok) {
      console.error('[sella-speech] spitch', resp.status, (await resp.text().catch(() => '')).slice(0, 200))
      return { ok: false, message: 'I could not read that aloud right now. Please try again.' }
    }
    const audio = Buffer.from(await resp.arrayBuffer())
    const seconds = clean.length / CHARS_PER_SECOND
    return { ok: true, audio, contentType: resp.headers.get('content-type') || 'audio/mpeg', costUsd: seconds * SPITCH_USD_PER_SECOND }
  } catch (err) {
    console.error('[sella-speech] spitch failed:', err?.name || err?.message || err)
    return { ok: false, message: 'I could not read that aloud right now. Please try again.' }
  }
}
