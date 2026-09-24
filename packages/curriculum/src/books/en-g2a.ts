import type { Book } from '../types';
import { unit } from './helpers';

const B = 'en-g2a';

/**
 * 沪教版牛津英语（深圳用，一年级起点）二年级上册，只收录 Module 1 Getting to know you 的前两个单元：
 * Unit 1 Good morning、Unit 2 I'm Danny。核对来源与不确定之处见 sourceNote。
 */
export const enG2a: Book = {
  id: B,
  subject: 'english',
  edition: '沪教牛津版（深圳）',
  revision: '深圳用2024版（沿用旧版单元结构）',
  grade: 2,
  term: '上',
  title: '英语 二年级上册（沪教牛津版 深圳用）',
  sourceNote: [
    '版本判断：深圳小学英语一年级起点使用上海教育出版社《英语（牛津上海版·深圳用）》，即“沪教牛津版（六三制一起）”。',
    '检索到的 2024 版（2024—2026 学年仍在使用、教习网标注“(2024)”）一、二年级册次沿用原 Module/Unit 结构（如一上 Module 1 Getting to know you：Unit 1 Hello、Unit 3 My face），',
    '未检索到 2026 年秋深圳二年级上册另行换用新单元结构的报道，故按现行版本整理。',
    '本册目录核对来源（均为检索摘要，原网页因网络代理无法直接打开）：原创力文档 max.book118.com「2024-2025学年小学英语二年级上册牛津上海版（深圳用）（2024）教学设计合集」目录；',
    '21世纪教育网 / 教习网「沪教牛津版（深圳用）二年级上册」教案与练习；人人文库「牛津上海版（深圳用）英语二年级上册 Module 1 Getting to know you Unit 2 I\'m Danny 同步测试」；',
    'B 站「2上Unit 5 That\'s my family 深圳小学英语课本」等。',
    '已核实：Module 1 Getting to know you —— Unit 1 Good morning、Unit 2 I\'m Danny、Unit 3 Are you Alice?；',
    'Unit 1 词汇 morning、afternoon、evening、night，句型 Good morning/afternoon/evening/night. How are you? I\'m fine. Thank you.；',
    'Unit 2 句型 I\'m ... / You\'re ...，课文 Hello, I\'m Danny. Hi, Danny. I\'m Mary. Oh, you\'re tall. I\'m short.，单词表含 boy、girl、big、small。',
    '不确定：各单元的字母/语音板块（检索到本模块词表还有 apple、bag、cat、dog，可能属于 Learn the letters，但无法确认归属哪一单元），因此未单列字母知识点；',
    'Unit 2 中 tall、short 是课文用词还是一年级学过的复习词未能确认；上海本地试用本的 Unit 1 题为 Hello，与深圳版 Good morning 内容相同。',
  ].join(''),
  units: [
    // ------------------------------------------------------------------ Unit 1
    unit(B, 1, 'Unit 1 Good morning（早上好）', [
      {
        slug: 'greetings',
        title: '一天中的问候：Good morning / afternoon / evening / night',
        objectives: [
          '会听、会说 morning、afternoon、evening、night 四个单词',
          '能根据早上、下午、晚上、睡觉前选对问候语',
          '知道 Good night 是睡前说的“晚安”，不是见面打招呼',
        ],
        keyPoints: [
          '重点：Good morning. / Good afternoon. / Good evening. / Good night. 四句问候语',
          '难点：afternoon 重音在后（after-NOON），evening 读 /ˈiːvnɪŋ/ 两个音节',
          '常见错误：晚上见面说 Good night（应说 Good evening）；句首 Good 忘记大写',
        ],
        prerequisites: [],
        localContexts: ['早上在校门口和老师打招呼', '晚上在深圳湾公园散步遇到邻居'],
        lecture: {
          title: '早上好、下午好、晚上好、晚安',
          minutes: 10,
          focus:
            '用“一天的时钟”情境教 4 个新词 morning、afternoon、evening、night 和 4 句问候语 Good morning. Good afternoon. Good evening. Good night. 每个单词、每句问候至少领读两遍；配合“太阳升起、太阳高照、太阳落山、月亮星星”的画面判断用哪一句；强调 Good night 是睡觉前或晚上道别时说的，晚上见面要说 Good evening。可复习一年级学过的 Hello. / Goodbye.',
        },
        techniques: [
          {
            slug: 'sun-clock',
            title: '看太阳选问候：一招不说错',
            minutes: 4,
            focus:
              '教“看太阳”口诀：太阳升起 Good morning，太阳头顶过后 Good afternoon，太阳落山 Good evening，上床睡觉 Good night。用 4 个生活场景（早上到校、下午放学、晚饭后遇到邻居、睡前和妈妈说话）让孩子选问候语，专门对比晚上见面说 Good evening、睡前说 Good night 的区别。',
          },
        ],
        practice: [],
      },
      {
        slug: 'how-are-you',
        title: '问好对话：How are you? I\'m fine. Thank you.',
        objectives: [
          '会用 How are you? 询问别人好不好',
          '会用 I\'m fine. Thank you. 礼貌地回答',
          '能和老师、同学演一段完整的问好对话',
        ],
        keyPoints: [
          '重点：Good morning, Miss Fang. How are you? / I\'m fine. Thank you.',
          '难点：How are you? 用降调；I\'m 是 I am 的缩写，读作 /aɪm/',
          '常见错误：回答时漏掉 Thank you 或只说 Fine；I\'m 的 I 小写或漏掉撇号；问句末尾忘写问号',
        ],
        prerequisites: ['en-g2a.u1.greetings'],
        localContexts: ['早上进教室和英语老师问好', '下午在小区楼下遇到好朋友'],
        lecture: {
          title: '你好吗？我很好，谢谢！',
          minutes: 10,
          focus:
            '在问候语后面接一段问好对话：A: Good morning, Miss Fang. How are you? B: I\'m fine. Thank you. 分别领读 How are you? 和 I\'m fine. Thank you. 至少两遍，再换成 Good afternoon / Good evening 开头演练 2–3 组对话；讲清 I\'m 就是 I am，I 永远大写；说英语问候时要看着对方、面带微笑。',
        },
        techniques: [
          {
            slug: 'polite-reply',
            title: '问答小技巧：先回应，再说谢谢',
            minutes: 4,
            focus:
              '教对话“接球”技巧：听到 How are you? 要马上回答 I\'m fine. Thank you. 而不是只说 Fine 或不说话。用“先问好—再问你好吗—再回答并道谢”的三步顺序练习：Good afternoon. / Good afternoon. / How are you? / I\'m fine. Thank you. 再对比都带 you 的 How are you?（你好吗）和 Thank you.（谢谢你），听清开头再回答。',
          },
        ],
        practice: [],
      },
    ]),
    // ------------------------------------------------------------------ Unit 2
    unit(B, 2, 'Unit 2 I\'m Danny（我是丹尼）', [
      {
        slug: 'words',
        title: '新词：boy, girl, big, small',
        objectives: [
          '会听、会说、会认 boy、girl、big、small 四个单词',
          '能用单词说出图片里是男孩还是女孩、是大还是小',
          '能把 big 和 small、boy 和 girl 成对记住',
        ],
        keyPoints: [
          '重点：boy 男孩、girl 女孩、big 大的、small 小的',
          '难点：girl 的 /ɜː/ 音嘴角微拉、声音拉长；boy 的 /ɔɪ/ 要从“奥”滑到“一”',
          '常见错误：说“一个男孩”漏掉 a（a boy, a girl）；把 big 读成 /bɪk/',
        ],
        prerequisites: [],
        localContexts: ['在学校操场上数男生女生', '在超市比较大苹果和小苹果'],
        lecture: {
          title: '男孩女孩，大大小小',
          minutes: 10,
          focus:
            '用 Danny 和 Mary 两个人物、大小两只玩具熊引出 4 个新词：boy、girl、big、small。每个单词领读至少两遍，并放进短句里听：a boy、a girl、big、small。做“看图说词”和“大小反着说”小游戏；提醒说一个人时前面加 a（a boy, a girl）。',
        },
        techniques: [
          {
            slug: 'opposite-pairs',
            title: '反义词成对记：big-small, boy-girl',
            minutes: 4,
            focus:
              '教“成对记单词”的方法：big 和 small 是一对“相反的词”，boy 和 girl 是一对“小伙伴词”。用夸张动作（张开双臂说 big，缩成一团说 small）和“我说一个你说另一个”的对口令游戏，把 big、small、boy、girl 各读两遍以上，并能快速说出配对词。',
          },
        ],
        practice: [],
      },
      {
        slug: 'i-am-you-are',
        title: '介绍自己和别人：I\'m ... / You\'re ...',
        objectives: [
          '会用 I\'m ... 介绍自己的名字',
          '会用 You\'re ... 说出对方的样子，如 You\'re tall.',
          '分清 I\'m 说的是“我”，You\'re 说的是“你”',
        ],
        keyPoints: [
          '重点：Hello, I\'m Danny. / Hi, Danny. I\'m Mary. / Oh, you\'re tall. I\'m short.',
          '难点：I\'m = I am，You\'re = You are，缩写中间有一撇（’）',
          '常见错误：介绍自己时说 You\'re Danny；You\'re a girl. 漏掉 a；名字首字母没有大写',
        ],
        prerequisites: ['en-g2a.u1.how-are-you', 'en-g2a.u2.words'],
        localContexts: ['新学期和新同学互相介绍', '在少年宫兴趣班认识新朋友'],
        lecture: {
          title: '我是丹尼，你很高！',
          minutes: 10,
          focus:
            '学习课文对话 Hello, I\'m Danny. / Hi, Danny. I\'m Mary. / Oh, you\'re tall. I\'m short. 分别领读 I\'m ...、You\'re ... 句子各两遍以上；再用本单元单词造句 You\'re a boy. You\'re a girl. You\'re big. I\'m small. 讲清 I\'m 说自己、You\'re 说对方（边说边指自己或指对方），名字和句首字母要大写。',
        },
        techniques: [
          {
            slug: 'point-and-say',
            title: '指一指：I\'m 指自己，You\'re 指对方',
            minutes: 4,
            focus:
              '教“边指边说”的方法区分 I\'m 和 You\'re：说 I\'m 时指自己，说 You\'re 时指对方。用 Danny 和 Mary 的图片做判断题（Danny 介绍自己该说 I\'m Danny. 还是 You\'re Danny.），并练习 You\'re a girl. / You\'re a boy. 不漏 a。',
          },
        ],
        practice: [],
      },
    ]),
  ],
};
