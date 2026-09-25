import type { Book, PracticeSpec } from '../types';
import { unit } from './helpers';

const B = 'yw-g2a';

/** Routine practice plus 拔高 / 创新 questions of one knowledge point in the yw2.words bank. */
function words(v: string): PracticeSpec[] {
  return [
    { generatorId: 'yw2.words', minDifficulty: 1, maxDifficulty: 5, variant: v },
    {
      generatorId: 'yw2.words',
      variant: `${v}#stretch`,
      tier: 'stretch',
      minDifficulty: 3,
      maxDifficulty: 5,
    },
    {
      generatorId: 'yw2.words',
      variant: `${v}#creative`,
      tier: 'creative',
      minDifficulty: 3,
      maxDifficulty: 5,
    },
  ];
}

/**
 * 统编版 语文 二年级上册（2024 修订，2025 年秋首次使用；2026 年秋深圳二年级使用）。
 * 本文件收前四个单元（目录以家长拍摄的新版目录照片为准）。目录核对情况见 sourceNote。
 */
export const ywG2a: Book = {
  id: B,
  subject: 'chinese',
  edition: '统编版',
  revision: '2024修订（2025秋起用）',
  grade: 2,
  term: '上',
  title: '语文 二年级上册（统编版 2024 修订）',
  sourceNote: [
    '版本判断：2022 版课标修订的统编语文教材 2024 年秋从一年级起用，2025 年秋起用于二年级；2026 年秋深圳二年级使用的是 2025 年秋首次使用的新版二年级上册。',
    '目录来源：家长拍摄的新版二年级上册目录照片（第一至四单元）。第一单元·阅读：1 小蝌蚪找妈妈、2 我是什么、3 植物妈妈有办法、语文园地一、快乐读书吧（读读童话故事）；第二单元·识字：1 场景歌、2 树之歌、3 拍手歌、4 田家四季歌、语文园地二；',
    '第三单元·阅读：4 彩虹、5 去外婆家、6 数星星的孩子、语文园地三；第四单元·阅读：7 古诗二首（登鹳雀楼、望庐山瀑布）、8 黄山奇石、9 日月潭、10 葡萄沟、语文园地四。第五单元及以后没有拍到，暂不收录。',
    '第一单元没有“口语交际：有趣的动物”（早先按网络摘要收录，已按目录照片删除，改为“语文园地一 · 快乐读书吧”知识点）。',
    '不确定：①各语文园地的具体栏目没有拍到，园地知识点只讲与本单元课文相关的字词句运用（量词、的地得、近反义词、标点、多音字等通用内容）和快乐读书吧的读书方法；',
    '②《彩虹》《去外婆家》是新版新增或调整的课文，原文未核实，只讲题目相关的字词和通用语言知识，不引用原句；③《数星星的孩子》《黄山奇石》《日月潭》《葡萄沟》按 2017 版同名课文的内容要点讲，新版字句是否改动未核实，不整句引用现代文；两首古诗按通行原文；',
    '④第一、二单元各课原文按 2017 版课文（奥数网、古文之家等转录）核对，课程每页只引用一两句关键句；各课会写字表未核实，不列完整生字表。',
  ].join(''),
  units: [
    // ------------------------------------------------------------------ 一
    unit(B, 1, '阅读：童话与科普', [
      {
        slug: 'tadpole',
        title: '小蝌蚪找妈妈',
        objectives: [
          '能按顺序说出小蝌蚪身体的变化',
          '知道小蝌蚪先后遇到了谁，最后找到了青蛙妈妈',
          '认识“脑袋、披、蹲、跳”等课文里的字词',
          '能借助“迎上去、追上去、游过去”讲讲这个故事',
        ],
        keyPoints: [
          '重点：小蝌蚪的变化顺序——长出两条后腿、长出两条前腿、尾巴变短、尾巴不见了',
          '难点：按变化顺序和“鲤鱼—乌龟—青蛙”的顺序完整讲故事',
          '常见错误：以为先长前腿；“跳”的足字旁最后一笔写成横（应为提）；“宽”多写一点',
        ],
        prerequisites: [],
        localContexts: ['深圳湾公园、洪湖公园的荷花池', '小区水池里的小蝌蚪'],
        lecture: {
          title: '小蝌蚪找妈妈',
          minutes: 10,
          focus:
            '用“小蝌蚪变变变”情境导入，引用课文首句感受小蝌蚪的样子；按“过了几天”梳理三次变化（两条后腿、两条前腿、尾巴变短）和三次相遇（鲤鱼、乌龟、青蛙），体会“迎上去、追上去、游过去”；识字写字讲“宽、皮、跳、睛”等字的结构与易错笔画（足字旁末笔是提、目字旁）；最后知道小蝌蚪长大变成青蛙、青蛙捉害虫。',
        },
        techniques: [
          {
            slug: 'retell-order',
            title: '按顺序讲故事：变化图帮大忙',
            minutes: 4,
            focus:
              '教“看变化图、按顺序讲故事”的方法：用四张小图（后腿、前腿、尾巴变短、变成青蛙）配“过了几天”“遇到谁”“说了什么”，示范把故事讲完整；对比顺序颠倒、漏掉一次相遇的错误讲法，最后请孩子自己讲一遍。',
          },
        ],
        practice: [
          { generatorId: 'yw2.words', minDifficulty: 1, maxDifficulty: 5, variant: 'u1.tadpole' },
          {
            generatorId: 'yw2.words',
            variant: 'u1.tadpole#stretch',
            tier: 'stretch',
            minDifficulty: 3,
            maxDifficulty: 5,
          },
          {
            generatorId: 'yw2.words',
            variant: 'u1.tadpole#creative',
            tier: 'creative',
            minDifficulty: 3,
            maxDifficulty: 5,
          },
        ],
      },
      {
        slug: 'what-am-i',
        title: '我是什么',
        objectives: [
          '能猜出谜底“水”，说出水会变成汽、云、雨、冰雹、雪',
          '会区分“落、打、飘”三个表示“下来”的动词',
          '知道水有时做好事、有时做坏事',
        ],
        keyPoints: [
          '重点：水的变化——太阳一晒变成汽，在空中成了云，遇冷变成雨、冰雹、雪',
          '难点：体会“落下来、打下来、飘下来”的不同，选择恰当的动词',
          '常见错误：“雹”读成 páo（应读 báo）；“飘”和“漂”分不清（空中用风字旁的飘，水上用三点水的漂）',
        ],
        prerequisites: [],
        localContexts: ['深圳夏天的雷阵雨和台风天', '深圳水库和东江引水'],
        lecture: {
          title: '我是什么',
          minutes: 10,
          focus:
            '以猜谜语导入，读课文开头感受“我会变”；用变化图梳理汽—云—雨、冰雹、雪，说明“我”就是水；讲“落、打、飘”三种“下来”的不同；识字讲“晒、冰雹、飘、傍”等字的读音和结构（“雹”读 báo，“飘”是风字旁）；最后讲水做好事和坏事，联系深圳的台风暴雨和节约用水。',
        },
        techniques: [
          {
            slug: 'fall-verbs',
            title: '落、打、飘：选对动词',
            minutes: 4,
            focus:
              '教区分三个动词：雨从空中“落”下来；冰雹又硬又重，“打”下来；雪花又轻又慢，“飘”下来。用做动作、比轻重的方法帮助理解，再用“树叶（　）下来”“冰雹（　）在屋顶上”等练习选词，并区分风字旁的“飘”和三点水的“漂”。',
          },
        ],
        practice: [
          { generatorId: 'yw2.words', minDifficulty: 1, maxDifficulty: 5, variant: 'u1.what-am-i' },
          {
            generatorId: 'yw2.words',
            variant: 'u1.what-am-i#stretch',
            tier: 'stretch',
            minDifficulty: 3,
            maxDifficulty: 5,
          },
          {
            generatorId: 'yw2.words',
            variant: 'u1.what-am-i#creative',
            tier: 'creative',
            minDifficulty: 3,
            maxDifficulty: 5,
          },
        ],
      },
      {
        slug: 'plant-mothers',
        title: '植物妈妈有办法',
        objectives: [
          '能说出蒲公英、苍耳、豌豆妈妈各用什么办法传播种子',
          '能有感情地朗读课文，读出押韵的节奏',
          '愿意仔细观察身边植物的“办法”',
        ],
        keyPoints: [
          '重点：三种办法——蒲公英靠风、苍耳靠动物、豌豆靠太阳晒裂豆荚',
          '难点：理解“降落伞”“铠甲”等比喻的意思',
          '常见错误：“豌豆”写成“碗豆”；“苍耳”的办法说成“靠风”',
        ],
        prerequisites: [],
        localContexts: ['深圳公园草地上的蒲公英', '去郊野公园远足时粘在裤腿上的草籽'],
        lecture: {
          title: '植物妈妈有办法',
          minutes: 10,
          focus:
            '从“孩子长大要离开妈妈”的关键句导入；逐一讲清蒲公英（像降落伞，靠风）、苍耳（带刺的铠甲，挂住动物皮毛）、豌豆（太阳晒得豆荚炸开，蹦着跳着离开）三种办法，用表格整理“植物—办法—靠谁帮忙”；识字讲“豌、苍、甲、娃”等字；朗读时读出押韵；最后鼓励观察身边植物。',
        },
        practice: [
          {
            generatorId: 'yw2.words',
            minDifficulty: 1,
            maxDifficulty: 5,
            variant: 'u1.plant-mothers',
          },
          {
            generatorId: 'yw2.words',
            variant: 'u1.plant-mothers#stretch',
            tier: 'stretch',
            minDifficulty: 3,
            maxDifficulty: 5,
          },
          {
            generatorId: 'yw2.words',
            variant: 'u1.plant-mothers#creative',
            tier: 'creative',
            minDifficulty: 3,
            maxDifficulty: 5,
          },
        ],
      },
      {
        slug: 'garden',
        title: '语文园地一 · 快乐读书吧',
        objectives: [
          '能把本单元学过的量词、偏旁、近义词和反义词用对',
          '会在句子里分清“的”和“地”，用上“雪白的、碧绿的”这样的好词',
          '会读童话书：看封面上的书名和作者，用目录找故事，读完讲给家人听',
        ],
        keyPoints: [
          '重点：字词句运用——量词搭配（一匹马、一条鱼）、偏旁归类（犭、虫）、“的”后面接事物、“地”后面接动作',
          '难点：说出童话的特点——动物、植物像人一样会说话、会想事情',
          '常见错误：“快活的游来游去”（应为“快活地”）；“一头蚂蚁”这样量词乱用',
        ],
        prerequisites: ['yw-g2a.u1.plant-mothers'],
        localContexts: ['深圳图书馆少儿馆', '睡前和爸爸妈妈一起读童话'],
        lecture: {
          title: '语文园地一 · 快乐读书吧',
          minutes: 10,
          focus:
            '先复习本单元的字词句：量词搭配、偏旁归类（犭、虫）、近义词反义词，用“雪白的肚皮、快活地游”讲“的”接事物、“地”接动作；再讲快乐读书吧“读读童话故事”：童话里动物植物会像人一样说话，读书先看封面（书名、作者），用目录找故事，读完把故事讲给家人听。园地的具体栏目未核实，只讲通用的字词句运用。',
        },
        practice: words('u1.garden'),
      },
    ]),
    // ------------------------------------------------------------------ 二
    unit(B, 2, '识字：儿歌识字', [
      {
        slug: 'scene-song',
        title: '场景歌',
        objectives: [
          '会用“一只、一片、一艘、一条”等数量词说事物',
          '能借助数量词想象海边、乡村等场景',
          '认识“鸥、艘、舰”等字',
        ],
        keyPoints: [
          '重点：数量词和事物的正确搭配（一只海鸥、一片沙滩、一艘军舰、一条帆船）',
          '难点：同一个量词能搭配不同事物，不同事物要选合适的量词',
          '常见错误：“一个军舰”“一个石桥”这样什么都用“个”',
        ],
        prerequisites: [],
        localContexts: ['深圳湾冬天的海鸥', '大梅沙沙滩', '蛇口港的轮船'],
        lecture: {
          title: '场景歌',
          minutes: 10,
          focus:
            '从课文开头“一只海鸥，一片沙滩。一艘军舰，一条帆船。”入手，边看图边说数量词，体会几个词语连起来就是一幅海边画面；识字讲“鸥（鸟字旁）、艘和舰（舟字旁）、沙”等字；再用深圳湾、大梅沙的场景让孩子自己用数量词说画面。不整篇抄录课文。',
        },
        techniques: [
          {
            slug: 'measure-words',
            title: '数量词搭配小妙招',
            minutes: 4,
            focus:
              '教选量词的方法：看样子（又大又平的一片沙滩、长长的一条帆船/小溪），看种类（军舰用“艘”，桥用“座”或“孔”，旗用“面”）；用配对游戏练习，并纠正什么都用“个”的错误。',
          },
        ],
        practice: [
          {
            generatorId: 'yw2.words',
            minDifficulty: 1,
            maxDifficulty: 5,
            variant: 'u2.scene-song',
          },
          {
            generatorId: 'yw2.words',
            variant: 'u2.scene-song#stretch',
            tier: 'stretch',
            minDifficulty: 3,
            maxDifficulty: 5,
          },
          {
            generatorId: 'yw2.words',
            variant: 'u2.scene-song#creative',
            tier: 'creative',
            minDifficulty: 3,
            maxDifficulty: 5,
          },
        ],
      },
      {
        slug: 'tree-song',
        title: '树之歌',
        objectives: [
          '认识杨树、榕树、梧桐、枫树、松柏、木棉等树',
          '知道带木字旁的字大多和树木有关',
          '能说出一两种树的特点',
        ],
        keyPoints: [
          '重点：认识木字旁，木字旁的捺要变成点',
          '难点：记住不同树的特点（榕树壮、梧桐叶像手掌、木棉喜暖）',
          '常见错误：木字旁最后一笔写成捺；“柏”在“松柏”里读 bǎi',
        ],
        prerequisites: [],
        localContexts: ['深圳街头的大榕树', '春天开红花的木棉（深圳常见行道树）', '仙湖植物园'],
        lecture: {
          title: '树之歌',
          minutes: 10,
          focus:
            '以“深圳街头认树”情境导入，引用课文前两句认识杨树、榕树、梧桐；再讲枫树、松柏、木棉、桦树、银杏、水杉、桂花的特点；识字重点讲木字旁（在左边时捺变点）和“杨、桐、枫、松、柏”等字；联系深圳常见的榕树和木棉。',
        },
        techniques: [
          {
            slug: 'wood-radical',
            title: '木字旁：看偏旁猜字义',
            minutes: 4,
            focus:
              '教“看偏旁猜字义”的识字方法：带木字旁的字大多和树木、木头有关（杨、松、柏、桐、桌、椅）；示范用“加一加”（木+公=松，木+白=柏）识字；提醒木字旁在左边时第四笔写点不写捺。',
          },
        ],
        practice: [
          { generatorId: 'yw2.words', minDifficulty: 1, maxDifficulty: 5, variant: 'u2.tree-song' },
          {
            generatorId: 'yw2.words',
            variant: 'u2.tree-song#stretch',
            tier: 'stretch',
            minDifficulty: 3,
            maxDifficulty: 5,
          },
          {
            generatorId: 'yw2.words',
            variant: 'u2.tree-song#creative',
            tier: 'creative',
            minDifficulty: 3,
            maxDifficulty: 5,
          },
        ],
      },
      {
        slug: 'clap-song',
        title: '拍手歌',
        objectives: [
          '能拍着手有节奏地读儿歌',
          '认识孔雀、锦鸡、雄鹰、大雁、猛虎、黄鹂、百灵、熊猫等动物',
          '懂得保护动物，人和动物是朋友',
        ],
        keyPoints: [
          '重点：带“鸟”的字（鸡、鹂、鹰）多与鸟有关',
          '难点：“雁群会写字”的意思（大雁排成“人”字形或“一”字形飞）',
          '常见错误：“鹰”的鸟在下面，“鸡”“鹂”的鸟在右边，位置记混；“锦”读 jǐn',
        ],
        prerequisites: [],
        localContexts: ['深圳野生动物园', '福田红树林的候鸟'],
        lecture: {
          title: '拍手歌',
          minutes: 10,
          focus:
            '用拍手游戏导入，只引用首句“你拍一，我拍一，动物世界很新奇”；按儿歌认识孔雀、锦鸡、雄鹰、大雁、猛虎、黄鹂、百灵、熊猫等动物，讲“雁群会写字”；识字讲“鸟”在右边（鸡、鹂）和在下面（鹰）的不同位置；最后说说保护动物，联系红树林候鸟。',
        },
        practice: [
          { generatorId: 'yw2.words', minDifficulty: 1, maxDifficulty: 5, variant: 'u2.clap-song' },
          {
            generatorId: 'yw2.words',
            variant: 'u2.clap-song#stretch',
            tier: 'stretch',
            minDifficulty: 3,
            maxDifficulty: 5,
          },
          {
            generatorId: 'yw2.words',
            variant: 'u2.clap-song#creative',
            tier: 'creative',
            minDifficulty: 3,
            maxDifficulty: 5,
          },
        ],
      },
      {
        slug: 'farm-seasons',
        title: '田家四季歌',
        objectives: [
          '知道农家春、夏、秋、冬各有什么景物和农事',
          '能读出儿歌的节奏和押韵',
          '体会农民的辛苦和丰收的喜悦',
        ],
        keyPoints: [
          '重点：四季农事——春天麦苗嫩、桑叶肥，夏天采桑插秧，秋天收稻谷，冬天做棉衣',
          '难点：理解“农事”“插秧”“稻上场”等词语',
          '常见错误：“季”写成“李”；“事”的最后一笔竖钩写成竖',
        ],
        prerequisites: [],
        localContexts: ['超市里的大米和棉被', '深圳周边的农场采摘'],
        lecture: {
          title: '田家四季歌',
          minutes: 10,
          focus:
            '以“一年四季农民伯伯在忙什么”导入，引用春季和秋季两句关键句；用表格梳理四季的景物和农事（春：花草蝴蝶、麦苗桑叶；夏：采桑插秧；秋：稻谷丰收；冬：新棉衣、农事了）；识字讲“季、吹、农、事、忙”等字；联系我们吃的米饭来自农民的辛苦劳动。',
        },
        practice: [
          {
            generatorId: 'yw2.words',
            minDifficulty: 1,
            maxDifficulty: 5,
            variant: 'u2.farm-seasons',
          },
          {
            generatorId: 'yw2.words',
            variant: 'u2.farm-seasons#stretch',
            tier: 'stretch',
            minDifficulty: 3,
            maxDifficulty: 5,
          },
          {
            generatorId: 'yw2.words',
            variant: 'u2.farm-seasons#creative',
            tier: 'creative',
            minDifficulty: 3,
            maxDifficulty: 5,
          },
        ],
      },
    ]),
    // ------------------------------------------------------------------ 三
    unit(B, 3, '阅读：彩虹、外婆家和星空', [
      {
        slug: 'rainbow',
        title: '彩虹',
        objectives: [
          '会认会写“彩、虹”，知道“彩”和颜色有关、“虹”是虫字旁',
          '知道彩虹常在雨过天晴时出现，能按顺序说出彩虹的七种颜色',
          '能用“像……”说说彩虹的样子，说说看到彩虹时的心情',
        ],
        keyPoints: [
          '重点：“彩”是“采”加三撇，“虹”是虫字旁加“工”；彩虹颜色从外到里是红橙黄绿青蓝紫',
          '难点：用“像……”打比方（彩虹像一座弯弯的桥）',
          '常见错误：“彩”漏掉三撇写成“采”；“虹”写成“红”；量词说成“一头彩虹”（应为“一道彩虹”）',
        ],
        prerequisites: ['yw-g2a.u1.what-am-i'],
        localContexts: ['深圳夏天雷阵雨过后的彩虹', '在阳台上用喷壶对着太阳“造彩虹”'],
        lecture: {
          title: '彩虹',
          minutes: 10,
          focus:
            '用雨后彩虹的照片导入，讲“彩虹”两个字的字形（采+彡、虫字旁）和“一道彩虹”；说明彩虹常在雨过天晴、背对太阳时出现，按“红橙黄绿青蓝紫”记七种颜色；再用“彩虹像……”练习打比方，联系深圳雷阵雨后的天空。本课是新版课文，原文未核实，不引用课文原句，只讲题目相关的字词和想象表达。',
        },
        practice: words('u3.rainbow'),
      },
      {
        slug: 'grandma-house',
        title: '去外婆家',
        objectives: [
          '会认会写“外、婆”等字，能分清外婆、奶奶、外公、爷爷等称呼',
          '能按“先……再……最后……”的顺序说说去外婆家的路上',
          '见到长辈会有礼貌地问好，体会亲人之间的爱',
        ],
        keyPoints: [
          '重点：亲人称呼——妈妈的妈妈是外婆（姥姥），爸爸的妈妈是奶奶',
          '难点：按顺序把一件事说清楚，用上“先、再、最后”',
          '常见错误：外婆和奶奶、舅舅和叔叔分不清；“婆”下面的“女”写成“子”',
        ],
        prerequisites: [],
        localContexts: ['周末坐地铁或高铁去外婆家', '外婆家门口的大榕树'],
        lecture: {
          title: '去外婆家',
          minutes: 9,
          focus:
            '以“周末去外婆家”情境导入，讲“外、婆”的字形（婆：上面“波”下面“女”）；用家庭关系图分清外婆、外公、奶奶、爷爷、舅舅、姑姑等称呼；再示范按“先……再……最后……”讲去外婆家的路上看到了什么，最后讲见到长辈怎样有礼貌地问好。本课是新版课文，原文未核实，不引用课文原句。',
        },
        practice: words('u3.grandma-house'),
      },
      {
        slug: 'star-counter',
        title: '数星星的孩子',
        objectives: [
          '知道张衡小时候爱数星星、爱观察，长大成了天文学家',
          '认识北斗七星，知道北斗七星像一把勺子、围着北极星转',
          '读准“数（shǔ）星星”，认识“珍珠、仰、颗、研究”等字词',
        ],
        keyPoints: [
          '重点：张衡一晚上一晚上地仔细观察，发现星星在动，可不是乱动',
          '难点：理解把星星比作珍珠的比喻；“数”在“数星星”里读 shǔ，在“数学”里读 shù',
          '常见错误：“一颗星星”写成“一棵星星”；“数星星”读成 shù',
        ],
        prerequisites: [],
        localContexts: ['在深圳湾公园看夜空', '暑假去郊外露营看星星'],
        lecture: {
          title: '数星星的孩子',
          minutes: 10,
          focus:
            '以夏夜数星星的情境导入，讲张衡小时候坐在院子里一颗一颗数星星、被说“傻孩子”也不放弃、仔细观察后发现北斗七星围着北极星转的故事，长大成了我国古代的天文学家；识字讲“数（shǔ）、珍珠、仰、颗（和“棵”比较）、研究”；最后学习张衡爱观察、爱动脑筋。按 2017 版同名课文的内容要点讲，不整句引用原文。',
        },
        techniques: [
          {
            slug: 'ke-ke',
            title: '颗和棵：看偏旁选量词',
            minutes: 4,
            focus:
              '教分清“颗”和“棵”：“棵”是木字旁，用在树、草这些植物上（一棵树）；“颗”右边是页，用在小而圆的东西上（一颗星星、一颗珍珠、一颗牙齿）；用配对小游戏练习，再用句子检验。',
          },
        ],
        practice: words('u3.star-counter'),
      },
      {
        slug: 'garden-3',
        title: '语文园地三',
        objectives: [
          '复习本单元的字词：多音字、形近字、量词、近义词和反义词',
          '会用对句末的句号、问号和感叹号，分清“的、地、得”',
          '会用“像……”打比方，用 ABB、AABB 这样的词把句子说生动',
        ],
        keyPoints: [
          '重点：“的”接事物、“地”接动作、“得”接怎么样；问句用问号，感叹用感叹号',
          '难点：同一个字在不同词语里读音不同（看门的看读 kān，背书包的背读 bēi）',
          '常见错误：“慈祥的笑了”这样的地、的混用；问句末尾用了句号',
        ],
        prerequisites: ['yw-g2a.u3.star-counter'],
        localContexts: ['给外婆写一张小卡片', '晚上在阳台看星星'],
        lecture: {
          title: '语文园地三',
          minutes: 9,
          focus:
            '用本单元的彩虹、外婆家、星空串起复习：多音字（数、看、背）、颗和棵、的地得、句末标点、ABB 和 AABB 式词语、用“像”打比方；每一项先举本单元的例子，再让孩子用到自己的生活里。园地的具体栏目未核实，只讲通用的字词句运用。',
        },
        practice: words('u3.garden-3'),
      },
    ]),
    // ------------------------------------------------------------------ 四
    unit(B, 4, '阅读：祖国山河', [
      {
        slug: 'poems',
        title: '古诗二首：登鹳雀楼 望庐山瀑布',
        objectives: [
          '能正确、有节奏地朗读并背诵《登鹳雀楼》《望庐山瀑布》',
          '知道两首诗的作者是王之涣和李白，能说出诗句的大意',
          '懂得“欲穷千里目，更上一层楼”的道理',
        ],
        keyPoints: [
          '重点：字义——尽（完了）、欲（想要）、穷（到尽头）、遥（远远地）、川（河流）、疑（好像）',
          '难点：体会“飞流直下三千尺”的夸张和“疑是银河落九天”的想象',
          '常见错误：“鹳”读成 quàn，“瀑”读成 bù；“更上一层楼”的“更”读成 gēng',
        ],
        prerequisites: [],
        localContexts: ['登上梧桐山顶看深圳', '深圳湾的日落'],
        lecture: {
          title: '古诗二首',
          minutes: 11,
          focus:
            '先读《登鹳雀楼》（王之涣）：白日依山尽，黄河入海流；欲穷千里目，更上一层楼。讲“尽、欲、穷、更”的意思和“站得高看得远”的道理。再读《望庐山瀑布》（李白）：日照香炉生紫烟，遥看瀑布挂前川；飞流直下三千尺，疑是银河落九天。讲“香炉（香炉峰）、遥、川、疑”，体会瀑布的高和急。最后比较五言诗和七言诗，练习有节奏地背诵。',
        },
        techniques: [
          {
            slug: 'poem-picture',
            title: '读古诗，想画面',
            minutes: 4,
            focus:
              '教“一句诗一幅画”的方法：先找诗里的景物（白日、山、黄河、大海；香炉峰、紫烟、瀑布、银河），再想它们在哪里、在做什么，把每句诗说成一句大白话，最后闭上眼睛把画面连起来背诵。',
          },
        ],
        practice: words('u4.poems'),
      },
      {
        slug: 'huangshan',
        title: '黄山奇石',
        objectives: [
          '知道黄山在安徽省，那里的石头奇形怪状、有趣极了',
          '能说出仙桃石、猴子观海、仙人指路、金鸡叫天都等奇石的样子',
          '能展开想象，给一块石头起名字并说说它像什么',
        ],
        keyPoints: [
          '重点：奇石的名字来自它们的样子（像桃子、像猴子、像仙人、像金鸡）',
          '难点：用“像……”“好像……”把石头的样子说具体',
          '常见错误：“奇”写成“骑”；“臂”（手臂）的“月”写成“目”',
        ],
        prerequisites: [],
        localContexts: ['深圳梧桐山上的大石头', '大鹏半岛海边的礁石'],
        lecture: {
          title: '黄山奇石',
          minutes: 10,
          focus:
            '以“石头会变魔术”导入，介绍黄山在我国安徽省南部，风景秀丽神奇，尤其是奇石；逐一看仙桃石、猴子观海、仙人指路、金鸡叫天都，说说名字和样子的关系，知道还有很多没名字的石头等人去想象；识字讲“奇、秀、巨、臂”；最后看一块深圳梧桐山的石头，练习起名字、说样子。按 2017 版同名课文的内容要点讲，不整句引用原文。',
        },
        techniques: [
          {
            slug: 'imagine-shape',
            title: '看样子，起名字',
            minutes: 4,
            focus:
              '教“看样子—想像什么—起个名—说一句”的想象方法：先看石头或云朵的形状，想它像什么动物或人，再用“谁+在做什么”起名字（如“猴子观海”），最后用“这块石头像……”说一句完整的话。',
          },
        ],
        practice: words('u4.huangshan'),
      },
      {
        slug: 'sun-moon-lake',
        title: '日月潭',
        objectives: [
          '知道日月潭在我国台湾，名字来自湖的形状：一边像太阳，一边像月亮',
          '能说出日月潭在不同时候、不同天气的美',
          '认识“潭、湾、岛、雾、纱”等字词',
        ],
        keyPoints: [
          '重点：“日潭”像圆圆的太阳，“月潭”像弯弯的月亮',
          '难点：理解“隐隐约约”“蒙蒙细雨”这样描写景色的词语',
          '常见错误：“岛”写成“鸟”；“台湾”的“湾”写成“弯”',
        ],
        prerequisites: [],
        localContexts: ['深圳水库和东湖公园', '清晨深圳湾的薄雾'],
        lecture: {
          title: '日月潭',
          minutes: 10,
          focus:
            '以“一个湖为什么叫日月潭”导入，介绍日月潭在我国台湾，是台湾有名的大湖，湖中有小岛，一边像圆圆的太阳，一边像弯弯的月亮；再讲清晨有薄雾、中午阳光明亮、下蒙蒙细雨时像披上轻纱的不同美景；识字讲“潭、湾、岛、雾、纱”（岛和鸟、湾和弯的区别）。按 2017 版同名课文的内容要点讲，不整句引用原文。',
        },
        practice: words('u4.sun-moon-lake'),
      },
      {
        slug: 'grape-valley',
        title: '葡萄沟',
        objectives: [
          '知道葡萄沟在新疆吐鲁番，那里的葡萄五光十色、又多又甜',
          '知道葡萄干是在通风的晾房里晾干的，颜色鲜、味道甜',
          '认识“葡萄、沟、坡、梨、摘”等字词，读准“热情好客”的“好”（hào）',
        ],
        keyPoints: [
          '重点：葡萄沟是个好地方——水果多、葡萄美、葡萄干有名、老乡热情好客',
          '难点：理解“五光十色”“热情好客”等词语',
          '常见错误：“好客”的“好”读成 hǎo；“葡萄干”的“干”读成 gàn',
        ],
        prerequisites: [],
        localContexts: ['超市里的新疆葡萄干', '深圳六月的荔枝'],
        lecture: {
          title: '葡萄沟',
          minutes: 10,
          focus:
            '以一把葡萄干导入，介绍新疆吐鲁番的葡萄沟：葡萄种在山坡上，枝叶茂密像凉棚，成熟时一串串挂着，颜色五光十色；葡萄干在通风的晾房里晾干，颜色鲜、味道甜；老乡热情好客。识字讲“葡萄（草字头）、沟、坡、摘”，多音字讲“好客（hào）”“葡萄干（gān）”；联系深圳的荔枝说说家乡的水果。按 2017 版同名课文的内容要点讲，不整句引用原文。',
        },
        practice: words('u4.grape-valley'),
      },
      {
        slug: 'garden-4',
        title: '语文园地四',
        objectives: [
          '复习本单元的字词：四字词语、偏旁（三点水、山字旁）、量词和多音字',
          '会用“的、地、得”和句末标点把写景的句子写通顺',
          '能用学到的好词介绍一处自己去过的风景',
        ],
        keyPoints: [
          '重点：会用“五光十色、闻名中外、奇形怪状”这样的四字词语',
          '难点：介绍风景时说清楚在哪里、有什么、美在哪里',
          '常见错误：“山峰”写成“山蜂”；“流得很急”写成“流的很急”',
        ],
        prerequisites: ['yw-g2a.u4.grape-valley'],
        localContexts: ['向外地的小朋友介绍深圳湾公园', '大鹏半岛的海边'],
        lecture: {
          title: '语文园地四',
          minutes: 9,
          focus:
            '用本单元的古诗、黄山、日月潭、葡萄沟串起复习：四字词语的意思和用法、带三点水和山的字、峰和蜂、的地得、量词和多音字（更、都、好、倒）；最后示范用“在哪里—有什么—美在哪里”介绍一处深圳的风景。园地的具体栏目未核实，只讲通用的字词句运用。',
        },
        practice: words('u4.garden-4'),
      },
    ]),
  ],
};
