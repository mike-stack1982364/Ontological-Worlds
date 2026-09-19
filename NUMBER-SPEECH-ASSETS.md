# Bundled spoken numbers

`number-speech-data.js` contains the complete English words **one** through
**nine**, in a fixed female synthetic voice, at each of the seven speech-speed
settings. The payload is mono 16 kHz, signed 16-bit little-endian PCM encoded as
base64. Playback does not require the device's speech-synthesis service, an
installed voice, a network request to a speech provider, or MP3 decoding.

The assets were generated specifically for this application with the CMU Flite
`cmu_us_slt` voice. They are not downloaded human recordings. Flite, FFmpeg and
Rubber Band are build tools; their libraries are not shipped to the browser.

## Rebuild

Run from the repository root:

```sh
python3 scripts/build-number-speech.py
```

The checked-in build used Python 3, FFmpeg `6.1.1-3ubuntu5`, Flite
`2.2-6build3`, and Rubber Band `3.3.0+dfsg-2build1`. FFmpeg must include its
`flite` and `rubberband` filters. The build runs locally with no network access.
The data records SHA-256 hashes of the original synthesized PCM and every
derived clip. Different synthesizer or time-stretcher versions may change the
waveforms and hashes; review regenerated assets before committing them.

## Preserving complete words

Every original waveform is retained in five regions: leading low-level noise,
the speech onset, the middle of the word, the speech ending, and trailing
low-level noise. A conservative 10 ms RMS detector chooses the boundaries to
protect; it never discards samples or gates quiet phonemes. A 20 ms guard extends
around those boundaries. The onset and ending retain at least 80 ms each of the
original active speech, sample for sample. Only joins outside these protected
regions are blended over 5 ms to avoid discontinuities.

Rubber Band compresses the other three regions without changing pitch. The
relative body tempos are 1, 1.3, 1.65, 2.1, 2.8, 4, and 6. These are **not exact
whole-word playback multipliers**: protecting consonants limits the effective
acceleration. Every higher setting still produces a strictly shorter complete
clip for every digit. No phoneme is removed to meet a timer or target duration.

The resulting clip-duration ranges are:

| Setting | Clip duration |
| --- | --- |
| Average | 0.620–0.925 s |
| Moderately fast | 0.512–0.747 s |
| Fast | 0.450–0.635 s |
| Very fast | 0.401–0.546 s |
| Extremely fast | 0.356–0.465 s |
| Incredibly fast | 0.315–0.391 s |
| Ultra-fast | 0.283–0.334 s |

The builder verifies protected samples, decreasing duration, complete transform
output and absence of amplitude clipping. `sourceSpeechBounds` and
`preservedRegions` in the data make the boundary checks independently
reproducible. Sequence-level lead-in, spacing, volume, pause/resume and completion
are handled separately by the playback engine. Objective waveform checks cannot
establish how a particular device or listener will perceive the fastest speech.

## Attribution

Speech synthesis: Language Technologies Institute, Carnegie Mellon University;
Flite and its `cmu_us_slt` voice, including work by Alan W Black and the Flite
contributors. See the [Flite source](https://github.com/festvox/flite),
[Flite copyright notice](https://github.com/festvox/flite/blob/6c9f20dc915b17f5619340069889db0aa007fcdc/COPYING)
and [slt voice notice](https://github.com/festvox/flite/blob/6c9f20dc915b17f5619340069889db0aa007fcdc/lang/cmu_us_slt/cmu_us_slt.c).
The following upstream notice is reproduced for attribution. This application
does not claim endorsement by Carnegie Mellon University or its contributors.
The derived waveforms use linear peak normalization and the protected-boundary
tempo processing described above; no upstream source code was modified.

> Language Technologies Institute, Carnegie Mellon University.
> Copyright (c) 1999–2017. All Rights Reserved.
>
> Permission is hereby granted, free of charge, to use and distribute this
> software and its documentation without restriction, including without
> limitation the rights to use, copy, modify, merge, publish, distribute,
> sublicense, and/or sell copies of this work, and to permit persons to whom
> this work is furnished to do so, subject to the following conditions:
>
> 1. The code must retain the above copyright notice, this list of conditions
>    and the following disclaimer.
> 2. Any modifications must be clearly marked as such.
> 3. Original authors' names are not deleted.
> 4. The authors' names are not used to endorse or promote products derived
>    from this software without specific prior written permission.
>
> CARNEGIE MELLON UNIVERSITY AND THE CONTRIBUTORS TO THIS WORK DISCLAIM ALL
> WARRANTIES WITH REGARD TO THIS SOFTWARE, INCLUDING ALL IMPLIED WARRANTIES
> OF MERCHANTABILITY AND FITNESS, IN NO EVENT SHALL CARNEGIE MELLON UNIVERSITY
> NOR THE CONTRIBUTORS BE LIABLE FOR ANY SPECIAL, INDIRECT OR CONSEQUENTIAL
> DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS,
> WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION,
> ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
