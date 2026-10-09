import assert from 'node:assert/strict';
import { test } from 'node:test';
import { textForSpeech, rankEnglishVoices, speechSentences, speakText, stopSpeech, pauseSpeech, resumeSpeech, getSpeechState } from '../lib/speech.ts';

test('markdown and representative equations become spoken text', () => {
  const spoken = textForSpeech('# **Slope**\n- [Read this](https://example.com)\n`y = x^2 + 3` and \\frac{1}{2} ≤ 0.5.');
  assert.equal(spoken, 'Slope Read this y equals x squared plus 3 and 1 divided by 2 less than or equal to 0.5.');
  assert.equal(textForSpeech('Step-by-step: x-y = -2 * 3 and x^20.'), 'Step-by-step: x minus y equals minus 2 times 3 and x to the power of 20.');
  assert.deepEqual(speechSentences('First sentence. Next sentence!'), ['First sentence.', 'Next sentence!']);
});

test('English voice ranking prefers natural voices and excludes novelty voices', () => {
  const voices = ['Fred', 'Generic', 'Samantha', 'Ava Enhanced', 'Google US English', 'Bahh'].map(name => ({ name, lang: 'en-US', voiceURI: name }));
  const ranked = rankEnglishVoices([...voices, { name: 'French Natural', lang: 'fr-FR', voiceURI: 'fr' }]);
  assert.equal(ranked[0].name, 'Ava Enhanced');
  assert.equal(ranked.some(v => ['Fred', 'Bahh', 'French Natural'].includes(v.name)), false);
});

test('queues only after sentence end, applies selected voice/rate, and stop prevents stale continuation', () => {
  const queued = [];
  globalThis.window = { speechSynthesis: {
    getVoices: () => [{ name: 'Samantha', lang: 'en-US', voiceURI: 'sam' }],
    speak: utterance => queued.push(utterance), cancel() {}, pause() {}, resume() {},
  }};
  globalThis.SpeechSynthesisUtterance = class { constructor(text) { this.text = text; } };
  speakText('First sentence. Second sentence.', { voiceURI: 'sam', rate: 1.2, autoplay: false }, 'reply');
  assert.equal(queued.length, 1);
  assert.equal(queued[0].voice.voiceURI, 'sam');
  assert.equal(queued[0].rate, 1.2);
  pauseSpeech(); assert.equal(getSpeechState().status, 'paused');
  resumeSpeech(); assert.equal(getSpeechState().status, 'playing');
  queued[0].onend(); assert.equal(queued.length, 2);
  stopSpeech(); queued[1].onend();
  assert.equal(queued.length, 2);
  assert.equal(getSpeechState().status, 'idle');
  delete globalThis.window; delete globalThis.SpeechSynthesisUtterance;
});
