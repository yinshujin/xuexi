import type { Book } from '../types';
import { unit } from './helpers';

const B = 'bsd-g2a';

/**
 * 北师大版 数学 二年级上册（2024 修订版，2025 年秋首次使用；2026 年秋深圳二年级继续使用）。
 * 目录见 sourceNote；课时名称为教材中的情境课题名。
 */
export const bsdG2a: Book = {
  id: B,
  subject: 'math',
  edition: '北师大版',
  revision: '2024修订',
  grade: 2,
  term: '上',
  title: '数学 二年级上册（北师大版 2024 修订）',
  sourceNote: [
    '版本判断：2022 版课标修订教材 2024 年秋从一年级起用，2025 年秋起用于二、三年级（新华网 2026-08-28 等报道：2026 年秋义务教育各年级完成新教材替换）。',
    '2026 年秋的深圳二年级学生 2025 年秋入学一年级，使用的正是 2024 修订版二年级上册（2025 年秋首次使用）。',
    '目录核对来源（均为检索摘要，原网页因网络代理无法直接打开）：电子课本网 dzkbw.com「北师大版二年级上册(2025秋版)」目录；',
    '21世纪教育网 / 教习网 / 学科网上按课时编号的教案（如 1.2 摘苹果、1.3 借阅图书、1.4 收玉米、1.5 跳绳、3.5 快乐的动物、4.1 文物中的乘法口诀、7.4 有多少无人机、7.5 做个乘法表）。',
    '单元：一 100以内数加与减（二）；二 测量（一）；三 数一数与乘法；四 乘法口诀（一）；五 分一分与除法；六 图形的运动（一）；七 乘法口诀（二）；八 乘除法的应用（一）。',
    '不确定处：第七单元 7.2/7.3 的课题（《西游记》中的乘法口诀 覆盖 7 的口诀还是 7、8、9 的口诀）未能核实，本数据把 8、9 的口诀单列为一个知识点；',
    '第六单元除「折一折，做一做」「好玩的华容道」外可能还有其他课时；第八单元只核实到「长颈鹿与小鸟」「农家小院」。',
    '旧版（2014）二上的「购物（元角分）」单元不在本册，人民币练习（g2.unit.money）未关联。整理与复习、综合实践未单列知识点。',
  ].join(''),
  units: [
    // ------------------------------------------------------------------ 一
    unit(B, 1, '100以内数加与减（二）', [
      {
        slug: 'add-carry-oral',
        title: '图书角：两位数加法（进位）的口算',
        objectives: [
          '会算两位数加一位数、两位数加两位数的进位加法',
          '能用小棒和计数器说清楚“满十进一”',
          '会用加法解决“一共有多少本书”的问题',
        ],
        keyPoints: [
          '重点：个位满十向十位进 1，算理用“捆小棒”直观说明',
          '难点：理解“满十进一”，口算时先算整十再合并（如 28+16=28+10+6）',
          '常见错误：个位相加满十后忘记给十位加 1，如 28+16 算成 34',
        ],
        prerequisites: [],
        localContexts: ['深圳图书馆少儿区借书', '班级图书角新添图书'],
        lecture: {
          title: '图书角：进位加法怎么算',
          minutes: 10,
          focus:
            '以“图书角”情境（如故事书 28 本、科普书 16 本，一共多少本）引入两位数加两位数的进位加法。先用摆小棒演示“10 根捆成 1 捆”，再用计数器“满十进一”，最后归纳口算方法（拆开十位和个位分别加，或先加整十再加一位数）。只做和不超过 100 的加法，不讲竖式格式（下一课再讲）。',
        },
        techniques: [
          {
            slug: 'make-ten',
            title: '凑十法：个位满十进一',
            minutes: 4,
            focus:
              '教“凑十法”口算进位加法：如 38+7，把 7 分成 2 和 5，38+2=40，40+5=45；再推广到 28+16=28+10+6。演示 2 个例子，对比把 45 写成 35 的错误（忘记进位），强调“个位凑成十，十位就多 1”。',
            remedies: ['carry-missed'],
          },
        ],
        practice: [
          { generatorId: 'g2.addsub.2d', variant: 'oral', minDifficulty: 1, maxDifficulty: 3 },
          {
            generatorId: 'g2.addsub.word',
            variant: 'add',
            minDifficulty: 1,
            maxDifficulty: 3,
            label: '解决问题',
          },
        ],
      },
      {
        slug: 'add-carry-vertical',
        title: '摘苹果：进位加法的竖式',
        objectives: [
          '会用竖式计算两位数进位加法',
          '知道竖式要相同数位对齐、从个位加起',
          '能说出进位的 1 写在哪里、加在哪里',
        ],
        keyPoints: [
          '重点：相同数位对齐，从个位加起，个位满十向十位进 1',
          '难点：竖式与计数器拨珠一一对应，理解进位的小“1”',
          '常见错误：数位没对齐（两位数加一位数时一位数写到十位下）；忘记加进位的 1',
        ],
        prerequisites: ['bsd-g2a.u1.add-carry-oral'],
        localContexts: ['南山荔枝公园/西丽果场摘荔枝', '莲花山公园秋游'],
        lecture: {
          title: '摘苹果：用竖式算进位加法',
          minutes: 10,
          focus:
            '沿用教材“摘苹果”情境，先在计数器上拨珠计算，再把每一步写成竖式，让孩子看到“计数器的个位满十进一”就是竖式里的小 1。例题选一道两位数加一位数（如 36+8）和一道两位数加两位数（如 47+35），强调相同数位对齐、从个位加起、进位的 1 要记得加。不出现三位数和连加竖式。',
        },
        techniques: [
          {
            slug: 'carry-mark',
            title: '竖式进位“小 1”标记法',
            minutes: 4,
            focus:
              '教竖式进位的固定动作：个位相加满十，立刻在十位下面写一个小小的“1”，算十位时先说“进的 1 我加上了”。演示 56+27、38+45 两个例子，对比没写小 1 导致十位少 1 的错误答案，最后做 1 道小练习。',
            remedies: ['carry-missed'],
          },
        ],
        practice: [
          { generatorId: 'g2.addsub.2d', variant: 'vertical', minDifficulty: 1, maxDifficulty: 4 },
          {
            generatorId: 'g2.addsub.word',
            variant: 'add',
            minDifficulty: 2,
            maxDifficulty: 4,
            label: '解决问题',
          },
        ],
      },
      {
        slug: 'sub-borrow-oral',
        title: '借阅图书：两位数减法（退位）的口算',
        objectives: [
          '会算两位数减一位数、两位数减两位数的退位减法',
          '能用小棒说明“个位不够减，拆一捆当 10 根”',
          '会用减法解决“还剩多少本书”的问题',
        ],
        keyPoints: [
          '重点：个位不够减时从十位退 1 当 10',
          '难点：退位后十位要少 1',
          '常见错误：个位用大数减小数（如 42-18 个位算成 8-2）；退位后十位忘记减 1',
        ],
        prerequisites: ['bsd-g2a.u1.add-carry-oral'],
        localContexts: ['深圳图书馆自助借书机', '小区书吧借书还书'],
        lecture: {
          title: '借阅图书：退位减法怎么算',
          minutes: 10,
          focus:
            '以“借阅图书”情境（原有 42 本，借走 18 本，还剩多少）引入退位减法。先用小棒演示“个位 2 根不够减 8，打开一捆变成 12 根”，再归纳口算方法（先减整十再减一位数：42-10-8；或破十法）。例题先两位数减一位数，再两位数减两位数，只在 100 以内，不讲竖式。',
        },
        techniques: [
          {
            slug: 'break-ten',
            title: '破十法：个位不够减怎么办',
            minutes: 4,
            focus:
              '教“破十法”：如 42-8，把 42 分成 30 和 12，12-8=4，30+4=34。再用 42-18=42-10-8 做第二例。对比两种典型错误：个位倒着减（8-2）和十位忘记减 1，最后做 1 道小练习。',
            remedies: ['borrow-missed'],
          },
        ],
        practice: [
          { generatorId: 'g2.addsub.2d', variant: 'oral', minDifficulty: 1, maxDifficulty: 3 },
          {
            generatorId: 'g2.addsub.word',
            variant: 'sub',
            minDifficulty: 1,
            maxDifficulty: 3,
            label: '解决问题',
          },
        ],
      },
      {
        slug: 'sub-borrow-vertical',
        title: '收玉米：退位减法的竖式',
        objectives: [
          '会用竖式计算两位数退位减法',
          '知道个位不够减要从十位退 1，并在十位上点退位点',
          '会用加法验算减法',
        ],
        keyPoints: [
          '重点：从个位减起，个位不够减从十位退 1 当 10 再减',
          '难点：十位相减时要先减去退走的 1',
          '常见错误：忘记点退位点导致十位多 1；个位用下面减上面',
        ],
        prerequisites: ['bsd-g2a.u1.sub-borrow-oral', 'bsd-g2a.u1.add-carry-vertical'],
        localContexts: ['光明农场收玉米', '菜市场卖玉米'],
        lecture: {
          title: '收玉米：用竖式算退位减法',
          minutes: 10,
          focus:
            '沿用教材“收玉米”情境，在计数器上演示“十位拨下 1 颗、个位拨上 10 颗”，再对应写出退位减法竖式和十位上的退位点。例题：一道两位数减一位数（如 52-7），一道两位数减两位数（如 63-28），每道都用加法验算。强调相同数位对齐、从个位减起、十位先减去退位的 1。',
        },
        techniques: [
          {
            slug: 'borrow-dot',
            title: '竖式退位点三步走',
            minutes: 4,
            focus:
              '教退位减法竖式的三步口令：“个位不够减——十位点个点——十位先减 1 再计算”。演示 71-36、90-45 两个例子（含被减数个位是 0），对比十位忘记减 1 的错误答案，做 1 道小练习。',
            remedies: ['borrow-missed'],
          },
          {
            slug: 'check-by-add',
            title: '用加法验算减法',
            minutes: 3,
            focus:
              '教“差 + 减数 = 被减数”的验算方法：算完 63-28=35 后，用 35+28 看是不是 63。演示 1 个算对和 1 个算错被验算发现的例子，养成算完就验的习惯，做 1 道小练习。',
            remedies: ['careless', 'borrow-missed'],
          },
        ],
        practice: [
          { generatorId: 'g2.addsub.2d', variant: 'vertical', minDifficulty: 1, maxDifficulty: 4 },
          {
            generatorId: 'g2.addsub.word',
            variant: 'sub',
            minDifficulty: 2,
            maxDifficulty: 4,
            label: '解决问题',
          },
        ],
      },
      {
        slug: 'compare-more-less',
        title: '跳绳：比多比少的问题与 100 减两位数',
        objectives: [
          '会解决“比多少”的问题，知道什么时候用加、什么时候用减',
          '会算 100 减两位数',
          '能画简单的线段图或圆圈图分析数量关系',
        ],
        keyPoints: [
          '重点：求比一个数多几的数用加法，求比一个数少几的数用减法',
          '难点：看到“多”字不一定用加法，要先弄清谁多谁少；100 减两位数连续退位',
          '常见错误：见“多”就加、见“少”就减；把 + 和 - 看错',
        ],
        prerequisites: ['bsd-g2a.u1.sub-borrow-vertical'],
        localContexts: ['学校体育节跳绳比赛', '深圳湾公园晨跑'],
        lecture: {
          title: '跳绳：比多比少的问题',
          minutes: 10,
          focus:
            '以教材“跳绳”情境（两位同学跳绳个数比较）讲解“比多少”的问题：先用圆圈图或简单的线段图画出两个数量，找出“同样多的部分”和“多出的部分”，再决定用加法还是减法。例题一道“比…多几”、一道“比…少几”，再补充 100 减两位数（如 100-36）的算法。不出现倍、乘除法。',
        },
        techniques: [
          {
            slug: 'circle-sign',
            title: '先圈符号再计算',
            minutes: 3,
            focus:
              '教做加减混合练习时“先用笔圈出 + 或 -，读一遍算式再算”的习惯。演示 2 道加减号交替出现的题，对比把 45-18 当成 45+18 的错误，做 1 道小练习。',
            remedies: ['op-confused'],
          },
          {
            slug: 'draw-compare',
            title: '画图判断用加还是用减',
            minutes: 4,
            focus:
              '教用两行圆圈（或两条线段）表示“比多比少”：上下对齐画同样多的部分，多出的部分圈起来，看问题求的是大数、小数还是相差数，再决定加或减。演示“小明跳了 45 下，小红比小明少 12 下”“小红比小明多 12 下”两个例子，对比见“多”就加的错误。',
            remedies: ['op-confused'],
          },
        ],
        practice: [
          { generatorId: 'g2.addsub.word', variant: 'compare', minDifficulty: 1, maxDifficulty: 5 },
          {
            generatorId: 'g2.addsub.2d',
            variant: 'oral',
            minDifficulty: 2,
            maxDifficulty: 4,
            label: '口算巩固',
          },
          {
            generatorId: 'g2.addsub.2d',
            variant: 'vertical',
            minDifficulty: 2,
            maxDifficulty: 5,
            label: '竖式巩固',
          },
        ],
      },
      {
        slug: 'ring-toss-review',
        title: '套圈游戏：100 以内加减法的综合运用',
        objectives: [
          '能熟练计算 100 以内进位加法和退位减法',
          '会有条理地找出所有可能的组合（如两个圈一共套中多少分）',
          '能用两步计算解决简单实际问题',
        ],
        keyPoints: [
          '重点：在游戏情境中综合运用进位加、退位减',
          '难点：有序思考，不重复不遗漏；两步计算按从左往右的顺序进行',
          '常见错误：连续计算时漏掉进位或退位；运算顺序乱',
        ],
        prerequisites: ['bsd-g2a.u1.add-carry-vertical', 'bsd-g2a.u1.sub-borrow-vertical'],
        localContexts: ['欢乐谷游戏摊位套圈', '学校游园会'],
        lecture: {
          title: '套圈游戏：加减法大闯关',
          minutes: 10,
          focus:
            '以教材“套圈游戏”情境（不同物品对应不同分数）综合练习 100 以内进位加和退位减：例题一是“套中两个一共多少分”的有序列举，例题二是“要得到某个分数，还差多少分”的两步计算（按从左往右算）。只用 100 以内两位数，不引入乘除法。',
        },
        techniques: [
          {
            slug: 'left-to-right',
            title: '两步计算：从左往右，有括号先算括号',
            minutes: 4,
            focus:
              '教多步加减的运算顺序：没有括号从左往右一步一步算，有小括号先算括号里面的。演示 56-18+25 和 56-(18+25) 两个例子，把每一步的结果写在算式下面，对比“先算后面”的错误，做 1 道小练习。',
            remedies: ['order-of-ops', 'carry-missed', 'borrow-missed'],
          },
        ],
        practice: [
          { generatorId: 'g2.addsub.2d', variant: 'vertical', minDifficulty: 3, maxDifficulty: 5 },
          { generatorId: 'g2.addsub.chain', minDifficulty: 1, maxDifficulty: 3, label: '两步计算' },
          {
            generatorId: 'g2.addsub.word',
            variant: 'mixed',
            minDifficulty: 3,
            maxDifficulty: 5,
            label: '解决问题',
          },
        ],
      },
    ]),
    // ------------------------------------------------------------------ 二
    unit(B, 2, '测量（一）', [
      {
        slug: 'measure-informal',
        title: '教室有多长：用不同方法测量',
        objectives: [
          '会用步长、脚长、拃等身体尺估测和测量长度',
          '体会测量工具和测量方法可以不同',
          '知道测量结果要说清“用什么量、量了几次”',
        ],
        keyPoints: [
          '重点：经历用不同方式测量同一长度的过程',
          '难点：体会用不同的“尺子”量出的结果不同，为统一单位做准备',
          '常见错误：测量时首尾没接好、有重叠或空隙',
        ],
        prerequisites: [],
        localContexts: ['量一量家里客厅有多长', '深圳湾公园步道走一走数步数'],
        lecture: {
          title: '教室有多长：想办法量一量',
          minutes: 8,
          focus:
            '以教材“教室有多长”情境，演示用步长、脚长、跳绳、拃等方法测量同一长度，强调首尾相接、不重叠、不留空；比较不同同学量出的结果为什么不同，引出“需要统一的长度单位”。本课只做非标准测量，不出现厘米、米的换算。',
        },
        techniques: [
          {
            slug: 'fewer-longer',
            title: '量的次数越少，“尺子”越长',
            minutes: 4,
            focus:
              '教比较测量结果的方法：量同一个物体，用的“尺子”（拃、脚长、小棒）越长，量的次数越少；次数越多，说明“尺子”越短。反过来，用同一把“尺子”量不同物体，量的次数越多，物体越长。演示“同一张课桌，淘气量了 6 拃，笑笑量了 8 拃，谁的一拃长”和“用同样的回形针量铅笔和橡皮”两个例子，对比“次数多尺子就长”的错误，做 1 道小练习。',
            remedies: ['measure-count'],
          },
        ],
        practice: [
          { generatorId: 'g2.measure', variant: 'informal', minDifficulty: 1, maxDifficulty: 5 },
        ],
      },
      {
        slug: 'centimeter',
        title: '课桌有多长：认识厘米，用刻度尺量',
        objectives: [
          '认识长度单位厘米，知道 1 厘米大约有多长',
          '会用刻度尺从 0 刻度开始量物体和线段的长度',
          '会估计较短物体的长度',
        ],
        keyPoints: [
          '重点：建立 1 厘米的表象（约一个手指宽），学会用刻度尺量',
          '难点：不从 0 刻度开始量时的读数（如从 2 量到 7 是 5 厘米）',
          '常见错误：从 1 开始数刻度；把刻度尺的端点当成 0',
        ],
        prerequisites: ['bsd-g2a.u2.measure-informal'],
        localContexts: ['量铅笔、橡皮、深圳通卡的长度'],
        lecture: {
          title: '课桌有多长：认识厘米',
          minutes: 10,
          focus:
            '先回顾用不同方法量课桌结果不一样，引出统一单位“厘米（cm）”。在刻度尺上认识 0 刻度、1 厘米、几厘米，用手指宽、图钉长等建立 1 厘米表象。例题：量一支铅笔（从 0 开始）；量一条线段但尺子从 2 开始对齐。只讲厘米，米放到下一课。',
        },
        techniques: [
          {
            slug: 'ruler-zero',
            title: '量长度三步：对 0、放平、看末端',
            minutes: 4,
            focus:
              '教刻度尺量长度的三步口令：“左端对准 0，尺子贴紧放平，看右端对着几”。演示一次正常量法和一次“断尺”（从 3 开始对齐，用末端减起点）量法，对比把刻度尺端点当 0 的错误，做 1 道小练习。',
            remedies: ['ruler-read'],
          },
        ],
        // 米还没学，所以不链接 g2.unit.length（它的换算题和选单位题都会用到米）。
        practice: [
          { generatorId: 'g2.measure', variant: 'ruler', minDifficulty: 1, maxDifficulty: 5 },
        ],
      },
      {
        slug: 'meter',
        title: '1 米有多长：认识米，米和厘米的换算',
        objectives: [
          '认识长度单位米，知道 1 米 = 100 厘米',
          '能根据物体选择合适的单位（厘米或米）',
          '会进行简单的米和厘米的换算和比较',
        ],
        keyPoints: [
          '重点：建立 1 米的表象，掌握 1 米 = 100 厘米',
          '难点：根据实际选择单位（如床长约 2 米，铅笔长约 18 厘米）',
          '常见错误：以为 1 米 = 10 厘米；给物体配错单位（如“小明身高 130 米”）',
        ],
        prerequisites: ['bsd-g2a.u2.centimeter'],
        localContexts: ['深圳地铁站台安全线离站台边的距离', '欢乐谷游乐项目身高限制（如 1 米 2）'],
        lecture: {
          title: '1 米有多长：认识米',
          minutes: 10,
          focus:
            '用米尺（100 个 1 厘米）直观说明 1 米 = 100 厘米；用张开双臂、门把手高度等建立 1 米表象。例题一：比较 1 米和 90 厘米谁长；例题二：给“黑板长约 3（ ）”“铅笔长约 18（ ）”填单位。只讲厘米和米，不出现毫米、分米、千米。',
        },
        techniques: [
          {
            slug: 'body-ruler',
            title: '身体尺帮你选单位',
            minutes: 4,
            focus:
              '教用“身体尺”判断单位：手指宽约 1 厘米，一拃约 15 厘米，张开双臂约 1 米多。先想物体大约是几个手指宽还是几个双臂长，再选厘米或米。演示“课本长约 26 厘米”“教室长约 9 米”两个例子，对比“身高 130 米”这样的错误，做 1 道小练习。',
            remedies: ['unit-choice'],
          },
          {
            slug: 'meter-cm-convert',
            title: '1 米 = 100 厘米 的换算',
            minutes: 4,
            focus:
              '教米和厘米的换算：1 米 = 100 厘米，2 米 = 200 厘米，1 米 30 厘米 = 130 厘米；比较长短前先换成同一单位。演示“1 米 ○ 90 厘米”和“1 米 20 厘米 = ？厘米”两个例子，对比把 1 米当成 10 厘米的错误，做 1 道小练习。',
            remedies: ['unit-rate'],
          },
        ],
        practice: [
          { generatorId: 'g2.unit.length', minDifficulty: 1, maxDifficulty: 5 },
          {
            generatorId: 'g2.measure',
            variant: 'mixed',
            minDifficulty: 3,
            maxDifficulty: 5,
            label: '测量巩固',
          },
        ],
      },
    ]),
    // ------------------------------------------------------------------ 三
    unit(B, 3, '数一数与乘法', [
      {
        slug: 'multiplication-intro',
        title: '小小清点员、儿童乐园：认识乘法',
        objectives: [
          '会几个几个地数，知道“几个几”',
          '知道求几个相同加数的和可以用乘法',
          '会读、写乘法算式，认识乘号和因数、积',
        ],
        keyPoints: [
          '重点：从“几个几”的同数连加抽象出乘法',
          '难点：只有相同加数的连加才能写成乘法',
          '常见错误：把 3 个 4 写成 3+4；把不同加数的连加也写成乘法',
        ],
        prerequisites: ['bsd-g2a.u1.add-carry-oral'],
        localContexts: ['欢乐谷过山车每节坐 4 人', '菜市场一袋袋装好的荔枝'],
        lecture: {
          title: '儿童乐园：认识乘法',
          minutes: 10,
          focus:
            '先用“小小清点员”情境练习 2 个 2 个、5 个 5 个地数，得到“几个几”；再用“儿童乐园”情境（如每辆小火车坐 3 人，有 4 辆）写出同数连加 3+3+3+3，自然引出乘法 4×3 或 3×4，介绍乘号、读法、因数和积。例题各配圆圈图。积都用数数或连加得到，不要求背口诀。',
        },
        techniques: [
          {
            slug: 'equal-groups',
            title: '圈一圈：找“几个几”',
            minutes: 4,
            focus:
              '教把图中的物体按同样多一圈一圈地圈起来，说“有几圈、每圈几个，就是几个几”，再写成乘法。演示 2 个例子（每盘 5 个荔枝共 3 盘；每排 4 个座位共 6 排），对比把“3 个 5”写成 3+5 的错误，做 1 道小练习。',
            remedies: ['mul-meaning', 'table-add-confused'],
          },
        ],
        practice: [{ generatorId: 'g2.mul.meaning', minDifficulty: 1, maxDifficulty: 2 }],
      },
      {
        slug: 'dot-array',
        title: '点子图中的乘法',
        objectives: [
          '会看点子图横着看、竖着看写出乘法算式',
          '知道一个点子图可以写两个乘法算式，两个因数交换位置积不变',
          '能用乘法表示点子图中的点数',
        ],
        keyPoints: [
          '重点：一图两式（如 3 行 5 列：3×5 和 5×3）',
          '难点：理解两个算式意义不同但结果相同',
          '常见错误：行数和每行个数搞反；数错点数',
        ],
        prerequisites: ['bsd-g2a.u3.multiplication-intro'],
        localContexts: ['深圳湾体育中心看台座位', '华侨城创意园窗户排列'],
        lecture: {
          title: '点子图中的乘法',
          minutes: 10,
          focus:
            '用点子图（方阵）讲解：横着看每行几个、有几行，写一个乘法；竖着看每列几个、有几列，写另一个乘法；两个算式积相同。例题一 3 行 4 列，例题二 2 行 6 列。最后说明乘法算式可以表示“几个几”也可以表示“几的几倍”的前置——本课只讲“几个几”，不讲倍。',
        },
        practice: [{ generatorId: 'g2.mul.meaning', minDifficulty: 1, maxDifficulty: 3 }],
      },
      {
        slug: 'animal-party',
        title: '动物聚会：用乘法解决问题',
        objectives: [
          '能从图中找到“几个几”的信息并列乘法算式',
          '会区分用乘法和用加法的问题',
          '能说出乘法算式在情境中表示什么',
        ],
        keyPoints: [
          '重点：在情境中找同样多的份数，列乘法算式',
          '难点：同一幅图中既有乘法问题也有加法问题，要辨别',
          '常见错误：看到数就乘；不是每份同样多也用乘法',
        ],
        prerequisites: ['bsd-g2a.u3.dot-array'],
        localContexts: ['深圳野生动物园动物表演', '仙湖植物园的花坛'],
        lecture: {
          title: '动物聚会：乘法小侦探',
          minutes: 10,
          focus:
            '以教材“动物聚会”情境，引导孩子找出“每组同样多”的信息列乘法，并解释算式意义（如 4×3 表示 4 个 3）。例题一：每只鸭子 2 条腿，5 只鸭子几条腿；例题二：对比一个能用乘法和一个只能用加法（每份不一样多）的问题。积在 30 以内，可以用连加得出。',
        },
        techniques: [
          {
            slug: 'mul-or-add',
            title: '乘还是加？看是不是“同样多”',
            minutes: 4,
            focus:
              '教判断方法：先问“每份是不是同样多”，同样多且有几份就用乘法；不一样多就用加法。并辨析 3×4 与 3+4 的区别（3 个 4 是 12，3 和 4 合起来是 7）。演示 2 个对比例子，做 1 道小练习。',
            remedies: ['table-add-confused', 'mul-meaning'],
          },
        ],
        practice: [{ generatorId: 'g2.mul.meaning', minDifficulty: 2, maxDifficulty: 4 }],
      },
      {
        slug: 'times-concept',
        title: '快乐的动物：认识倍',
        objectives: [
          '知道“一个数是另一个数的几倍”的意思',
          '会用圈一圈、画图表示倍的关系',
          '能求一个数的几倍是多少',
        ],
        keyPoints: [
          '重点：把较少的数量看作 1 份，较多的有这样的几份，就是几倍',
          '难点：倍与“多几”的区别',
          '常见错误：把“是几倍”当成“多几个”；标准量找错',
        ],
        prerequisites: ['bsd-g2a.u3.animal-party'],
        localContexts: ['深圳湾公园看候鸟：白鹭和黑脸琵鹭的数量'],
        lecture: {
          title: '快乐的动物：认识倍',
          minutes: 10,
          focus:
            '以教材“快乐的动物”情境（如小鸡 2 只、小鸭 6 只）讲解：把 2 只看作 1 份，6 里有 3 个 2，所以小鸭是小鸡的 3 倍。用圈一圈的图示贯穿。例题一：看图说几倍；例题二：求 4 的 3 倍是多少（用乘法 3×4 或连加）。不要求用除法求几倍（除法还没学），不讲“多几”与“几倍”的混合应用。',
        },
        practice: [{ generatorId: 'g2.mul.meaning', minDifficulty: 2, maxDifficulty: 5 }],
      },
    ]),
    // ------------------------------------------------------------------ 四
    unit(B, 4, '乘法口诀（一）', [
      {
        slug: 'table-5',
        title: '文物中的乘法口诀：5 的乘法口诀',
        objectives: [
          '知道乘法口诀在我国已有两千多年历史',
          '会编 5 的乘法口诀并熟记',
          '会用 5 的口诀计算乘法',
        ],
        keyPoints: [
          '重点：通过 5 个 5 个地数编出 5 的口诀，每句口诀对应两个乘法算式',
          '难点：理解口诀的含义（如“三五十五”表示 3 个 5 是 15）',
          '常见错误：5 的口诀得数个位不是 0 就是 5，出现其他个位即错；把 5×3 当成 5+3',
        ],
        prerequisites: ['bsd-g2a.u3.multiplication-intro'],
        localContexts: ['深圳博物馆里的古代文物', '五指一只手：数手指'],
        lecture: {
          title: '文物中的乘法口诀：学会 5 的口诀',
          minutes: 10,
          focus:
            '以教材“文物中的乘法口诀”情境引入：古代的竹简上就刻着九九乘法口诀（里耶秦简）。再用“一只手 5 根手指”5 个 5 个地数，填表得到 1~5 个 5 的积，一起编出“一五得五”到“五五二十五”，说明每句口诀对应两个乘法算式（如三五十五：3×5=15，5×3=15）。本课只讲 5 的口诀到五五二十五，不要编 6~9 的口诀。',
        },
        techniques: [
          {
            slug: 'table-pattern-5',
            title: '5 的口诀规律：个位 0、5 轮流',
            minutes: 3,
            focus:
              '教 5 的口诀的规律：得数依次多 5，个位是 5、0、5、0……；忘了某句可以从上一句加 5 推出来（如四五二十，再加 5 是二十五）。演示 2 个“由已知推未知”的例子，对比“三五十八”这样的错误，做 1 道小练习。',
            remedies: ['table-neighbor'],
          },
        ],
        practice: [
          {
            generatorId: 'g2.mul.table',
            variant: 'tables-2-5',
            minDifficulty: 1,
            maxDifficulty: 2,
          },
        ],
      },
      {
        slug: 'table-2',
        title: '做家务：2 的乘法口诀',
        objectives: [
          '会编 2 的乘法口诀并熟记',
          '能发现 2 的口诀的规律',
          '会用 2 的口诀解决简单问题',
        ],
        keyPoints: [
          '重点：通过摆筷子（每双 2 根）编出 2 的口诀',
          '难点：理解“几个 2”与口诀的对应关系',
          '常见错误：二二得四与二加二混淆；得数必须是双数',
        ],
        prerequisites: ['bsd-g2a.u4.table-5'],
        localContexts: ['家里吃饭摆筷子', '深圳地铁车厢两两并排的座位'],
        lecture: {
          title: '做家务：2 的乘法口诀',
          minutes: 10,
          focus:
            '以教材“做家务·摆筷子”情境，1 双 2 根、2 双 4 根……填表，编出“一二得二”到“二五一十”（与 5 的口诀一样只到乘数 5），说出每句口诀的意思。发现规律：得数依次多 2，都是双数。例题：用口诀算 2×4 和 4×2；解决“5 双筷子有几根”。不编 6 以上的口诀。',
        },
        practice: [
          {
            generatorId: 'g2.mul.table',
            variant: 'tables-2-5',
            minDifficulty: 1,
            maxDifficulty: 2,
          },
        ],
      },
      {
        slug: 'table-3-4',
        title: '需要几个轮子：3 和 4 的乘法口诀',
        objectives: [
          '会编 3、4 的乘法口诀并熟记',
          '能比较 3 和 4 的口诀，发现规律',
          '会用 3、4 的口诀解决问题',
        ],
        keyPoints: [
          '重点：通过三轮车（每辆 3 个轮子）、小汽车（每辆 4 个轮子）编口诀',
          '难点：3、4 的口诀容易混（如三四十二、四四十六）',
          '常见错误：相邻口诀记混（三四十二记成十五）；把 3×4 算成 3+4',
        ],
        prerequisites: ['bsd-g2a.u4.table-2'],
        localContexts: ['深圳街头的共享单车和三轮车', '汽车站里的小汽车'],
        lecture: {
          title: '需要几个轮子：3 和 4 的口诀',
          minutes: 10,
          focus:
            '以教材“需要几个轮子”情境（三轮车每辆 3 个轮子，小汽车每辆 4 个轮子）填表，编出 3 的口诀（一三得三……三五十五）和 4 的口诀（一四得四……四五二十），比较两组口诀的相同与不同。例题：3×4=？用哪句口诀；4 辆小汽车有几个轮子。口诀范围只到 5 的口诀以内。',
        },
        techniques: [
          {
            slug: 'neighbor-derive',
            title: '口诀记混了？用“相邻加一个”来推',
            minutes: 4,
            focus:
              '教用相邻口诀推算：3×4 想“3×3=9，再加一个 3 是 12”；4×4 想“4×3=12，再加 4 是 16”。演示 2 个例子，对比“三四十五”“四四十二”这类相邻口诀记混的错误，做 1 道小练习。',
            remedies: ['table-neighbor', 'table-add-confused'],
          },
        ],
        practice: [
          {
            generatorId: 'g2.mul.table',
            variant: 'tables-2-5',
            minDifficulty: 1,
            maxDifficulty: 3,
          },
        ],
      },
      {
        slug: 'table-2-5-apply',
        title: '回家路上：用 2~5 的口诀解决问题',
        objectives: [
          '熟练运用 2~5 的乘法口诀',
          '能从情境中提出并解决乘法问题',
          '会解决简单的乘加、乘减问题',
        ],
        keyPoints: [
          '重点：综合运用 2~5 的口诀，理解乘法意义',
          '难点：乘加、乘减的两步问题（如 3×4+2）先算乘再算加减',
          '常见错误：口诀用错；乘加时先算加法',
        ],
        prerequisites: ['bsd-g2a.u4.table-3-4'],
        localContexts: ['放学坐深圳地铁回家', '小区花园里的花'],
        lecture: {
          title: '回家路上：口诀小能手',
          minutes: 10,
          focus:
            '以教材“回家路上”情境（小动物们回家路上看到的物品）提出乘法问题，用 2~5 的口诀解答，并说明每个算式的意义。例题一：一步乘法问题；例题二：乘加问题（如每排 4 人，坐了 3 排，还有 2 人，一共几人：3×4+2），强调先算乘法。积不超过 25 的口诀范围。',
        },
        techniques: [
          {
            slug: 'mul-first',
            title: '乘加乘减：先乘后加减',
            minutes: 3,
            focus:
              '教乘加、乘减的计算顺序：先用口诀算乘法，再算加减。演示 3×4+2 和 5×5-3 两个例子，对比先算 4+2 的错误，做 1 道小练习。',
            remedies: ['table-add-confused'],
          },
        ],
        practice: [
          {
            generatorId: 'g2.mul.table',
            variant: 'tables-2-5',
            minDifficulty: 2,
            maxDifficulty: 4,
          },
          {
            generatorId: 'g2.mul.meaning',
            minDifficulty: 3,
            maxDifficulty: 5,
            label: '乘法的意义',
          },
        ],
      },
    ]),
    // ------------------------------------------------------------------ 五
    unit(B, 5, '分一分与除法', [
      {
        slug: 'equal-sharing',
        title: '分物游戏、分水果：平均分',
        objectives: [
          '知道“每份分得同样多”叫平均分',
          '会用摆一摆、圈一圈把物品平均分',
          '能说清“分成几份、每份几个”或“每几个一份、分成几份”',
        ],
        keyPoints: [
          '重点：理解平均分的含义',
          '难点：两种分法——按份数分（每份几个）和按每份个数分（分几份）',
          '常见错误：分得不一样多也叫平均分；数错份数',
        ],
        prerequisites: ['bsd-g2a.u4.table-2-5-apply'],
        localContexts: ['把荔枝平均分给家人', '莲花山野餐分水果'],
        lecture: {
          title: '分物游戏：什么是平均分',
          minutes: 10,
          focus:
            '以教材“分物游戏”“分水果”情境，用摆小棒/圈一圈演示把 12 个物品平均分：①分给 3 人，每人几个；②每 4 个装一盘，能装几盘。对比“一人 5 个一人 7 个”不是平均分。本课重在操作和语言描述，不写除法算式（下一课再学）。',
        },
        practice: [],
      },
      {
        slug: 'division-meaning',
        title: '分糖果、分香蕉：认识除法',
        objectives: [
          '会用除法算式表示平均分的过程和结果',
          '认识除号，知道被除数、除数、商',
          '能说出除法算式在情境中的两种意思',
        ],
        keyPoints: [
          '重点：平均分的两种情况都可以用除法表示',
          '难点：12÷3=4 既可以表示“平均分成 3 份每份 4 个”，也可以表示“每 3 个一份分成 4 份”',
          '常见错误：被除数和除数写反；把除法和减法混淆',
        ],
        prerequisites: ['bsd-g2a.u5.equal-sharing'],
        localContexts: ['儿童节分糖果', '分香蕉给小猴（深圳野生动物园）'],
        lecture: {
          title: '分糖果：认识除法',
          minutes: 10,
          focus:
            '承接平均分，用“分糖果”（15 颗平均分给 5 人，每人几颗）引出除法算式 15÷5=3，介绍除号、读法、被除数、除数、商；再用“分香蕉”（每只猴子分 3 根，15 根可以分给几只）说明同一个算式的另一种意思。每道例题都先圈图再列式，求商用数一数或想乘法。不出现有余数的除法和除法竖式。',
        },
        techniques: [
          {
            slug: 'circle-divide',
            title: '先圈图再列除法',
            minutes: 4,
            focus:
              '教“圈一圈→说一说→列除式”：总数写在前面（被除数），平均分成几份或每份几个写在后面（除数），圈出的结果就是商。演示 12÷4 的两种圈法，对比把 4÷12 写反的错误，做 1 道小练习。',
            remedies: ['div-wrong-table'],
          },
        ],
        practice: [{ generatorId: 'g2.div.table', minDifficulty: 1, maxDifficulty: 1 }],
      },
      {
        slug: 'div-by-table-2-5',
        title: '小熊开店：用 2~5 的口诀求商',
        objectives: [
          '会用 2~5 的乘法口诀求商',
          '体会乘法和除法的联系',
          '能解决“买几个、每个多少钱”的简单除法问题',
        ],
        keyPoints: [
          '重点：想乘法口诀求商（12÷3 想“三（四）十二”）',
          '难点：根据除数找对应的口诀',
          '常见错误：想错口诀（12÷3 想成“二六十二”得 6）；商写成被除数',
        ],
        prerequisites: ['bsd-g2a.u5.division-meaning'],
        localContexts: ['华强北小店买文具', '社区小卖部买饮料'],
        lecture: {
          title: '小熊开店：用口诀求商',
          minutes: 10,
          focus:
            '以教材“小熊开店”情境（如 20 元买 4 个同样的东西，每个多少元；每个 5 元，15 元能买几个）讲解用乘法口诀求商：看除数，想“除数乘几等于被除数”。例题两道分别对应两种除法意思。只用 2~5 的口诀，被除数不超过 25，不出现有余数除法。',
        },
        techniques: [
          {
            slug: 'think-mul-for-div',
            title: '想乘算除：盯住除数找口诀',
            minutes: 4,
            focus:
              '教求商口令：“除数乘几等于被除数？”如 20÷4，想“四（五）二十”，商是 5；15÷3 想“三五十五”，商是 5。演示 2 个例子，对比 12÷3 想成“二六十二”得 6 的错误（口诀里没有除数 3），做 1 道小练习。',
            remedies: ['div-wrong-table'],
          },
        ],
        practice: [{ generatorId: 'g2.div.table', minDifficulty: 1, maxDifficulty: 2 }],
      },
      {
        slug: 'times-and-division',
        title: '花园：倍与乘除法',
        objectives: [
          '会求一个数是另一个数的几倍（用除法）',
          '进一步理解倍与乘、除法的联系',
          '能解决花园情境中的简单问题',
        ],
        keyPoints: [
          '重点：求一个数是另一个数的几倍用除法',
          '难点：分清谁是 1 份（除数）',
          '常见错误：除数、被除数颠倒；把“几倍”算成“多几”',
        ],
        prerequisites: ['bsd-g2a.u5.div-by-table-2-5', 'bsd-g2a.u3.times-concept'],
        localContexts: ['仙湖植物园的蝴蝶和蜻蜓', '深圳市花簕杜鹃花坛'],
        lecture: {
          title: '花园：几倍用除法',
          minutes: 10,
          focus:
            '以教材“花园”情境（如蝴蝶 15 只，蜻蜓 5 只，蝴蝶是蜻蜓的几倍）讲解：把蜻蜓 5 只看作 1 份，15 里有几个 5 就是几倍，列式 15÷5=3。例题二：已知“一个数的几倍”求这个数用乘法（如 4 的 5 倍）。只用 2~5 的口诀范围，不出现有余数除法。',
        },
        practice: [
          { generatorId: 'g2.div.table', minDifficulty: 1, maxDifficulty: 2 },
          { generatorId: 'g2.mul.meaning', minDifficulty: 3, maxDifficulty: 5, label: '倍与乘法' },
        ],
      },
    ]),
    // ------------------------------------------------------------------ 六
    unit(B, 6, '图形的运动（一）', [
      {
        slug: 'axial-symmetry',
        title: '折一折，做一做：轴对称图形',
        objectives: [
          '会通过对折判断一个图形是不是轴对称图形',
          '知道对折后的折痕就是对称轴',
          '会剪出简单的轴对称图形',
        ],
        keyPoints: [
          '重点：对折后两边完全重合的图形是轴对称图形',
          '难点：判断平行四边形等“看起来对称”但对折不重合的图形',
          '常见错误：只看左右大小差不多就说是轴对称',
        ],
        prerequisites: [],
        localContexts: ['深圳湾“春笋”大楼和平安大厦的对称外观', '剪窗花'],
        lecture: {
          title: '折一折：认识轴对称图形',
          minutes: 10,
          focus:
            '以教材“折一折，做一做”活动讲解：把纸对折后剪出图案，展开后两边完全一样，折痕就是对称轴。例题一：判断蝴蝶、树叶、字母图形是否为轴对称图形；例题二：对折剪纸时画一半能剪出什么。不讲对称轴的精确画法和对称点距离，不涉及旋转对称。',
        },
        practice: [],
      },
      {
        slug: 'translation-rotation',
        title: '好玩的华容道：平移与旋转',
        objectives: [
          '能辨认生活中的平移和旋转现象',
          '会玩华容道游戏，说出棋子向哪个方向平移了几格',
          '能区分平移和旋转',
        ],
        keyPoints: [
          '重点：平移时物体的方向不变，旋转时物体绕一个点转动',
          '难点：数清平移了几格（看同一个点移动的格数）',
          '常见错误：数格子时数了图形之间的空格',
        ],
        prerequisites: [],
        localContexts: ['深圳地铁扶梯和车门（平移）', '欢乐谷摩天轮（旋转）'],
        lecture: {
          title: '好玩的华容道：平移和旋转',
          minutes: 9,
          focus:
            '以教材“好玩的华容道”游戏为主线讲平移：棋子只能上下左右移动，说出向哪个方向移动了几格（盯住棋子的一个角数格）；再举摩天轮、风车、陀螺等例子认识旋转，对比两者。不涉及旋转角度、方格纸上画旋转图形。',
        },
        practice: [],
      },
    ]),
    // ------------------------------------------------------------------ 七
    unit(B, 7, '乘法口诀（二）', [
      {
        slug: 'table-6',
        title: '有多少张贴画：6 的乘法口诀',
        objectives: [
          '会编 6 的乘法口诀并熟记',
          '能用已学口诀推出 6 的口诀',
          '会用 6 的口诀解决问题',
        ],
        keyPoints: [
          '重点：编 6 的口诀，理解每句口诀的意思',
          '难点：6 的口诀得数较大，容易记错（如六七四十二、六八四十八）',
          '常见错误：相邻口诀记混；六九五十四记成五十六',
        ],
        prerequisites: ['bsd-g2a.u4.table-2-5-apply'],
        localContexts: ['集贴画本每页 6 张', '深圳地铁 6 号线'],
        lecture: {
          title: '有多少张贴画：6 的乘法口诀',
          minutes: 10,
          focus:
            '以教材“有多少张贴画”情境（每版 6 张）填表，编出“一六得六”到“六六三十六”，并说明 6 的口诀可以由已学口诀推出（如六六三十六 = 五六三十加 6）。例题：6×4 用哪句口诀；5 版贴画有几张。本课只编到“六六三十六”（口诀表中 6 以内的部分），7~9 的口诀后面再学。',
        },
        techniques: [
          {
            slug: 'derive-from-5',
            title: '从 5 的口诀推 6 的口诀',
            minutes: 4,
            focus:
              '教推算法：6×几 = 5×几 + 几。如 6×4 想 5×4=20，再加 4 是 24；6×6 想 5×6=30，再加 6 是 36。演示 2 个例子，对比“六四二十八”这样的相邻记混错误，做 1 道小练习。',
            remedies: ['table-neighbor'],
          },
        ],
        practice: [
          {
            generatorId: 'g2.mul.table',
            variant: 'tables-6-9',
            minDifficulty: 1,
            maxDifficulty: 2,
          },
        ],
      },
      {
        slug: 'table-7',
        title: '《西游记》中的乘法口诀：7 的乘法口诀',
        objectives: ['会编 7 的乘法口诀并熟记', '能借助故事记住难记的口诀', '会用 7 的口诀计算'],
        keyPoints: [
          '重点：编 7 的口诀，熟记“三七二十一”“七七四十九”等',
          '难点：七八五十六、六七四十二等较难记的口诀',
          '常见错误：七八五十六与七九六十三混淆；把 7×3 算成 7+3',
        ],
        prerequisites: ['bsd-g2a.u7.table-6'],
        localContexts: ['一周 7 天（深圳图书馆每周开放安排）'],
        lecture: {
          title: '《西游记》中的乘法口诀：7 的口诀',
          minutes: 10,
          focus:
            '以教材“《西游记》中的乘法口诀”情境（如“不管三七二十一”“七七四十九天”等故事说法）引入，用 7 个 7 个地数填表编出“一七得七”到“七七四十九”。例题：7×5 用哪句口诀；一周 7 天，3 周是几天。故事只用于帮助记忆，不讲故事细节；得数不超过 49（8、9 的口诀下一课学）。',
        },
        techniques: [
          {
            slug: 'story-memory',
            title: '故事和规律记难记的口诀',
            minutes: 4,
            focus:
              '教记难记口诀的两个办法：①相邻推算（7×8 = 7×7+7 = 56）；②编顺口溜（“五六七八——56=7×8”）。演示 2 个例子，对比七八五十四、六七四十八这类记混错误，做 1 道小练习。',
            remedies: ['table-neighbor'],
          },
        ],
        practice: [
          {
            generatorId: 'g2.mul.table',
            variant: 'tables-6-9',
            minDifficulty: 1,
            maxDifficulty: 3,
          },
        ],
      },
      {
        slug: 'table-8-9',
        title: '8 和 9 的乘法口诀',
        objectives: [
          '会编 8、9 的乘法口诀并熟记',
          '发现 9 的口诀的规律（十位加个位等于 9 等）',
          '会用 8、9 的口诀计算和解决问题',
        ],
        keyPoints: [
          '重点：编并熟记 8、9 的口诀',
          '难点：八九七十二、九九八十一、七九六十三等大得数口诀',
          '常见错误：相邻口诀记混；9 的口诀个位十位写反',
        ],
        prerequisites: ['bsd-g2a.u7.table-7'],
        localContexts: ['8 人一桌吃团圆饭', '华侨城欢乐海岸的游船每船 9 人'],
        lecture: {
          title: '8 和 9 的乘法口诀',
          minutes: 10,
          focus:
            '分别编出 8 的口诀（一八得八……八八六十四）和 9 的口诀（一九得九……九九八十一），可延续《西游记》情境（“八九七十二变”“九九八十一难”）帮助记忆。重点发现 9 的口诀规律：得数的十位比几少 1，十位和个位加起来是 9。例题：8×7 和 9×6。不出现两位数乘法。',
        },
        techniques: [
          {
            slug: 'nine-fingers',
            title: '9 的口诀：手指法和“十位加个位等于 9”',
            minutes: 4,
            focus:
              '教 9 的口诀两种检查法：①十指法（算 9×4 弯下第 4 根手指，左边 3 根右边 6 根，得 36）；②得数十位比乘的数少 1，十位加个位等于 9。演示 9×4、9×7 两例，对比 9×7=62 这样的错误，做 1 道小练习。',
            remedies: ['table-neighbor'],
          },
        ],
        practice: [
          {
            generatorId: 'g2.mul.table',
            variant: 'tables-6-9',
            minDifficulty: 2,
            maxDifficulty: 4,
          },
        ],
      },
      {
        slug: 'drones-apply',
        title: '有多少无人机：用口诀解决问题',
        objectives: [
          '能把图案分成相同的几部分，用乘法求总数',
          '体会解决同一问题的方法可以不同',
          '会用 6~9 的口诀解决实际问题',
        ],
        keyPoints: [
          '重点：把图案中的物体分成相同的几部分，列乘法算式',
          '难点：同一图案不同分法对应不同算式，结果相同；乘加乘减',
          '常见错误：分出的每部分不相同还用乘法；口诀算错',
        ],
        prerequisites: ['bsd-g2a.u7.table-8-9'],
        localContexts: ['深圳湾无人机灯光秀'],
        lecture: {
          title: '有多少无人机：数一数，乘一乘',
          minutes: 10,
          focus:
            '以教材“有多少无人机”情境（无人机排成的图案）讲解：把图案分成同样多的几部分，用乘法求一共多少架；换一种分法也能得到同样结果（也可以用乘加、乘减，如 6×6+2、7×6-4）。深圳湾无人机表演可作为引入。例题两道，积在九九口诀范围内。',
        },
        practice: [
          {
            generatorId: 'g2.mul.table',
            variant: 'tables-6-9',
            minDifficulty: 2,
            maxDifficulty: 5,
          },
          {
            generatorId: 'g2.mul.meaning',
            minDifficulty: 3,
            maxDifficulty: 5,
            label: '乘法的意义',
          },
        ],
      },
      {
        slug: 'times-table-chart',
        title: '做个乘法表：整理九九乘法口诀',
        objectives: [
          '能把学过的口诀整理成乘法表',
          '能发现乘法表中的规律',
          '能熟练说出任意一句口诀',
        ],
        keyPoints: [
          '重点：按“分类整理—补全表格—发现规律”整理九九乘法表',
          '难点：发现横行、竖列、斜线上的规律（如每行依次多几）',
          '常见错误：相邻口诀记混；把乘法当成加法',
        ],
        prerequisites: ['bsd-g2a.u7.drones-apply'],
        localContexts: ['做一张乘法表贴在书桌前'],
        lecture: {
          title: '做个乘法表',
          minutes: 10,
          focus:
            '按教材“做个乘法表”的三层次展开：先把 1~9 的口诀分类整理，再补全乘法表中的空格，最后找规律（每一行得数依次多几；两个因数交换位置得数不变，所以表中一句口诀管两道算式）。例题：填补乘法表空缺的 3 格；找出得数是 24 的所有口诀。不引入 10 以上的乘法。',
        },
        techniques: [
          {
            slug: 'table-grid-rules',
            title: '乘法表找规律，记口诀更轻松',
            minutes: 4,
            focus:
              '教利用乘法表规律检查口诀：同一行依次多同一个数；因数交换得数相同；得数相同的口诀（如 3×8 与 4×6）。演示 2 个例子，对比把 4×6 算成 4+6 和六四二十八这两种错误，做 1 道小练习。',
            remedies: ['table-neighbor', 'table-add-confused'],
          },
        ],
        practice: [
          { generatorId: 'g2.mul.table', variant: 'all', minDifficulty: 2, maxDifficulty: 5 },
        ],
      },
    ]),
    // ------------------------------------------------------------------ 八
    unit(B, 8, '乘除法的应用（一）', [
      {
        slug: 'div-by-table-6-9',
        title: '长颈鹿与小鸟：用 6~9 的口诀求商',
        objectives: [
          '会用 6~9 的乘法口诀求商',
          '进一步体会乘法和除法的关系',
          '能用除法解决简单的实际问题',
        ],
        keyPoints: [
          '重点：用 6~9 的口诀求商（如 42÷7 想“六七四十二”）',
          '难点：一句口诀可以算两道除法（42÷6、42÷7）',
          '常见错误：想错口诀；把除数和商混淆',
        ],
        prerequisites: ['bsd-g2a.u7.times-table-chart', 'bsd-g2a.u5.div-by-table-2-5'],
        localContexts: ['深圳湾公园鸟屋', '深圳野生动物园喂长颈鹿'],
        lecture: {
          title: '长颈鹿与小鸟：用口诀求商',
          minutes: 10,
          focus:
            '以教材“长颈鹿与小鸟”情境（长颈鹿用木板为小鸟搭房子）讲解用 6~9 的口诀求商：看除数，想“除数乘几得被除数”。例题一：一句口诀写出两道除法（七八五十六：56÷7=8，56÷8=7）；例题二：解决“平均分”的实际问题。不出现有余数的除法和除法竖式。',
        },
        techniques: [
          {
            slug: 'one-fact-four',
            title: '一句口诀，四道算式',
            minutes: 4,
            focus:
              '教“一句口诀写四道算式”：如“六七四十二”→ 6×7=42、7×6=42、42÷6=7、42÷7=6，求商时只要找到含除数和被除数的那句口诀。演示 2 个例子，对比 48÷6 想成“六九五十四”的错误，做 1 道小练习。',
            remedies: ['div-wrong-table'],
          },
        ],
        practice: [{ generatorId: 'g2.div.table', minDifficulty: 2, maxDifficulty: 5 }],
      },
      {
        slug: 'farmyard-apply',
        title: '农家小院：乘除法解决问题',
        objectives: [
          '能根据问题选择用乘法还是除法',
          '会用乘除法和倍的知识解决实际问题',
          '能从情境中提出数学问题',
        ],
        keyPoints: [
          '重点：分清“求几个几是多少”（乘）、“平均分/包含几个”（除）、“几倍”',
          '难点：从情境中提取信息，选对运算',
          '常见错误：该除却乘；该乘却加（把几个几当成几加几）',
        ],
        prerequisites: ['bsd-g2a.u8.div-by-table-6-9'],
        localContexts: ['光明农场的鸡鸭', '菜市场按箱卖荔枝'],
        lecture: {
          title: '农家小院：乘还是除？',
          minutes: 10,
          focus:
            '以教材“农家小院”情境综合练习表内乘除法：例题一“每笼 6 只鸡，有 7 笼，一共几只”（乘法）；例题二“48 只鸭平均放进 8 个圈，每圈几只”或“鹅的只数是鸭的几倍”（除法）。先说出数量关系，再列式；结果在表内乘除范围。不出现两位数乘除和有余数除法。',
        },
        techniques: [
          {
            slug: 'choose-op',
            title: '三问法：选乘还是选除',
            minutes: 4,
            focus:
              '教选运算的三问：①是不是“几个几”求总数？用乘。②是不是把总数平均分，求每份或份数？用除。③是不是问“几倍”？用除。演示 2 道对比题，对比把“5 个 8”写成 5+8、把平均分写成乘法的错误，做 1 道小练习。',
            remedies: ['mul-meaning', 'table-add-confused', 'div-wrong-table'],
          },
        ],
        practice: [
          { generatorId: 'g2.div.table', minDifficulty: 2, maxDifficulty: 5 },
          {
            generatorId: 'g2.mul.table',
            variant: 'all',
            minDifficulty: 3,
            maxDifficulty: 5,
            label: '口诀巩固',
          },
        ],
      },
    ]),
  ],
};
