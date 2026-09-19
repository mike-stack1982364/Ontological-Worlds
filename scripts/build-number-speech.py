#!/usr/bin/env python3
"""Build complete, offline spoken digits. Requires FFmpeg with flite/rubberband.

No browser TTS, network service, downloaded recording, or runtime synthesis is
used by the generated asset. Regenerate with Python 3 and FFmpeg 6.1.1 / Flite 2.2.
"""

import argparse
import array
import base64
import hashlib
import json
from pathlib import Path
import subprocess
import sys

SAMPLE_RATE = 16000
RATES = {
    "average": 1,
    "moderately-fast": 1.3,
    "fast": 1.65,
    "very-fast": 2.1,
    "extremely-fast": 2.8,
    "incredibly-fast": 4,
    "ultra-fast": 6,
}
WORDS = "one two three four five six seven eight nine".split()
EDGE = round(SAMPLE_RATE * 0.100)
PROTECTED = round(SAMPLE_RATE * 0.080)
GUARD = round(SAMPLE_RATE * 0.020)
OVERLAP = round(SAMPLE_RATE * 0.005)
PAD = round(SAMPLE_RATE * 0.250)


def unpack(raw):
    samples = array.array("h")
    samples.frombytes(raw)
    if sys.byteorder != "little":
        samples.byteswap()
    return list(samples)


def pack(samples):
    data = array.array("h", samples)
    if sys.byteorder != "little":
        data.byteswap()
    return data.tobytes()


def ffmpeg(args, raw=None):
    return subprocess.run(
        ["ffmpeg", "-hide_banner", "-loglevel", "error", *args],
        input=raw, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True,
    ).stdout


def synthesize(word):
    raw = ffmpeg([
        "-f", "lavfi", "-i", f"flite=text={word}:voice=slt",
        "-ac", "1", "-ar", str(SAMPLE_RATE), "-f", "s16le", "pipe:1",
    ])
    samples = unpack(raw)
    peak = max(abs(value) for value in samples)
    if len(samples) < EDGE * 3 or peak < 100:
        raise ValueError(f"Incomplete synthesized word: {word}")
    # The same linear gain applies to every speed of this digit. No gates,
    # onset fades, silence detection, or truncation are permitted here.
    gain = (32767 * 0.85) / peak
    return [round(value * gain) for value in samples], hashlib.sha256(raw).hexdigest()


def crossfade(left, right, frames):
    if frames < 1:
        return left + right
    mixed = [round(left[-frames + i] * (1 - (i + 1) / (frames + 1))
                   + right[i] * ((i + 1) / (frames + 1)))
             for i in range(frames)]
    return left[:-frames] + mixed + right[frames:]


def speech_bounds(samples):
    # Flite emits low-level noise around speech. This conservative 10-ms RMS
    # detector chooses which regions to protect, NEVER which samples to remove.
    frame = round(SAMPLE_RATE * 0.010)
    active = [i for i in range(0, len(samples) - frame + 1, frame)
              if sum(value * value for value in samples[i:i + frame]) / frame > 64 ** 2]
    if not active or active[-1] - active[0] < 2 * EDGE:
        raise ValueError("Cannot identify complete speech boundaries")
    return active[0], active[-1] + frame


def stretch(samples, rate):
    padded = [0] * PAD + samples + [0] * PAD
    transformed = unpack(ffmpeg([
        "-f", "s16le", "-ar", str(SAMPLE_RATE), "-ac", "1", "-i", "pipe:0",
        "-af", f"rubberband=tempo={rate}:pitch=1:transients=crisp:formant=preserved",
        "-f", "s16le", "pipe:1",
    ], pack(padded)))
    start = round(PAD / rate)
    length = round(len(samples) / rate)
    if len(transformed) < start + length:
        raise ValueError("Time stretcher returned an incomplete body")
    return transformed[start:start + length]


def accelerate(samples, rate, bounds):
    onset, end = bounds
    if rate == 1:
        return samples[:], [
            {"sourceStart": onset, "outputStart": onset, "frames": PROTECTED},
            {"sourceStart": end - PROTECTED, "outputStart": end - PROTECTED, "frames": PROTECTED},
        ]
    # Five regions retain the entire word and its exterior noise. Noise and
    # the middle accelerate; the two speech boundaries retain original pitch,
    # timing and PCM samples. Overlap joins lie OUTSIDE the protected 80 ms.
    first = (max(0, onset - GUARD), onset + EDGE)
    last = (end - EDGE, min(len(samples), end + GUARD))
    pieces = [
        stretch(samples[:first[0]], rate),
        samples[first[0]:first[1]],
        stretch(samples[first[1]:last[0]], rate),
        samples[last[0]:last[1]],
        stretch(samples[last[1]:], rate),
    ]
    result = pieces[0]
    starts = [0]
    for piece in pieces[1:]:
        overlap = min(OVERLAP, len(result), len(piece))
        starts.append(len(result) - overlap)
        result = crossfade(result, piece, overlap)
    preserved = [
        {"sourceStart": onset, "outputStart": starts[1] + onset - first[0], "frames": PROTECTED},
        {"sourceStart": end - PROTECTED, "outputStart": starts[3] + end - PROTECTED - last[0], "frames": PROTECTED},
    ]
    # Audio gain must not clip after the transform. Original edge samples stay
    # unchanged; any unexpected overshoot fails the build instead of limiting.
    if any(abs(value) >= 32767 for value in result):
        raise ValueError("Time-stretched waveform clips")
    for region in preserved:
        source, output, count = region["sourceStart"], region["outputStart"], region["frames"]
        assert result[output:output + count] == samples[source:source + count]
    return result, preserved


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path,
                        default=Path(__file__).resolve().parents[1] / "number-speech-data.js")
    args = parser.parse_args()
    originals = {}
    source_hashes = {}
    for digit, word in enumerate(WORDS, 1):
        originals[str(digit)], source_hashes[str(digit)] = synthesize(word)
    clips = {}
    clip_hashes = {}
    frame_counts = {}
    source_bounds = {digit: speech_bounds(source) for digit, source in originals.items()}
    preserved_regions = {}
    prior = {digit: float("inf") for digit in originals}
    for speed, rate in RATES.items():
        clips[speed], clip_hashes[speed], frame_counts[speed] = {}, {}, {}
        preserved_regions[speed] = {}
        for digit, source in originals.items():
            samples, preserved_regions[speed][digit] = accelerate(source, rate, source_bounds[digit])
            if len(samples) >= prior[digit]:
                raise ValueError(f"Non-increasing speed for {digit}: {speed}")
            prior[digit] = len(samples)
            raw = pack(samples)
            clips[speed][digit] = base64.b64encode(raw).decode("ascii")
            clip_hashes[speed][digit] = hashlib.sha256(raw).hexdigest()
            frame_counts[speed][digit] = len(samples)
    data = {
        "format": "pcm-s16le", "sampleRate": SAMPLE_RATE,
        "voice": "CMU Flite 2.2 cmu_us_slt", "version": 1,
        "protectedSpeechBoundaryFrames": PROTECTED,
        "sourceSpeechBounds": source_bounds, "preservedRegions": preserved_regions,
        "rates": RATES, "clips": clips,
        "sourcePcmSha256": source_hashes, "clipPcmSha256": clip_hashes,
        "frames": frame_counts,
    }
    header = """// Generated by scripts/build-number-speech.py. Do not edit waveform data.
// Complete spoken digits from CMU Flite slt; see NUMBER-SPEECH-ASSETS.md.
(function (root) {
  'use strict';
  const data = """
    footer = """;
  root.__numberSpeechData = data;
  if (typeof module === 'object' && module.exports) module.exports = data;
})(typeof globalThis !== 'undefined' ? globalThis : this);
"""
    args.output.write_text(header + json.dumps(data, indent=2) + footer)
    print(f"Wrote {args.output.name}: {args.output.stat().st_size:,} bytes; 63 complete clips")
    for speed in RATES:
        durations = [value / SAMPLE_RATE for value in frame_counts[speed].values()]
        print(f"{speed}: {min(durations):.3f}–{max(durations):.3f} seconds")


if __name__ == "__main__":
    main()
