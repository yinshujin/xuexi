import type { Book } from '../types';
import { unit } from './helpers';

const B = 'en-g4a';

/**
 * 沪教牛津版（深圳用，一年级起点）英语 四年级上册 —— 只编码前两个单元
 * （Module 1 Getting to know you 中的 Unit 1、Unit 2）。
 *
 * 目录按 2013 年起在深圳使用的版本（《英语（深圳用）》，上海教育出版社）编码；
 * 2026 年秋若已换用修订版新教材，单元名称和内容可能不同（详见 sourceNote）。
 */
export const enG4a: Book = {
  id: B,
  subject: 'english',
  edition: '沪教牛津版（深圳）',
  revision: '2013（深圳用）',
  grade: 4,
  term: '上',
  title: '英语 四年级上册（沪教牛津版 深圳用）',
  sourceNote: [
    '本册只编码前两个单元，按深圳现行《英语（深圳用）》四年级上册（沪教牛津版，一年级起点）目录：',
    'Module 1 Getting to know you —— Unit 1 Meeting new people、Unit 2 Can you swim?（之后为 Unit 3，未编码）。',
    '依据：21 世纪教育网“小学英语新版-牛津上海版（深圳用）四年级上册”目录、原创力文档“2024-2025 学年沪教牛津版（深圳用）四年级上册教学设计合集”目录、',
    '学科网“七彩课堂 2023-2024 学年四年级英语上册（沪教牛津版深圳用）Module 1 Unit 2 Can you swim?”、腾讯文库“沪教牛津版（深圳用）Unit 2 Can you swim? 教案”等多个来源的检索摘要，',
    '单元名称已在多个来源中一致核对。注意：上海本地的试用本同一单元叫“Unit 2 Abilities”，深圳用本叫“Can you swim?”。',
    '单词与句型（Unit 1：meet、new、classmate、boy、girl、he、she、his、her，Good morning/afternoon，This is…、His/Her name’s…、Nice to meet you；',
    'Unit 2：swim、skate、ride a bicycle、run fast、jump high、fly、draw、sing、dance，Can you…? Yes, I can./No, I can’t.、What can you do?、I can… but I can’t…、Welcome to…）',
    '来自教案、练习的检索摘要，教材网站被网络代理屏蔽，未能逐页核对课本原文，课文人物与“Look and learn”具体词条可能略有出入。',
    '【不确定】2026 年秋义务教育全面换用新教材，深圳四年级可能已使用修订版沪教英语，但未检索到修订版四上目录；请家长对照孩子手中的课本核对单元名称和单词。',
  ].join(''),
  units: [
    // ------------------------------------------------------------------ Unit 1
    unit(B, 1, 'Meeting new people（认识新朋友）', [
      {
        slug: 'words',
        title: '新单词：认识新同学（meet, new, classmate, he, she, his, her）',
        objectives: [
          '会读、会认 meet、new、classmate、boy、girl 等新单词',
          '分清 he 和 she、his 和 her',
          '会用 Good morning 和 Good afternoon 打招呼',
        ],
        keyPoints: [
          '重点：meet、new、classmate、his、her 的读音和意思',
          '难点：his（他的）和 her（她的）要看人物是男孩还是女孩',
          '常见错误：把 he 和 she 弄反；把 his 说成 he',
        ],
        prerequisites: [],
        localContexts: ['开学第一天认识班里的新同学', '在小区里认识新邻居小朋友'],
        lecture: {
          title: 'Meeting new people：认识新同学的单词',
          minutes: 10,
          focus:
            '开学第一天情境。教新词：meet、new、classmate、boy、girl、he、she、his、her，每个词领读两遍并配中文。复习 Good morning / Good afternoon 打招呼。用男孩、女孩图片对比 he/she、his/her。不教新句型以外的语法术语。',
        },
        techniques: [
          {
            slug: 'his-her',
            title: '他的还是她的：his 和 her 快速判断',
            minutes: 4,
            focus:
              '只讲一个方法：先看是男孩还是女孩——男孩用 he / his，女孩用 she / her。演示 2 个例子：This is Peter. His name’s Peter. / This is Jill. Her name’s Jill.；对比把女孩说成 his name 的错误；小口诀帮助记忆。',
          },
        ],
        practice: [],
      },
      {
        slug: 'introduce',
        title: '句型：介绍新朋友（This is… His/Her name’s… Nice to meet you.）',
        objectives: [
          '会用 This is… 向别人介绍一位朋友',
          '会用 His name’s… / Her name’s… 说出朋友的名字',
          '认识新朋友时会说 Nice to meet you. 并回答 Nice to meet you too.',
        ],
        keyPoints: [
          '重点：This is… 和 His/Her name’s… 的意思和用法',
          '难点：name’s 是 name is 的缩写；回答时要加 too',
          '常见错误：人名首字母没大写；句末漏写句号；回答 Nice to meet you. 时漏说 too',
        ],
        prerequisites: ['en-g4a.u1.words'],
        localContexts: ['开学第一天认识班里的新同学', '在深圳湾公园遇到新朋友'],
        lecture: {
          title: '介绍新朋友：This is… Nice to meet you.',
          minutes: 10,
          focus:
            '在教室情境中练对话：Good morning. This is my new classmate. His name’s Peter. / Her name’s Jill. Nice to meet you. — Nice to meet you too. 句型领读、替换人名练习；提示人名首字母大写、name’s = name is；最后用 My name’s… 做自我介绍。',
        },
        techniques: [
          {
            slug: 'greetings-time',
            title: '看时间打招呼：Good morning / afternoon / evening',
            minutes: 4,
            focus:
              '只讲一个方法：看时间选招呼——上午 Good morning，下午 Good afternoon，晚上见面 Good evening，睡前道别 Good night。演示 2 个例子；对比晚上见面说 Good night 的错误；中文口诀帮助记忆。',
          },
        ],
        practice: [],
      },
    ]),
    // ------------------------------------------------------------------ Unit 2
    unit(B, 2, 'Can you swim?（你会游泳吗？）', [
      {
        slug: 'words',
        title: '新单词：我会做的事（swim, skate, ride a bicycle, run fast, jump high）',
        objectives: [
          '会读、会认 swim、skate、ride a bicycle、run fast、jump high、fly 等动作词',
          '能边做动作边说出这些短语',
          '复习 draw、sing、dance 等学过的动作词',
        ],
        keyPoints: [
          '重点：swim、skate、ride a bicycle、run fast、jump high 的读音和意思',
          '难点：run fast、jump high 是“动作 + 怎么样”的短语，要连在一起说',
          '常见错误：bicycle 拼写漏字母；把 ride a bicycle 说成 ride bicycle',
        ],
        prerequisites: [],
        localContexts: ['学校运动会', '周末在深圳湾骑自行车', '在小区游泳池游泳'],
        lecture: {
          title: 'Can you swim?：会做的事情单词',
          minutes: 10,
          focus:
            '运动会情境。教动作短语：swim、skate、ride a bicycle、run fast、jump high、fly，每个领读两遍并配动作和中文；复习 draw、sing、dance。用 I can swim. 等简单句子带出单词，下一课再系统学问答。',
        },
        techniques: [
          {
            slug: 'act-it-out',
            title: '动作记单词法：边做边说',
            minutes: 4,
            focus:
              '只讲一个方法：边做动作边说词组（TPR 记单词）。演示 2 个例子：做蛙泳动作说 swim，原地快跑说 run fast；对比漏说 a 的 ride bicycle；用一小段 chant 串起 swim、skate、ride a bicycle、run fast、jump high。',
          },
        ],
        practice: [],
      },
      {
        slug: 'can-questions',
        title: '句型：Can you…? Yes, I can. / No, I can’t. What can you do?',
        objectives: [
          '会用 Can you…? 问别人会不会做某事',
          '会用 Yes, I can. / No, I can’t. 回答',
          '会用 What can you do? 问、用 I can… 答',
          '会说 He can… / She can… 介绍别人的本领',
        ],
        keyPoints: [
          '重点：Can you…? Yes, I can. / No, I can’t. 和 What can you do? I can…',
          '难点：can 后面跟动词原形，he/she 也一样（She can swim.，不是 She can swims.）',
          '常见错误：说成 Do you can swim?；can’t 漏写撇号；问句句末漏写问号',
        ],
        prerequisites: ['en-g4a.u2.words'],
        localContexts: ['学校运动会报名', '和新同学聊各自的本领'],
        lecture: {
          title: 'Can you swim? 问问你会什么',
          minutes: 11,
          focus:
            '运动会报名情境。句型：Can you swim? — Yes, I can. / No, I can’t. What can you do? — I can skate. Can she/he…? — Yes, she can. / No, he can’t. 领读并替换动作词；讲 can 后用动词原形、can’t = cannot；问句用问号。',
        },
        techniques: [
          {
            slug: 'can-plus-verb',
            title: 'can 后面跟原形：He can swim，不加 s',
            minutes: 4,
            focus:
              '只讲一个规则：can 后面的动作词不变样，I、you、he、she 都一样。演示 2 个例子：He can swim. / She can ride a bicycle.；对比 He can swims. 和 Do you can swim? 两个错误；配一句 chant 帮助记忆。',
          },
        ],
        practice: [],
      },
      {
        slug: 'can-but',
        title: '读一读、说一说：I can… but I can’t…',
        objectives: [
          '会用 I can… but I can’t… 说出自己会和不会的事',
          '能读懂一段介绍朋友本领的小短文',
          '会用 Welcome to… 欢迎别人',
        ],
        keyPoints: [
          '重点：but（但是）连接会做和不会做的事',
          '难点：读短文时找出谁会什么、谁不会什么',
          '常见错误：but 前后两件事意思相同；can’t 后面的动作词加 s',
        ],
        prerequisites: ['en-g4a.u2.can-questions'],
        localContexts: ['欢迎新同学来到我们班', '介绍自己的好朋友'],
        lecture: {
          title: 'I can swim, but I can’t skate. 我会的和不会的',
          minutes: 10,
          focus:
            '用 Welcome to our class. 开场，讲 but 表示“但是”：I can swim, but I can’t skate. She can draw, but she can’t sing. 读一段 4~5 句的小短文（介绍 Peter 和 Kitty 的本领），找出谁会、谁不会；最后仿写介绍自己。',
        },
        practice: [],
      },
    ]),
  ],
};
