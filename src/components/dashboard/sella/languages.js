// src/components/dashboard/sella/languages.js
// Sella's languages on the client: the picker labels, the greeting on the
// empty chat, the voice sample, and the locale the device voice is asked for.
// The server holds the same list in src/api-handlers/_lib/sella-speech.js.
//
// Greeting and sample wording should be checked by a native speaker of each
// language before any marketing uses them.

export const LANGUAGE_OPTIONS = [
  { id: "en", label: "English" },
  { id: "pcm", label: "Nigerian Pidgin" },
  { id: "yo", label: "Yorùbá" },
  { id: "ig", label: "Igbo" },
  { id: "ha", label: "Hausa" },
];

export const LOCALES = { en: "en-NG", pcm: "en-NG", yo: "yo-NG", ig: "ig-NG", ha: "ha-NG" };

export const GREETINGS = {
  en: { hello: "Hello", ask: "How can I assist you today?" },
  pcm: { hello: "How far", ask: "Wetin I fit do for you today?" },
  yo: { hello: "Ẹ n lẹ́ o", ask: "Kí ni mo lè ṣe fún ọ lónìí?" },
  ig: { hello: "Ndewo", ask: "Kedu ihe m ga-emere gị taa?" },
  ha: { hello: "Sannu", ask: "Me zan iya yi maka yau?" },
};

// Hausa marks gender in "I am": ni ce (woman), ni ne (man).
export function voiceSample(language, voice, name = "Sella") {
  switch (language) {
    case "pcm": return `How far! Na ${name} be dis. Na dis voice I go take read my reply give you.`;
    case "yo": return `Ẹ n lẹ́ o! Èmi ni ${name}. Ohùn yìí ni màá fi ka èsì mi fún ọ.`;
    case "ig": return `Ndewo! Abụ m ${name}. Ọ bụ olu a ka m ga-eji gụọrọ gị azịza m.`;
    case "ha": return `Sannu! ${voice === "male" ? "Ni ne" : "Ni ce"} ${name}. Da wannan muryar zan karanta maka amsoshina.`;
    default: return `Hi, I'm ${name}. This is the voice I will use to read my replies to you.`;
  }
}
