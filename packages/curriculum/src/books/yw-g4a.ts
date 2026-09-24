import type { Book } from '../types';
import { unit } from './helpers';

const B = 'yw-g4a';

/**
 * 统编版 语文 四年级上册 —— 只编码前两个单元。
 *
 * 2026 年秋季起四年级使用 2022 课标修订后的新版四上（本册是修订幅度最大的一册）。
 * 目录依据网络检索的多方报道与教辅资源交叉比对（详见 sourceNote），未能直接查看人教社正文，
 * 拿到实体课本后请核对。
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
    '本册按 2026 年秋季起使用的统编版（2022 课标修订）四年级上册编码，只含前两个单元。',
    '检索来源（2026-09，均为搜索摘要，网络代理屏蔽了国内教材网站，未能打开正文或人教社电子书）：',
    '搜狐《一文读懂丨2026年秋季小学语文教材（四至六年级）变化全梳理》、腾讯新闻 2026-09-07《小学四年级语文新教材变化详解》、',
    '搜狐《2026年秋季小学语文4～6年级新教材变动抢先看》、学科网“5夜间飞行的秘密 暑假自学-2026-2027学年语文四年级上册统编版”、',
    '道客巴巴“2026秋新教材统编版四年级上册语文 第一单元 习作 推荐一个好地方 教案”、21世纪教育网“统编版四年级上册 第二单元 习作：我的家人”。',
    '【较可信，多源一致】新版四上单元主题依次为自然之美、阅读方法（提问）、连续观察、中外神话、表达方法、中国文化、童年成长、家国情怀；',
    '第一单元删去《走月亮》，《繁星》由略读升为精读，即 1 观潮、2 现代诗二首（秋晚的江上 刘大白／花牛歌 徐志摩）、3 繁星（巴金），习作“推荐一个好地方”保留；',
    '第二单元删去《呼风唤雨的世纪》《蝴蝶的家》，新增《方帽子店》（原三下）和《田忌赛马》（原五下），即 4 一个豆荚里的五粒豆、5 夜间飞行的秘密、6 方帽子店、7* 田忌赛马，语文要素仍为“阅读时从不同角度提问”。',
    '【不确定】第一单元口语交际是否仍为“我们与环境”；第二单元习作题目——搜索摘要为“我的家人”（2024 年起的印次已由旧版“小小‘动物园’”改为“我的家人”），本文件按“写家人：抓特点、用事例”编写，两种题目都适用；',
    '《方帽子店》《田忌赛马》哪篇是略读（*）、课后提问任务的具体分工，以及新版课文是否有删改，均未见到正文。',
    '若新版无法核实，旧版 2019 目录为：观潮、走月亮、现代诗二首、繁星；一个豆荚里的五粒豆、夜间飞行的秘密、呼风唤雨的世纪、蝴蝶的家。',
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
            '介绍钱塘江大潮与观潮的时间地点（农历八月十八，海宁盐官镇），带孩子按“潮来前—潮来时—潮头过后”梳理课文顺序，重点讲潮来时：声音从闷雷滚动到山崩地裂，样子从一条白线到白色城墙、千万匹白色战马，体会作者按顺序、抓声音和样子写出大潮的雄伟。只引用个别关键句，不整段抄录课文。',
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
        practice: [{ generatorId: 'yw4.words', minDifficulty: 1, maxDifficulty: 5, variant: 'u1.tide' }, { generatorId: 'yw4.polyphone', minDifficulty: 1, maxDifficulty: 5, variant: 'u1.tide', label: '多音字' }],
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
        practice: [{ generatorId: 'yw4.words', minDifficulty: 1, maxDifficulty: 5, variant: 'u1.modern-poems' }, { generatorId: 'yw4.polyphone', minDifficulty: 1, maxDifficulty: 5, variant: 'u1.modern-poems', label: '多音字' }],
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
        practice: [{ generatorId: 'yw4.words', minDifficulty: 1, maxDifficulty: 5, variant: 'u1.stars' }, { generatorId: 'yw4.polyphone', minDifficulty: 1, maxDifficulty: 5, variant: 'u1.stars', label: '多音字' }],
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
        practice: [{ generatorId: 'yw4.words', minDifficulty: 1, maxDifficulty: 5, variant: 'u1.recommend-place' }, { generatorId: 'yw4.polyphone', minDifficulty: 1, maxDifficulty: 5, variant: 'u1.recommend-place', label: '多音字' }],
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
        practice: [{ generatorId: 'yw4.words', minDifficulty: 1, maxDifficulty: 5, variant: 'u2.peas' }, { generatorId: 'yw4.polyphone', minDifficulty: 1, maxDifficulty: 5, variant: 'u2.peas', label: '多音字' }],
      },
      {
        slug: 'night-flight',
        title: '夜间飞行的秘密',
        objectives: [
          '说出科学家做的三次试验和得出的结论',
          '知道雷达是受蝙蝠启发发明的',
          '学会从内容、写法、启示等不同角度提问',
        ],
        keyPoints: [
          '重点：三次试验——蒙眼睛不撞铃铛，塞耳朵、封嘴巴就乱撞',
          '难点：理解蝙蝠用嘴发出超声波、用耳朵接收回声来探路，雷达的原理与此相似',
          '常见错误：以为蝙蝠靠眼睛在夜里飞行',
        ],
        prerequisites: ['yw-g4a.u2.peas'],
        lecture: {
          title: '夜间飞行的秘密：蝙蝠和雷达',
          minutes: 10,
          focus:
            '讲科学家怎样用拉满绳子、系着铃铛的屋子做三次试验：蒙住蝙蝠眼睛照样飞，塞住耳朵或封住嘴就到处乱撞，由此发现蝙蝠靠嘴和耳朵配合、用超声波探路；人们受此启发给飞机装上雷达，让飞机夜里也能安全飞行。以此教提问策略第二步：从内容、写法、得到的启示等不同角度提问。',
        },
        techniques: [
          {
            slug: 'question-angles',
            title: '换个角度提问题',
            minutes: 4,
            focus:
              '教孩子从三个角度提问：针对内容（为什么蒙上眼睛铃铛不响）、针对写法（作者为什么把三次试验一次一次写清楚）、联系生活得到启示（生活里还有哪些东西学了动物本领）。每个角度举一个例子，再让孩子分类。',
          },
        ],
        practice: [{ generatorId: 'yw4.words', minDifficulty: 1, maxDifficulty: 5, variant: 'u2.night-flight' }, { generatorId: 'yw4.polyphone', minDifficulty: 1, maxDifficulty: 5, variant: 'u2.night-flight', label: '多音字' }],
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
        practice: [{ generatorId: 'yw4.words', minDifficulty: 1, maxDifficulty: 5, variant: 'u2.square-hats' }, { generatorId: 'yw4.polyphone', minDifficulty: 1, maxDifficulty: 5, variant: 'u2.square-hats', label: '多音字' }],
      },
      {
        slug: 'horse-race',
        title: '田忌赛马',
        objectives: [
          '讲清田忌第一次输、第二次赢的经过',
          '明白孙膑调换马的出场顺序为什么能赢',
          '综合运用提问方法读懂故事',
        ],
        keyPoints: [
          '重点：同样的三匹马，只换了出场顺序，结果从三场全输变成两胜一负',
          '难点：理解孙膑善于观察、分析，扬长避短',
          '常见错误：以为田忌第二次换了更好的马',
        ],
        prerequisites: ['yw-g4a.u2.night-flight'],
        lecture: {
          title: '田忌赛马：换个顺序就能赢',
          minutes: 10,
          focus:
            '讲齐国大将田忌和齐威王赛马的故事：第一次每个等级的马都比不过齐威王，三场全输；孙膑让田忌用下等马对上等马、上等马对中等马、中等马对下等马，结果两胜一负赢了比赛。用表格对比两次比赛，引导孩子提问并综合运用提问方法，体会孙膑的智慧。',
        },
        techniques: [],
        practice: [{ generatorId: 'yw4.words', minDifficulty: 1, maxDifficulty: 5, variant: 'u2.horse-race' }, { generatorId: 'yw4.polyphone', minDifficulty: 1, maxDifficulty: 5, variant: 'u2.horse-race', label: '多音字' }],
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
        practice: [{ generatorId: 'yw4.words', minDifficulty: 1, maxDifficulty: 5, variant: 'u2.my-family' }],
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
        ],
      },
    ]),
  ],
};
