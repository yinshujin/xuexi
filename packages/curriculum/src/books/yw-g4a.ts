import type { Book, PracticeSpec } from '../types';
import { unit } from './helpers';

const B = 'yw-g4a';

/**
 * 题库练习：常规题（yw4.words）+ 可选多音字（yw4.polyphone）+ 可选看拼音写词语（yw4.dictation）+ 拔高 / 创新题。
 * `v` 是知识点 id 去掉 "yw-g4a."，如 'u3.ivy'。
 */
/** 看拼音写词语：本课词语听写表里的词（yw-g4a-words.ts）。 */
function dictation(v: string): PracticeSpec {
  return { generatorId: 'yw4.dictation', variant: v, minDifficulty: 1, maxDifficulty: 5, label: '看拼音写词语' };
}

function bank(v: string, opts: { polyphone?: boolean; dictation?: boolean } = {}): PracticeSpec[] {
  return [
    { generatorId: 'yw4.words', minDifficulty: 1, maxDifficulty: 5, variant: v },
    ...(opts.polyphone
      ? [{ generatorId: 'yw4.polyphone', minDifficulty: 1, maxDifficulty: 5, variant: v, label: '多音字' } as PracticeSpec]
      : []),
    ...(opts.dictation ? [dictation(v)] : []),
    { generatorId: 'yw4.words', variant: `${v}#stretch`, tier: 'stretch', minDifficulty: 3, maxDifficulty: 5 },
    { generatorId: 'yw4.words', variant: `${v}#creative`, tier: 'creative', minDifficulty: 3, maxDifficulty: 5 },
  ];
}

/**
 * 统编版 语文 四年级上册（2026 秋新版），全部八个单元。
 *
 * 目录已按家长拍摄的实体课本目录页核对（2026-09）；课文正文未逐字核对，
 * 题库和讲解只引用古诗、文言文原文和广为人知的情节、常识，不整段引用现代文课文。
 */
export const ywG4a: Book = {
  id: B,
  subject: 'chinese',
  edition: '统编版',
  revision: '2026修订',
  grade: 4,
  term: '上',
  title: '语文 四年级上册（统编版 2026 秋新版）',
  sourceNote: [
    '本册按 2026 年秋季起使用的统编版（2022 课标修订）四年级上册编码，含全部八个单元。',
    '目录依据：家长拍摄的实体课本目录页（2026-09），已逐课核对：',
    '第一单元 1 观潮、2 繁星、3* 现代诗二首（秋晚的江上、花牛歌）、口语交际 我们与环境、习作 推荐一个好地方；',
    '第二单元（阅读策略单元：提问）4 一个豆荚里的五粒豆、5 夜间飞行的秘密、6 方帽子店、7* 田忌赛马、习作 我的家人；',
    '第三单元 8 古诗三首（暮江吟、题西林壁、雪梅）、9 爬山虎的脚、10 蟋蟀的住宅、口语交际 爱护眼睛，保护视力、习作 写观察日记；',
    '第四单元 11 盘古开天地、12 精卫填海、13 普罗米修斯、14* 女娲补天、习作 我和___过一天、快乐读书吧 很久很久以前；',
    '第五单元（习作单元）15 麻雀、16 爬天都峰、习作 生活万花筒、习作例文 我家的杏熟了、小木船；',
    '第六单元 17 长城、18 颐和园、19* 秦兵马俑、口语交际 我是小小讲解员、习作 中国的世界文化遗产；',
    '第七单元 20 牛和鹅、21 一只窝囊的大老虎、22* 陀螺、23 王戎不取道旁李、口语交际 安慰、习作 我的心儿怦怦跳；',
    '第八单元 24 我将无我，不负人民、25 为中华之崛起而读书、26* 延安，我把你追寻、27 古诗三首（凉州词、出塞、夏日绝句）、习作 写信。（标*的是略读课文，各单元另有语文园地，未单独编码。）',
    '单元主题（第三单元起）为网络检索摘要，与目录一致：连续观察、中外神话、把一件事写清楚、中国文化、童年成长、家国情怀。',
    '【课文核对（2026-09）】题库与讲解已对照网上可查到的课文原文（古文之家 cngwzj.com 拼音版课文、智慧山、语文朗读宝等）核对：观潮、繁星、现代诗二首、一个豆荚里的五粒豆、夜间飞行的秘密、方帽子店、田忌赛马（门客孙膑，一场比赛先输后赢）、爬山虎的脚、蟋蟀的住宅、盘古开天地、普罗米修斯、女娲补天、麻雀、爬天都峰、两篇习作例文、牛和鹅、一只窝囊的大老虎、陀螺、为中华之崛起而读书、延安我把你追寻；长城、颐和园、秦兵马俑只找到旧人教版课文，“我将无我，不负人民”只找到外交部等关于 2019 年会见的报道，新版正文未见，相关题目只用事实和情节；古诗、文言文按通行原文。',
  ].join(''),
  units: [
    // ------------------------------------------------------------------ 一
    unit(B, 1, '自然之美', [
      {
        slug: 'tide',
        title: '观潮',
        objectives: [
          '知道钱塘江大潮为什么被称为“天下奇观”',
          '能按“潮来前、潮来时、潮头过后”的顺序说出大潮的样子',
          '找出写大潮声音和样子的词句，边读边想象画面',
        ],
        keyPoints: [
          '重点：按时间顺序写景；抓住“声音”和“形状”两条线体会大潮的变化',
          '难点：从“闷雷滚动”到“山崩地裂”，体会声音由远到近、由小到大',
          '常见错误：把观潮的时间、地点记错（农历八月十八，海宁盐官镇）',
        ],
        prerequisites: [],
        localContexts: ['深圳湾、大梅沙的海浪和涨潮'],
        lecture: {
          title: '观潮：天下奇观钱塘江大潮',
          minutes: 10,
          focus:
            '介绍钱塘江大潮与观潮的时间地点（农历八月十八，海宁盐官镇），带孩子按“潮来前—潮来时—潮头过后”梳理课文顺序，重点讲潮来时：声音从闷雷滚动到山崩地裂，样子从一条白线到一堵两丈多高的水墙、千万匹白色战马，体会作者按顺序、抓声音和样子写出大潮的雄伟。只引用个别关键句，不整段抄录课文。',
        },
        techniques: [
          {
            slug: 'scene-order',
            title: '写景顺序：按时间先后理一理',
            minutes: 4,
            focus:
              '教孩子找时间顺序的“路标词”（午后一点左右、过了一会儿、霎时、潮头过后），把课文分成潮来前、潮来时、潮头过后三段，并说出每段写了什么；再用同样方法说一说一次看日落或看海的经过。',
          },
        ],
        practice: [{ generatorId: 'yw4.words', minDifficulty: 1, maxDifficulty: 5, variant: 'u1.tide' }, { generatorId: 'yw4.polyphone', minDifficulty: 1, maxDifficulty: 5, variant: 'u1.tide', label: '多音字' }, dictation('u1.tide'), { generatorId: 'yw4.words', variant: 'u1.tide#stretch', tier: 'stretch', minDifficulty: 3, maxDifficulty: 5 }, { generatorId: 'yw4.words', variant: 'u1.tide#creative', tier: 'creative', minDifficulty: 3, maxDifficulty: 5 }],
      },
      {
        slug: 'stars',
        title: '繁星',
        objectives: [
          '说出作者在三个不同的时间和地点看星星',
          '找出作者看星星时的感受，体会他对星天的喜爱',
          '学着说一说自己看夜空时想到的画面',
        ],
        keyPoints: [
          '重点：按“从前在家乡—三年前在南京—如今在海上”理清三次看星星',
          '难点：体会“仿佛回到母亲的怀里”等句子中作者的感受',
          '常见错误：以为三次看星星是在同一个地方；把作者记成别人（本文作者巴金）',
        ],
        prerequisites: ['yw-g4a.u1.tide'],
        localContexts: ['在深圳梧桐山或东西涌露营时看星星'],
        lecture: {
          title: '繁星：三次看星星',
          minutes: 10,
          focus:
            '《繁星》是巴金写的散文，新版中是精读课文。带孩子找出三次看星星的时间和地点（家乡庭院纳凉、南京住处的后门、海上的船上），对比每次看到的景象和心情，体会作者由看星星展开的想象和对星天的喜爱。可引用开头“我爱月夜，但我也爱星天。”，不整段抄录课文。',
        },
        techniques: [],
        practice: [{ generatorId: 'yw4.words', minDifficulty: 1, maxDifficulty: 5, variant: 'u1.stars' }, { generatorId: 'yw4.polyphone', minDifficulty: 1, maxDifficulty: 5, variant: 'u1.stars', label: '多音字' }, dictation('u1.stars'), { generatorId: 'yw4.words', variant: 'u1.stars#stretch', tier: 'stretch', minDifficulty: 3, maxDifficulty: 5 }, { generatorId: 'yw4.words', variant: 'u1.stars#creative', tier: 'creative', minDifficulty: 3, maxDifficulty: 5 }],
      },
      {
        slug: 'modern-poems',
        title: '现代诗二首（秋晚的江上 · 花牛歌）',
        objectives: [
          '有感情地朗读两首现代诗，感受诗的节奏',
          '说出每首诗描绘的画面',
          '体会诗人把鸟儿、芦苇、花牛写得像人一样的有趣写法',
        ],
        keyPoints: [
          '重点：边读边想象画面，说出诗句中的景物和颜色变化',
          '难点：理解“驮着斜阳”“把斜阳掉在江上”“头白的芦苇”这些新奇的说法',
          '常见错误：把两首诗的作者弄混（《秋晚的江上》刘大白，《花牛歌》徐志摩）',
        ],
        prerequisites: [],
        lecture: {
          title: '现代诗二首：读诗句，想画面',
          minutes: 10,
          focus:
            '先讲现代诗和古诗的不同（不讲究字数整齐、押韵自由、分行分节），再分别读《秋晚的江上》（刘大白）和《花牛歌》（徐志摩）：前者抓鸟儿驮斜阳、斜阳掉江上、芦苇变红颜的画面变化；后者抓花牛坐、眠、走、做梦四个小节的有趣画面与反复句式。引导孩子边读边想象，说出自己看到的画面。',
        },
        techniques: [
          {
            slug: 'imagine-picture',
            title: '想象画面：读一句，画一幅',
            minutes: 4,
            focus:
              '教“想象画面”三步：圈出诗句里的景物，找出颜色和动作，再用“我好像看到了……”说出一幅完整的画面。以“双翅一翻，把斜阳掉在江上”为例演示，再让孩子练习一句。',
          },
        ],
        practice: [{ generatorId: 'yw4.words', minDifficulty: 1, maxDifficulty: 5, variant: 'u1.modern-poems' }, { generatorId: 'yw4.polyphone', minDifficulty: 1, maxDifficulty: 5, variant: 'u1.modern-poems', label: '多音字' }, { generatorId: 'yw4.words', variant: 'u1.modern-poems#stretch', tier: 'stretch', minDifficulty: 3, maxDifficulty: 5 }, { generatorId: 'yw4.words', variant: 'u1.modern-poems#creative', tier: 'creative', minDifficulty: 3, maxDifficulty: 5 }],
      },
      {
        slug: 'environment',
        title: '口语交际：我们与环境',
        objectives: [
          '说出身边的一个环境问题，并说清楚自己的看法和理由',
          '认真听别人发言，能记下要点，有不同意见礼貌地提出',
          '想出自己能做到的保护环境的小办法',
        ],
        keyPoints: [
          '重点：先说观点，再用“因为……”说理由，最好举一个身边的例子',
          '难点：理由要实在，办法要具体、自己做得到',
          '常见错误：只喊口号（“我们要保护环境”），说不出具体的问题和办法；别人说话时插嘴',
        ],
        prerequisites: [],
        localContexts: ['深圳垃圾分类：可回收物、厨余垃圾、有害垃圾、其他垃圾', '深圳湾公园的红树林和候鸟', '小区里的共享单车乱停'],
        lecture: {
          title: '口语交际：我们与环境',
          minutes: 9,
          focus:
            '教孩子围绕身边的环境问题（乱扔垃圾、浪费水电、一次性塑料袋、垃圾没分类）进行交流：先说清“我发现了什么问题”，再说“我的看法和理由”，最后说“我们可以怎么做”。结合深圳垃圾分类的四类垃圾举例，练习认真倾听、记要点、礼貌地补充或提出不同意见，避免只喊口号。',
        },
        techniques: [],
        practice: bank('u1.environment'),
      },
      {
        slug: 'recommend-place',
        title: '习作：推荐一个好地方',
        objectives: [
          '选一个自己熟悉又喜欢的地方',
          '把推荐理由写清楚，分几点说',
          '用上具体的景物、活动，让别人也想去',
        ],
        keyPoints: [
          '重点：写清楚“这是什么地方、在哪里、有什么特别、为什么推荐”',
          '难点：理由要具体，不能只写“好玩”“漂亮”',
          '常见错误：写成流水账，从出门写到回家，推荐理由反而没写清楚',
        ],
        prerequisites: ['yw-g4a.u1.tide'],
        localContexts: ['深圳湾公园', '莲花山公园', '深圳图书馆'],
        lecture: {
          title: '习作：推荐一个好地方',
          minutes: 10,
          focus:
            '教孩子写推荐文：先选地方（公园、图书馆、小吃街、自己的小书桌都可以），再用“地方—特点—理由”列提纲，每条理由配一个具体的景物或活动来说明，结尾发出邀请。以深圳湾公园为例示范如何把“好玩”写具体，并提醒不要写成流水账。',
        },
        techniques: [],
        practice: [{ generatorId: 'yw4.words', minDifficulty: 1, maxDifficulty: 5, variant: 'u1.recommend-place' }, { generatorId: 'yw4.polyphone', minDifficulty: 1, maxDifficulty: 5, variant: 'u1.recommend-place', label: '多音字' }, { generatorId: 'yw4.words', variant: 'u1.recommend-place#stretch', tier: 'stretch', minDifficulty: 3, maxDifficulty: 5 }, { generatorId: 'yw4.words', variant: 'u1.recommend-place#creative', tier: 'creative', minDifficulty: 3, maxDifficulty: 5 }],
      },
      {
        slug: 'garden',
        title: '语文园地一：描写声音的词语',
        objectives: [
          '积累描写声音的四字词语，会读会写',
          '分清哪些词写声音大、热闹，哪些词写安静',
          '能把这些词语用在句子里，把声音写生动',
        ],
        keyPoints: [
          '重点：人声鼎沸、锣鼓喧天、震耳欲聋、响彻云霄写声音大；低声细语、窃窃私语、鸦雀无声、悄无声息写声音小或安静',
          '难点：根据场合选对词语，不说“夜深了锣鼓喧天”这样不合情理的话',
          '常见错误：把“窃窃私语”当成大声说话；“霄”写成“宵”',
        ],
        prerequisites: ['yw-g4a.u1.tide'],
        lecture: {
          title: '语文园地一：描写声音的词语',
          minutes: 8,
          focus:
            '讲语文园地一“词句段运用”中描写声音的八个四字词语：先按“热闹—安静”分成两组，逐个讲读音和意思（鼎是古代的锅，人声鼎沸像锅里的水烧开了；鸦雀无声是连乌鸦麻雀的声音都没有），再结合观潮、考试、图书馆等情境练习选词，最后学着用对比把声音的变化写出来。',
        },
        techniques: [],
        practice: bank('u1.garden', { dictation: true }),
      },
    ]),
    // ------------------------------------------------------------------ 二
    unit(B, 2, '阅读方法：提问', [
      {
        slug: 'peas',
        title: '一个豆荚里的五粒豆',
        objectives: [
          '读懂五粒豆各自的经历，尤其是最后一粒豆',
          '敢于提出问题，把问题写成问题清单',
          '知道可以针对课文的一部分提问，也可以针对全文提问',
        ],
        keyPoints: [
          '重点：边读边提问，把问题写下来，不怕问题“简单”',
          '难点：分清哪些问题是针对局部的，哪些是针对全文的',
          '常见错误：只会提“是什么”的问题；只读不问',
        ],
        prerequisites: [],
        lecture: {
          title: '一个豆荚里的五粒豆：我也会提问',
          minutes: 10,
          focus:
            '讲安徒生童话《一个豆荚里的五粒豆》：五粒豆飞出豆荚后的不同经历，重点是最后一粒落在顶楼窗下的裂缝里、在青苔中发芽开花，给生病的小女孩带来希望，小女孩慢慢好起来。以此为例教提问策略的第一步：边读边把想到的问题记下来，列成问题清单，并分出针对部分内容和针对全文的问题。',
        },
        techniques: [],
        practice: [{ generatorId: 'yw4.words', minDifficulty: 1, maxDifficulty: 5, variant: 'u2.peas' }, { generatorId: 'yw4.polyphone', minDifficulty: 1, maxDifficulty: 5, variant: 'u2.peas', label: '多音字' }, dictation('u2.peas'), { generatorId: 'yw4.words', variant: 'u2.peas#stretch', tier: 'stretch', minDifficulty: 3, maxDifficulty: 5 }, { generatorId: 'yw4.words', variant: 'u2.peas#creative', tier: 'creative', minDifficulty: 3, maxDifficulty: 5 }],
      },
      {
        slug: 'night-flight',
        title: '夜间飞行的秘密',
        objectives: [
          '说出科学家做的三次实验和得出的结论',
          '知道飞机上雷达的工作原理和蝙蝠探路类似',
          '学会从内容、写法、启示等不同角度提问',
        ],
        keyPoints: [
          '重点：三次实验——蒙眼睛不撞铃铛，塞耳朵、封嘴巴就乱撞',
          '难点：理解蝙蝠用嘴发出超声波、用耳朵接收回声来探路，雷达的原理与此相似',
          '常见错误：以为蝙蝠靠眼睛在夜里飞行',
        ],
        prerequisites: ['yw-g4a.u2.peas'],
        lecture: {
          title: '夜间飞行的秘密：蝙蝠和雷达',
          minutes: 10,
          focus:
            '讲科学家怎样用拉满绳子、系着铃铛的屋子做三次实验：蒙住蝙蝠眼睛照样飞，塞住耳朵或封住嘴就到处乱撞，由此发现蝙蝠靠嘴和耳朵配合、用超声波探路；现代飞机上的雷达工作原理与蝙蝠探路类似，让飞机夜里也能安全飞行。以此教提问策略第二步：从内容、写法、得到的启示等不同角度提问。',
        },
        techniques: [
          {
            slug: 'question-angles',
            title: '换个角度提问题',
            minutes: 4,
            focus:
              '教孩子从三个角度提问：针对内容（为什么蒙上眼睛铃铛不响）、针对写法（作者为什么把三次实验一次一次写清楚）、联系生活得到启示（生活里还有哪些东西学了动物本领）。每个角度举一个例子，再让孩子分类。',
          },
        ],
        practice: [{ generatorId: 'yw4.words', minDifficulty: 1, maxDifficulty: 5, variant: 'u2.night-flight' }, { generatorId: 'yw4.polyphone', minDifficulty: 1, maxDifficulty: 5, variant: 'u2.night-flight', label: '多音字' }, dictation('u2.night-flight'), { generatorId: 'yw4.words', variant: 'u2.night-flight#stretch', tier: 'stretch', minDifficulty: 3, maxDifficulty: 5 }, { generatorId: 'yw4.words', variant: 'u2.night-flight#creative', tier: 'creative', minDifficulty: 3, maxDifficulty: 5 }],
      },
      {
        slug: 'square-hats',
        title: '方帽子店',
        objectives: [
          '说出方帽子店的故事：为什么方帽子后来卖不出去了',
          '体会“不能一成不变，要敢于改变和创新”的道理',
          '尝试从不同角度提问，并挑出对理解课文最有帮助的问题',
        ],
        keyPoints: [
          '重点：按起因、经过、结果讲清故事',
          '难点：理解方帽子最后成了“古董”说明了什么',
          '常见错误：只记住“帽子是方的”，说不出故事告诉我们的道理',
        ],
        prerequisites: ['yw-g4a.u2.night-flight'],
        lecture: {
          title: '方帽子店：帽子一定是方的吗',
          minutes: 9,
          focus:
            '讲施雁冰的童话《方帽子店》：老店只做方帽子，大家也只戴方帽子，可方帽子戴着不舒服；孩子们想出了各种舒服又好看的圆帽子，人们纷纷去买，方帽子慢慢卖不出去成了古董。引导孩子提问并挑选对理解故事最有帮助的问题，体会不能墨守成规、要敢于创新。',
        },
        techniques: [],
        practice: [{ generatorId: 'yw4.words', minDifficulty: 1, maxDifficulty: 5, variant: 'u2.square-hats' }, { generatorId: 'yw4.polyphone', minDifficulty: 1, maxDifficulty: 5, variant: 'u2.square-hats', label: '多音字' }, dictation('u2.square-hats'), { generatorId: 'yw4.words', variant: 'u2.square-hats#stretch', tier: 'stretch', minDifficulty: 3, maxDifficulty: 5 }, { generatorId: 'yw4.words', variant: 'u2.square-hats#creative', tier: 'creative', minDifficulty: 3, maxDifficulty: 5 }],
      },
      {
        slug: 'horse-race',
        title: '田忌赛马',
        objectives: [
          '讲清孙膑怎样安排三场比赛、田忌怎样赢了齐威王',
          '明白孙膑调换马的出场顺序为什么能赢',
          '综合运用提问方法读懂故事',
        ],
        keyPoints: [
          '重点：大家的马脚力相差不多，孙膑“一匹也不用换”，只调换出场顺序，田忌就胜两场输一场',
          '难点：理解孙膑善于观察、分析，扬长避短',
          '常见错误：以为田忌是换了更好的马才赢的',
        ],
        prerequisites: ['yw-g4a.u2.night-flight'],
        lecture: {
          title: '田忌赛马：换个顺序就能赢',
          minutes: 10,
          focus:
            '讲齐国大将田忌和齐威王赛马的故事：孙膑是田忌的门客，他看了几场比赛，发现大家的马脚力相差不多，都分成上、中、下三等；他让田忌一匹马也不换，第一场用下等马对上等马（输），第二场用上等马对中等马（赢），第三场用中等马对下等马（赢），田忌胜两场输一场，赢了齐威王，后来孙膑被任命为军师。用表格梳理三场比赛，引导孩子提问并综合运用提问方法，体会孙膑的智慧。',
        },
        techniques: [],
        practice: [{ generatorId: 'yw4.words', minDifficulty: 1, maxDifficulty: 5, variant: 'u2.horse-race' }, { generatorId: 'yw4.polyphone', minDifficulty: 1, maxDifficulty: 5, variant: 'u2.horse-race', label: '多音字' }, { generatorId: 'yw4.words', variant: 'u2.horse-race#stretch', tier: 'stretch', minDifficulty: 3, maxDifficulty: 5 }, { generatorId: 'yw4.words', variant: 'u2.horse-race#creative', tier: 'creative', minDifficulty: 3, maxDifficulty: 5 }],
      },
      {
        slug: 'my-family',
        title: '习作：我的家人（写人抓特点）',
        objectives: [
          '选一位家人，找出他（她）最突出的特点',
          '用一两件具体的事来表现这个特点',
          '把对家人的感情写出来',
        ],
        keyPoints: [
          '重点：抓住外貌、性格、爱好中最突出的一点来写',
          '难点：用具体事例说明特点，而不是只写“我妈妈很勤劳”',
          '常见错误：把家人的所有情况都罗列一遍，没有重点',
        ],
        prerequisites: ['yw-g4a.u1.recommend-place'],
        localContexts: ['周末和家人去深圳湾骑车', '一家人在家包饺子'],
        lecture: {
          title: '习作：写写我的家人',
          minutes: 10,
          focus:
            '教孩子写家人：先想一想家人最突出的特点（比如爱唠叨、爱运动、像只勤劳的小蜜蜂），再选一两件事把特点写具体，最后写出自己的感受。可以用“像什么动物”来帮助找特点（旧版题目为“小小‘动物园’”）。示范把“爸爸很爱运动”写成一件具体的事。',
        },
        techniques: [],
        practice: [{ generatorId: 'yw4.words', minDifficulty: 1, maxDifficulty: 5, variant: 'u2.my-family' }, { generatorId: 'yw4.words', variant: 'u2.my-family#stretch', tier: 'stretch', minDifficulty: 3, maxDifficulty: 5 }, { generatorId: 'yw4.words', variant: 'u2.my-family#creative', tier: 'creative', minDifficulty: 3, maxDifficulty: 5 }],
      },
      {
        slug: 'polyphones',
        title: '多音字：据义定音',
        objectives: [
          '知道多音字读哪个音，要看它在词语和句子里的意思',
          '会用“组词定音、据义定音、结合语境”三种方法判断读音',
          '读准前两个单元课文里的多音字（如 薄雾、相称、系着、扫兴）',
        ],
        keyPoints: [
          '重点：意思不同，读音不同——先弄清这个字在词语里的意思，再定读音',
          '难点：意思相近的读音（如 露 lù／lòu、薄 báo／bó），要记住书面词和口语词的区别',
          '常见错误：只按最常见的读音读，如把“相称”读成 xiāng chēng，把“系鞋带”读成 xì',
        ],
        prerequisites: ['yw-g4a.u2.peas'],
        lecture: {
          title: '多音字：据义定音',
          minutes: 10,
          focus:
            '讲清多音字的读音由意思决定。三种方法：一、组词定音——给字组个熟悉的词（称赞 chēng／相称 chèn）；二、据义定音——想想这个字在这里是什么意思（系 jì 是打结，系 xì 是关系）；三、结合语境——把句子读完整再定音（“我倒想知道”的倒读 dào，“摔倒”读 dǎo）。例子取自本册课文：观潮的薄雾、闷雷、风号浪吼，繁星的似的、模糊，五粒豆的相称、挣钱、盛开，夜间飞行的秘密的系着、塞上，田忌赛马的大将、扫兴。',
        },
        techniques: [
          {
            slug: 'swap-word',
            title: '换个词试一试',
            minutes: 4,
            focus:
              '教孩子一个小窍门：拿不准读音时，把这个字换进自己熟悉的词里比一比，意思一样的就读一样的音（盛开的“盛”和茂盛一样读 shèng，盛饭的“盛”是装进去，读 chéng）。再配几句顺口溜帮助记忆，如“系鞋带读 jì，关系联系读 xì”。',
          },
        ],
        practice: [
          { generatorId: 'yw4.polyphone', minDifficulty: 1, maxDifficulty: 5, variant: 'u2.polyphones' },
          { generatorId: 'yw4.polyphone', minDifficulty: 2, maxDifficulty: 5, variant: 'mixed', label: '多音字综合' },
          { generatorId: 'yw4.words', variant: 'u2.polyphones#stretch', tier: 'stretch', minDifficulty: 3, maxDifficulty: 5 },
          { generatorId: 'yw4.words', variant: 'u2.polyphones#creative', tier: 'creative', minDifficulty: 3, maxDifficulty: 5 },
        ],
      },
      {
        slug: 'garden',
        title: '语文园地二：识字加油站（形声字）',
        objectives: [
          '会读会写提纲、生锈、泡沫、综合、氧气、结账、矿物、俱乐部',
          '知道形声字一边表示意思、一边表示读音',
          '能根据偏旁猜字的意思',
        ],
        keyPoints: [
          '重点：锈（金属）、沫（水）、矿（石）、账（钱，古时贝壳当钱）、氧（气体）——形旁表义，另一边表音',
          '难点：用形声字的规律推测生字的意思',
          '常见错误：“结账”写成“结帐”；“提纲”的“纲”写成“钢”',
        ],
        prerequisites: [],
        lecture: {
          title: '语文园地二：形声字识字',
          minutes: 8,
          focus:
            '讲语文园地二识字加油站的一组词：提纲、生锈、泡沫、综合、氧气、结账、矿物、俱乐部。重点讲形声字：锈是金字旁因为金属才会生锈，沫是三点水，矿是石字旁，账是贝字旁因为古时候贝壳当钱用，氧的气字头表示气体、羊表示读音。教孩子遇到生字先看偏旁猜意思。',
        },
        techniques: [],
        practice: bank('u2.garden', { dictation: true }),
      },
    ]),
    // ------------------------------------------------------------------ 三
    unit(B, 3, '连续观察', [
      {
        slug: 'ancient-poems',
        title: '古诗三首（暮江吟 · 题西林壁 · 雪梅）',
        objectives: [
          '正确、流利地背诵三首古诗，会写诗中的生字',
          '借助注释说出每首诗的意思和描绘的画面',
          '体会《题西林壁》《雪梅》中蕴含的道理',
        ],
        keyPoints: [
          '重点：《暮江吟》白居易（唐）写傍晚江景和月夜；《题西林壁》苏轼（宋）写庐山；《雪梅》卢钺（宋）写梅雪争春',
          '难点：理解“瑟瑟”“可怜”“缘”“降”“阁笔”“逊”等字词；体会“不识庐山真面目，只缘身在此山中”和“梅须逊雪三分白，雪却输梅一段香”的道理',
          '常见错误：把“未肯降”的“降”读成 jiàng；把“半江瑟瑟”理解成冷得发抖',
        ],
        prerequisites: ['yw-g4a.u1.modern-poems'],
        localContexts: ['在深圳湾看夕阳落到海面上', '从不同位置看平安大厦'],
        lecture: {
          title: '古诗三首：看景物，悟道理',
          minutes: 11,
          focus:
            '逐首讲读：《暮江吟》抓“一道残阳铺水中，半江瑟瑟半江红”的颜色对比和“露似真珠月似弓”的比喻，体会诗人按时间先后连续观察（傍晚到夜晚）；《题西林壁》讲横看、侧看、远近高低看到的庐山不同，悟出“看问题要跳出局部、全面地看”；《雪梅》讲梅和雪各有长处也各有不足，要取长补短。每首结合注释串讲诗意，再指导背诵。',
        },
        techniques: [],
        practice: bank('u3.ancient-poems', { polyphone: true, dictation: true }),
      },
      {
        slug: 'ivy',
        title: '爬山虎的脚',
        objectives: [
          '说出爬山虎的叶子和脚的样子',
          '按顺序说清爬山虎是怎样一步一步往上爬的',
          '体会作者连续、细致的观察和准确的用词',
        ],
        keyPoints: [
          '重点：脚长在茎上长叶柄的地方，是六七根细丝，像蜗牛的触角；触着墙时细丝的头变成小圆片巴住墙，细丝弯曲，把嫩茎拉一把，就这样一脚一脚往上爬',
          '难点：体会“触、变、巴、拉、贴”等动词写得准确，以及作者长期连续观察的方法',
          '常见错误：以为爬山虎的脚长在叶子上；以为没触着墙的脚也能一直留着（其实几天就萎了）',
        ],
        prerequisites: ['yw-g4a.u3.ancient-poems'],
        localContexts: ['学校或小区墙上的爬山虎', '阳台上爬藤的植物'],
        lecture: {
          title: '爬山虎的脚：它是怎样爬上墙的',
          minutes: 10,
          focus:
            '讲叶圣陶的《爬山虎的脚》：先看叶子（嫩叶红、长大后绿得新鲜，叶尖一顺儿朝下，铺得均匀），再看脚长在哪里、什么样子，最后按“触墙—变成小圆片巴住—细丝弯曲拉一把茎—贴紧墙”的顺序讲清怎样爬。用动作演示几个关键动词，引导孩子发现作者是长时间、反复观察才写得这样细致，只引用个别短语，不整段抄录课文。',
        },
        techniques: [],
        practice: bank('u3.ivy', { polyphone: true, dictation: true }),
      },
      {
        slug: 'cricket',
        title: '蟋蟀的住宅',
        objectives: [
          '说出蟋蟀的住宅有什么特点，它是怎样建造住宅的',
          '体会作者把蟋蟀当作人来写的有趣写法',
          '学习作者长期、细致观察昆虫的精神',
        ],
        keyPoints: [
          '重点：蟋蟀不肯随遇而安，住宅要选排水好、有温和阳光的地方；它用前足扒土、用钳子似的大颚搬土块、用强有力的后足踏地，工作很辛苦',
          '难点：理解作者为什么说蟋蟀的住宅“可以算是伟大的工程了”；体会拟人写法',
          '常见错误：以为蟋蟀随便找个洞就住；把作者法布尔（法国昆虫学家，著有《昆虫记》）记错',
        ],
        prerequisites: ['yw-g4a.u3.ivy'],
        localContexts: ['夏夜在草丛里听到蟋蟀叫'],
        lecture: {
          title: '蟋蟀的住宅：小小工程师',
          minutes: 10,
          focus:
            '讲法布尔（法国昆虫学家，《昆虫记》作者）笔下的蟋蟀：它不肯随遇而安，慎重地选择住址；住宅的特点（隐蔽、排水好、干净朝阳）；建造过程（用前足扒土，用钳子似的大颚搬走较大的土块，用有力的后足踏地），工具简单却建成了“伟大的工程”。讲清作者把蟋蟀当作人来写，引导孩子体会作者长期、耐心的连续观察。',
        },
        techniques: [],
        practice: bank('u3.cricket', { dictation: true }),
      },
      {
        slug: 'eyes',
        title: '口语交际：爱护眼睛，保护视力',
        objectives: [
          '知道常见的伤害眼睛的坏习惯和保护视力的好方法',
          '交流时能说清楚自己的看法，并用例子或知识来说明',
          '能对别人的发言做补充，说话有条理',
        ],
        keyPoints: [
          '重点：读写姿势“一尺、一拳、一寸”；看书写字或看屏幕一段时间要休息、远眺；多到户外活动',
          '难点：说建议时用上“首先……其次……”等词，把理由说清楚',
          '常见错误：在光线太暗、走路或坐车时看书看手机；躺着看书',
        ],
        prerequisites: ['yw-g4a.u1.environment'],
        localContexts: ['学校做眼保健操', '周末在公园户外活动'],
        lecture: {
          title: '口语交际：爱护眼睛，保护视力',
          minutes: 8,
          focus:
            '先讨论哪些习惯会伤害眼睛（躺着看书、光线太暗、长时间看手机平板、坐车时看书），再交流保护视力的方法（“一尺一拳一寸”的读写姿势、用眼一段时间就休息远眺、认真做眼保健操、每天多到户外活动、定期检查视力）。教孩子发言时先说观点再说理由，有条理地提建议，并认真听别人的补充。',
        },
        techniques: [],
        practice: bank('u3.eyes'),
      },
      {
        slug: 'diary',
        title: '习作：写观察日记',
        objectives: [
          '知道日记的格式：日期、星期、天气写在第一行',
          '连续观察一种植物、动物或一个现象，把观察到的变化记下来',
          '写观察日记时用上多种感官，写出自己的发现和感受',
        ],
        keyPoints: [
          '重点：连续观察，每篇日记写清这一天观察到的变化',
          '难点：观察要细致，用看、听、闻、摸等多种方法；用准确的词写出变化（如“冒出”“舒展”）',
          '常见错误：每天写的都一样，没写出变化；只写“今天我观察了豆芽”而没有具体内容',
        ],
        prerequisites: ['yw-g4a.u3.cricket'],
        localContexts: ['在家泡绿豆看它发芽', '阳台上的小番茄', '养一只小蜗牛'],
        lecture: {
          title: '习作：写观察日记',
          minutes: 10,
          focus:
            '以泡绿豆发芽为例，示范连续观察几天、每天写一篇观察日记：第一行写日期、星期、天气；正文写这一天看到的变化（颜色、形状、大小），用上看、摸、闻等多种感官，用准确的动词和比喻把变化写具体，最后写一句自己的发现或感受。提醒孩子不要每天写得一样。',
        },
        techniques: [],
        practice: bank('u3.diary'),
      },
    ]),
    // ------------------------------------------------------------------ 四
    unit(B, 4, '中外神话', [
      {
        slug: 'pangu',
        title: '盘古开天地',
        objectives: [
          '按起因、经过、结果讲述盘古开天地的故事',
          '说出盘古倒下后身体变成了什么',
          '感受神话神奇的想象和盘古的献身精神',
        ],
        keyPoints: [
          '重点：天地混沌像个大鸡蛋—盘古用斧子劈开—轻而清的上升成天、重而浊的下降成地—盘古顶天立地—倒下后身体化成万物',
          '难点：体会神话“神奇的想象”；理解盘古为创造世界付出了一切',
          '常见错误：把“轻而清的东西上升、重而浊的东西下降”说反',
        ],
        prerequisites: [],
        lecture: {
          title: '盘古开天地：神奇的想象',
          minutes: 10,
          focus:
            '先讲什么是神话：古人用神奇的想象解释天地万物的来历。再按起因、经过、结果讲盘古开天地：天地混沌一片像个大鸡蛋，盘古醒来用斧头劈开，轻而清的东西上升变成天，重而浊的东西下降变成地；他怕天地合拢，头顶天、脚踏地，天越来越高、地越来越厚；最后倒下，气息、声音、双眼、四肢、血液、汗毛、汗水变成了风云、雷声、日月、大地的四极和五方的名山、江河、草木、雨露。引导孩子体会想象的神奇和盘古的献身精神，不逐字引用课文。',
        },
        techniques: [],
        practice: bank('u4.pangu', { dictation: true }),
      },
      {
        slug: 'jingwei',
        title: '精卫填海（文言文）',
        objectives: [
          '正确、流利地朗读、背诵课文，读准停顿',
          '借助注释说出每句话的意思，能用自己的话讲这个故事',
          '体会精卫坚持不懈、意志坚定的精神',
        ],
        keyPoints: [
          '重点：原文“炎帝之少女，名曰女娃。女娃游于东海，溺而不返，故为精卫。常衔西山之木石，以堙于东海。”（出自《山海经》）',
          '难点：理解“少女（小女儿）、曰、溺、返、故、衔、堙”的意思',
          '常见错误：把“少女”理解成年轻姑娘；把“堙（yīn）”读错',
        ],
        prerequisites: ['yw-g4a.u4.pangu'],
        lecture: {
          title: '精卫填海：小小的鸟，大大的决心',
          minutes: 10,
          focus:
            '讲读《山海经》里的文言文《精卫填海》：先读准字音和停顿（炎帝之/少女，名曰/女娃……），再借助注释逐句理解“少女”是小女儿、“溺而不返”是淹死没能回来、“故”是所以、“衔”是用嘴叼、“堙”是填塞，最后用自己的话讲故事，体会精卫不怕困难、坚持到底的精神。',
        },
        techniques: [],
        practice: bank('u4.jingwei', { dictation: true }),
      },
      {
        slug: 'prometheus',
        title: '普罗米修斯',
        objectives: [
          '说出普罗米修斯为什么盗火、受到什么惩罚、最后怎样获救',
          '感受普罗米修斯为人类造福、不怕牺牲的精神',
          '比较中外神话的相同之处',
        ],
        keyPoints: [
          '重点：人类没有火—普罗米修斯从太阳车的车轮上取了一颗火星带到人间—宙斯大怒，命火神把他锁在高加索山上，派鹫鹰每天啄食他的肝脏—大力神赫拉克勒斯救了他',
          '难点：体会普罗米修斯宁愿受苦也不屈服、不后悔的品质',
          '常见错误：把宙斯和普罗米修斯的身份弄混；以为是宙斯把火送给人类',
        ],
        prerequisites: ['yw-g4a.u4.pangu'],
        lecture: {
          title: '普罗米修斯：为人类盗火的英雄',
          minutes: 10,
          focus:
            '介绍古希腊神话，按起因、经过、结果讲普罗米修斯的故事：人类没有火，生活艰难，普罗米修斯盗取火种送给人类；众神领袖宙斯大怒，让火神把他锁在高加索山的悬崖上，又派鹫鹰每天啄食他的肝脏；他始终不屈服，后来被大力神赫拉克勒斯救下。引导孩子体会他为人类造福、不怕牺牲的精神，并和盘古作比较。',
        },
        techniques: [],
        practice: bank('u4.prometheus', { dictation: true }),
      },
      {
        slug: 'nuwa',
        title: '女娲补天',
        objectives: [
          '说出女娲为什么补天、怎样补天',
          '能把女娲找五彩石的经过讲得更具体，加上自己的想象',
          '感受女娲不怕困难、造福人类的精神',
        ],
        keyPoints: [
          '重点：天上露出大窟窿、地上裂开深沟、洪水和野兽残害人类—女娲决心补天—拣来五色石，用神火炼成石浆补天，又立柱撑天、杀黑龙、用芦灰堵洪水',
          '难点：用自己的想象把“找五彩石”的过程讲具体',
          '常见错误：把女娲补天和女娲造人两个故事混在一起',
        ],
        prerequisites: ['yw-g4a.u4.pangu'],
        lecture: {
          title: '女娲补天：用想象把故事讲具体',
          minutes: 9,
          focus:
            '讲女娲补天的神话：天上露出一个大窟窿，地上裂开深沟，洪水喷涌，野兽残害人类；女娲难过极了，决心修补天地：从各地拣来赤、青、黄、白、黑五色石头，用神火炼成石浆补好天，又用大乌龟的四条腿撑住天，杀死作恶的黑龙，用芦苇灰堵住洪水。引导孩子按起因、经过、结果复述，并学着加上想象，把女娲找五彩石的过程讲具体。只讲情节梗概，不逐句引用课文。',
        },
        techniques: [],
        practice: bank('u4.nuwa', { dictation: true }),
      },
      {
        slug: 'day-with',
        title: '习作：我和___过一天',
        objectives: [
          '选一个喜欢的神话或童话人物，想象和他（她）一起过一天',
          '把这一天发生的事写清楚，写出人物的本领和特点',
          '想象要大胆，又要符合人物原来的特点',
        ],
        keyPoints: [
          '重点：选好人物，想好“去哪里、做什么、发生了什么”，按时间顺序写一两件主要的事',
          '难点：让人物的本领在事情里用上（比如和孙悟空过一天，用上筋斗云、七十二变）',
          '常见错误：只介绍人物，不写发生的事；想象和人物特点不相符',
        ],
        prerequisites: ['yw-g4a.u4.nuwa'],
        localContexts: ['和孙悟空一起在深圳上空翻筋斗云', '和神笔马良一起给小区画一座花园'],
        lecture: {
          title: '习作：我和___过一天',
          minutes: 10,
          focus:
            '教孩子写想象作文：先从读过的神话、童话里选一个人物（孙悟空、哪吒、神笔马良、精卫等），想想他有什么本领和特点；再列提纲——早上在哪里遇到他、一起做了哪一两件有趣的事、遇到了什么困难怎样解决、最后怎样告别；写的时候让人物的本领用在事情里。以“和孙悟空过一天”为例示范，提醒不要只介绍人物。',
        },
        techniques: [],
        practice: bank('u4.day-with'),
      },
      {
        slug: 'myths-reading',
        title: '快乐读书吧：很久很久以前',
        objectives: [
          '知道中国古代神话和世界神话中的一些有名故事',
          '能说出几个神话人物和他们做过的事',
          '体会神话神奇的想象，愿意读更多神话',
        ],
        keyPoints: [
          '重点：中国神话如夸父逐日、后羿射日、大禹治水、嫦娥奔月、女娲造人；古希腊神话如普罗米修斯、潘多拉的盒子',
          '难点：理解神话是古人对自然现象的想象和解释',
          '常见错误：把神话人物和他们的故事对错',
        ],
        prerequisites: ['yw-g4a.u4.prometheus'],
        lecture: {
          title: '快乐读书吧：很久很久以前',
          minutes: 9,
          focus:
            '带孩子走进神话书：讲神话是古人用想象解释天地、日月、风雨的故事；介绍中国神话（夸父逐日、后羿射日、大禹治水、嫦娥奔月、女娲造人）和古希腊神话（普罗米修斯盗火、潘多拉的盒子）的主要情节；教读神话的方法——边读边想象神奇的画面，说说人物的神奇本领，制作“神话人物卡”。',
        },
        techniques: [],
        practice: bank('u4.myths-reading'),
      },
      {
        slug: 'garden',
        title: '语文园地四：花卉名称和神话词语',
        objectives: [
          '会读会写玫瑰、牡丹、茉莉、海棠等花卉名称',
          '积累腾云驾雾、神通广大、各显神通等形容神话人物本领的词语',
          '能在讲神话故事、写想象作文时用上这些词语',
        ],
        keyPoints: [
          '重点：花卉、花蕾、玫瑰、牡丹、茉莉、海棠；腾云驾雾、上天入地、神机妙算、各显神通、三头六臂、神通广大、未卜先知、刀枪不入',
          '难点：理解“未卜先知”“神机妙算”等词语的意思，用得恰当',
          '常见错误：“卉”读成 huī；把“神清气爽”误当作形容本领的词',
        ],
        prerequisites: ['yw-g4a.u4.pangu'],
        lecture: {
          title: '语文园地四：花卉与神话词语',
          minutes: 8,
          focus:
            '讲语文园地四的两组词：一组是花卉名称（玫瑰、牡丹、茉莉、海棠，草字头、王字旁的由来），一组是形容神话人物本领的四字词语（腾云驾雾、上天入地、三头六臂、神通广大、各显神通、未卜先知、神机妙算、刀枪不入）。结合孙悟空、哪吒、八仙过海等孩子熟悉的故事讲词义，再练习在“我和___过一天”的习作中用上它们。',
        },
        techniques: [],
        practice: bank('u4.garden', { dictation: true }),
      },
    ]),
    // ------------------------------------------------------------------ 五
    unit(B, 5, '习作单元：把一件事写清楚', [
      {
        slug: 'sparrow',
        title: '麻雀',
        objectives: [
          '说出故事的起因、经过和结果',
          '找出作者看到、听到、想到的内容，体会作者怎样把事情写清楚',
          '感受老麻雀保护小麻雀的勇敢和伟大的爱',
        ],
        keyPoints: [
          '重点：猎狗发现从巢里掉下来的小麻雀—老麻雀飞下来挡在猎狗面前—猎狗慢慢后退—“我”唤回猎狗走开了',
          '难点：体会老麻雀的外形、动作、叫声描写如何表现它的紧张和勇敢',
          '常见错误：以为是“我”打跑了猎狗；分不清小麻雀和老麻雀',
        ],
        prerequisites: [],
        lecture: {
          title: '麻雀：把看到、听到、想到的写清楚',
          minutes: 10,
          focus:
            '讲俄国作家屠格涅夫的《麻雀》：打猎回来的路上，猎狗发现一只从巢里掉下来的小麻雀；老麻雀从树上飞下来，挡在猎狗面前，浑身发抖却拼命保护小麻雀；猎狗犹豫着后退，“我”唤回猎狗走开了。重点引导孩子按起因、经过、结果理清故事，找出作者看到的、听到的、想到的，体会这样写才能把事情写清楚，感受母爱（亲情）的力量。只讲情节，不整段抄录课文。',
        },
        techniques: [],
        practice: bank('u5.sparrow', { dictation: true }),
      },
      {
        slug: 'tiandu',
        title: '爬天都峰',
        objectives: [
          '说出“我”和老爷爷是怎样爬上天都峰的',
          '体会作者把爬山前、爬山时、爬上后的经过写清楚的方法',
          '懂得人与人可以互相鼓励、互相学习',
        ],
        keyPoints: [
          '重点：天都峰很高很陡—“我”和老爷爷互相鼓励—一起爬上峰顶—互相感谢，都说是从对方身上汲取了力量',
          '难点：理解“我”和老爷爷为什么互相道谢',
          '常见错误：以为是老爷爷一个人帮助了“我”',
        ],
        prerequisites: ['yw-g4a.u5.sparrow'],
        localContexts: ['爬梧桐山', '爬莲花山'],
        lecture: {
          title: '爬天都峰：按顺序把事情写清楚',
          minutes: 10,
          focus:
            '讲“我”在黄山天都峰脚下遇到一位老爷爷，两人都担心爬不上去，却互相鼓励，一起爬上了峰顶，最后互相道谢——都是从对方身上汲取了勇气和力量。引导孩子按爬山前、爬山时、爬上后梳理经过，体会作者写出了心里的想法和动作，才把事情写清楚；联系自己爬梧桐山的经历说一说。只讲情节，不整段引用课文。',
        },
        techniques: [],
        practice: bank('u5.tiandu', { dictation: true }),
      },
      {
        slug: 'kaleidoscope',
        title: '习作：生活万花筒（含习作例文）',
        objectives: [
          '从生活中选一件印象深刻的事来写',
          '把事情的起因、经过、结果写清楚，重点写经过',
          '学习习作例文《我家的杏熟了》《小木船》把事情写清楚的方法',
        ],
        keyPoints: [
          '重点：写之前列提纲，按事情发展的顺序写；经过部分写出看到的、听到的、想到的',
          '难点：把事情最精彩的部分写具体，而不是一句话带过',
          '常见错误：开头绕得太远，经过只写一两句；时间、地点、人物交代不清',
        ],
        prerequisites: ['yw-g4a.u5.tiandu'],
        localContexts: ['第一次自己坐地铁', '学校运动会上的接力赛', '和同学闹别扭又和好'],
        lecture: {
          title: '习作：生活万花筒——把一件事写清楚',
          minutes: 11,
          focus:
            '先借习作例文说方法：《我家的杏熟了》按事情顺序写奶奶把杏分给孩子们，懂得好东西要和大家分享；《小木船》写“我”和好朋友因小木船闹翻又和好，写出了前后的心情变化。再教孩子选一件印象深的事，用“起因—经过—结果”列提纲，经过部分写出看到、听到、想到的，把最精彩的地方写具体。以“第一次自己坐地铁”为例示范。',
        },
        techniques: [],
        practice: bank('u5.kaleidoscope', { dictation: true }),
      },
    ]),
    // ------------------------------------------------------------------ 六
    unit(B, 6, '中国文化', [
      {
        slug: 'great-wall',
        title: '长城',
        objectives: [
          '说出长城的样子、长度和它的组成部分（城墙、垛子、城台等）',
          '体会作者由看到的景物联想到修筑长城的劳动人民',
          '感受长城是古代劳动人民智慧和血汗的结晶',
        ],
        keyPoints: [
          '重点：长城东起山海关、西到嘉峪关，是“万里长城”；城墙上有垛子（上面有瞭望口、射口）和城台',
          '难点：理解为什么说长城是“伟大的奇迹”；远看、近看的观察顺序',
          '常见错误：把长城的东西两头记反；以为长城只是一道普通的墙',
        ],
        prerequisites: [],
        localContexts: ['深圳的大鹏所城也有古城墙'],
        lecture: {
          title: '长城：伟大的奇迹',
          minutes: 10,
          focus:
            '介绍万里长城：先远看，它像一条长龙在崇山峻岭间蜿蜒，东起山海关、西到嘉峪关；再近看，城墙很宽、很高，上面有垛子，垛子上有瞭望口和射口，每隔一段有城台，古时用来打仗和守卫。引导孩子想象古代劳动人民在没有机器的时代，靠肩扛手抬修筑长城，体会长城是劳动人民血汗和智慧凝成的伟大奇迹。长城于 1987 年列入《世界遗产名录》。',
        },
        techniques: [],
        practice: bank('u6.great-wall', { dictation: true }),
      },
      {
        slug: 'summer-palace',
        title: '颐和园',
        objectives: [
          '按游览顺序说出颐和园的几个主要景点',
          '学习作者按游览顺序、移步换景来写景的方法',
          '感受颐和园的美丽，激发对古代园林的喜爱',
        ],
        keyPoints: [
          '重点：颐和园在北京，是著名的皇家园林；长廊、万寿山、佛香阁、昆明湖、十七孔桥',
          '难点：找出表示游览顺序的句子（进了大门、走完长廊、登上万寿山、从万寿山下来……）',
          '常见错误：把景点的先后顺序说乱；以为颐和园在杭州',
        ],
        prerequisites: ['yw-g4a.u6.great-wall'],
        lecture: {
          title: '颐和园：跟着作者去游园',
          minutes: 10,
          focus:
            '介绍北京的颐和园（清代皇家园林，1998 年列入《世界遗产名录》）：跟着游览路线走——进门先到长廊（很长，横槛上有许多彩色的画），再登上万寿山看佛香阁、俯瞰昆明湖，最后从山上下来到昆明湖边，看十七孔桥。教孩子找出过渡句，学习按游览顺序、移步换景写一个地方。只讲景点和顺序，不整段引用课文。',
        },
        techniques: [],
        practice: bank('u6.summer-palace', { dictation: true }),
      },
      {
        slug: 'terracotta',
        title: '秦兵马俑',
        objectives: [
          '说出秦兵马俑在哪里、什么时候发现、有什么特点',
          '说出几种兵马俑（将军俑、武士俑、骑兵俑等）的样子',
          '感受兵马俑规模宏大、类型众多、个性鲜明',
        ],
        keyPoints: [
          '重点：秦兵马俑在陕西西安临潼，1974 年农民打井时发现，是秦始皇陵的陪葬坑；规模宏大、类型众多、个性鲜明',
          '难点：体会作者先总写、再分类具体写的写法',
          '常见错误：以为兵马俑是真人；把秦始皇和汉朝弄混',
        ],
        prerequisites: ['yw-g4a.u6.great-wall'],
        lecture: {
          title: '秦兵马俑：地下的军阵',
          minutes: 9,
          focus:
            '介绍秦兵马俑：1974 年陕西临潼的农民打井时发现，是秦始皇陵的陪葬坑，1987 年和秦始皇陵一起列入《世界遗产名录》，被称为“世界第八大奇迹”。讲它“规模宏大、类型众多、个性鲜明”：一号坑最大，陶俑陶马排成整齐的军阵；有将军俑、武士俑、骑兵俑、弓弩手等，神态各不相同。教孩子学习先总写、再分几类具体写的方法。',
        },
        techniques: [],
        practice: bank('u6.terracotta'),
      },
      {
        slug: 'guide',
        title: '口语交际：我是小小讲解员',
        objectives: [
          '选一个熟悉的地方或文物，做讲解前准备好讲解词',
          '讲解时按一定顺序，把重点讲清楚，语气亲切自然',
          '做听众时认真听，能提出问题',
        ],
        keyPoints: [
          '重点：讲解词有开头（问好、介绍自己和讲解对象）、主体（按顺序讲重点）、结尾（感谢、提醒）',
          '难点：根据听众调整讲法，适当用上数字、故事让讲解更生动',
          '常见错误：照着稿子念，声音太小；什么都讲，没有重点',
        ],
        prerequisites: ['yw-g4a.u6.summer-palace'],
        localContexts: ['深圳博物馆', '大鹏所城', '学校的校史室'],
        lecture: {
          title: '口语交际：我是小小讲解员',
          minutes: 8,
          focus:
            '教孩子当讲解员：先选好讲解对象（如长城、兵马俑，或深圳博物馆、大鹏所城），收集资料，写讲解词；讲解词开头问好、介绍自己，中间按参观顺序讲两三个重点，可以用数字和小故事，结尾感谢听众并提醒注意事项；讲的时候面向听众、声音响亮、语速适中，不照稿念。',
        },
        techniques: [],
        practice: bank('u6.guide'),
      },
      {
        slug: 'heritage',
        title: '习作：中国的世界文化遗产',
        objectives: [
          '知道我国一些著名的世界文化遗产',
          '选一处世界文化遗产，查找资料，整理后介绍它',
          '介绍时分几方面写清楚，写出自己的感受',
        ],
        keyPoints: [
          '重点：搜集资料—挑选有用的内容—分几方面（位置、历史、特点、价值）有条理地介绍',
          '难点：把资料变成自己的话，不照抄',
          '常见错误：资料罗列太多，没有重点；把自然遗产和文化遗产混在一起',
        ],
        prerequisites: ['yw-g4a.u6.terracotta'],
        lecture: {
          title: '习作：中国的世界文化遗产',
          minutes: 10,
          focus:
            '介绍我国一些世界文化遗产（长城、故宫、秦始皇陵及兵马俑坑、莫高窟、颐和园、天坛、苏州古典园林等），教孩子写介绍文：选一处，查找资料，挑出有用的信息，按位置、历史、特点、价值几方面分段介绍，把资料改成自己的话，结尾写感受。以兵马俑为例示范怎样从一堆资料里挑重点。',
        },
        techniques: [],
        practice: bank('u6.heritage'),
      },
      {
        slug: 'garden',
        title: '语文园地六：世界遗产相关词语',
        objectives: [
          '会读会写游人、狮子、姿态、陵寝、景观、丝绸、廊道等词语',
          '认识拉萨、大昭寺、都江堰、哈尼族等地名和名称',
          '了解这些词语和我国世界文化遗产的联系',
        ],
        keyPoints: [
          '重点：陵寝（帝王的坟墓）、都江堰（四川）、大昭寺（西藏拉萨）、哈尼梯田（云南）、丝绸之路',
          '难点：读准“寝 qǐn”“堰 yàn”“都 dū”“昭 zhāo”',
          '常见错误：“都江堰”的“都”读成 dōu',
        ],
        prerequisites: ['yw-g4a.u6.great-wall'],
        lecture: {
          title: '语文园地六：遗产词语',
          minutes: 8,
          focus:
            '讲语文园地六识字加油站的词语：游人、狮子、姿态、陵寝、景观、丝绸、拉萨、廊道、哈尼族、都江堰、大昭寺。结合地图介绍都江堰（四川，两千多年前修建的水利工程）、大昭寺（西藏拉萨）、哈尼梯田（云南）、丝绸之路、明清皇家陵寝，读准难读的字音，体会我国文化遗产的丰富。',
        },
        techniques: [],
        practice: bank('u6.garden', { dictation: true }),
      },
    ]),
    // ------------------------------------------------------------------ 七
    unit(B, 7, '童年成长', [
      {
        slug: 'ox-goose',
        title: '牛和鹅',
        objectives: [
          '说出“我”对牛和鹅的看法前后有什么变化',
          '体会“我”被鹅追赶时害怕的心情',
          '懂得看问题可以换个角度，遇事不要慌张',
        ],
        keyPoints: [
          '重点：“我们”原来怕鹅不怕牛；被鹅追时吓坏了；金奎叔抓住鹅的长脖子把它甩开，告诉“我”鹅没什么可怕的',
          '难点：体会批注的方法——在书的空白处写下自己的疑问、感受和体会',
          '常见错误：以为课文是在讲牛和鹅谁更厉害',
        ],
        prerequisites: [],
        lecture: {
          title: '牛和鹅：换个角度看问题',
          minutes: 10,
          focus:
            '讲任大霖的《牛和鹅》：“我们”听说牛看人觉得人很大，所以怕人；鹅看人觉得人很小，所以欺负人，于是不怕牛却怕鹅；一次“我”被鹅追着咬，吓得要命，金奎叔抓住鹅的长脖子把它甩开，告诉“我”鹅没什么可怕的。引导孩子体会“我”前后看法的变化，懂得看问题要换个角度，并学习在书上写批注。只讲情节，不整段引用课文。',
        },
        techniques: [],
        practice: bank('u7.ox-goose', { dictation: true }),
      },
      {
        slug: 'tiger',
        title: '一只窝囊的大老虎',
        objectives: [
          '说出“我”演老虎的经过',
          '体会“我”演出前后心情的变化',
          '理解“窝囊”的意思，学会用批注写下自己的感受',
        ],
        keyPoints: [
          '重点：“我”很想演戏，被安排演老虎；演出时没演好，引得台下哄堂大笑，觉得自己是一只“窝囊”的大老虎',
          '难点：体会作者如何通过动作、心理写出心情的变化',
          '常见错误：把“窝囊”理解成“厉害”',
        ],
        prerequisites: ['yw-g4a.u7.ox-goose'],
        lecture: {
          title: '一只窝囊的大老虎：心情的变化',
          minutes: 9,
          focus:
            '讲叶至善的《一只窝囊的大老虎》：“我”小时候很想上台演戏，被安排演一只老虎，演出时没演好，台下的观众哄堂大笑，“我”觉得自己成了一只窝囊的大老虎。引导孩子找出“我”演出前的期待、演出时的慌张、演出后的难过，理解“窝囊”的意思，用批注写下自己的感受。只讲情节梗概，不引用课文原句。',
        },
        techniques: [],
        practice: bank('u7.tiger', { dictation: true }),
      },
      {
        slug: 'top',
        title: '陀螺',
        objectives: [
          '说出“我”得到陀螺和斗陀螺的经过',
          '体会“我”心情的起伏变化',
          '懂得看人看事不能只看外表',
        ],
        keyPoints: [
          '重点：“我”的小陀螺看起来不起眼，却在斗陀螺时赢了大陀螺',
          '难点：理解“人不可貌相”的道理',
          '常见错误：以为陀螺越大就越厉害',
        ],
        prerequisites: ['yw-g4a.u7.tiger'],
        lecture: {
          title: '陀螺：不能只看外表',
          minutes: 8,
          focus:
            '讲高洪波的《陀螺》：“我”小时候很想有个陀螺，得到一个小小的、不起眼的陀螺；斗陀螺时，它竟然撞赢了别人的大陀螺，“我”的心情从失落变得无比骄傲。引导孩子找出心情的变化，体会“人不可貌相”的道理：看人看事不能只看外表。只讲情节梗概，不引用课文原句。',
        },
        techniques: [],
        practice: bank('u7.top'),
      },
      {
        slug: 'wangrong',
        title: '王戎不取道旁李（文言文）',
        objectives: [
          '正确、流利地朗读、背诵课文，读准停顿',
          '借助注释说出每句话的意思，能讲这个故事',
          '体会王戎善于观察、善于思考',
        ],
        keyPoints: [
          '重点：原文“王戎七岁，尝与诸小儿游。看道边李树多子折枝，诸儿竞走取之，唯戎不动。人问之，答曰：‘树在道边而多子，此必苦李。’取之，信然。”（出自《世说新语》）',
          '难点：理解“尝、诸、竞走、唯、信然”的意思；说出王戎推理的理由',
          '常见错误：把“竞走”理解成体育比赛的竞走；把“子”理解成孩子',
        ],
        prerequisites: ['yw-g4a.u4.jingwei'],
        lecture: {
          title: '王戎不取道旁李：会观察，会思考',
          minutes: 10,
          focus:
            '讲读《世说新语》里的《王戎不取道旁李》：先读准停顿，再借助注释理解“尝（曾经）、诸（众多）、子（果实）、竞走（争着跑过去）、唯（只有）、信然（确实如此）”，逐句说意思；重点讲王戎的推理：李树长在人来人往的路边，果子却多得压弯了树枝，说明没人摘，一定是苦的。体会他善于观察、善于思考。',
        },
        techniques: [],
        practice: bank('u7.wangrong'),
      },
      {
        slug: 'comfort',
        title: '口语交际：安慰',
        objectives: [
          '知道安慰别人要先了解对方为什么难过',
          '选择合适的语言和语气安慰别人',
          '可以配合动作、表情，也可以帮对方想办法',
        ],
        keyPoints: [
          '重点：先体会对方的心情，再说贴心的话，必要时帮他想办法',
          '难点：语气要温和，说的话要让对方感到被理解，不说风凉话',
          '常见错误：说“这有什么好哭的”“别想了”这类让人更难受的话',
        ],
        prerequisites: [],
        localContexts: ['同学接力赛掉了棒', '好朋友心爱的东西丢了'],
        lecture: {
          title: '口语交际：安慰',
          minutes: 8,
          focus:
            '通过几个情境（比赛时掉了接力棒、心爱的小狗走丢了、好朋友要转学）教孩子安慰别人：先弄清对方为什么难过，说出理解他的话；再用温和的语气鼓励他，或帮他想办法；还可以配合拍拍肩膀、递纸巾等动作。对比“这有什么好哭的”等不合适的话，体会怎样说才能让人心里好受。',
        },
        techniques: [],
        practice: bank('u7.comfort'),
      },
      {
        slug: 'heart-beat',
        title: '习作：我的心儿怦怦跳',
        objectives: [
          '选一件让自己心儿怦怦跳（紧张、害怕、激动）的事',
          '把事情经过写清楚，重点写当时的心情',
          '通过动作、神态、心理和身体感受写出心情',
        ],
        keyPoints: [
          '重点：写清是什么事让心儿怦怦跳，把最紧张的那一刻写具体',
          '难点：不只写“我很紧张”，而是写出手心出汗、腿发软、脑子一片空白等具体感受',
          '常见错误：经过写得太简单，心情只用一句“我很害怕”带过',
        ],
        prerequisites: ['yw-g4a.u7.tiger'],
        localContexts: ['第一次上台表演', '打针前', '在欢乐谷坐过山车'],
        lecture: {
          title: '习作：我的心儿怦怦跳',
          minutes: 10,
          focus:
            '教孩子写一件让自己紧张、害怕或激动的事：先回忆当时的情景，列出起因、经过、结果；重点把心跳最快的那一刻写具体——写动作（手紧紧攥着衣角）、神态（脸涨得通红）、身体感受（手心冒汗、腿发软）和心里想的话。以“第一次上台表演”为例示范，把“我很紧张”改写成具体的句子。',
        },
        techniques: [],
        practice: bank('u7.heart-beat'),
      },
      {
        slug: 'garden',
        title: '语文园地七：蔬菜名称和惯用语',
        objectives: [
          '会读会写韭菜、芹菜、辣椒、红薯、莲藕、芋头',
          '理解打头阵、挑大梁、占上风、破天荒、栽跟头、敲边鼓、开绿灯、碰钉子等惯用语',
          '能在合适的情境中用上惯用语',
        ],
        keyPoints: [
          '重点：惯用语的字面意思和实际意思不一样，要理解它的比喻义',
          '难点：根据情境选对惯用语，如“开绿灯”是允许，“碰钉子”是被拒绝',
          '常见错误：“挑大梁”的“挑”读成 tiāo',
        ],
        prerequisites: ['yw-g4a.u7.ox-goose'],
        localContexts: ['学校接力赛', '班级文艺演出'],
        lecture: {
          title: '语文园地七：惯用语',
          minutes: 8,
          focus:
            '讲语文园地七的两组词：蔬菜名称（韭菜、芹菜、辣椒、红薯、莲藕、芋头，多是草字头）和八个惯用语（打头阵、挑大梁、占上风、破天荒、栽跟头、敲边鼓、开绿灯、碰钉子）。先讲每个惯用语的字面意思，再讲比喻义，用接力赛、借书、演出等生活情境练习选用。',
        },
        techniques: [],
        practice: bank('u7.garden', { dictation: true }),
      },
    ]),
    // ------------------------------------------------------------------ 八
    unit(B, 8, '家国情怀', [
      {
        slug: 'selfless',
        title: '我将无我，不负人民',
        objectives: [
          '理解题目“我将无我，不负人民”的意思',
          '读懂课文，说出从中感受到的一心为人民的情怀',
          '积累“不负、奉献、全心全意”等词语',
        ],
        keyPoints: [
          '重点：“无我”是忘掉自己、不为自己打算；“不负人民”是不辜负人民',
          '难点：联系生活理解“为人民服务”',
          '常见错误：把“负”理解成“背着”',
        ],
        prerequisites: [],
        lecture: {
          title: '我将无我，不负人民',
          minutes: 8,
          focus:
            '讲题目的来历和意思：2019 年习近平主席访问意大利时说“我将无我，不负人民”，意思是全心全意为人民服务，把自己全部奉献给人民，决不辜负人民。结合课文内容和生活中为人民服务的人（医生、消防员、边防战士等），引导孩子理解“无我”“不负”的含义，积累相关词语。不引用未核对的课文原句。',
        },
        techniques: [],
        practice: bank('u8.selfless', { dictation: true }),
      },
      {
        slug: 'rise',
        title: '为中华之崛起而读书',
        objectives: [
          '说出周恩来少年时立下“为中华之崛起而读书”志向的经过',
          '理解“中华不振”的意思，体会周恩来的远大志向',
          '想一想自己为什么读书',
        ],
        keyPoints: [
          '重点：伯父说“中华不振”—周恩来在被外国人占据的地方目睹中国人受欺负却无处说理—校长问为什么读书，他回答“为中华之崛起而读书”',
          '难点：理解旧中国被外国欺凌的历史背景，体会志向的来源',
          '常见错误：以为周恩来是为了自己将来当官、挣钱而读书',
        ],
        prerequisites: [],
        lecture: {
          title: '为中华之崛起而读书',
          minutes: 10,
          focus:
            '讲少年周恩来的故事：他十二岁离开家乡到东北，伯父告诉他“中华不振”；他在被外国人占据的地方亲眼看到一个中国妇女的亲人被外国人的汽车轧死，巡警不但不惩处肇事者反而训斥她；于是在奉天东关模范学校的修身课上，魏校长问大家为什么读书时，他清晰而坚定地回答“为中华之崛起而读书”。讲清旧中国积贫积弱的背景，引导孩子理解“崛起”“振兴”，想一想自己为什么读书。',
        },
        techniques: [],
        practice: bank('u8.rise', { dictation: true }),
      },
      {
        slug: 'yanan',
        title: '延安，我把你追寻',
        objectives: [
          '有感情地朗读这首现代诗',
          '知道延安是中国革命的圣地，了解宝塔山、延河、窑洞、南泥湾等',
          '体会诗人要在新时代追寻延安精神的心情',
        ],
        keyPoints: [
          '重点：诗中追寻的不是具体的物，而是延安精神——艰苦奋斗、自力更生、全心全意为人民服务',
          '难点：理解诗中的象征：延河、宝塔山、南泥湾等代表了延安时期的革命岁月和艰苦奋斗',
          '常见错误：以为诗人只是想去延安旅游',
        ],
        prerequisites: ['yw-g4a.u8.rise'],
        lecture: {
          title: '延安，我把你追寻：追寻延安精神',
          minutes: 8,
          focus:
            '介绍延安：陕西延安是中国革命圣地，宝塔山、延河、窑洞是它的标志，南泥湾大生产是自力更生的代表。讲诗人在高楼林立、生活富裕的今天仍要追寻延安，是追寻艰苦奋斗、自力更生、全心全意为人民服务的延安精神。指导有感情地朗读，只讲诗意和象征，不整节引用诗句。',
        },
        techniques: [],
        practice: bank('u8.yanan'),
      },
      {
        slug: 'ancient-poems',
        title: '古诗三首（凉州词 · 出塞 · 夏日绝句）',
        objectives: [
          '正确、流利、有感情地背诵三首古诗，会写诗中的生字',
          '借助注释说出诗句的意思，想象边塞和战场的画面',
          '体会诗中的爱国情怀',
        ],
        keyPoints: [
          '重点：《凉州词》王翰（唐）、《出塞》王昌龄（唐）、《夏日绝句》李清照（宋）',
          '难点：理解“夜光杯、沙场、但使、龙城飞将、不教、人杰、鬼雄”；体会“秦时明月汉时关”是互文',
          '常见错误：把“不教胡马度阴山”的“教”读成 jiāo；把《凉州词》和《出塞》的作者弄混',
        ],
        prerequisites: ['yw-g4a.u3.ancient-poems'],
        lecture: {
          title: '古诗三首：边塞与英雄',
          minutes: 11,
          focus:
            '逐首讲读：《凉州词》（王翰）写将士出征前痛饮葡萄美酒，“醉卧沙场君莫笑，古来征战几人回”写出豪迈与悲壮；《出塞》（王昌龄）“秦时明月汉时关”写边关历史悠久，“但使龙城飞将在，不教胡马度阴山”盼望有李广那样的名将守边；《夏日绝句》（李清照）借项羽不肯过江东的故事，赞美宁死不屈的英雄气概。结合注释串讲诗意，体会爱国情怀，指导背诵。',
        },
        techniques: [],
        practice: bank('u8.ancient-poems', { dictation: true }),
      },
      {
        slug: 'letter',
        title: '习作：写信',
        objectives: [
          '知道书信的格式：称呼、问候语、正文、祝福语、署名、日期',
          '给亲友写一封信，把想说的话写清楚',
          '会正确填写信封',
        ],
        keyPoints: [
          '重点：称呼顶格写，后面加冒号；问候语和正文空两格；祝福语“此致”空两格、“敬礼”顶格；署名和日期写在右下方',
          '难点：正文写清楚要说的事，语气符合双方关系',
          '常见错误：称呼没有顶格；忘写日期；信封上收信人和寄信人位置写反',
        ],
        prerequisites: [],
        localContexts: ['给在老家的爷爷奶奶写信', '给转学的好朋友写信'],
        lecture: {
          title: '习作：写信',
          minutes: 10,
          focus:
            '以给老家的爷爷奶奶写信为例，讲书信的格式：第一行顶格写称呼加冒号；第二行空两格写问候语；正文分段写想说的事（近况、问题、心里话）；结尾写祝福语（如“祝您身体健康”，或“此致”空两格、“敬礼”另起一行顶格）；右下方写署名，下面写日期。再讲信封的写法：上面写收信人邮编和地址，中间写收信人姓名，下面写寄信人地址、姓名和邮编。',
        },
        techniques: [],
        practice: bank('u8.letter'),
      },
      {
        slug: 'garden',
        title: '语文园地八：赞美英雄和正直的词语',
        objectives: [
          '会读会写志存高远、精忠报国、大义凛然、英勇无畏、视死如归、铁面无私、秉公执法、刚正不阿',
          '分清哪些词赞美英雄不怕牺牲，哪些词赞美为人公正',
          '能在合适的语境中使用这些词语',
        ],
        keyPoints: [
          '重点：大义凛然、英勇无畏、视死如归写不怕牺牲；铁面无私、秉公执法、刚正不阿写公正；志存高远、精忠报国写志向',
          '难点：读准“凛 lǐn”“阿 ē”；词语用在合适的对象上',
          '常见错误：“刚正不阿”的“阿”读成 ā',
        ],
        prerequisites: ['yw-g4a.u8.rise'],
        lecture: {
          title: '语文园地八：英雄与正直',
          minutes: 8,
          focus:
            '讲语文园地八的八个四字词语，分成三类：写志向（志存高远、精忠报国）、写不怕牺牲（大义凛然、英勇无畏、视死如归）、写公正（铁面无私、秉公执法、刚正不阿）。结合周恩来立志、岳飞精忠报国、包公断案等故事讲词义，再练习在句子里用对。',
        },
        techniques: [],
        practice: bank('u8.garden', { dictation: true }),
      },
    ]),
  ],
};
