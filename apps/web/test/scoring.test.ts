import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { alignWords } from '../src/lib/scoring/align';
import { toBase64Frames, toInt16 } from '../src/lib/scoring/audio';
import { parseScoringText } from '../src/lib/scoring/config';
import { bookStars, cheerBand, passed } from '../src/lib/scoring/grade';
import { parseIseXml, scoreWithXfyun, signedUrl, XfyunError, type SocketLike } from '../src/lib/scoring/xfyun';

// Made-up credentials: the real ones are entered on the device, never in the code.
const CRED = { appId: 'app12345', apiKey: 'key0123456789abcdef', apiSecret: 'secretSECRETsecret' };

const RESULT_XML = `<?xml version="1.0" ?><xml_result><read_sentence lan="en" type="study" version="7,0,0,1024">
<rec_paper><read_chapter accuracy_score="82.4" fluency_score="76.1" integrity_score="100" standard_score="80" total_score="81.6" is_rejected="false" content="Come back, cat!">
<sentence content="come back cat" total_score="81.6">
<word content="sil" dp_message="0" total_score="0"/>
<word content="come" dp_message="0" total_score="92.3"/>
<word content="back" dp_message="0" total_score="35.2"/>
<word content="cat" dp_message="16" total_score="0"/>
</sentence></read_chapter></rec_paper></read_sentence></xml_result>`;

describe('讯飞 ISE', () => {
  it('signs the URL with HMAC-SHA256 over host, date and request line', async () => {
    const date = 'Thu, 25 Sep 2026 02:00:00 GMT';
    const url = new URL(await signedUrl(CRED, date));
    expect(url.host).toBe('ise-api.xfyun.cn');
    expect(url.searchParams.get('date')).toBe(date);
    const auth = atob(url.searchParams.get('authorization')!);
    const expected = createHmac('sha256', CRED.apiSecret)
      .update(`host: ise-api.xfyun.cn\ndate: ${date}\nGET /v2/open-ise HTTP/1.1`)
      .digest('base64');
    expect(auth).toBe(
      `api_key="${CRED.apiKey}", algorithm="hmac-sha256", headers="host date request-line", signature="${expected}"`,
    );
  });

  it('parses scores and word verdicts (漏读, low score) and skips silence', () => {
    const s = parseIseXml(RESULT_XML);
    expect(s).toMatchObject({ overall: 82, accuracy: 82, fluency: 76, completeness: 100, heard: 'come back cat' });
    expect(s.words).toEqual([
      { word: 'come', state: 'ok' },
      { word: 'back', state: 'wrong' },
      { word: 'cat', state: 'miss' },
    ]);
    expect(s.unclear).toBeUndefined();
  });

  it('a rejected recording is "unclear", not a zero', () => {
    const s = parseIseXml('<read_chapter total_score="0" is_rejected="true"/>');
    expect(s.unclear).toBe(true);
    expect(passed(s, 60)).toBe(false);
    expect(cheerBand(s, 60)).toBe('unclear');
  });

  /** A fake 讯飞 server: records what is sent and answers like the real one. */
  function fakeSocket(reply: (sent: unknown[]) => Array<Record<string, unknown>> | 'close' | 'silent') {
    const sent: unknown[] = [];
    let urlSeen = '';
    const open = (url: string): SocketLike => {
      urlSeen = url;
      const ws: SocketLike = {
        onopen: null,
        onmessage: null,
        onerror: null,
        onclose: null,
        send(data) {
          const msg = JSON.parse(data);
          sent.push(msg);
          if (msg.data?.status !== 2) return;
          const r = reply(sent);
          setTimeout(() => {
            if (r === 'close') ws.onclose?.({});
            else if (r !== 'silent') for (const m of r) ws.onmessage?.({ data: JSON.stringify(m) });
          }, 1);
        },
        close() {},
      };
      setTimeout(() => ws.onopen?.({}), 1);
      return ws;
    };
    return { open, sent, url: () => urlSeen };
  }

  it('sends the parameters first, then the audio frames, and reads the result', async () => {
    const b64 = (s: string) => btoa(String.fromCharCode(...new TextEncoder().encode(s)));
    const fake = fakeSocket(() => [
      { code: 0, data: { status: 1, data: '' } },
      { code: 0, data: { status: 2, data: b64(RESULT_XML) } },
    ]);
    const frames = ['AAAA', 'BBBB', 'CCCC'];
    const s = await scoreWithXfyun(frames, '“Come back, cat!”\n', CRED, fake.open);
    expect(s.overall).toBe(82);
    expect(fake.url()).toMatch(/^wss:\/\/ise-api\.xfyun\.cn\/v2\/open-ise\?authorization=/);
    const [first, ...audio] = fake.sent as Array<{ common?: unknown; business: Record<string, unknown>; data: Record<string, unknown> }>;
    expect(first.common).toEqual({ app_id: CRED.appId });
    expect(first.business).toMatchObject({ category: 'read_sentence', ent: 'en_vip', group: 'pupil', cmd: 'ssb' });
    expect(first.business.text).toBe('﻿[content]\n"Come back, cat!"');
    expect(audio.map((m) => [m.business.aus, m.data.status, m.data.data])).toEqual([
      [1, 1, 'AAAA'],
      [2, 1, 'BBBB'],
      [4, 2, 'CCCC'],
    ]);
  });

  it('reports errors from 讯飞, a closed connection and a timeout as failures', async () => {
    const err = fakeSocket(() => [{ code: 10313, message: 'invalid appid' }]);
    await expect(scoreWithXfyun(['AAAA'], 'Hi.', CRED, err.open)).rejects.toThrow(/10313/);
    const closed = fakeSocket(() => 'close');
    await expect(scoreWithXfyun(['AAAA'], 'Hi.', CRED, closed.open)).rejects.toBeInstanceOf(XfyunError);
    const silent = fakeSocket(() => 'silent');
    await expect(scoreWithXfyun(['AAAA'], 'Hi.', CRED, silent.open, 30)).rejects.toThrow(/超时/);
  });
});

describe('word alignment', () => {
  it('maps engine words back onto the printed words', () => {
    const printed = '"Cock-a-doodle-doo!" says the rooster.'.split(' ');
    const engine = [
      { word: 'cock', state: 'ok' as const },
      { word: 'a', state: 'ok' as const },
      { word: 'doodle', state: 'wrong' as const },
      { word: 'doo', state: 'ok' as const },
      { word: 'says', state: 'ok' as const },
      { word: 'the', state: 'miss' as const },
      { word: 'rooster', state: 'ok' as const },
    ];
    expect(alignWords(printed, engine)).toEqual(['wrong', 'ok', 'miss', 'ok']);
  });

  it("merges split contractions and leaves unmatched words uncoloured", () => {
    expect(alignWords(["I", "couldn't", "go."], [
      { word: 'i', state: 'ok' },
      { word: 'could', state: 'ok' },
      { word: "n't", state: 'ok' },
      { word: 'go', state: 'ok' },
    ])).toEqual(['ok', 'ok', 'ok']);
    expect(alignWords(['Hello', 'Kitty.'], [{ word: 'hello', state: 'ok' }])).toEqual(['ok', undefined]);
  });
});

describe('grading', () => {
  const s = (overall: number) => ({ overall, accuracy: overall, fluency: overall, completeness: overall, words: [], heard: '' });
  it('passes on the pass line, and cheers relative to it', () => {
    expect(passed(s(70), 70)).toBe(true);
    expect(passed(s(69), 70)).toBe(false);
    expect(cheerBand(s(97), 70)).toBe('perfect');
    expect(cheerBand(s(86), 70)).toBe('great');
    expect(cheerBand(s(72), 70)).toBe('pass');
    expect(cheerBand(s(63), 70)).toBe('close');
    expect(cheerBand(s(40), 70)).toBe('retry');
    expect(cheerBand(s(40), 70, { mercy: true })).toBe('mercy');
  });
  it('book stars follow the share of sentences really passed', () => {
    expect(bookStars(10, 10)).toBe(3);
    expect(bookStars(5, 10)).toBe(2);
    expect(bookStars(0, 10)).toBe(0);
    expect(bookStars(0, 0)).toBe(0);
  });
});

describe('audio frames', () => {
  it('16-bit PCM in 1280-byte frames', () => {
    const pcm = new Float32Array(1000).fill(0.5);
    const bytes = toInt16(pcm);
    expect(bytes.length).toBe(2000);
    expect(new DataView(bytes.buffer).getInt16(0, true)).toBe(Math.floor(0.5 * 0x7fff));
    const frames = toBase64Frames(bytes);
    expect(frames).toHaveLength(2);
    expect(atob(frames[0]).length).toBe(1280);
    expect(atob(frames[1]).length).toBe(720);
  });
});

describe('credentials text', () => {
  it('reads the three values from JSON, env-style or console text', () => {
    const want = { vendor: 'xfyun', xfyun: { appId: 'app12345', apiKey: 'key0123456789abcdef', apiSecret: 'secretSECRETsecret' } };
    expect(parseScoringText(JSON.stringify({ appId: 'app12345', apiKey: 'key0123456789abcdef', apiSecret: 'secretSECRETsecret' }))).toEqual(want);
    expect(parseScoringText("XFYUN_APPID: 'app12345',\nXFYUN_API_KEY: 'key0123456789abcdef',\nXFYUN_API_SECRET: 'secretSECRETsecret',")).toEqual(want);
    expect(parseScoringText('APPID：app12345\nAPISecret：secretSECRETsecret\nAPIKey：key0123456789abcdef')).toEqual(want);
    expect(parseScoringText('nothing here')).toBeNull();
  });
});
