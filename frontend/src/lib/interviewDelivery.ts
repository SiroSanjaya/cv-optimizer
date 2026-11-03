export interface AnswerDeliveryMetrics {
  durationSeconds: number;
  wordsPerMinute: number | null;
  fillerWords: number;
  longPauses: number | null;
}

const FILLER_PATTERNS = [
  /\b(?:eee+|em+|anu|hmm+|eh+)\b/gi,
  /\bapa namanya\b/gi,
  /\b(?:um+|uh+|erm+)\b/gi,
  /\b(?:you know)\b/gi,
];

export function calculateAnswerDeliveryMetrics(
  transcript: string,
  durationMs: number,
  longPauses: number | null
): AnswerDeliveryMetrics {
  const durationSeconds = Math.max(0, Math.round(durationMs / 100) / 10);
  const words = transcript.trim().split(/\s+/).filter(Boolean);
  const fillerWords = FILLER_PATTERNS.reduce(
    (total, pattern) => total + (transcript.match(pattern)?.length ?? 0),
    0
  );

  return {
    durationSeconds,
    wordsPerMinute:
      durationSeconds > 0
        ? Math.round((words.length / durationSeconds) * 60)
        : null,
    fillerWords,
    longPauses,
  };
}

export async function countLongPauses(blob: Blob): Promise<number> {
  const browserWindow = window as Window & {
    webkitAudioContext?: typeof AudioContext;
  };
  const AudioContextConstructor =
    window.AudioContext ?? browserWindow.webkitAudioContext;
  if (!AudioContextConstructor) {
    throw new Error("Browser ini belum mendukung analisis jeda audio.");
  }

  const context = new AudioContextConstructor();
  try {
    const audio = await context.decodeAudioData(await blob.arrayBuffer());
    const sampleRate = audio.sampleRate;
    const samplesPerWindow = Math.max(1, Math.floor(sampleRate * 0.02));
    const rmsValues: number[] = [];
    let peakRms = 0;

    for (let start = 0; start < audio.length; start += samplesPerWindow) {
      const end = Math.min(start + samplesPerWindow, audio.length);
      let sumSquares = 0;
      let sampleCount = 0;

      for (let channel = 0; channel < audio.numberOfChannels; channel += 1) {
        const samples = audio.getChannelData(channel);
        for (let index = start; index < end; index += 1) {
          sumSquares += samples[index] * samples[index];
          sampleCount += 1;
        }
      }

      const rms = sampleCount ? Math.sqrt(sumSquares / sampleCount) : 0;
      rmsValues.push(rms);
      peakRms = Math.max(peakRms, rms);
    }

    const silenceThreshold = Math.max(0.008, peakRms * 0.08);
    const firstSpeech = rmsValues.findIndex((rms) => rms >= silenceThreshold);
    let lastSpeech = rmsValues.length - 1;
    while (lastSpeech >= 0 && rmsValues[lastSpeech] < silenceThreshold) {
      lastSpeech -= 1;
    }
    if (firstSpeech < 0 || lastSpeech <= firstSpeech) return 0;

    let longPauses = 0;
    let silentWindows = 0;
    for (let index = firstSpeech + 1; index < lastSpeech; index += 1) {
      if (rmsValues[index] < silenceThreshold) {
        silentWindows += 1;
      } else {
        if (silentWindows >= 30) longPauses += 1;
        silentWindows = 0;
      }
    }
    if (silentWindows >= 30) longPauses += 1;

    return longPauses;
  } finally {
    await context.close();
  }
}
