/**
 * A realistic OpenMAIC classroom used by the mock OpenMAIC server and tests.
 * Shapes follow what OpenMAIC's server-side generation persists: slide scenes
 * with PPTist canvas elements, speech actions carrying `audioUrl` after TTS,
 * spotlight / laser / whiteboard actions, a discussion action (live-only),
 * and a quiz scene.
 */

const theme = {
  backgroundColor: '#ffffff',
  themeColors: ['#5b9bd5', '#ed7d31', '#a5a5a5', '#ffc000', '#4472c4'],
  fontColor: '#333333',
  fontName: 'Microsoft YaHei',
};

const RECT = 'M 0 0 L 1000 0 L 1000 1000 L 0 1000 Z';

function text(id: string, html: string, left: number, top: number, width: number, height: number) {
  return {
    type: 'text',
    id,
    content: html,
    left,
    top,
    width,
    height,
    rotate: 0,
    defaultFontName: 'Microsoft YaHei',
    defaultColor: '#333333',
  };
}

function box(id: string, label: string, left: number, top: number, fill: string) {
  return {
    type: 'shape',
    id,
    left,
    top,
    width: 260,
    height: 90,
    rotate: 0,
    viewBox: [1000, 1000],
    path: RECT,
    fill,
    fixedRatio: false,
    text: {
      content: `<p style="text-align:center;font-size:24px;">${label}</p>`,
      defaultFontName: 'Microsoft YaHei',
      defaultColor: '#ffffff',
      align: 'middle',
    },
  };
}

export interface SampleOptions {
  id: string;
  /** Origin of the (mock) OpenMAIC server, used for audioUrl / media URLs. */
  baseUrl: string;
  title: string;
  /** Include narration audio URLs (as if TTS was enabled). */
  withAudio: boolean;
}

export function sampleClassroom(opts: SampleOptions) {
  const { id, baseUrl, title, withAudio } = opts;
  const media = (file: string) => `${baseUrl}/api/classroom-media/${id}/${file}`;
  let speechCount = 0;
  const speech = (sceneOrder: number, actionId: string, t: string) => {
    speechCount += 1;
    return {
      id: actionId,
      type: 'speech',
      text: t,
      ...(withAudio
        ? { audioId: `tts_s${sceneOrder}_${actionId}`, audioUrl: media(`audio/tts_s${sceneOrder}_${actionId}.wav`) }
        : {}),
    };
  };
  const now = Date.now();

  const scenes = [
    {
      id: `${id}-s0`,
      stageId: id,
      type: 'slide',
      title: '情境导入：地铁站的书店',
      order: 0,
      content: {
        type: 'slide',
        canvas: {
          id: 'slide-0',
          viewportSize: 1000,
          viewportRatio: 0.5625,
          theme,
          background: { type: 'solid', color: '#f7fbff' },
          elements: [
            text('t0', `<p style="font-size:36px;"><strong>${title}</strong></p>`, 60, 40, 880, 70),
            text(
              't1',
              '<p style="font-size:24px;">深圳地铁站旁的书店进了 48 箱故事书，每箱 326 本。</p>',
              60,
              150,
              880,
              60,
            ),
            box('b1', '每箱 326 本', 140, 280, '#5b9bd5'),
            box('b2', '一共 48 箱', 600, 280, '#ed7d31'),
            {
              type: 'image',
              id: 'img0',
              src: media('media/books.png'),
              left: 400,
              top: 400,
              width: 200,
              height: 120,
              rotate: 0,
              fixedRatio: true,
            },
          ],
        },
      },
      actions: [
        speech(0, 'a0', '同学们好！今天我们去深圳地铁站旁边的书店看一看。'),
        { id: 'a1', type: 'spotlight', elementId: 't1' },
        speech(0, 'a2', '书店进了 48 箱故事书，每箱 326 本。一共有多少本呢？'),
        { id: 'a3', type: 'laser', elementId: 'b1' },
        speech(0, 'a4', '求一共多少本，就是求 48 个 326 是多少，用乘法：326 乘 48。'),
      ],
    },
    {
      id: `${id}-s1`,
      stageId: id,
      type: 'slide',
      title: '竖式计算：分两步乘',
      order: 1,
      content: {
        type: 'slide',
        canvas: {
          id: 'slide-1',
          viewportSize: 1000,
          viewportRatio: 0.5625,
          theme,
          elements: [
            text('t2', '<p style="font-size:32px;"><strong>326 × 48 怎样算？</strong></p>', 60, 40, 880, 60),
            text('t3', '<p style="font-size:24px;">① 先用 8 去乘 326</p>', 80, 140, 400, 50),
            text('t4', '<p style="font-size:24px;">② 再用 4 个十去乘 326</p>', 80, 210, 400, 50),
            text('t5', '<p style="font-size:24px;">③ 最后把两次的积相加</p>', 80, 280, 400, 50),
          ],
        },
      },
      actions: [
        speech(1, 'b0', '我们用竖式来算。第一步，先用个位上的 8 去乘 326。'),
        { id: 'b1', type: 'spotlight', elementId: 't3' },
        { id: 'b2', type: 'wb_open' },
        { id: 'b3', type: 'wb_draw_text', elementId: 'wb1', content: '326 × 8 = 2608', x: 80, y: 60, width: 500, height: 60, fontSize: 32 },
        speech(1, 'b4', '第二步，用十位上的 4 去乘 326，得到的是 1304 个十，也就是 13040。'),
        { id: 'b5', type: 'wb_draw_text', elementId: 'wb2', content: '326 × 40 = 13040', x: 80, y: 140, width: 500, height: 60, fontSize: 32 },
        { id: 'b6', type: 'wb_draw_line', startX: 80, startY: 220, endX: 560, endY: 220, color: '#333333', width: 3 },
        { id: 'b7', type: 'wb_draw_latex', elementId: 'wb3', latex: '2608 + 13040 = 15648', x: 80, y: 240, width: 520, height: 70 },
        speech(1, 'b8', '最后把两次的积加起来，326 乘 48 等于 15648。'),
        { id: 'b9', type: 'wb_close' },
        { id: 'b10', type: 'discussion', topic: '为什么第二个积要向左错一位？' },
      ],
    },
    {
      id: `${id}-s2`,
      stageId: id,
      type: 'quiz',
      title: '课堂小题',
      order: 2,
      content: {
        type: 'quiz',
        questions: [
          {
            id: 'q1',
            type: 'single',
            question: '计算 213 × 32 时，用 3 去乘 213 得到的积，末位应该和哪一位对齐？',
            options: [
              { label: '个位', value: 'A' },
              { label: '十位', value: 'B' },
              { label: '百位', value: 'C' },
            ],
            answer: ['B'],
            analysis: '3 在十位上，表示 3 个十，所以积的末位要和十位对齐。',
            hasAnswer: true,
            points: 1,
          },
          {
            id: 'q2',
            type: 'single',
            question: '125 × 16 的结果是？',
            options: [
              { label: '2000', value: 'A' },
              { label: '875', value: 'B' },
              { label: '1875', value: 'C' },
            ],
            answer: ['A'],
            analysis: '125 × 6 = 750，125 × 10 = 1250，750 + 1250 = 2000。',
            hasAnswer: true,
            points: 1,
          },
        ],
      },
      actions: [speech(2, 'c0', '下面我们来做两道小题，看看你学会了没有。')],
    },
  ];

  return {
    classroom: {
      id,
      stage: {
        id,
        name: title,
        description: `示例课程：${title}`,
        createdAt: now,
        updatedAt: now,
        languageDirective: 'zh-CN',
      },
      scenes,
      createdAt: new Date(now).toISOString(),
    },
    speechCount,
  };
}
