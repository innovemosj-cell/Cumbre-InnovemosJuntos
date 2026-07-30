// Cliente liviano para Google Gemini TTS via REST.
// Funciona en edge runtime (solo usa fetch + atob).
//
// Setup:
//   GOOGLE_AI_API_KEY  - API key de Google AI Studio (https://aistudio.google.com/apikey)
//   GOOGLE_TTS_VOICE   - (opcional) nombre de voz: Kore, Puck, Charon, Fenrir,
//                        Aoede, Leda, Orus, Zephyr. Default: Kore.
//
// Gemini devuelve PCM 16-bit a 24kHz mono codificado en base64.
// Lo envolvemos en un header WAV de 44 bytes para que el browser lo reproduzca.

const DEFAULT_VOICE = 'Kore';
const MODEL = 'gemini-2.5-flash-preview-tts';
const SAMPLE_RATE = 24000;
const CHANNELS = 1;
const BITS_PER_SAMPLE = 16;

export type SynthesizeOptions = {
  voice?: string;
};

export type SynthesizeResult = {
  audio: ArrayBuffer;
  mimeType: 'audio/wav';
};

export async function synthesizeSpeech(
  text: string,
  options: SynthesizeOptions = {}
): Promise<SynthesizeResult> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_AI_API_KEY no está configurada.');
  }

  const voice =
    options.voice ?? process.env.GOOGLE_TTS_VOICE ?? DEFAULT_VOICE;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text }] }],
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice },
          },
        },
      },
    }),
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => '');
    console.error('[google-tts] error:', {
      status: res.status,
      statusText: res.statusText,
      model: MODEL,
      body: errorText.slice(0, 800),
    });
    // Extraer detalle legible del JSON de Google
    let detail = '';
    try {
      const parsed = JSON.parse(errorText);
      detail = parsed?.error?.message ?? '';
      // Si hay quotaFailure con violations, extraer el quotaId (RPM / RPD / TPM)
      const violations =
        parsed?.error?.details?.find?.(
          (d: any) => d['@type']?.includes('QuotaFailure')
        )?.violations ?? [];
      if (violations.length) {
        const ids = violations
          .map((v: any) => v.quotaId || v.subject || '')
          .filter(Boolean)
          .join(', ');
        if (ids) detail = `${detail} [${ids}]`;
      }
    } catch {}
    throw new Error(
      `Google TTS falló: ${res.status} ${res.statusText}${detail ? ' — ' + detail.slice(0, 300) : ''}`
    );
  }

  const json = (await res.json()) as {
    candidates?: Array<{
      content?: {
        parts?: Array<{
          inlineData?: { data?: string; mimeType?: string };
        }>;
      };
    }>;
  };

  const base64 = json?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64) {
    console.error('[google-tts] respuesta sin audio:', JSON.stringify(json).slice(0, 300));
    throw new Error('Google TTS no devolvió audio.');
  }

  const pcm = base64ToUint8Array(base64);
  const wav = wrapInWav(pcm, SAMPLE_RATE, CHANNELS, BITS_PER_SAMPLE);
  return { audio: wav, mimeType: 'audio/wav' };
}

function base64ToUint8Array(b64: string): Uint8Array {
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
}

function wrapInWav(
  pcm: Uint8Array,
  sampleRate: number,
  channels: number,
  bitsPerSample: number
): ArrayBuffer {
  const blockAlign = (channels * bitsPerSample) / 8;
  const byteRate = sampleRate * blockAlign;
  const dataSize = pcm.length;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);

  // "RIFF"
  view.setUint8(0, 0x52);
  view.setUint8(1, 0x49);
  view.setUint8(2, 0x46);
  view.setUint8(3, 0x46);
  // chunk size
  view.setUint32(4, 36 + dataSize, true);
  // "WAVE"
  view.setUint8(8, 0x57);
  view.setUint8(9, 0x41);
  view.setUint8(10, 0x56);
  view.setUint8(11, 0x45);
  // "fmt "
  view.setUint8(12, 0x66);
  view.setUint8(13, 0x6d);
  view.setUint8(14, 0x74);
  view.setUint8(15, 0x20);
  // fmt chunk size
  view.setUint32(16, 16, true);
  // format = 1 (PCM)
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  // "data"
  view.setUint8(36, 0x64);
  view.setUint8(37, 0x61);
  view.setUint8(38, 0x74);
  view.setUint8(39, 0x61);
  view.setUint32(40, dataSize, true);
  // PCM payload
  bytes.set(pcm, 44);

  return buffer;
}
