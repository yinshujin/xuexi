import type { Book, PracticeSpec } from '../types';
import { unit } from './helpers';

const B = 'en-g2a';

/** Routine practice plus the 拔高 / 创新 questions of a knowledge point. */
function practice(kp: string): PracticeSpec[] {
  return [
    { generatorId: 'en2.words', minDifficulty: 1, maxDifficulty: 5, variant: kp },
    { generatorId: 'en2.words', variant: `${kp}#stretch`, tier: 'stretch', minDifficulty: 3, maxDifficulty: 5 },
    { generatorId: 'en2.words', variant: `${kp}#creative`, tier: 'creative', minDifficulty: 3, maxDifficulty: 5 },
  ];
}

/**
 * 沪教牛津版（深圳用，一年级起点）英语 二年级上册 新版（“Big Question”单元结构）。
 * 六个单元，每单元两个知识点：uN.words（单词 + Sounds 字母组合）和 uN.talk（围绕 Big Question 的核心句型）。
 * 来源与不确定之处见 sourceNote。
 */
export const enG2a: Book = {
  id: B,
  subject: 'english',
  edition: '沪教牛津版（深圳）',
  revision: '新版（Big Question 单元结构）',
  grade: 2,
  term: '上',
  title: '英语 二年级上册（沪教牛津版 深圳用）',
  sourceNote: [
    '单元结构、Big Question、单词和 Sounds（字母组合）全部来自家长拍摄的孩子课本目录页：',
    'Unit 1 What can you do with your five senses?（feel, see, smell, hear, taste；Story: A magic show；Communicate: A talk；Extend: The blind men and the elephant；Sounds: -at, -ap）；',
    'Unit 2 What do you like about your family?（uncle, aunt, cousin, old, young, cute；Story: At Uncle Bob\'s party；Communicate: A talk；Extend: Grandma\'s bag；Sounds: -am, -an）；',
    'Unit 3 What is your favourite toy?（doll, toy plane, toy bear, ball, robot, jigsaw puzzle；Story: The lost toy；Communicate: A game；Extend: Different toys；Sounds: -ed, -et）；',
    'Unit 4 What is around your home?（pet shop, fruit shop, cinema, zoo, park, toy shop；Story: Around my new home；Communicate: A report；Extend: My favourite shopping centre；Sounds: -en, -ig）；',
    'Unit 5 What do you like about farms?（cow, sheep, duck, chick, chicken, pig；Story: On the farm；Communicate: A game；Extend: Old MacDonald has a farm；Sounds: -in, -ip）；',
    'Unit 6 How do people celebrate the Mid-Autumn Festival?（play with lanterns, eat mooncakes, solve riddles, look at the moon；Story: The Mid-Autumn Festival；Communicate: A report；Extend: The story of Chang\'e；Sounds: Review the sounds）。',
    '另有 Project 1、Project 2、Word list、Daily expressions、Picture dictionary、Chants、Cut and stick，未单列知识点。',
    '【推断，未见课文】目录页不含课文内容：各单元的核心句型（如 I can see with my eyes.、This is my uncle. He\'s old.、What\'s your favourite toy? My favourite toy is…、There\'s a park near my home.、I like cows. They\'re big.、At the Mid-Autumn Festival, we eat mooncakes.）',
    '是按 Big Question 和同类教材推断的常用简单句；字母组合的示例词（cat, hat, map, tap, ham, jam, fan, bed, net, hen, pen, big, pin, ship 等）是常见的同韵词，不一定和课本 Sounds 页的图完全一致。',
    'eyes、ears、nose、mouth、hands 等身体部位词按一年级已学处理。请家长对照课本核对句型。',
  ].join(''),
  units: [
    // ------------------------------------------------------------------ Unit 1
    unit(B, 1, 'Unit 1 What can you do with your five senses?（五种感官能做什么？）', [
      {
        slug: 'words',
        title: '单词：feel, see, smell, hear, taste；字母组合 -at、-ap',
        objectives: [
          '会读、会认 feel、see、smell、hear、taste 五个感官单词',
          '知道每个感官词对应的身体部位（眼睛看、耳朵听、鼻子闻、嘴巴尝、手摸）',
          '会拼读 -at（cat, hat, bat, mat）和 -ap（map, tap, nap）两组单词',
        ],
        keyPoints: [
          '重点：see 看、hear 听、smell 闻、taste 尝、feel 摸（感觉）',
          '难点：-at 和 -ap 只差最后一个音，要听清结尾的 /t/ 和 /p/',
          '常见错误：hear 和 see 混淆；smell 漏写一个 l；把 map 读成 mat',
        ],
        prerequisites: [],
        localContexts: ['在深圳湾公园闻花香、听鸟叫', '在家里尝一尝妈妈做的菜'],
        lecture: {
          title: '五种感官：看、听、闻、尝、摸',
          minutes: 10,
          focus:
            '用“魔术表演”情境引出五个感官词 see、hear、smell、taste、feel，每个词领读两遍，配身体部位动作（指眼睛说 see，指耳朵说 hear……）。再学 Sounds：-at 家族 cat、hat、bat、mat，-ap 家族 map、tap、nap，示范“开头音 + 结尾音”拼读，对比 mat 和 map 的结尾音。',
        },
        techniques: [
          {
            slug: 'word-families',
            title: '单词家族拼读法：-at 和 -ap',
            minutes: 4,
            focus:
              '只讲一个方法：同一个家族的单词结尾一样，只换开头的字母。演示 c-at cat、h-at hat、m-at mat，再换成 m-ap map、t-ap tap、n-ap nap；对比 mat 和 map 结尾音不同；用小 chant 串起两组单词。',
          },
        ],
        practice: practice('u1.words'),
      },
      {
        slug: 'talk',
        title: '句型：I can see / hear / smell … with my …；What can you see?',
        objectives: [
          '会用 I can see with my eyes. 等句子说出每种感官能做什么',
          '会用 What can you see / hear? 问别人，并用 I can see / hear a … 回答',
          '能说出 eyes、ears、nose、mouth、hands 和感官词的正确搭配',
        ],
        keyPoints: [
          '重点：I can + 感官词 + with my + 身体部位。',
          '难点：hear 配 ears，see 配 eyes，不能搭配错；问什么就用什么动词回答',
          '常见错误：I can hear with my eyes.；漏掉 with；句首 I 小写',
        ],
        prerequisites: ['en-g2a.u1.words'],
        localContexts: ['玩“蒙眼猜东西”游戏', '在深圳湾公园散步时说说看到、听到了什么'],
        lecture: {
          title: '我能用眼睛看，用耳朵听',
          minutes: 10,
          focus:
            '围绕 Big Question “What can you do with your five senses?” 学句型：I can see with my eyes. I can hear with my ears. I can smell with my nose. I can taste with my mouth. I can feel with my hands. 再学问答 What can you see? I can see a cat. / What can you hear? 领读、替换练习，编一段魔术表演的小对话；强调感官词和身体部位要配对。',
        },
        practice: practice('u1.talk'),
      },
    ]),
    // ------------------------------------------------------------------ Unit 2
    unit(B, 2, 'Unit 2 What do you like about your family?（你喜欢家人的什么？）', [
      {
        slug: 'words',
        title: '单词：uncle, aunt, cousin, old, young, cute；字母组合 -am、-an',
        objectives: [
          '会读、会认 uncle、aunt、cousin 三个家人称呼',
          '会用 old、young、cute 说家人的样子，知道 old 和 young 意思相反',
          '会拼读 -am（ham, jam）和 -an（fan, man, pan, van）两组单词',
        ],
        keyPoints: [
          '重点：uncle 叔叔 / 舅舅、aunt 阿姨 / 姑姑、cousin 堂（表）兄弟姐妹；old 年老的、young 年轻的、cute 可爱的',
          '难点：cousin 读 /ˈkʌzn/，不分男女；-am 和 -an 结尾音 /m/、/n/ 要分清',
          '常见错误：uncle 写成 uncel；aunt 漏写 u；把 ham 读成 fan 的结尾',
        ],
        prerequisites: [],
        localContexts: ['周末去叔叔家吃饭', '给同学看全家福'],
        lecture: {
          title: '我的家人：叔叔、阿姨和表兄妹',
          minutes: 10,
          focus:
            '用 Uncle Bob 的生日派对情境教 uncle、aunt、cousin、old、young、cute，每个词领读两遍并配中文和动作（弯腰拄拐说 old，蹦跳说 young，捧脸说 cute）；old 和 young 成对记。再学 Sounds：-am 家族 ham、jam，-an 家族 fan、man、pan、van，示范“开头音 + 结尾音”拼读。',
        },
        techniques: [
          {
            slug: 'word-families',
            title: '单词家族拼读法：-am 和 -an',
            minutes: 4,
            focus:
              '只讲一个方法：同一家族结尾相同，换开头字母就变新词。演示 h-am ham、j-am jam，再换 f-an fan、m-an man、v-an van；对比 ham 和 fan 的结尾 /m/ 与 /n/（闭嘴和舌尖顶上牙）；用 chant 串起单词。',
          },
        ],
        practice: practice('u2.words'),
      },
      {
        slug: 'talk',
        title: '句型：This is my uncle. He\'s old. / Who\'s she? She\'s my aunt.',
        objectives: [
          '会用 This is my … 介绍家人',
          '会用 He\'s / She\'s old / young / cute. 说家人的样子',
          '会用 Who\'s he / she? 问“他 / 她是谁”，并用 He\'s / She\'s my … 回答',
        ],
        keyPoints: [
          '重点：This is my uncle. He\'s young. / Who\'s she? She\'s my aunt.',
          '难点：男的用 he，女的用 she；He\'s = He is，She\'s = She is',
          '常见错误：说阿姨用 He\'s；缩写漏掉撇号；Who\'s 和 What\'s 混用',
        ],
        prerequisites: ['en-g2a.u2.words'],
        localContexts: ['在 Uncle Bob 的生日派对上介绍家人', '给同学看全家福'],
        lecture: {
          title: '这是我的叔叔，他很年轻',
          minutes: 10,
          focus:
            '围绕 Big Question “What do you like about your family?” 学句型：This is my uncle. He\'s young. This is my aunt. She\'s cute. Who\'s he? He\'s my cousin. 领读、替换人物和形容词；用全家福做问答对话；讲清 he 说男的、she 说女的，He\'s 就是 He is。',
        },
        practice: practice('u2.talk'),
      },
    ]),
    // ------------------------------------------------------------------ Unit 3
    unit(B, 3, 'Unit 3 What is your favourite toy?（你最喜欢什么玩具？）', [
      {
        slug: 'words',
        title: '单词：doll, toy plane, toy bear, ball, robot, jigsaw puzzle；字母组合 -ed、-et',
        objectives: [
          '会读、会认 doll、toy plane、toy bear、ball、robot、jigsaw puzzle 六个玩具词',
          '知道 toy plane、toy bear 里的 toy 是“玩具”',
          '会拼读 -ed（bed, red）和 -et（net, pet, wet）两组单词',
        ],
        keyPoints: [
          '重点：doll 洋娃娃、ball 球、robot 机器人、jigsaw puzzle 拼图、toy plane 玩具飞机、toy bear 玩具熊',
          '难点：jigsaw puzzle 两个词较长，puzzle 有两个 z；-ed 和 -et 的结尾音 /d/、/t/',
          '常见错误：doll 写成 dol；puzzle 漏一个 z；把 bed 读成 bet',
        ],
        prerequisites: [],
        localContexts: ['在玩具店挑玩具', '和同学交换玩具玩'],
        lecture: {
          title: '我的玩具：洋娃娃、机器人和拼图',
          minutes: 10,
          focus:
            '用“寻找丢失的玩具”情境教 doll、toy plane、toy bear、ball、robot、jigsaw puzzle，每个词领读两遍、配中文和图示；讲 toy 是“玩具”，toy plane、toy bear 就是玩具飞机、玩具熊。再学 Sounds：-ed 家族 bed、red，-et 家族 net、pet、wet，示范拼读。',
        },
        techniques: [
          {
            slug: 'word-families',
            title: '单词家族拼读法：-ed 和 -et',
            minutes: 4,
            focus:
              '只讲一个方法：同一家族结尾相同，换开头字母就变新词。演示 b-ed bed、r-ed red，再换 n-et net、p-et pet、w-et wet；对比 bed 和 bet 的结尾音；用 chant 串起单词。',
          },
        ],
        practice: practice('u3.words'),
      },
      {
        slug: 'talk',
        title: '句型：What\'s your favourite toy? My favourite toy is… / Is it a …?',
        objectives: [
          '会用 What\'s your favourite toy? 问别人最喜欢的玩具',
          '会用 My favourite toy is my … 回答',
          '玩猜玩具游戏时会问 Is it a …? 并用 Yes, it is. / No, it isn\'t. 回答',
        ],
        keyPoints: [
          '重点：What\'s your favourite toy? My favourite toy is my robot. / Is it a ball? Yes, it is.',
          '难点：favourite 的拼写（英式拼法，有 u）；Is it…? 用 it is / it isn\'t 回答',
          '常见错误：回答 Is it…? 时说 Yes, it isn\'t.；漏掉 my；句末漏写问号',
        ],
        prerequisites: ['en-g2a.u3.words'],
        localContexts: ['和同学聊最喜欢的玩具', '玩“摸盒子猜玩具”游戏'],
        lecture: {
          title: '你最喜欢什么玩具？',
          minutes: 10,
          focus:
            '围绕 Big Question “What is your favourite toy?” 学句型：What\'s your favourite toy? My favourite toy is my robot. I like my doll. 再做猜玩具游戏：Is it a ball? Yes, it is. / No, it isn\'t. 领读、替换玩具词，编一段问答对话；讲 favourite 是“最喜欢的”。',
        },
        practice: practice('u3.talk'),
      },
    ]),
    // ------------------------------------------------------------------ Unit 4
    unit(B, 4, 'Unit 4 What is around your home?（你家附近有什么？）', [
      {
        slug: 'words',
        title: '单词：pet shop, fruit shop, cinema, zoo, park, toy shop；字母组合 -en、-ig',
        objectives: [
          '会读、会认 pet shop、fruit shop、toy shop、cinema、zoo、park 六个地点词',
          '知道 shop 是“商店”，能说出每个地方能做什么',
          '会拼读 -en（hen, pen, ten）和 -ig（big, dig, wig）两组单词',
        ],
        keyPoints: [
          '重点：pet shop 宠物店、fruit shop 水果店、toy shop 玩具店、cinema 电影院、zoo 动物园、park 公园',
          '难点：cinema 读 /ˈsɪnəmə/，开头的 c 读 /s/；-en 和 -ig 的元音 /e/、/ɪ/',
          '常见错误：cinema 写成 sinema；zoo 漏写一个 o；把 pen 读成 pin',
        ],
        prerequisites: [],
        localContexts: ['周末去深圳湾公园', '去小区楼下的水果店买荔枝', '去动物园看大熊猫'],
        lecture: {
          title: '我家附近：公园、动物园和商店',
          minutes: 10,
          focus:
            '用“搬新家，逛一逛附近”的情境教 pet shop、fruit shop、toy shop、cinema、zoo、park，每个词领读两遍并配中文；讲 shop 是商店，宠物 + 商店 = 宠物店。再学 Sounds：-en 家族 hen、pen、ten，-ig 家族 big、dig、wig，示范拼读。',
        },
        techniques: [
          {
            slug: 'word-families',
            title: '单词家族拼读法：-en 和 -ig',
            minutes: 4,
            focus:
              '只讲一个方法：同一家族结尾相同，换开头字母就变新词。演示 h-en hen、p-en pen、t-en ten，再换 b-ig big、d-ig dig、w-ig wig；对比 pen 和 pig 中间的元音；用 chant 串起单词。',
          },
        ],
        practice: practice('u4.words'),
      },
      {
        slug: 'talk',
        title: '句型：There\'s a park near my home. / Is there a … near your home?',
        objectives: [
          '会用 There\'s a … near my home. 介绍家附近的地方',
          '会用 Is there a … near your home? 问别人，并用 Yes, there is. / No, there isn\'t. 回答',
          '能做一个简单的小报告，介绍自己家附近有什么',
        ],
        keyPoints: [
          '重点：There\'s a zoo near my home. / Is there a park near your home? Yes, there is.',
          '难点：There\'s = There is；near 是“在……附近”；Is there…? 要用 there is / there isn\'t 回答',
          '常见错误：回答时说 Yes, it is.；There\'s 后面漏掉 a；把 near my home 说成 in my home',
        ],
        prerequisites: ['en-g2a.u4.words'],
        localContexts: ['给新同学介绍自己住的小区', '周末和家人去附近的公园'],
        lecture: {
          title: '我家附近有一个公园',
          minutes: 10,
          focus:
            '围绕 Big Question “What is around your home?” 学句型：There\'s a park near my home. There\'s a fruit shop near my home. 再学问答 Is there a zoo near your home? Yes, there is. / No, there isn\'t. 领读、替换地点词；最后仿照 A report 介绍自己家附近的地方。',
        },
        practice: practice('u4.talk'),
      },
    ]),
    // ------------------------------------------------------------------ Unit 5
    unit(B, 5, 'Unit 5 What do you like about farms?（你喜欢农场的什么？）', [
      {
        slug: 'words',
        title: '单词：cow, sheep, duck, chick, chicken, pig；字母组合 -in、-ip',
        objectives: [
          '会读、会认 cow、sheep、duck、chick、chicken、pig 六个农场动物词',
          '分清 chick（小鸡）和 chicken（鸡）',
          '会拼读 -in（pin, bin, fin）和 -ip（ship, lip, zip）两组单词',
        ],
        keyPoints: [
          '重点：cow 奶牛、sheep 绵羊、duck 鸭子、chick 小鸡、chicken 鸡、pig 猪',
          '难点：sheep 有两个 e，读长音 /iː/；ship（轮船）是短音 /ɪ/，不要和 sheep 混',
          '常见错误：chicken 写成 chiken；把 sheep 读成 ship',
        ],
        prerequisites: [],
        localContexts: ['周末去农家乐看小动物', '在绘本里读农场故事'],
        lecture: {
          title: '农场里的动物',
          minutes: 10,
          focus:
            '用“去农场玩”的情境教 cow、sheep、duck、chick、chicken、pig，每个词领读两遍并配中文和动物叫声；对比 chick 和 chicken。再学 Sounds：-in 家族 pin、bin、fin，-ip 家族 ship、lip、zip，示范拼读，对比 ship 和 sheep 的长短音。',
        },
        techniques: [
          {
            slug: 'word-families',
            title: '单词家族拼读法：-in 和 -ip',
            minutes: 4,
            focus:
              '只讲一个方法：同一家族结尾相同，换开头字母就变新词。演示 p-in pin、b-in bin、f-in fin，再换 sh-ip ship、l-ip lip、z-ip zip；对比 ship 和 sheep 的长短音；用 chant 串起单词。',
          },
        ],
        practice: practice('u5.words'),
      },
      {
        slug: 'talk',
        title: '句型：I like cows. They\'re big. / What do you like?',
        objectives: [
          '会用 I like cows. 说出喜欢的农场动物（用复数）',
          '会用 They\'re big / small / cute. 说动物的样子',
          '会用 What do you like? 问别人喜欢什么',
        ],
        keyPoints: [
          '重点：I like ducks. They\'re cute. / What do you like? I like pigs.',
          '难点：说喜欢一类动物用复数，大多加 s（cows, ducks, pigs）；sheep 的复数还是 sheep',
          '常见错误：I like cow.；写成 sheeps；They\'re 说成 It\'s',
        ],
        prerequisites: ['en-g2a.u5.words'],
        localContexts: ['在农家乐喂小鸡、看奶牛', '和同学玩“猜动物”游戏'],
        lecture: {
          title: '我喜欢奶牛，它们很大',
          minutes: 10,
          focus:
            '围绕 Big Question “What do you like about farms?” 学句型：I like cows. They\'re big. I like chicks. They\'re small. I like ducks. They\'re cute. 再学问句 What do you like? 讲说喜欢一类动物要用复数，大多加 s，sheep 不变；They\'re = They are。领读、替换动物词，编一段农场对话。',
        },
        practice: practice('u5.talk'),
      },
    ]),
    // ------------------------------------------------------------------ Unit 6
    unit(B, 6, 'Unit 6 How do people celebrate the Mid-Autumn Festival?（人们怎样过中秋节？）', [
      {
        slug: 'words',
        title: '词组：play with lanterns, eat mooncakes, solve riddles, look at the moon；复习字母组合',
        objectives: [
          '会读、会认 play with lanterns、eat mooncakes、solve riddles、look at the moon 四个中秋活动词组',
          '认识 moon、mooncake、lantern、riddle 和 Mid-Autumn Festival',
          '复习本册学过的十组字母组合',
        ],
        keyPoints: [
          '重点：eat mooncakes 吃月饼、play with lanterns 玩灯笼、solve riddles 猜谜语、look at the moon 赏月',
          '难点：词组要整体记，look at the moon 里的 at 和 the 不能漏；Mid-Autumn Festival 首字母大写',
          '常见错误：play lanterns 漏掉 with；look the moon 漏掉 at；mooncake 写成 moncake',
        ],
        prerequisites: [],
        localContexts: ['中秋节在深圳湾公园赏月', '和家人一起吃月饼、猜灯谜'],
        lecture: {
          title: '中秋节：吃月饼、玩灯笼、猜谜语、赏月',
          minutes: 10,
          focus:
            '用“中秋节晚上”的情境教 eat mooncakes、play with lanterns、solve riddles、look at the moon，每个词组领读两遍并配中文和动作；认识 moon、mooncake、lantern、riddle。最后用小游戏复习本册的字母组合（cat、jam、bed、hen、pin 等）。',
        },
        techniques: [
          {
            slug: 'review-sounds',
            title: '复习字母组合：给单词找家',
            minutes: 4,
            focus:
              '只讲一个方法：看单词的最后两个字母，就知道它属于哪个“家族”。把 hat、map、jam、van、red、pet、ten、dig、bin、zip 送回 -at、-ap、-am、-an、-ed、-et、-en、-ig、-in、-ip 的家；对比 pen 和 pin、mat 和 map；用 chant 复习。',
          },
        ],
        practice: practice('u6.words'),
      },
      {
        slug: 'talk',
        title: '句型：At the Mid-Autumn Festival, we eat mooncakes.',
        objectives: [
          '会用 At the Mid-Autumn Festival, we … 说出中秋节的活动',
          '会问 What do you do at the Mid-Autumn Festival?，会说 Happy Mid-Autumn Festival!',
          '能做一个简单的小报告，介绍自己家怎样过中秋节',
        ],
        keyPoints: [
          '重点：At the Mid-Autumn Festival, we eat mooncakes. We play with lanterns. We look at the moon.',
          '难点：节日前面用 at；we 是“我们”；几个活动可以用 and 连起来',
          '常见错误：Mid-Autumn Festival 小写；eat 和 play with 搭配错（eat lanterns）',
        ],
        prerequisites: ['en-g2a.u6.words'],
        localContexts: ['中秋节晚上和家人在公园赏月', '给外国小朋友介绍中秋节'],
        lecture: {
          title: '中秋节，我们吃月饼、赏月',
          minutes: 10,
          focus:
            '围绕本单元 Big Question 学句型：At the Mid-Autumn Festival, we eat mooncakes. We play with lanterns. We look at the moon. 学问句 What do you do at the Mid-Autumn Festival? 和祝福 Happy Mid-Autumn Festival! 最后仿照 A report 介绍自己家怎样过中秋。',
        },
        practice: practice('u6.talk'),
      },
    ]),
  ],
};
