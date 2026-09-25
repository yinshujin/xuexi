import type { Book } from '../types';
import type { KpInput } from './helpers';
import { unit } from './helpers';

const B = 'en-g4a';

/** Routine practice plus 拔高 / 创新 for one knowledge point of this book. */
function practice(kp: string): KpInput['practice'] {
  return [
    { generatorId: 'en4.words', minDifficulty: 1, maxDifficulty: 5, variant: kp },
    { generatorId: 'en4.words', variant: `${kp}#stretch`, tier: 'stretch', minDifficulty: 3, maxDifficulty: 5 },
    { generatorId: 'en4.words', variant: `${kp}#creative`, tier: 'creative', minDifficulty: 3, maxDifficulty: 5 },
  ];
}

/**
 * 沪教牛津版（深圳用）英语 四年级上册 —— 新版“Big Question”教材，8 个单元。
 * 每单元两个知识点：单词与字母发音（uN.words）、句型（uN.grammar）。来源见 sourceNote。
 */
export const enG4a: Book = {
  id: B,
  subject: 'english',
  edition: '沪教牛津版（深圳）',
  revision: '新版（Big Question 版）',
  grade: 4,
  term: '上',
  title: '英语 四年级上册（沪教牛津版 深圳用）',
  sourceNote: [
    '依据：家长拍摄的孩子手中课本目录页（新版“Big Question”教材，每单元分 Get ready / Explore / Communicate / Extend 四部分，书后有 Project 1、Project 2、Unit checklist 和 Word list）。',
    '8 个单元的 Big Question、单词（Words）、字母发音（Sound）、语法句型（Grammar）以及 Reading / Listening / Speaking / Writing / Extend 的标题均按目录页编码：',
    'U1 Where do people live?（city, building, flat, street, country, farm, house；a；Where do … live? … live …）；',
    'U2 Where do animals live?（eagle, owl, honeybee；i；Where\'s / Where are …? It\'s / They\'re …）；',
    'U3 How do we use numbers?（odd numbers, even numbers, plus, minus, equal, answer；e；How many … do we have? We have … / … don\'t have …）；',
    'U4 What do we buy?（supermarket, a bag of rice, a box of eggs, a bottle of juice；o；What would you like? I\'d like … / How much is/are …? It\'s/They\'re … yuan）；',
    'U5 How are the seasons different?（spring, warm, summer, hot, autumn, cool, winter, cold；u；It gets/snows … It doesn\'t get/snow …）；',
    'U6 What\'s amazing about plants?（flower, fruit, leaf, soil；a, e；It has … It doesn\'t have …）；',
    'U7 How do we keep safe on the road?（green light, red light, wait, cross；i, o；Wait … Don\'t play …）；',
    'U8 What do our grandparents do?（go shopping, go for a walk, use the internet, do exercise, do housework, do gardening；u；Review）。',
    '课文、听力、故事的正文没有看到，所以练习和课里不引用课文原文，例句和小短文都是按单元情境另写的。',
    '【不确定】目录只写了字母，没写是哪种读音：本册按“U1–U5 学短元音（cat、big、ten、box、sun），U6–U8 学字母本身的长音（cake、he、kite、home、use，多为 a-e / i-e / o-e / u-e 结构）”来编；',
    '单词表之外只补充了很基础的词（如 tree、nest、panda、apple、road、grandpa），请家长对照课本核对。',
  ].join(''),
  units: [
    // ------------------------------------------------------------------ Unit 1
    unit(B, 1, 'Where do people live?（人们住在哪里？）', [
      {
        slug: 'words',
        title: '单词与发音：city, building, flat, street, country, farm, house；字母 a',
        objectives: [
          '会读、会认 city、building、flat、street、country、farm、house 七个单词',
          '分清城市（city）和乡村（country），知道 flat 和 house 都是住的地方',
          '会读字母 a 在 cat、flat、map 里的短音，能和 cake、name 里的 a 区分',
        ],
        keyPoints: [
          '重点：七个“家和地方”单词的读音、意思和拼写',
          '难点：flat 是楼房里的一套房子（公寓），house 是独立的一栋房子；country 在本单元是“乡村”',
          '发音：a 在闭音节里读短音（cat、flat、hat、bag），在 cake、name 里读字母本身的音',
          '常见错误：building 漏写 i（bulding）；country 写成 contry；street 写成 stret',
        ],
        prerequisites: [],
        localContexts: ['深圳福田的高楼和住宅小区', '周末回老家的农场看爷爷奶奶', '小区门口的街道'],
        lecture: {
          title: 'Where do people live? 城市和乡村的单词',
          minutes: 10,
          focus:
            '用“深圳的家 vs 老家的农场”两幅画面导入。教 city、building、flat、street、country、farm、house，每个词领读两遍、配中文和画面；把单词分成“城市里（city, building, flat, street）”和“乡村里（country, farm, house）”两组。最后学字母 a 的短音：cat、flat、map、bag，并和 cake、name 对比。',
        },
        techniques: [
          {
            slug: 'short-a',
            title: '字母 a 的短音：cat, flat, map',
            minutes: 4,
            focus:
              '只讲一个方法：a 夹在两个辅音字母中间（像 c-a-t、f-l-a-t）时读短音，嘴巴张大、声音短促。演示 cat、flat、bag 三个例子，拼读 f-l-a-t → flat；对比 cake、name 里 a 读字母本身的音；用一句小 chant 帮助记忆：A cat on a mat in a flat.',
          },
        ],
        practice: practice('u1.words'),
      },
      {
        slug: 'grammar',
        title: '句型：Where do … live? … live in / on …',
        objectives: [
          '会用 Where do you / they live? 问别人住在哪里',
          '会用 I / We / They live in … 回答，并说出城市、公寓、街道',
          '知道“住在农场”说 live on a farm，“住在乡村”说 live in the country',
        ],
        keyPoints: [
          '重点：Where do you live? — I live in a flat in the city.',
          '难点：介词 in / on：live in a city / a flat / a house / the country，但住在农场上要说 live on a farm',
          '场景：小记者采访别人住在哪里（Listening: A student reporter’s trip），介绍自己的家（Writing: About your home）',
          '常见错误：漏掉 do（Where you live?）；回答时漏掉 live 或介词（I live a flat.）；问句句末漏问号',
        ],
        prerequisites: ['en-g4a.u1.words'],
        localContexts: ['小记者在深圳街头采访', '介绍自己住的小区和楼层', '爷爷奶奶住在老家农场'],
        lecture: {
          title: 'Where do you live? 说说你住在哪里',
          minutes: 10,
          focus:
            '小记者采访情境。句型：Where do you live? — I live in a flat in Shenzhen. Where do they live? — They live on a farm in the country. 领读并替换 city、flat、house、farm、street；讲 do 是问句的“帮手”不能漏；讲介词：城市、公寓、房子、乡村都用 in，农场用 on（live on a farm）。最后用 3 句话介绍自己的家。不讲 he/she lives 的三单变化。',
        },
        techniques: [
          {
            slug: 'in-or-on',
            title: 'live in 还是 live on？一招选介词',
            minutes: 4,
            focus:
              '只讲一个规则：住在城市、公寓、房子、乡村里用 in（in the city, in a flat, in a house, in the country）；住在农场上用 on（on a farm）。演示 2 个例子；对比 I live in a farm. 的错误；用一句口诀帮助记忆：“城里楼里房子里，in 来帮忙；农场田野上，on 来登场。”',
          },
        ],
        practice: practice('u1.grammar'),
      },
    ]),
    // ------------------------------------------------------------------ Unit 2
    unit(B, 2, 'Where do animals live?（动物住在哪里？）', [
      {
        slug: 'words',
        title: '单词与发音：eagle, owl, honeybee；字母 i',
        objectives: [
          '会读、会认 eagle、owl、honeybee 等动物单词，知道它们住在哪里',
          '会读字母 i 在 big、fish、six 里的短音，能和 kite、five 里的 i 区分',
          '能用学过的单词说出一两种动物的家（nest、tree 等）',
        ],
        keyPoints: [
          '重点：eagle（老鹰）、owl（猫头鹰）、honeybee（蜜蜂）的读音、意思和拼写',
          '难点：honeybee 是 honey + bee 合成的长词；owl 的 ow 发音',
          '发音：i 在闭音节里读短音（big、pig、fish、six），在 kite、five 里读字母本身的音',
          '常见错误：eagle 写成 egale；honeybee 拆开写或漏写 e',
        ],
        prerequisites: [],
        localContexts: ['周末去深圳野生动物园', '仙湖植物园里的蜜蜂和花', '学校树上的鸟窝'],
        lecture: {
          title: 'Where do animals live? 动物和它们的家',
          minutes: 10,
          focus:
            '动物园情境导入。教 eagle、owl、honeybee，复习 panda、fish、tree、nest，每个词领读两遍、配中文和动物特点（老鹰飞得高、猫头鹰晚上醒着、蜜蜂会做蜂蜜）。用 An owl lives in a tree. 这类简单句带出动物的家，下一课再系统学 Where’s / Where are。最后学字母 i 的短音：big、fish、six，并和 kite、five 对比。',
        },
        techniques: [
          {
            slug: 'short-i',
            title: '字母 i 的短音：big, fish, six',
            minutes: 4,
            focus:
              '只讲一个方法：i 夹在辅音字母中间（b-i-g、f-i-sh）读短音，嘴角微微咧开、声音短。演示 big、fish、six 三个例子并拼读；对比 kite、five、nine 里 i 读字母本身的音；用一句 chant 帮助记忆：A big pig and six fish.',
          },
        ],
        practice: practice('u2.words'),
      },
      {
        slug: 'grammar',
        title: '句型：Where’s …? It’s … / Where are …? They’re …',
        objectives: [
          '会用 Where’s the …? It’s in / on / under … 问答一只动物在哪里',
          '会用 Where are the …? They’re … 问答几只动物在哪里',
          '会用 in、on、under 说出动物的位置和家',
        ],
        keyPoints: [
          '重点：Where’s the owl? — It’s in the tree. Where are the honeybees? — They’re in the garden.',
          '难点：一只用 Where’s … It’s …，两只以上（名词加 s）用 Where are … They’re …',
          '场景：电视节目介绍动物的家（Listening: A TV show about animals’ homes），介绍一种喜欢的动物（Writing）',
          '常见错误：Where’s the birds?（多只却用 is）；回答时用 It’s 回答复数；Where’s 漏掉撇号',
        ],
        prerequisites: ['en-g4a.u2.words'],
        localContexts: ['在深圳野生动物园找动物', '公园里找小鸟和蜜蜂', '看动物纪录片'],
        lecture: {
          title: 'Where’s the owl? 动物在哪里',
          minutes: 10,
          focus:
            '电视节目“动物的家”情境。句型：Where’s the owl? — It’s in the tree. Where are the honeybees? — They’re in the garden. Where’s the eagle? — It’s on the hill. 领读并替换动物和地点；讲一只用 is / It’s，多只用 are / They’re；复习 in、on、under。最后用 3 句话介绍一种喜欢的动物和它的家。',
        },
        techniques: [
          {
            slug: 'one-or-more',
            title: '一只还是很多只：is / It’s 和 are / They’re',
            minutes: 4,
            focus:
              '只讲一个方法：先看动物名字后面有没有 s——没有 s 是一只，问 Where’s …?，答 It’s …；有 s 是很多只，问 Where are …?，答 They’re …。演示 the owl / the owls 两个例子；对比 Where’s the birds? 的错误；用手势“一根手指 is，张开五指 are”帮助记忆。',
          },
        ],
        practice: practice('u2.grammar'),
      },
    ]),
    // ------------------------------------------------------------------ Unit 3
    unit(B, 3, 'How do we use numbers?（我们怎样使用数字？）', [
      {
        slug: 'words',
        title: '单词与发音：odd numbers, even numbers, plus, minus, equal, answer；字母 e',
        objectives: [
          '会读、会认 odd numbers、even numbers、plus、minus、equal、answer',
          '能用英语读简单算式：Three plus four equals seven.',
          '会读字母 e 在 ten、pen、red 里的短音，能和 he、me 里的 e 区分',
        ],
        keyPoints: [
          '重点：plus（加）、minus（减）、equal（等于）读算式；odd numbers（单数）、even numbers（双数）',
          '难点：odd / even 分单双数：1、3、5、7、9 是 odd，2、4、6、8、10 是 even',
          '发音：e 在闭音节里读短音（ten、pen、red、bed），在 he、me、we 里读字母本身的音',
          '常见错误：plus 和 minus 弄反；equal 写成 eqaul；answer 漏写不发音的 w',
        ],
        prerequisites: [],
        localContexts: ['超市里算一算要付多少钱', '深圳地铁的车厢号和站台号', '数学课上用英语读算式'],
        lecture: {
          title: 'How do we use numbers? 用英语读算式',
          minutes: 10,
          focus:
            '数字游戏情境导入。教 odd numbers、even numbers、plus、minus、equal、answer，每个词领读两遍并配中文；用 2 + 3 = 5 读作 Two plus three equals five.、9 − 4 = 5 读作 Nine minus four equals five. 练习读算式；用 1–10 分单双数。最后学字母 e 的短音：ten、pen、red，并和 he、me 对比。只用 20 以内的数。',
        },
        techniques: [
          {
            slug: 'read-sums',
            title: '用英语读算式：plus, minus, equals',
            minutes: 4,
            focus:
              '只讲一个方法：看符号换单词——“+”读 plus，“−”读 minus，“=”读 equals，数字照读。演示 3 + 5 = 8 和 10 − 2 = 8 两个例子；对比把“−”读成 plus 的错误；用一句口诀帮助记忆：“加号 plus 多一点，减号 minus 少一点，等号 equals 答案见。”',
          },
        ],
        practice: practice('u3.words'),
      },
      {
        slug: 'grammar',
        title: '句型：How many … do we have? We have … / We don’t have …',
        objectives: [
          '会用 How many … do we have? 问有多少个',
          '会用 We have … 回答数量，用 We don’t have … 说没有什么',
          '知道 How many 后面的名词要用复数（apples、bananas）',
        ],
        keyPoints: [
          '重点：How many apples do we have? — We have six apples. We don’t have any pears.',
          '难点：How many 后面跟名词复数；don’t = do not，“没有”说 don’t have',
          '场景：做水果沙拉点水果（Listening: Making a fruit salad），用数字问问题（Speaking）',
          '常见错误：How many apple（漏 s）；说成 We not have …；问句漏掉 do',
        ],
        prerequisites: ['en-g4a.u3.words'],
        localContexts: ['和家人做水果沙拉', '班级春游准备零食', '数一数教室里的书'],
        lecture: {
          title: 'How many apples do we have? 做水果沙拉',
          minutes: 10,
          focus:
            '做水果沙拉情境。句型：How many apples do we have? — We have six. How many bananas do we have? — We have two bananas. We don’t have any pears. 领读并替换水果和数字；讲 How many 后面的名词加 s；讲“没有”用 don’t have。最后结合 plus / minus 算一算一共有几个。',
        },
        techniques: [
          {
            slug: 'how-many-s',
            title: 'How many 后面加 s',
            minutes: 4,
            focus:
              '只讲一个规则：问“有多少个”时，How many 后面的东西不止一个，要用复数，一般加 s（apples、pears、eggs）。演示 2 个例子；对比 How many apple do we have? 的错误；用一句 chant 帮助记忆：How many, how many? Add an s, add an s!',
          },
        ],
        practice: practice('u3.grammar'),
      },
    ]),
    // ------------------------------------------------------------------ Unit 4
    unit(B, 4, 'What do we buy?（我们买什么？）', [
      {
        slug: 'words',
        title: '单词与发音：supermarket, a bag of rice, a box of eggs, a bottle of juice；字母 o',
        objectives: [
          '会读、会认 supermarket、a bag of rice、a box of eggs、a bottle of juice',
          '会用 a bag of / a box of / a bottle of 说出一袋、一盒、一瓶东西',
          '会读字母 o 在 box、dog、hot 里的短音，能和 go、home 里的 o 区分',
        ],
        keyPoints: [
          '重点：supermarket（超市）和三个“数量 + of + 东西”短语',
          '难点：米装在袋子里（bag），鸡蛋装在盒子里（box），果汁装在瓶子里（bottle），不能乱搭',
          '发音：o 在闭音节里读短音（box、dog、hot、shop），在 go、no、home 里读字母本身的音',
          '常见错误：supermarket 写成 supermaket；bottle 写成 botle；漏掉 of',
        ],
        prerequisites: [],
        localContexts: ['和妈妈去小区楼下的超市', '周末去大型超市采购', '准备生日派对要买的东西'],
        lecture: {
          title: 'What do we buy? 去超市买东西',
          minutes: 10,
          focus:
            '去超市情境导入。教 supermarket、a bag of rice、a box of eggs、a bottle of juice，每个短语领读两遍、配图片和中文；练习“容器 + of + 东西”的搭配（a bag of rice，不说 a bottle of rice）。最后学字母 o 的短音：box、dog、hot，并和 go、home 对比。',
        },
        techniques: [
          {
            slug: 'short-o',
            title: '字母 o 的短音：box, dog, hot',
            minutes: 4,
            focus:
              '只讲一个方法：o 夹在辅音字母中间（b-o-x、d-o-g）读短音，嘴巴张圆、声音短。演示 box、dog、hot 三个例子并拼读；对比 go、no、home 里 o 读字母本身的音；用一句 chant 帮助记忆：A dog in a box in a hot shop.',
          },
        ],
        practice: practice('u4.words'),
      },
      {
        slug: 'grammar',
        title: '句型：What would you like? / How much is / are …?',
        objectives: [
          '会用 What would you like? 问别人想要什么，用 I’d like … 回答',
          '会用 How much is …? It’s … yuan. 问答一样东西的价钱',
          '会用 How much are …? They’re … yuan. 问答复数东西的价钱',
        ],
        keyPoints: [
          '重点：What would you like? — I’d like a bottle of juice. How much is it? — It’s eight yuan.',
          '难点：一样东西用 is / It’s，复数东西（eggs、apples）用 are / They’re；I’d = I would',
          '场景：在商店买东西（Listening: At the shops），为生日派对购物（Speaking）',
          '常见错误：How many is it?；How much is the apples?；I like 和 I’d like 混用',
        ],
        prerequisites: ['en-g4a.u4.words'],
        localContexts: ['在超市收银台问价钱', '给好朋友买生日礼物', '在学校义卖活动当小店员'],
        lecture: {
          title: 'How much is it? 在商店买东西',
          minutes: 10,
          focus:
            '生日派对购物情境。句型：What would you like? — I’d like a box of eggs. How much is the juice? — It’s eight yuan. How much are the apples? — They’re ten yuan. 领读并替换商品和价钱；讲 How much 问价钱、How many 问数量；讲一样东西用 is / It’s，复数用 are / They’re。最后编一段 4 句的购物对话。',
        },
        techniques: [
          {
            slug: 'much-or-many',
            title: 'How much 还是 How many？',
            minutes: 4,
            focus:
              '只讲一个方法：问“多少钱”用 How much，答 … yuan；问“多少个”用 How many，答数字。演示 How much is the juice? It’s six yuan. 和 How many eggs do we have? We have ten. 两个例子；对比 How many is it? 的错误；用口诀帮助记忆：“钱用 much，个用 many。”',
          },
        ],
        practice: practice('u4.grammar'),
      },
    ]),
    // ------------------------------------------------------------------ Unit 5
    unit(B, 5, 'How are the seasons different?（四季有什么不同？）', [
      {
        slug: 'words',
        title: '单词与发音：spring, warm, summer, hot, autumn, cool, winter, cold；字母 u',
        objectives: [
          '会读、会认四个季节 spring、summer、autumn、winter',
          '会用 warm、hot、cool、cold 说出每个季节的天气',
          '会读字母 u 在 sun、bus、summer 里的短音，能和 use、cute 里的 u 区分',
        ],
        keyPoints: [
          '重点：四季单词和四个天气形容词的对应：spring—warm，summer—hot，autumn—cool，winter—cold',
          '难点：autumn 结尾的 n 不发音；warm 和 cool、hot 和 cold 意思相近又不同',
          '发音：u 在闭音节里读短音（sun、bus、cup、summer），在 use、cute 里读字母本身的音',
          '常见错误：autumn 漏写 n；summer 写成 sumer；winter 和 summer 的天气记反',
        ],
        prerequisites: [],
        localContexts: ['深圳的夏天又长又热', '冬天去北方看雪', '春天去莲花山放风筝'],
        lecture: {
          title: 'The four seasons：四季和天气',
          minutes: 10,
          focus:
            '四季图片导入。教 spring—warm、summer—hot、autumn—cool、winter—cold，每组领读两遍、配中文和画面；用 Spring is warm. 这样的简单句把季节和天气连起来。联系深圳：夏天很热，冬天不太冷。最后学字母 u 的短音：sun、bus、summer，并和 use、cute 对比。',
        },
        techniques: [
          {
            slug: 'season-pairs',
            title: '季节配天气：四组好朋友',
            minutes: 4,
            focus:
              '只讲一个方法：把季节和天气配成四对来记——spring warm、summer hot、autumn cool、winter cold，按一年的顺序越来越热、再越来越冷。演示 2 个例子；对比 Winter is hot. 的错误；用一首四句的 chant 帮助记忆。',
          },
        ],
        practice: practice('u5.words'),
      },
      {
        slug: 'grammar',
        title: '句型：It gets … / It snows … / It doesn’t get … / It doesn’t snow …',
        objectives: [
          '会用 It gets hot / cold in … 说季节里天气变得怎样',
          '会用 It snows in winter. 说下雪',
          '会用 It doesn’t get … / It doesn’t snow … 说“不会……”',
        ],
        keyPoints: [
          '重点：It gets hot in summer. It snows in winter. It doesn’t snow in Shenzhen.',
          '难点：It 后面动词加 s（gets、snows）；否定用 doesn’t，后面的动词不加 s（It doesn’t get cold.）',
          '场景：四季里玩什么（Listening），调查大家最喜欢的季节（Speaking）',
          '常见错误：It doesn’t snows.；It get hot.；季节前漏掉 in',
        ],
        prerequisites: ['en-g4a.u5.words'],
        localContexts: ['深圳冬天不下雪', '夏天去大梅沙游泳', '调查同学最喜欢的季节'],
        lecture: {
          title: 'It gets hot in summer. 说说四季的天气',
          minutes: 10,
          focus:
            '季节调查情境。句型：It gets warm in spring. It gets hot in summer. It snows in winter in Beijing. It doesn’t snow in Shenzhen. It doesn’t get very cold. 领读并替换季节和天气；讲 It 后面动词加 s，doesn’t 后面动词不加 s；最后说说自己最喜欢的季节：I like summer. It gets hot. I can swim.',
        },
        techniques: [
          {
            slug: 'doesnt-no-s',
            title: 'doesn’t 后面去掉 s',
            minutes: 4,
            focus:
              '只讲一个规则：肯定句 It gets / It snows 动词带 s；变成否定句时 s 跑到 doesn’t 里去了，后面的动词不再加 s：It doesn’t get / It doesn’t snow。演示 2 个例子；对比 It doesn’t snows. 的错误；用“s 搬家”的小故事帮助记忆。',
          },
        ],
        practice: practice('u5.grammar'),
      },
    ]),
    // ------------------------------------------------------------------ Unit 6
    unit(B, 6, 'What’s amazing about plants?（植物有什么神奇之处？）', [
      {
        slug: 'words',
        title: '单词与发音：flower, fruit, leaf, soil；字母 a、e 的长音',
        objectives: [
          '会读、会认 flower、fruit、leaf、soil，能说出植物的各个部分',
          '知道植物长在 soil（土壤）里，会开 flower、结 fruit',
          '会读 a 在 cake、name 里、e 在 he、these 里读字母本身的音，能和 cat、ten 区分',
        ],
        keyPoints: [
          '重点：flower（花）、fruit（果实）、leaf（叶子）、soil（土壤）的读音、意思和拼写',
          '难点：leaf 的 ea 读长音；soil 的 oi 发音',
          '发音：cake、name 里的 a 和 he、me 里的 e 都读字母本身的音',
          '常见错误：flower 写成 flowr；fruit 写成 furit；leaf 写成 leef',
        ],
        prerequisites: [],
        localContexts: ['学校种植园里的向日葵', '深圳街头的簕杜鹃', '阳台上种的小番茄'],
        lecture: {
          title: 'My sunflower：植物的各个部分',
          minutes: 10,
          focus:
            '学校种植园情境导入。教 flower、fruit、leaf、soil，复习 sunflower，每个词领读两遍、指着植物图片说部位；用 The sunflower has a big flower. 带出单词。最后学 a、e 读字母本身的音：cake、name、he、these，并和 cat、ten 对比（magic e 让前面的元音读字母名）。',
        },
        techniques: [
          {
            slug: 'magic-e',
            title: '神奇的 e：cat → cake',
            minutes: 4,
            focus:
              '只讲一个方法：单词结尾有一个不发音的 e 时，前面的 a 读字母本身的音（cake、name、make）；e 自己在 he、me、these 里也读字母本身的音。演示 cap → cape 和 Pet → Pete 两组对比；对比把 cake 读成 cak 的错误；用口诀帮助记忆：“尾巴 e 不出声，前面元音念名字。”',
          },
        ],
        practice: practice('u6.words'),
      },
      {
        slug: 'grammar',
        title: '句型：It has … / It doesn’t have …',
        objectives: [
          '会用 It has … 说一种植物有什么（花、叶子、果实）',
          '会用 It doesn’t have … 说植物没有什么',
          '能用 3–4 句话介绍一种植物的样子和生长',
        ],
        keyPoints: [
          '重点：It has big yellow flowers. It has green leaves. It doesn’t have fruit.',
          '难点：It 后面用 has（不用 have）；否定用 doesn’t have（不说 doesn’t has）',
          '场景：学校花园里的植物（Listening），植物的生长（Speaking / Writing）',
          '常见错误：It have …；It doesn’t has …；leaf 的复数写成 leafs（应为 leaves）',
        ],
        prerequisites: ['en-g4a.u6.words'],
        localContexts: ['介绍学校花园里的一棵植物', '观察阳台上的小番茄', '深圳的荔枝树'],
        lecture: {
          title: 'It has big yellow flowers. 介绍一种植物',
          minutes: 10,
          focus:
            '学校花园情境。句型：This is my sunflower. It’s tall. It has big yellow flowers. It has green leaves. It doesn’t have fruit now. 领读并替换植物和部位；讲 It 后面用 has，否定 doesn’t have；讲 leaf → leaves。最后按“小苗—长叶—开花—结果”说说植物的生长。',
        },
        techniques: [
          {
            slug: 'has-doesnt-have',
            title: 'It has 和 It doesn’t have',
            minutes: 4,
            focus:
              '只讲一个规则：说“它有”用 It has；说“它没有”用 It doesn’t have，doesn’t 后面换回 have。演示 It has leaves. / It doesn’t have flowers. 两个例子；对比 It doesn’t has fruit. 的错误；用“has 遇到 doesn’t 就变回 have”帮助记忆。',
          },
        ],
        practice: practice('u6.grammar'),
      },
    ]),
    // ------------------------------------------------------------------ Unit 7
    unit(B, 7, 'How do we keep safe on the road?（怎样安全过马路？）', [
      {
        slug: 'words',
        title: '单词与发音：green light, red light, wait, cross；字母 i、o 的长音',
        objectives: [
          '会读、会认 green light、red light、wait、cross 和 road、safe',
          '知道红灯停、绿灯行：Wait at the red light. Cross at the green light.',
          '会读 i 在 kite、five 里、o 在 home、nose 里读字母本身的音，能和 big、box 区分',
        ],
        keyPoints: [
          '重点：green light（绿灯）、red light（红灯）、wait（等待）、cross（穿过马路）',
          '难点：red light 要 wait，green light 才能 cross；cross the road 是“过马路”',
          '发音：i-e（kite、five、ride）、o-e（home、nose、rose）里的 i、o 读字母本身的音',
          '常见错误：light 写成 ligth；wait 写成 wiat；cross 漏写一个 s',
        ],
        prerequisites: [],
        localContexts: ['上学路上过斑马线', '深南大道的红绿灯', '学校门口的交通协管员'],
        lecture: {
          title: 'Our way to school：过马路的单词',
          minutes: 10,
          focus:
            '上学路上情境导入。教 green light、red light、wait、cross，复习 road、safe，每个词领读两遍并配动作（停下等、走过去）；用 Red light, wait! Green light, cross! 做口令游戏。最后学 i、o 读字母本身的音：kite、five、home、nose，并和 big、box 对比。',
        },
        techniques: [
          {
            slug: 'long-i-o',
            title: 'i-e 和 o-e：kite, home',
            minutes: 4,
            focus:
              '只讲一个方法：结尾有不发音的 e 时，前面的 i、o 读字母本身的音：kit → kite，hop → hope。演示 kite、five、home、nose；对比 big、box 的短音；用一句 chant 帮助记忆：Five kites fly home.',
          },
        ],
        practice: practice('u7.words'),
      },
      {
        slug: 'grammar',
        title: '句型：Wait … / Don’t play … 提出安全建议',
        objectives: [
          '会用 Wait for the green light. 这样的祈使句提出要求',
          '会用 Don’t play on the road. 这样的句子提醒别人不要做危险的事',
          '能看懂常见交通标志，说出一两条安全提示',
        ],
        keyPoints: [
          '重点：Wait at the red light. Look left and right. Don’t play on the road. Don’t run.',
          '难点：祈使句用动词原形开头，没有主语；“不要”在句首加 Don’t',
          '场景：交通安全知识问答（Listening），给别人安全提示（Speaking），介绍交通标志（Writing）',
          '常见错误：Not play on the road.；Don’t plays …；Waits for the green light.',
        ],
        prerequisites: ['en-g4a.u7.words'],
        localContexts: ['放学路上提醒同学注意安全', '交通安全主题班会', '坐地铁、公交时的安全提示'],
        lecture: {
          title: 'Don’t play on the road! 给出安全提示',
          minutes: 10,
          focus:
            '交通安全班会情境。句型：Wait for the green light. Look left and right. Cross the road at the green light. Don’t play on the road. Don’t run across the road. 领读并配动作；讲祈使句用动词原形开头，“不要……”用 Don’t + 动词原形；看几个交通标志说安全提示。',
        },
        techniques: [
          {
            slug: 'dont-plus-verb',
            title: 'Don’t + 动词原形',
            minutes: 4,
            focus:
              '只讲一个规则：提醒别人“不要做”时，句子开头用 Don’t，后面紧跟动词原形：Don’t play. Don’t run. 演示 2 个例子；对比 Not play on the road. 和 Don’t plays. 两个错误；用交警手势配口令帮助记忆。',
          },
        ],
        practice: practice('u7.grammar'),
      },
    ]),
    // ------------------------------------------------------------------ Unit 8
    unit(B, 8, 'What do our grandparents do?（爷爷奶奶做什么？）', [
      {
        slug: 'words',
        title: '单词与发音：go shopping, go for a walk, use the internet, do exercise, do housework, do gardening；字母 u 的长音',
        objectives: [
          '会读、会认 go shopping、go for a walk、use the internet、do exercise、do housework、do gardening',
          '分清用 go 和用 do 的短语',
          '会读 u 在 use、cute 里读字母本身的音，能和 sun、bus 区分',
        ],
        keyPoints: [
          '重点：六个活动短语的读音、意思，以及 go 和 do 的搭配',
          '难点：go shopping、go for a walk 用 go；do exercise、do housework、do gardening 用 do；use the internet 用 use',
          '发音：u-e 结构（use、cute、tube）里 u 读字母本身的音',
          '常见错误：do shopping、go exercise；internet 写成 internat；housework 写成 housewrok',
        ],
        prerequisites: [],
        localContexts: ['爷爷每天早上在公园做运动', '奶奶在阳台做园艺', '外公用手机上网看新闻'],
        lecture: {
          title: 'Our grandparents：爷爷奶奶的一天',
          minutes: 10,
          focus:
            '爷爷奶奶的一天情境导入。教 go shopping、go for a walk、use the internet、do exercise、do housework、do gardening，每个短语领读两遍并配动作和中文；把短语分成 go 组、do 组和 use the internet。最后学 u 读字母本身的音：use、cute，并和 sun、bus 对比。',
        },
        techniques: [
          {
            slug: 'go-or-do',
            title: 'go 还是 do？活动短语分组记',
            minutes: 4,
            focus:
              '只讲一个方法：把活动分两组——出门去的用 go（go shopping、go for a walk），在做一件事用 do（do exercise、do housework、do gardening）。演示 2 个例子；对比 do shopping 的错误；用口诀帮助记忆：“出门 go，干活 do。”',
          },
        ],
        practice: practice('u8.words'),
      },
      {
        slug: 'grammar',
        title: '句型复习：谈谈爷爷奶奶做什么',
        objectives: [
          '能用本册学过的句型问答爷爷奶奶住在哪里、做什么',
          '会用 They often … / My grandpa likes … 介绍爷爷奶奶的爱好',
          '能用 4–5 句话介绍自己的爷爷或奶奶',
        ],
        keyPoints: [
          '重点：Where do your grandparents live? What do they do in the morning? They often go for a walk.',
          '难点：they 后面动词不变（They go shopping.）；爷爷 / 奶奶一个人时动词加 s（He goes shopping.）',
          '场景：采访爷爷，调查祖父母的爱好，写爷爷或奶奶，重阳节',
          '常见错误：My grandma do housework.；They goes for a walk.；What do your grandpa do?',
        ],
        prerequisites: ['en-g4a.u8.words'],
        localContexts: ['重阳节给爷爷奶奶打电话', '采访小区里的老人', '周末和外婆一起逛菜市场'],
        lecture: {
          title: 'What do our grandparents do? 介绍我的爷爷奶奶',
          minutes: 10,
          focus:
            '采访爷爷情境，复习本册句型。What do your grandparents do? — They often go for a walk. Where do they live? — They live in a flat in the city. My grandpa likes gardening. He does exercise every morning. My grandma uses the internet. 讲 they 后动词不变、he/she 后动词加 s；最后结合重阳节写 4–5 句介绍爷爷或奶奶。',
        },
        practice: practice('u8.grammar'),
      },
    ]),
  ],
};
