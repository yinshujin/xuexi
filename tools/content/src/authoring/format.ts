/**
 * "课件脚本" (authored lesson) format: a compact JSON that an AI agent such as
 * WorkBuddy can write with its own model quota. `compile.ts` turns it into a
 * regular pack lesson (OpenMAIC DSL slides + actions), so review / build /
 * publish and the player work unchanged.
 */

export const AUTHORED_FORMAT = 'xuexi-authored@1' as const;

export type BlockColor = 'blue' | 'orange' | 'green' | 'purple' | 'gray';

export type Block =
  | { id: string; kind: 'heading'; text: string }
  | { id: string; kind: 'text'; text: string }
  | { id: string; kind: 'bullets'; items: string[] }
  | { id: string; kind: 'cards'; items: Array<{ id: string; text: string; color?: BlockColor }> }
  | { id: string; kind: 'formula'; latex: string }
  | { id: string; kind: 'table'; rows: string[][] };

export type BoardItem = { text: string } | { latex: string } | { line: true } | { table: string[][] };

export type Step =
  | { say: string }
  | { spotlight: string }
  | { laser: string }
  | { board: BoardItem[] }
  | { boardClear: true }
  | { boardClose: true };

export interface SlideScene {
  type: 'slide';
  title: string;
  blocks: Block[];
  script: Step[];
}

export interface QuizQuestionSpec {
  question: string;
  options: string[];
  /** Indices (0-based) of the correct options. More than one → multiple choice. */
  answer: number[];
  analysis: string;
}

export interface QuizScene {
  type: 'quiz';
  title: string;
  /** Spoken before the questions. */
  intro?: string;
  questions: QuizQuestionSpec[];
}

export type AuthoredScene = SlideScene | QuizScene;

export interface AuthoredLesson {
  format: typeof AUTHORED_FORMAT;
  lessonId: string;
  title: string;
  scenes: AuthoredScene[];
}

/** Human / agent readable specification, printed by `pnpm content author-brief`. */
export const FORMAT_SPEC = `## 课件脚本格式（xuexi-authored@1）

输出一个 JSON 文件（UTF-8，不要加注释），结构如下：

{
  "format": "xuexi-authored@1",
  "lessonId": "<课 id，必须和下面给出的一致>",
  "title": "<课的标题>",
  "scenes": [ <场景>, ... ]          // 4–12 个场景，课堂小题可以分成两个 quiz
}

### 场景一：幻灯片 slide
{
  "type": "slide",
  "title": "<这一页的名字，孩子看不到，用于审核>",
  "blocks": [ <页面上的内容块>, ... ],   // 自上而下排版，最多 5 块
  "script": [ <讲解步骤>, ... ]          // 按顺序播放
}

内容块（每块都要有唯一的 id，只用小写字母、数字和 -）：
- {"id":"h1","kind":"heading","text":"大标题"}                 // 每页最多 1 个，放第一块
- {"id":"t1","kind":"text","text":"一句话，最好不超过 30 字"}
- {"id":"l1","kind":"bullets","items":["要点1","要点2","要点3"]}  // 最多 4 条，每条 ≤ 20 字
- {"id":"c1","kind":"cards","items":[{"id":"c1a","text":"每箱 326 本","color":"blue"},{"id":"c1b","text":"一共 48 箱","color":"orange"}]}
                                                               // 2–4 张彩色卡片排成一行，color: blue/orange/green/purple/gray
- {"id":"f1","kind":"formula","latex":"326 \\\\times 48"}         // LaTeX 公式（JSON 里反斜杠要写两个）
- {"id":"g1","kind":"table","rows":[["表头1","表头2"],["a","b"]]}  // 最多 5 行

讲解步骤（每页至少 2 句 say）：
- {"say":"老师说的话，口语化短句，一次 1–3 句"}
- {"spotlight":"t1"}      // 聚光灯照亮某个内容块（或某张卡片 id），直到下一句话讲完
- {"laser":"c1a"}         // 激光笔指一下
- {"board":[ ... ]}       // 打开白板，按顺序写下内容，用来一步步推导：
      {"text":"326 × 8 = 2608"}   普通文字 / 算式（写 × ÷，不要写 * /）
      {"latex":"\\\\frac{1}{2}"}   LaTeX 公式
      {"line":true}               画一条横线（竖式里的横线）
      {"table":[["百位","十位","个位"],["3","2","6"]]}
  一页白板最多写 8 行，写满了会自动擦掉重写。
- {"boardClear":true}     // 擦白板
- {"boardClose":true}     // 关闭白板，回到幻灯片
  注意：白板的内容会一直保留到下一页，关闭白板也不会擦掉。所以每一页用完白板都要 boardClose，
  下一次打开白板写新内容之前先 boardClear。白板打开时会盖住幻灯片，spotlight / laser 要在 boardClose 之后再用。

### 场景二：课堂小题 quiz
{
  "type": "quiz",
  "title": "课堂小题",
  "intro": "下面我们做几道小题。",
  "questions": [
    {"question":"题干","options":["选项1","选项2","选项3"],"answer":[1],"analysis":"解析：为什么选这个"}
  ]
}
answer 是正确选项的序号（从 0 开始）；多个序号表示多选（题干里写上“多选”）。每个 quiz 2–4 题，一个 quiz 一种题型，title 写题型名。

### 硬性要求
- 所有算式必须正确：脚本会自动验算形如 "a + b = c"、"a × b = c"、"a ÷ b = c" 的算式，以及连等式（"408 × 23 = 408 × 20 + 408 × 3 = 9384"，每一段都要等于第一段）和带万、亿的数（"1200000 = 120万"），算错会被拒绝。
- 只用这一册已经学过的知识；术语和北师大版课本一致。
- 页面文字少、讲解靠 say；say 里的数字和页面、白板上的一致。
- 讲解课 8–12 分钟（约 6–9 页、40–70 句 say）；技巧课 3–5 分钟（约 2–4 页、15–30 句 say）。
- 每节课都有一页“学法口诀”：2–4 句顺口好记的口诀（每句 5–9 字），和本课方法一致，老师先领读再逐句解释。
- 讲解课再加一页“快速推理”（如求最大、最小的数，□ 里最大或最小能填几），教孩子怎样很快想出答案。
- 课堂小题按题型分成几个 quiz 场景：讲解课 3 组（判断题 3 道，选项固定 ["对","错"]；选择题 3–4 道，可含 1 道多选；
  填空与解决问题 3 道，题干用“（　）”表示空）；技巧课 2 组（判断题 2 道；选择与填空 2–3 道）。
`;

export const EXAMPLE_LESSON: AuthoredLesson = {
  format: AUTHORED_FORMAT,
  lessonId: 'example.lesson',
  title: '三位数乘两位数',
  scenes: [
    {
      type: 'slide',
      title: '情境导入',
      blocks: [
        { id: 'h1', kind: 'heading', text: '地铁站旁的书店' },
        { id: 't1', kind: 'text', text: '书店进了 48 箱故事书，每箱 326 本。' },
        {
          id: 'c1',
          kind: 'cards',
          items: [
            { id: 'c1a', text: '每箱 326 本', color: 'blue' },
            { id: 'c1b', text: '一共 48 箱', color: 'orange' },
          ],
        },
      ],
      script: [
        { say: '同学们好！今天我们去深圳地铁站旁边的书店看一看。' },
        { spotlight: 't1' },
        { say: '书店进了 48 箱故事书，每箱 326 本。一共有多少本呢？' },
        { laser: 'c1a' },
        { say: '求 48 个 326 是多少，用乘法：326 乘 48。' },
      ],
    },
    {
      type: 'slide',
      title: '竖式计算',
      blocks: [
        { id: 'h1', kind: 'heading', text: '326 × 48 怎样算？' },
        { id: 'l1', kind: 'bullets', items: ['先用 8 去乘 326', '再用 4 个十去乘 326', '最后把两次的积相加'] },
      ],
      script: [
        { say: '第一步，先用个位上的 8 去乘 326。' },
        { board: [{ text: '326 × 8 = 2608' }] },
        { say: '第二步，用十位上的 4 去乘 326，得到 1304 个十，也就是 13040。' },
        { board: [{ text: '326 × 40 = 13040' }, { line: true }, { text: '2608 + 13040 = 15648' }] },
        { say: '所以 326 乘 48 等于 15648。' },
        { boardClose: true },
      ],
    },
    {
      type: 'quiz',
      title: '课堂小题',
      intro: '下面我们做两道小题。',
      questions: [
        {
          question: '计算 213 × 32 时，用 3 去乘 213 得到的积，末位要和哪一位对齐？',
          options: ['个位', '十位', '百位'],
          answer: [1],
          analysis: '3 在十位上，表示 3 个十，所以积的末位和十位对齐。',
        },
      ],
    },
  ],
};
