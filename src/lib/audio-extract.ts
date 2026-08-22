/**
 * Browser-side audio extraction for transcription.
 *
 * Lesson videos run up to 200 MB while the speech-to-text request body ceiling
 * is ~26 MiB, so the video must NEVER be uploaded to the transcription
 * function. We decode the file locally, downmix to mono, resample to 16 kHz and
 * encode a 16-bit WAV — roughly 11 MB for a 6-minute lesson.
 */

export const TRANSCRIBE_MAX_SECONDS = 20 * 60;
const TARGET_SAMPLE_RATE = 16000;

export interface ExtractedAudio {
  wav: Blob;
  durationSeconds: number;
}

function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const writeString = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i += 1) view.setUint8(offset + i, value.charCodeAt(i));
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  writeString(36, 'data');
  view.setUint32(40, samples.length * 2, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i += 1) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

/** Decode → mono → 16 kHz → 16-bit WAV. Throws a message-safe Error. */
export async function extractAudioForTranscription(file: File): Promise<ExtractedAudio> {
  const AudioCtx: typeof AudioContext =
    window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) throw new Error('This browser cannot read audio from video files. Try Chrome or Safari.');

  const arrayBuffer = await file.arrayBuffer();
  const decodeCtx = new AudioCtx();
  let decoded: AudioBuffer;
  try {
    decoded = await decodeCtx.decodeAudioData(arrayBuffer.slice(0));
  } catch {
    throw new Error('The audio in this video could not be read in the browser.');
  } finally {
    void decodeCtx.close();
  }

  if (decoded.duration > TRANSCRIBE_MAX_SECONDS) {
    throw new Error('This video is longer than 20 minutes. Lesson videos should be 6 minutes or less.');
  }

  // Offline downmix + resample in one pass.
  const frames = Math.max(1, Math.ceil(decoded.duration * TARGET_SAMPLE_RATE));
  const offline = new OfflineAudioContext(1, frames, TARGET_SAMPLE_RATE);
  const source = offline.createBufferSource();
  source.buffer = decoded;
  source.connect(offline.destination);
  source.start();
  const rendered = await offline.startRendering();

  const mono = rendered.getChannelData(0);
  const wav = encodeWav(new Float32Array(mono), TARGET_SAMPLE_RATE);
  if (wav.size < 4096) throw new Error('No audio was found in this video.');

  return { wav, durationSeconds: decoded.duration };
}
