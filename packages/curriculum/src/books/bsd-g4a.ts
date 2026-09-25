import type { Book } from '../types';
import { unit } from './helpers';

const B = 'bsd-g4a';

/**
 * 北师大版 数学 四年级上册（2024 修订版，2026 年秋深圳四年级首次使用）。
 * 目录按家长拍摄的课本、练习册目录整理（见 sourceNote）；知识点标题用教材课题名。
 * 第一、二单元沿用原来的知识点 id（已有课程和练习记录）。
 */
export const bsdG4a: Book = {
  id: B,
  subject: 'math',
  edition: '北师大版',
  revision: '2024修订',
  grade: 4,
  term: '上',
  title: '数学 四年级上册（北师大版 2024 修订）',
  sourceNote: [
    '目录来源：家长拍摄的 2026 年秋季新课本和配套练习册目录（2024 修订版；括号内为课本页码）。',
    '一 认识更大的数（p2：数说祖国、十万有多大、认识更大的数、人口普查、大豆产量、国庆庆典、从结绳计数说起、整理与复习）；综合实践 编码（p19）；',
    '二 线与角（p23：线的认识、相交与垂直、平移与平行、旋转与角、角的度量（一）（二）、整理与复习）；',
    '三 整数乘法（二）（p39：找规律、队列表演（一）（二）、卫星运行时间、神奇的计算工具、有趣的算式、电影院、整理与复习）；',
    '四 我们生活的空间（二）（p58：观察的范围、天安门广场）；五 运算律（p63：生态养殖、加法交换律和乘法交换律、加法结合律、乘法结合律、乘法分配律、整理与复习）；数学好玩 数图形的学问（p77）；',
    '六 图形的奥秘（p79：切开立体图形、搭建立体大楼、翻滚正方体）；七 运用数量关系解决问题（p85：总量与分量，单价、数量与总价，速度、时间与路程，相遇问题）；',
    '八 数据的表示和分析（一）（p94：同学的生日、获奖时的年龄）；综合实践 导航给的时间准吗（p99）；总复习（p103）。',
    '编排：不编号的“综合实践”“数学好玩”放在前一个单元末尾（u1.coding、u5.count-figures、u8.navigation）；整理与复习、总复习不单列知识点。',
    '第一、二单元沿用 2014 版的知识点 id，标题改成新课题名。对应关系：数说祖国、十万有多大、认识更大的数、从结绳计数说起 → counting-units；人口普查 → read-write-big；',
    '大豆产量 → compare-big、国庆庆典 → approximation 是推断的（这两课的正文没有看到，按旧版“国土面积”“近似数”的位置推断），已做好的讲解课仍用旧版情境。',
    '以下也是按课题名推断、需对照课本核实的：找规律 = 积的变化规律与末尾有 0 的乘法；队列表演（一）（二）= 两位数乘两位数（点子图、竖式）；电影院 = 乘法估算；生态养殖 = 混合运算与中括号；',
    '第四、六、八单元和两个综合实践的具体内容（观察的范围 = 视线与盲区，天安门广场 = 用方向和距离描述位置等）。这些知识点暂时只有课，没有程序化练习。',
    '旧版的“方向与位置”“除法（除数是两位数）”“生活中的负数”“可能性”不在本册，相应知识点已删除；g4.div.2d、g4.negative 练习保留给以后的册次。',
    '第一单元的深圳数据来自练习册“数说祖国”一页（深圳 2025 年常住人口、国内旅游总收入、在校学生总数、城乡居民生活用电）。',
  ].join(''),
  units: [
    // ------------------------------------------------------------------ 一
    unit(B, 1, '认识更大的数', [
      {
        slug: 'counting-units',
        title: '数说祖国、十万有多大、认识更大的数、从结绳计数说起：计数单位与数位顺序表',
        objectives: [
          '认识计数单位十万、百万、千万、亿',
          '知道相邻两个计数单位之间的进率都是十（十进制计数法）',
          '会用数位顺序表说出每一位的名称和计数单位',
        ],
        keyPoints: [
          '重点：10 个一万是十万……10 个一千万是一亿；数位与计数单位的对应',
          '难点：区分“数位”（个位、万位……）与“计数单位”（一、万……）',
          '常见错误：把万位和十万位弄混；以为数位就是计数单位',
        ],
        prerequisites: [],
        localContexts: [
          '深圳 2025 年常住人口 18248500 人',
          '深圳地铁一年的客流量',
          '深圳图书馆的藏书量',
        ],
        lecture: {
          title: '数一数：认识更大的计数单位',
          minutes: 10,
          focus:
            '用教材“数一数”的方块图（一千一千地数到一万，再一万一万地数到十万）引出十万、百万、千万、亿，强调相邻计数单位进率都是十；制作数位顺序表，按“四位一级”分出个级、万级、亿级。可简要提及“从结绳计数说起”中的算盘与十进制。例题：说出 3 在不同数位上表示多少；填数位顺序表。不涉及小数和负数。',
        },
        techniques: [
          {
            slug: 'place-chart',
            title: '数位顺序表：从右往左四位一级',
            minutes: 4,
            focus:
              '教画数位顺序表：从右往左个、十、百、千（个级），万、十万、百万、千万（万级），亿……（亿级）。遇到一个数先从右往左每四位画一条分级线，再说出每位的数位和计数单位。演示 2 个例子，对比把 50 万写成 5000 00 的数位错误，做 1 道小练习。',
            remedies: ['place-value'],
          },
        ],
        practice: [
          { generatorId: 'g4.bignum.place', minDifficulty: 1, maxDifficulty: 5 },
          {
            generatorId: 'g4.challenge',
            variant: 'bignum#stretch',
            tier: 'stretch',
            minDifficulty: 1,
            maxDifficulty: 5,
          },
          {
            generatorId: 'g4.challenge',
            variant: 'bignum#creative',
            tier: 'creative',
            minDifficulty: 1,
            maxDifficulty: 5,
          },
        ],
      },
      {
        slug: 'read-write-big',
        title: '人口普查：大数的读法与写法',
        objectives: [
          '会读、写亿以内和亿以上的数',
          '会读写中间或末尾有 0 的数',
          '能把整万、整亿的数改写成以“万”“亿”作单位的数',
        ],
        keyPoints: [
          '重点：分级读写——先读亿级，再读万级，最后读个级',
          '难点：中间和末尾的 0 怎么读、写数时哪一位没有就写 0 占位',
          '常见错误：每级末尾的 0 也读出来；中间连续几个 0 读成几个“零”；写数时漏写 0 占位',
        ],
        prerequisites: ['bsd-g4a.u1.counting-units'],
        localContexts: [
          '深圳 2025 年在校学生总数 2875200 人',
          '深圳常住人口统计数字',
          '深圳宝安机场年旅客吞吐量',
        ],
        lecture: {
          title: '人口普查：大数怎么读、怎么写',
          minutes: 11,
          focus:
            '以教材“人口普查”情境（各地人口数）讲分级读数：先分级，从高级读起，读万级按个级读法再加“万”；每级末尾的 0 不读，中间连续几个 0 只读一个“零”。再讲写数：从高位写起，哪一位一个单位也没有就写 0。最后讲整万数改写成以“万”作单位（去掉末尾 4 个 0 加“万”）。例题两道含中间 0 与末尾 0。数据用整数，不用小数表示（如不写 17.79 万）。',
        },
        techniques: [
          {
            slug: 'read-by-level',
            title: '分级读数法：先分级，零的读法口诀',
            minutes: 5,
            focus:
              '教分级读数三步：①从右往左四位一级画分级线；②从最高级读起，读完万级加“万”，读完亿级加“亿”；③口诀“每级末尾的 0 都不读，中间有几个 0 都只读一个零”。演示 30500600、200080000 两例，对比读成“三千零五十万零六百零”的错误，做 1 道小练习。',
            remedies: ['zero-reading', 'place-value'],
          },
          {
            slug: 'write-with-zero',
            title: '写大数：按级写，没有就写 0',
            minutes: 4,
            focus:
              '教写大数方法：先听清有几级，每级都要写满四位（最高级除外），哪一位没有就写 0 占位。演示“三千零五万六千”“八亿零七十万”两例，写完再按级读一遍检查，对比漏写 0 的错误，做 1 道小练习。',
            remedies: ['zero-reading'],
          },
        ],
        practice: [
          { generatorId: 'g4.bignum.read', minDifficulty: 1, maxDifficulty: 5 },
          {
            generatorId: 'g4.challenge',
            variant: 'bignum#stretch',
            tier: 'stretch',
            minDifficulty: 1,
            maxDifficulty: 5,
          },
          {
            generatorId: 'g4.challenge',
            variant: 'bignum#creative',
            tier: 'creative',
            minDifficulty: 1,
            maxDifficulty: 5,
          },
        ],
      },
      {
        slug: 'compare-big',
        title: '大豆产量：大数比较大小',
        objectives: [
          '会比较多位数的大小',
          '能把几个大数按顺序排列',
          '能在数轴（直线）上标出大数的大致位置',
        ],
        keyPoints: [
          '重点：位数不同，位数多的大；位数相同，从最高位比起',
          '难点：数的位数多、中间有 0 时数清位数',
          '常见错误：只比最高位数字而忽略位数；数错位数',
        ],
        prerequisites: ['bsd-g4a.u1.read-write-big'],
        localContexts: [
          '深圳 2025 年城乡居民生活用电 21496000000 千瓦时',
          '广东各城市面积或人口比较',
          '深圳各区面积比较（南山、福田、宝安、龙岗）',
        ],
        lecture: {
          title: '国土面积：大数比大小',
          minutes: 9,
          focus:
            '以教材“国土面积”情境（几个省区面积，单位平方千米）讲大数比较：先数位数，位数多的数大；位数相同从最高位起逐位比较。例题一：两个位数不同的数比较；例题二：几个位数相同的数排序。“平方千米”只作单位名称出现，不讲面积单位换算。',
        },
        techniques: [
          {
            slug: 'align-digits',
            title: '比大小：先数位数，再对齐逐位比',
            minutes: 4,
            focus:
              '教比较大数的方法：先按级分开数清位数；位数相同就上下对齐，从最高位一位一位比，遇到第一个不同的数字就决出大小。演示 2 个例子（如 1180000 与 986000；720000 与 702000），对比只看首位数字的错误，做 1 道小练习。',
            remedies: ['place-value'],
          },
        ],
        practice: [
          { generatorId: 'g4.bignum.compare', minDifficulty: 1, maxDifficulty: 5 },
          {
            generatorId: 'g4.challenge',
            variant: 'bignum#stretch',
            tier: 'stretch',
            minDifficulty: 1,
            maxDifficulty: 5,
          },
          {
            generatorId: 'g4.challenge',
            variant: 'bignum#creative',
            tier: 'creative',
            minDifficulty: 1,
            maxDifficulty: 5,
          },
        ],
      },
      {
        slug: 'approximation',
        title: '国庆庆典：近似数（四舍五入与改写）',
        objectives: [
          '能区分精确数和近似数',
          '会用“四舍五入”法求一个数的近似数（省略万位或亿位后面的尾数）',
          '分清“改写”（用“=”）和“求近似数”（用“≈”）',
        ],
        keyPoints: [
          '重点：四舍五入看省略部分最高位的数字',
          '难点：改写与省略的区别；进位后连续进位（如 3996000 省略到万位约 400 万）',
          '常见错误：看错要看的那一位；改写时用了“≈”、省略时用了“=”；忘记写“万”“亿”',
        ],
        prerequisites: ['bsd-g4a.u1.read-write-big'],
        localContexts: [
          '深圳 2025 年国内旅游总收入 235670000000 元',
          '深圳湾体育中心观众人数',
          '欢乐谷国庆假期游客人数',
        ],
        lecture: {
          title: '近似数：四舍五入',
          minutes: 11,
          focus:
            '以教材“近似数”情境（阅兵、观众人数等）先区分精确数和近似数，再讲“四舍五入”法：省略万位后面的尾数，就看千位上的数，小于 5 舍去、大于或等于 5 向前一位进 1，结果写“≈”并带“万”。对比改写：整万数改写成以“万”作单位用“=”。例题一求近似数，例题二对比改写与求近似数。不出现小数形式的近似数。',
        },
        techniques: [
          {
            slug: 'round-look-next',
            title: '四舍五入：圈出“看的那一位”',
            minutes: 4,
            focus:
              '教四舍五入三步：①在要保留的位后面画一条竖线；②圈出竖线右边第一位数字；③小于 5 舍，大于或等于 5 进 1，写“≈”和单位。演示 4352000 ≈ 435 万、3996000 ≈ 400 万（连续进位）两例，对比看错位的错误，做 1 道小练习。',
            remedies: ['rounding'],
          },
          {
            slug: 'rewrite-vs-round',
            title: '改写用“=”，省略用“≈”',
            minutes: 4,
            focus:
              '教区分“改写成以万作单位”和“省略万位后面的尾数”：改写数的大小不变，用“=”（1200000 = 120 万）；省略是近似，用“≈”（1234000 ≈ 123 万）。演示两例对比，列出“题目怎么说→用哪种符号”的判断表，做 1 道小练习。',
            remedies: ['rewrite-vs-approx'],
          },
        ],
        practice: [
          { generatorId: 'g4.bignum.rewrite', minDifficulty: 1, maxDifficulty: 5 },
          {
            generatorId: 'g4.challenge',
            variant: 'approx#stretch',
            tier: 'stretch',
            minDifficulty: 1,
            maxDifficulty: 5,
          },
          {
            generatorId: 'g4.challenge',
            variant: 'approx#creative',
            tier: 'creative',
            minDifficulty: 1,
            maxDifficulty: 5,
          },
        ],
      },
      {
        slug: 'coding',
        title: '综合实践：编码',
        objectives: [
          '知道邮政编码、身份证号码、车牌号、学号等编码里的数字都有含义',
          '会从身份证号码里读出出生日期和性别，会看邮政编码',
          '能为同学设计一个简单、不重复的编码方案',
        ],
        keyPoints: [
          '重点：编码的每一段数字表示什么',
          '难点：设计编码要唯一、有规律、容易看懂',
          '常见错误：数错身份证号码中出生日期所在的位数；以为编码可以随便排',
        ],
        prerequisites: ['bsd-g4a.u1.read-write-big'],
        localContexts: ['深圳的邮政编码 518000', '学校运动会选手号码'],
        lecture: {
          title: '编码的奥秘：数字里藏着信息',
          minutes: 10,
          focus:
            '按教材“生活中的编码—编码的奥秘—设计编码方案—选手编码交流会”的顺序：先找生活中的编码（电话号码、车牌、邮政编码、身份证号码）；再以身份证号码为例讲每一段的含义（前 6 位地址码，第 7～14 位出生年月日，第 17 位单数表示男、双数表示女，最后一位是校验码），邮政编码 6 位从左到右越来越具体；最后为运动会选手设计编码（年级 + 班级 + 序号 + 性别），说明好的编码要唯一、有规律。只用虚构的号码。',
        },
        practice: [],
      },
    ]),
    // ------------------------------------------------------------------ 二
    unit(B, 2, '线与角', [
      {
        slug: 'lines',
        title: '线的认识：线段、射线、直线',
        objectives: [
          '认识线段、射线和直线，知道它们的区别',
          '会用字母表示线段、射线、直线',
          '知道两点之间线段最短，过一点可以画无数条直线',
        ],
        keyPoints: [
          '重点：三种线的端点个数和能否延长',
          '难点：射线的表示法（端点字母写在前面）',
          '常见错误：射线 AB 与射线 BA 当成同一条；认为直线可以量长度',
        ],
        prerequisites: [],
        localContexts: ['深南大道笔直的道路', '深圳湾公园的激光灯光秀（射线）'],
        lecture: {
          title: '线的认识',
          minutes: 9,
          focus:
            '以教材“线的认识”情境（斜拉桥钢索、手电筒光线等）引入，列表对比线段（2 个端点、可量长度）、射线（1 个端点、向一端无限延伸）、直线（没有端点、向两端无限延伸），讲字母表示法。例题：数图中有几条线段；判断说法对错。不涉及角的度量。',
        },
        techniques: [
          {
            slug: 'endpoints',
            title: '看端点，分清线段、射线、直线',
            minutes: 4,
            focus:
              '教用“数端点、看延伸”分辨三种线：两个端点、不能延伸的是线段，可以量长度；一个端点、向一端无限延伸的是射线；没有端点、向两端无限延伸的是直线，射线和直线都不能量长度，也不能比长短。再教有序数线段：一条线上有 4 个点，从第一个点出发数出 3 条，第二个点 2 条，第三个点 1 条，3 + 2 + 1 = 6。对比“射线比直线短”和“只数相邻两点”的错误，做 1 道小练习。',
            remedies: ['line-type'],
          },
        ],
        practice: [
          { generatorId: 'g4.lines', variant: 'lines', minDifficulty: 1, maxDifficulty: 5 },
          {
            generatorId: 'g4.challenge',
            variant: 'lines#stretch',
            tier: 'stretch',
            minDifficulty: 1,
            maxDifficulty: 5,
          },
          {
            generatorId: 'g4.challenge',
            variant: 'lines#creative',
            tier: 'creative',
            minDifficulty: 1,
            maxDifficulty: 5,
          },
        ],
      },
      {
        slug: 'intersect-perpendicular',
        title: '相交与垂直',
        objectives: [
          '知道两条直线相交成直角时互相垂直，交点叫垂足',
          '会用三角板画垂线',
          '知道点到直线的距离（垂线段最短）',
        ],
        keyPoints: [
          '重点：垂直的含义与画垂线',
          '难点：过直线外一点画已知直线的垂线；垂线段最短',
          '常见错误：画垂线时三角板直角边没有与已知直线重合',
        ],
        prerequisites: ['bsd-g4a.u2.lines'],
        localContexts: ['深圳街道的十字路口', '莲花山公园的旗杆与地面'],
        lecture: {
          title: '相交与垂直',
          minutes: 10,
          focus:
            '以教材“相交与垂直”情境（剪刀、十字路口）讲两条直线相交，相交成直角时互相垂直，交点叫垂足。演示用三角板画垂线的步骤（一靠、二移、三画），并讲从直线外一点到直线的所有线段中垂线段最短。例题：找图中互相垂直的线段；画一条垂线。',
        },
        practice: [
          { generatorId: 'g4.lines', variant: 'perpendicular', minDifficulty: 1, maxDifficulty: 5 },
          {
            generatorId: 'g4.challenge',
            variant: 'perp#stretch',
            tier: 'stretch',
            minDifficulty: 1,
            maxDifficulty: 5,
          },
          {
            generatorId: 'g4.challenge',
            variant: 'perp#creative',
            tier: 'creative',
            minDifficulty: 1,
            maxDifficulty: 5,
          },
        ],
      },
      {
        slug: 'parallel',
        title: '平移与平行',
        objectives: [
          '知道在同一平面内不相交的两条直线叫平行线',
          '会用平移三角板的方法画平行线',
          '能找出生活中的平行现象',
        ],
        keyPoints: [
          '重点：平行线的含义与画法',
          '难点：“同一平面内”这个前提；用平移画平行线',
          '常见错误：看起来不相交的两条线段就认为平行（延长后会相交）',
        ],
        prerequisites: ['bsd-g4a.u2.intersect-perpendicular'],
        localContexts: ['深圳地铁轨道', '单杠与双杠'],
        lecture: {
          title: '平移与平行',
          minutes: 9,
          focus:
            '以教材“平移与平行”情境（推拉窗平移、铁轨）讲：同一平面内不相交的两条直线互相平行；演示用直尺和三角板“一靠、二推、三画”画平行线。例题：判断几组线是否平行（包括延长后会相交的情况）；画已知直线的平行线。',
        },
        techniques: [
          {
            slug: 'same-plane',
            title: '判断平行和垂直：抓住关键词',
            minutes: 4,
            focus:
              '教判断平行与垂直的关键词：①平行要“在同一平面内”并且“不相交”，两条线段看起来不相交，要延长后再看会不会相交；②垂直要“相交”并且“成直角”，用三角板的直角比一比。演示“两条线段延长后相交，所以不平行”和“两条直线斜着相交，不是直角，所以不垂直”两个例子，对比漏掉“同一平面内”和“相交就是垂直”的错误说法，做 1 道小练习。',
            remedies: ['perp-parallel'],
          },
        ],
        practice: [
          { generatorId: 'g4.lines', variant: 'parallel', minDifficulty: 1, maxDifficulty: 5 },
          {
            generatorId: 'g4.lines',
            variant: 'mixed',
            minDifficulty: 3,
            maxDifficulty: 5,
            label: '线的综合',
          },
          {
            generatorId: 'g4.challenge',
            variant: 'perp#stretch',
            tier: 'stretch',
            minDifficulty: 1,
            maxDifficulty: 5,
          },
          {
            generatorId: 'g4.challenge',
            variant: 'perp#creative',
            tier: 'creative',
            minDifficulty: 1,
            maxDifficulty: 5,
          },
        ],
      },
      {
        slug: 'angles-rotation',
        title: '旋转与角：角的分类',
        objectives: [
          '知道角可以看成一条射线绕端点旋转而成',
          '认识锐角、直角、钝角、平角、周角',
          '知道 1 平角 = 2 直角，1 周角 = 2 平角 = 4 直角',
        ],
        keyPoints: [
          '重点：按大小对角分类及相互关系',
          '难点：平角和周角的认识（看起来像直线、射线，但它们是角）',
          '常见错误：把 90° 算成锐角或钝角；平角和周角的度数记混；以为角的大小和边的长短有关',
        ],
        prerequisites: ['bsd-g4a.u2.lines'],
        localContexts: ['钟面上时针和分针的夹角', '欢乐谷大摆锤的摆动角度'],
        lecture: {
          title: '旋转与角',
          minutes: 10,
          focus:
            '以教材“旋转与角”的“活动角”操作引入：一条射线绕端点旋转形成角，转得越多角越大。依次认识锐角（小于直角）、直角、钝角（大于直角小于平角）、平角、周角，并说明 1 周角 = 2 平角 = 4 直角（平角 180°、周角 360°可在下一课量角后强化）。例题：钟面上指针形成的角；给一组角分类。',
        },
        techniques: [
          {
            slug: 'angle-classify',
            title: '角的分类：拿直角当“尺子”',
            minutes: 4,
            focus:
              '教用三角板的直角去比：比直角小是锐角，等于直角是直角，比直角大比平角小是钝角，两边成一条直线是平角，转了一整圈是周角。演示 2 组角的判断，对比“边画得长角就大”的错误，做 1 道小练习。',
            remedies: ['angle-type'],
          },
          {
            slug: 'straight-full-angle',
            title: '平角、周角与求未知角',
            minutes: 4,
            focus:
              '教平角 = 180°、周角 = 360°、直角 = 90°，以及利用它们求未知角：一个平角被分成两个角，已知一个是 50°，另一个是 180° - 50° = 130°。演示 2 个例子（平角分两份、直角分两份），对比用 90° 去减平角的错误，做 1 道小练习。',
            remedies: ['angle-sum'],
          },
        ],
        practice: [
          { generatorId: 'g4.angle.classify', minDifficulty: 1, maxDifficulty: 5 },
          {
            generatorId: 'g4.challenge',
            variant: 'angle#stretch',
            tier: 'stretch',
            minDifficulty: 1,
            maxDifficulty: 5,
          },
          {
            generatorId: 'g4.challenge',
            variant: 'angle#creative',
            tier: 'creative',
            minDifficulty: 1,
            maxDifficulty: 5,
          },
        ],
      },
      {
        slug: 'angle-measure',
        title: '角的度量（一）（二）：用量角器量角和画角',
        objectives: [
          '知道角的计量单位是“度”（°）',
          '会用量角器量角的度数',
          '会用量角器画指定度数的角',
        ],
        keyPoints: [
          '重点：量角的方法——中心对顶点、0 刻度线对一边、看另一边',
          '难点：内圈刻度和外圈刻度的选择',
          '常见错误：内外圈读反（把 60° 读成 120°）；量角器中心没对准顶点',
        ],
        prerequisites: ['bsd-g4a.u2.angles-rotation'],
        localContexts: ['滑滑梯的倾斜角（小区游乐场）', '深圳湾大桥斜拉索与桥面的夹角'],
        lecture: {
          title: '角的度量：学会用量角器',
          minutes: 12,
          focus:
            '先用教材“角的度量（一）”的滑梯情境说明需要统一的角的单位——把半圆平均分成 180 份，每份是 1°。再用“角的度量（二）”认识量角器（中心、0 刻度线、内圈、外圈），演示量角三步和画角步骤。例题一量一个锐角，例题二量一个钝角并估计检查；最后画一个 70° 的角。',
        },
        techniques: [
          {
            slug: 'protractor-steps',
            title: '量角三步法：点对点、线对线、从 0 数',
            minutes: 5,
            focus:
              '教量角口令：①点对点——量角器中心对准角的顶点；②线对线——0 刻度线对准角的一条边；③从 0 数——这条边对着内圈 0 就读内圈，对着外圈 0 就读外圈。演示量 60° 和 130° 两例，并先估“锐角还是钝角”来检查，对比把 60° 读成 120° 的内外圈错误，做 1 道小练习。',
            remedies: ['protractor-scale'],
          },
        ],
        practice: [
          { generatorId: 'g4.angle.measure', minDifficulty: 1, maxDifficulty: 5 },
          {
            generatorId: 'g4.challenge',
            variant: 'angle#stretch',
            tier: 'stretch',
            minDifficulty: 1,
            maxDifficulty: 5,
          },
          {
            generatorId: 'g4.challenge',
            variant: 'angle#creative',
            tier: 'creative',
            minDifficulty: 1,
            maxDifficulty: 5,
          },
        ],
      },
    ]),
    // ------------------------------------------------------------------ 三
    unit(B, 3, '整数乘法（二）', [
      {
        slug: 'mul-pattern',
        title: '找规律：积的变化规律与末尾有 0 的乘法',
        objectives: [
          '会口算整十、整百数乘整十数（如 30 × 20、300 × 40）',
          '发现“一个因数不变，另一个因数乘几，积也乘几”的规律',
          '会用规律直接写出新算式的积',
        ],
        keyPoints: [
          '重点：先算 0 前面的数，再看两个因数末尾一共有几个 0，就在积的末尾添几个 0',
          '难点：用积的变化规律由已知算式推出新算式的积（如由 12 × 3 = 36 推出 120 × 30 = 3600）',
          '常见错误：少添或多添 0；0 前面的数相乘又出现 0 时（如 50 × 40）漏写',
        ],
        prerequisites: [],
        localContexts: ['深圳地铁一列车 6 节车厢，每节约 300 人'],
        lecture: {
          title: '找规律：积的变化',
          minutes: 10,
          focus:
            '用一组算式（12 × 3、12 × 30、12 × 300；120 × 3、120 × 30）引导观察：一个因数不变，另一个因数乘 10、乘 100，积也乘 10、乘 100。由此归纳整十、整百数乘法的口算方法：先把 0 前面的数相乘，再数两个因数末尾一共有几个 0，在积的末尾添几个 0。例题一 30 × 20、300 × 40；例题二 25 × 40、50 × 60（0 前面的数相乘又出现 0）。只讲乘法，不讲除法的规律。',
        },
        practice: [
          { generatorId: 'g4.oral.muldiv', variant: 'mul', minDifficulty: 1, maxDifficulty: 5 },
          {
            generatorId: 'g4.challenge',
            variant: 'mul#stretch',
            tier: 'stretch',
            minDifficulty: 1,
            maxDifficulty: 3,
          },
          {
            generatorId: 'g4.challenge',
            variant: 'mul#creative',
            tier: 'creative',
            minDifficulty: 1,
            maxDifficulty: 3,
          },
        ],
      },
      {
        slug: 'mul-3x2',
        title: '队列表演（一）（二）、卫星运行时间：两位数、三位数乘两位数',
        objectives: [
          '会用竖式计算两位数乘两位数、三位数乘两位数',
          '理解每一步部分积的含义，知道第二个部分积为什么从十位写起',
          '会计算因数中间或末尾有 0 的乘法',
        ],
        keyPoints: [
          '重点：三位数乘两位数的竖式计算方法和算理（先乘个位，再乘十位，最后相加）',
          '难点：用十位上的数去乘时，积的末位要和十位对齐；中间、末尾有 0 的乘法',
          '常见错误：第二个部分积没有错一位；进位忘加；因数末尾有 0 时处理不当；口诀算错',
        ],
        prerequisites: ['bsd-g4a.u3.mul-pattern'],
        localContexts: ['深圳北站高铁每小时发车班次', '深圳地铁每列车载客量'],
        lecture: {
          title: '队列表演、卫星运行时间：用竖式算乘法',
          minutes: 12,
          focus:
            '先以“队列表演”情境（每行 14 人，有 12 行）用点子图把 14 × 12 拆成 14 × 10 + 14 × 2，引出两位数乘两位数的竖式，说明第二个部分积表示多少个十、末位和十位对齐；再以“卫星运行时间”情境（绕地球一圈约 114 分，21 圈要多少分）把方法推广到三位数乘两位数，并讲中间有 0 的乘法（如 408 × 23）和因数末尾有 0 时先把 0 前面的数相乘再添 0。只用整数。',
        },
        techniques: [
          {
            slug: 'partial-product-shift',
            title: '部分积对齐法：乘十位，从十位写起',
            minutes: 5,
            focus:
              '教竖式对位：用个位乘得到第一个部分积，末位对齐个位；用十位乘得到第二个部分积，末位对齐十位（它表示几个十，个位可以空着或想成 0）；最后相加。每一步的进位小数字写小、用完划掉。演示 124×32、357×46 两例，对比部分积没错位的错误，做 1 道小练习。',
            remedies: ['partial-shift', 'carry-missed'],
          },
          {
            slug: 'trailing-zeros',
            title: '末尾有 0 的乘法：先不管 0，最后添上',
            minutes: 4,
            focus:
              '教因数末尾有 0 的简便竖式：把 0 前面的数对齐相乘，最后看两个因数末尾一共有几个 0，就在积的末尾添几个 0；因数中间有 0 不能省略，要照乘。演示 240×30、305×24 两例，对比少添或多添 0 的错误，做 1 道小练习。',
            remedies: ['trailing-zero'],
          },
          {
            slug: 'check-facts',
            title: '口诀复查与估算验算',
            minutes: 4,
            focus:
              '教算完三位数乘两位数后的两种检查：①每一步都默念口诀复查（如“七八五十六”）；②估算判断积的大小（如 198×31 约 200×30 = 6000，结果应接近 6000）。演示一个口诀算错被估算发现的例子和一个正确例子，做 1 道小练习。',
            remedies: ['mul-fact', 'careless'],
          },
        ],
        practice: [
          { generatorId: 'g4.mul.3x2', minDifficulty: 1, maxDifficulty: 5 },
          {
            generatorId: 'g4.challenge',
            variant: 'mul#stretch',
            tier: 'stretch',
            minDifficulty: 1,
            maxDifficulty: 5,
          },
          {
            generatorId: 'g4.challenge',
            variant: 'mul#creative',
            tier: 'creative',
            minDifficulty: 1,
            maxDifficulty: 5,
          },
        ],
      },
      {
        slug: 'calculator-patterns',
        title: '神奇的计算工具、有趣的算式：计算器与算式规律',
        objectives: [
          '了解计算工具的发展（算筹、算盘、计算器）',
          '会用计算器进行大数计算',
          '能用计算器探索算式的规律，并用规律写出后面的算式',
        ],
        keyPoints: [
          '重点：用计算器计算与探索规律',
          '难点：观察一组算式，发现并说明规律',
          '常见错误：按错键不检查；只看结果不说理由',
        ],
        prerequisites: ['bsd-g4a.u3.mul-3x2'],
        localContexts: ['深圳华强北电子市场里的计算器', '腾讯、华为等深圳科技公司的计算机'],
        lecture: {
          title: '有趣的算式：用计算器找规律',
          minutes: 8,
          focus:
            '简要介绍“神奇的计算工具”（算筹、算盘、计算器），然后以教材“有趣的算式”为主：用计算器算 1×1、11×11、111×111……以及 142857×2、×3……，观察结果的规律，并根据规律直接写出后面的算式。强调先猜想再用计算器验证。不讲计算器的高级功能。',
        },
        practice: [],
      },
      {
        slug: 'mul-estimate',
        title: '电影院：乘法估算',
        objectives: [
          '会用把因数看成整十、整百数的方法估算乘法',
          '能根据实际问题选择合适的估算方法',
          '能用估算判断计算结果是否合理',
        ],
        keyPoints: [
          '重点：把因数看成接近的整十、整百数再口算',
          '难点：根据问题决定估大还是估小（如钱够不够）',
          '常见错误：看成近似数时四舍五入出错；估算后又去精确计算',
        ],
        prerequisites: ['bsd-g4a.u3.mul-3x2', 'bsd-g4a.u1.approximation'],
        localContexts: ['深圳湾体育中心“春茧”看台观众', '深圳的电影院一个放映厅的座位数'],
        lecture: {
          title: '电影院：座位够不够',
          minutes: 10,
          focus:
            '以教材“电影院”情境（放映厅有 32 排，每排 28 个座位，大约有多少个座位；另一个厅 21 排、每排 32 座，来了 580 人，够不够坐）讲乘法估算：把因数看成接近的整十、整百数，如 32 × 28 ≈ 30 × 30 = 900，说出“大约”。再讨论“够不够”：座位够不够要看估小了还是估大了，钱够不够要估大。估算结果用“≈”，不要求精确计算。',
        },
        techniques: [
          {
            slug: 'round-then-multiply',
            title: '估算两步：看成整十整百，再口算',
            minutes: 4,
            focus:
              '教估算两步：①用四舍五入把每个因数看成最接近的整十或整百数；②口算得出大约数。演示 412×19 ≈ 400×20、286×52 ≈ 300×50 两例，对比 286 看成 200 的四舍五入错误，做 1 道小练习。',
            remedies: ['rounding'],
          },
        ],
        practice: [
          { generatorId: 'g4.mul.estimate', minDifficulty: 1, maxDifficulty: 5 },
          {
            generatorId: 'g4.challenge',
            variant: 'mulest#stretch',
            tier: 'stretch',
            minDifficulty: 1,
            maxDifficulty: 5,
          },
          {
            generatorId: 'g4.challenge',
            variant: 'mulest#creative',
            tier: 'creative',
            minDifficulty: 1,
            maxDifficulty: 5,
          },
        ],
      },
    ]),
    // ------------------------------------------------------------------ 四
    unit(B, 4, '我们生活的空间（二）', [
      {
        slug: 'observe-range',
        title: '观察的范围',
        objectives: [
          '知道观察的位置变了，能看到的范围也会变',
          '会在示意图上画出视线，找出看不到的地方（盲区）',
          '能用观察的范围解释生活现象',
        ],
        keyPoints: [
          '重点：视线是从眼睛出发的直线，被挡住的部分看不到',
          '难点：离遮挡物越近，看到的范围越小',
          '常见错误：画视线时不经过遮挡物的边缘',
        ],
        prerequisites: ['bsd-g4a.u2.lines'],
        localContexts: ['站在深圳湾公园的围墙后看海', '大货车司机看不到的盲区'],
        lecture: {
          title: '观察的范围：视线与盲区',
          minutes: 9,
          focus:
            '以教材“观察的范围”情境（隔着墙或窗户看外面）讲：从眼睛出发经过遮挡物边缘画两条视线，两条视线之间是能看到的范围，被挡住的是盲区；人离遮挡物越近，看到的范围越小。例题一在示意图上画视线判断某个人或物体能不能被看到；例题二说明大货车右转时的盲区，提醒过马路的安全。不涉及计算。',
        },
        practice: [],
      },
      {
        slug: 'tiananmen',
        title: '天安门广场',
        objectives: [
          '能看懂简单的平面示意图',
          '会用方向和距离描述建筑物的位置',
          '能根据描述在示意图上找到位置',
        ],
        keyPoints: [
          '重点：先说方向（东、南、西、北和东北、东南、西北、西南），再说距离',
          '难点：观察点不同，同一建筑物的方向说法不同',
          '常见错误：以自己为中心和以某建筑物为中心的方向弄混',
        ],
        prerequisites: [],
        localContexts: ['深圳市民中心和莲花山公园的位置'],
        lecture: {
          title: '天安门广场：描述位置',
          minutes: 9,
          focus:
            '以教材“天安门广场”情境的平面示意图（天安门、人民英雄纪念碑、人民大会堂、国家博物馆）讲：确定观察点，按“上北下南、左西右东”判断方向，再说出大约的距离，完整描述“某建筑物在某建筑物的什么方向，大约多少米”；再换一个观察点重新描述。方向只用八个方向，不涉及角度。',
        },
        practice: [],
      },
    ]),
    // ------------------------------------------------------------------ 五
    unit(B, 5, '运算律', [
      {
        slug: 'mixed-order',
        title: '生态养殖：混合运算的顺序与中括号',
        objectives: [
          '掌握四则混合运算的顺序',
          '认识中括号，会计算带小括号和中括号的算式',
          '能列综合算式解决购物问题',
        ],
        keyPoints: [
          '重点：先乘除后加减，有括号先算小括号再算中括号',
          '难点：多步问题列综合算式时括号的使用',
          '常见错误：从左往右一路算下去忽略乘除优先；中括号里的小括号没先算',
        ],
        prerequisites: [],
        localContexts: ['深圳郊区的生态鱼塘', '深圳书城买文具'],
        lecture: {
          title: '生态养殖：混合运算的顺序',
          minutes: 10,
          focus:
            '以养殖场情境（如买 3 袋饲料和 1 桶药水一共多少元，付 100 元找回多少）讲四则混合运算顺序，并认识中括号：先算小括号里的，再算中括号里的。例题一 100-(3×24+9)；例题二带中括号的算式如 9÷[3×(5-2)]。每一步都写脱式，只用整数，不涉及简便计算（后面几课学）。',
        },
        techniques: [
          {
            slug: 'mark-order',
            title: '画线标顺序：先括号，再乘除，后加减',
            minutes: 4,
            focus:
              '教脱式计算前先在每一步运算下面画横线并标上 ①②③：先小括号，再中括号，括号外先乘除后加减，同级从左往右。演示 120-40÷5×2 和 12×[(8+4)÷2] 两例，对比从左往右硬算的错误，做 1 道小练习。',
            remedies: ['order-of-ops'],
          },
        ],
        practice: [
          { generatorId: 'g4.law.simplify', minDifficulty: 1, maxDifficulty: 2, label: '运算顺序' },
          {
            generatorId: 'g4.challenge',
            variant: 'order#stretch',
            tier: 'stretch',
            minDifficulty: 1,
            maxDifficulty: 5,
          },
          {
            generatorId: 'g4.challenge',
            variant: 'order#creative',
            tier: 'creative',
            minDifficulty: 1,
            maxDifficulty: 5,
          },
        ],
      },
      {
        slug: 'commutative',
        title: '加法交换律和乘法交换律',
        objectives: [
          '理解加法交换律和乘法交换律',
          '会用字母表示两个交换律',
          '会用交换律验算和简便计算',
        ],
        keyPoints: [
          '重点：a+b=b+a，a×b=b×a',
          '难点：用字母表示运算律；举例说明',
          '常见错误：以为减法、除法也能交换',
        ],
        prerequisites: ['bsd-g4a.u5.mixed-order'],
        localContexts: ['欢乐谷两个项目排队时间相加'],
        lecture: {
          title: '加法交换律和乘法交换律',
          minutes: 9,
          focus:
            '以教材中“照样子再写一组”的活动，让孩子从 4+6=6+4、3×5=5×3 等算式中发现规律，用自己的话、图示和字母表示加法交换律与乘法交换律；再举反例说明减法、除法一般不能交换。例题：填空 a+□=36+a；用交换律验算。字母只用来表示运算律，不解方程。',
        },
        practice: [
          { generatorId: 'g4.law.simplify', minDifficulty: 1, maxDifficulty: 2 },
          {
            generatorId: 'g4.challenge',
            variant: 'law#stretch',
            tier: 'stretch',
            minDifficulty: 1,
            maxDifficulty: 5,
          },
          {
            generatorId: 'g4.challenge',
            variant: 'law#creative',
            tier: 'creative',
            minDifficulty: 1,
            maxDifficulty: 5,
          },
        ],
      },
      {
        slug: 'associative-add',
        title: '加法结合律：凑整简便计算',
        objectives: [
          '理解加法结合律并会用字母表示',
          '会综合运用加法交换律和结合律进行简便计算',
          '能看出哪两个数相加能凑成整十、整百',
        ],
        keyPoints: [
          '重点：(a+b)+c=a+(b+c)',
          '难点：先交换再结合，把能凑整的数放在一起',
          '常见错误：凑整时找错搭档（如 38+62 凑成 100 却和别的数组合）；移动数时丢了前面的符号',
        ],
        prerequisites: ['bsd-g4a.u5.commutative'],
        localContexts: ['深圳湾公园骑行几段路程相加', '购物清单上几样东西的价钱'],
        lecture: {
          title: '加法结合律：凑整真好算',
          minutes: 10,
          focus:
            '以教材“加法结合律”的算式观察活动（如 (19+62)+38 与 19+(62+38)）发现加法结合律并用字母表示。再讲综合运用交换律和结合律凑整百简算，如 58+147+42 = (58+42)+147。例题两道，每道先找“好朋友数”（和是整十整百），再写简算过程。只用加法，不涉及减法性质。',
        },
        techniques: [
          {
            slug: 'find-partners',
            title: '找“凑整好朋友”',
            minutes: 4,
            focus:
              '教凑整：个位相加得 10 的数是好朋友（如 58 和 42、175 和 25），先把好朋友连线，再用交换律、结合律把它们放在一起算。演示 36+87+64、125+78+75 两例，对比找错搭档（如 36+87）的错误，做 1 道小练习。',
            remedies: ['pairing'],
          },
        ],
        practice: [
          { generatorId: 'g4.law.simplify', minDifficulty: 1, maxDifficulty: 3 },
          {
            generatorId: 'g4.challenge',
            variant: 'law#stretch',
            tier: 'stretch',
            minDifficulty: 1,
            maxDifficulty: 5,
          },
          {
            generatorId: 'g4.challenge',
            variant: 'law#creative',
            tier: 'creative',
            minDifficulty: 1,
            maxDifficulty: 5,
          },
        ],
      },
      {
        slug: 'associative-mul',
        title: '乘法结合律：25×4、125×8 凑整',
        objectives: [
          '理解乘法结合律并会用字母表示',
          '会用乘法交换律和结合律进行简便计算',
          '记住 25×4=100、125×8=1000 等常用凑整组合',
        ],
        keyPoints: [
          '重点：(a×b)×c=a×(b×c)',
          '难点：拆数凑整（如 25×32 = 25×4×8）',
          '常见错误：把乘法结合律和分配律混淆（25×(4+8) 算成 25×4×8）；凑整组合记错',
        ],
        prerequisites: ['bsd-g4a.u5.associative-add'],
        localContexts: ['书架每层 40 本、共 3 层 6 个书架（深圳图书馆）'],
        lecture: {
          title: '乘法结合律：找 25 和 4',
          minutes: 10,
          focus:
            '以教材“乘法结合律”情境（如 (40×3)×6 与 40×(3×6)）发现规律并用字母表示；讲常用凑整组合 5×2、25×4、125×8，例题一 25×17×4，例题二 125×32 = 125×8×4。强调这里只有乘法，没有加法，不要和下一课的分配律混淆。',
        },
        techniques: [
          {
            slug: 'mul-pairs',
            title: '乘法凑整三对宝：5×2、25×4、125×8',
            minutes: 4,
            focus:
              '教看到 25 找 4、看到 125 找 8、看到 5 找 2；没有现成的就把另一个数拆开（44 = 4×11，32 = 8×4）。演示 25×44、125×24 两例，对比把 25×44 拆成 25×40+4 的错误，做 1 道小练习。',
            remedies: ['pairing'],
          },
        ],
        practice: [
          { generatorId: 'g4.law.simplify', minDifficulty: 2, maxDifficulty: 4 },
          {
            generatorId: 'g4.challenge',
            variant: 'lawmul#stretch',
            tier: 'stretch',
            minDifficulty: 1,
            maxDifficulty: 5,
          },
          {
            generatorId: 'g4.challenge',
            variant: 'lawmul#creative',
            tier: 'creative',
            minDifficulty: 1,
            maxDifficulty: 5,
          },
        ],
      },
      {
        slug: 'distributive',
        title: '乘法分配律',
        objectives: [
          '理解乘法分配律 (a+b)×c=a×c+b×c',
          '会用乘法分配律进行简便计算（正用和反用）',
          '能用图形面积解释乘法分配律',
        ],
        keyPoints: [
          '重点：两个数的和乘一个数，等于分别乘再相加',
          '难点：反用分配律（提取相同因数）和拆数使用（如 102×35）',
          '常见错误：只乘了一个加数（漏乘）；和乘法结合律混淆',
        ],
        prerequisites: ['bsd-g4a.u5.associative-mul'],
        localContexts: ['厨房贴瓷砖（教材情境）', '深圳湾公园两块草坪的面积'],
        lecture: {
          title: '乘法分配律：两块一起算',
          minutes: 12,
          focus:
            '以教材“乘法分配律”情境（厨房贴瓷砖，两面墙的瓷砖数）用两种方法列式，得到 (a+b)×c = a×c+b×c，并用长方形面积图示说明。例题一正用：(80+4)×25；例题二反用：35×37+65×37。再简要演示拆数：102×35 = 100×35+2×35。强调括号里的每个数都要乘到。',
        },
        techniques: [
          {
            slug: 'multiply-each',
            title: '分配律“每人一份”：连线防漏乘',
            minutes: 5,
            focus:
              '教用连线法用分配律：从括号外的数画箭头分别指向括号里的每一个加数，每条箭头都写一个乘法。演示 (40+8)×25 和 99×45+45 两例（后者把 45 看成 45×1），对比 (40+8)×25 = 40×25+8 的漏乘错误，做 1 道小练习。',
            remedies: ['distributive-miss'],
          },
        ],
        practice: [
          { generatorId: 'g4.law.simplify', minDifficulty: 2, maxDifficulty: 5 },
          {
            generatorId: 'g4.challenge',
            variant: 'lawmul#stretch',
            tier: 'stretch',
            minDifficulty: 1,
            maxDifficulty: 5,
          },
          {
            generatorId: 'g4.challenge',
            variant: 'lawmul#creative',
            tier: 'creative',
            minDifficulty: 1,
            maxDifficulty: 5,
          },
        ],
      },
      {
        slug: 'count-figures',
        title: '数学好玩：数图形的学问',
        objectives: [
          '会有序地数线段、射线、角、三角形和长方形，不重复、不遗漏',
          '发现点数和线段条数的规律（2 个点 1 条，3 个点 3 条，4 个点 6 条……）',
          '能用数线段的方法解决握手、比赛场次、车票种类等问题',
        ],
        keyPoints: [
          '重点：有序地数——从第一个点出发数完，再从第二个点出发……',
          '难点：把数角、数三角形、数长方形转化成数线段',
          '常见错误：只数基本图形；从不同的点出发重复数',
        ],
        prerequisites: ['bsd-g4a.u2.lines', 'bsd-g4a.u2.angles-rotation'],
        localContexts: ['深圳地铁一条线路各站之间的车票', '班级篮球赛每两个班赛一场'],
        lecture: {
          title: '数图形的学问：有序地数',
          minutes: 10,
          focus:
            '从“一条线段上有 3 个点、4 个点，一共有几条线段”开始，教有序地数：先数以第一个点为左端点的线段，再数以第二个点为左端点的……得到 3 + 2 + 1；再把数角（从一点出发的射线）、数三角形（从顶点向对边画线段）转化成数线段，最后用同样的方法算握手次数、比赛场次。例题一数线段，例题二数三角形。',
        },
        techniques: [
          {
            slug: 'ordered-count',
            title: '有序数图形：从第一个点数起',
            minutes: 4,
            focus:
              '教有序数图形的口令：给点编上字母，从第一个点出发数完，再从第二个点出发，只往后数不回头，最后把各组相加。演示一条线段上 5 个点和三角形顶点引出 2 条线段两例，对比只数基本图形的错误，做 1 道小练习。',
            remedies: ['figure-count'],
          },
        ],
        practice: [
          { generatorId: 'g4.figures', minDifficulty: 1, maxDifficulty: 5 },
          {
            generatorId: 'g4.challenge',
            variant: 'figures#stretch',
            tier: 'stretch',
            minDifficulty: 1,
            maxDifficulty: 5,
          },
          {
            generatorId: 'g4.challenge',
            variant: 'figures#creative',
            tier: 'creative',
            minDifficulty: 1,
            maxDifficulty: 5,
          },
        ],
      },
    ]),
    // ------------------------------------------------------------------ 六
    unit(B, 6, '图形的奥秘', [
      {
        slug: 'cut-solids',
        title: '切开立体图形',
        objectives: [
          '知道用一个平面切开长方体、正方体、圆柱等，切面是一个平面图形',
          '能说出不同切法得到的切面形状',
          '能根据切面形状想象是怎样切的',
        ],
        keyPoints: [
          '重点：切的方向不同，切面的形状可能不同',
          '难点：想象斜着切正方体得到的切面',
          '常见错误：把切面和立体图形的某个面混为一谈',
        ],
        prerequisites: [],
        localContexts: ['切萝卜、切豆腐、切蛋糕'],
        lecture: {
          title: '切开立体图形：切面是什么形状',
          minutes: 9,
          focus:
            '用切萝卜块、切豆腐（正方体、长方体）和切火腿肠（圆柱）的生活情境讲：平着切、竖着切、斜着切，切面分别是什么形状（正方形、长方形、三角形、圆等）。先猜再用实物或动画验证。例题一说出切面形状，例题二根据切面形状选择切法。不涉及计算。',
        },
        practice: [],
      },
      {
        slug: 'build-blocks',
        title: '搭建立体大楼',
        objectives: [
          '能从正面、侧面、上面观察用小正方体搭成的立体图形，画出看到的形状',
          '能根据从不同方向看到的形状搭出立体图形',
          '会数搭成立体图形用了几个小正方体',
        ],
        keyPoints: [
          '重点：从三个方向看到的形状',
          '难点：根据看到的形状确定小正方体的个数（最多、最少）',
          '常见错误：漏数被挡住的小正方体',
        ],
        prerequisites: [],
        localContexts: ['用积木搭深圳平安金融中心、京基 100'],
        lecture: {
          title: '搭建立体大楼：从三个方向看',
          minutes: 10,
          focus:
            '以用小正方体搭“大楼”的活动讲：分别从正面、左面（侧面）、上面看，画出看到的形状（用方格表示）；再反过来，根据三个方向看到的形状搭出大楼，并数出用了几个小正方体，讨论被挡住的那几个。例题一画出三个方向看到的形状，例题二根据形状数小正方体的个数。',
        },
        practice: [],
      },
      {
        slug: 'roll-cube',
        title: '翻滚正方体',
        objectives: [
          '认识正方体的展开图，知道相对的两个面',
          '能想象正方体翻滚后哪个面朝上',
          '能判断一个平面图形能不能折成正方体',
        ],
        keyPoints: [
          '重点：正方体相对的面在展开图中不相邻（隔一个）',
          '难点：想象连续翻滚后每个面的位置',
          '常见错误：把相邻的面当成相对的面',
        ],
        prerequisites: ['bsd-g4a.u6.build-blocks'],
        localContexts: ['掷骰子：相对两面的点数和是 7'],
        lecture: {
          title: '翻滚正方体：哪个面朝上',
          minutes: 9,
          focus:
            '用骰子和写了字的正方体讲：正方体有 6 个面，相对的两个面不相邻；沿着一条棱向前、向右翻滚一次，朝上的面怎样变化，连续翻滚时一步一步记录。再看正方体展开图，找出相对的面（隔一个的两个面相对）。例题一翻滚后哪个面朝上，例题二在展开图中找相对的面。',
        },
        practice: [],
      },
    ]),
    // ------------------------------------------------------------------ 七
    unit(B, 7, '运用数量关系解决问题', [
      {
        slug: 'part-whole',
        title: '总量与分量',
        objectives: [
          '理解“总量 = 分量 + 分量”，知道求分量用减法',
          '会用线段图表示总量与分量的关系',
          '能解决两步计算的总量、分量问题',
        ],
        keyPoints: [
          '重点：找准总量和各个分量',
          '难点：分量本身要先用乘法求出来的两步问题',
          '常见错误：漏加一个分量；求分量时用了加法',
        ],
        prerequisites: ['bsd-g4a.u3.mul-3x2'],
        localContexts: ['学校食堂买大米和面粉', '荔枝园收获的荔枝和龙眼'],
        lecture: {
          title: '总量与分量：画线段图找关系',
          minutes: 10,
          focus:
            '以购物、收获水果等情境讲“总量 = 分量 + 分量”：先画线段图，标出总量和分量，再列式。例题一两个分量都要先用乘法算（买 12 袋大米每袋 25 千克、15 袋面粉每袋 20 千克，一共多少千克）；例题二已知总量和一个分量，求另一个分量。只用三位数乘两位数和加减，数据是整数。',
        },
        techniques: [
          {
            slug: 'draw-line',
            title: '画线段图：先找总量，再找分量',
            minutes: 4,
            focus:
              '教画线段图三步：①画一条长线段表示总量；②分成几段，标出各个分量；③问号在总量上用加法，在分量上用减法。演示“一共”和“其余”两类题，对比漏掉一个分量的错误，做 1 道小练习。',
            remedies: ['relation-confused'],
          },
        ],
        practice: [
          { generatorId: 'g4.quantity', variant: 'part-whole', minDifficulty: 1, maxDifficulty: 5 },
          {
            generatorId: 'g4.challenge',
            variant: 'quantity#stretch',
            tier: 'stretch',
            minDifficulty: 1,
            maxDifficulty: 5,
          },
          {
            generatorId: 'g4.challenge',
            variant: 'quantity#creative',
            tier: 'creative',
            minDifficulty: 1,
            maxDifficulty: 5,
          },
        ],
      },
      {
        slug: 'unit-price',
        title: '单价、数量与总价',
        objectives: [
          '知道单价、数量、总价的含义',
          '掌握 单价 × 数量 = 总价，及 总价 ÷ 数量 = 单价、总价 ÷ 单价 = 数量',
          '能用这组关系解决购物问题',
        ],
        keyPoints: [
          '重点：单价 × 数量 = 总价',
          '难点：根据问题选用变式（求单价、求数量）',
          '常见错误：把单价和总价弄混；该乘用了除',
        ],
        prerequisites: ['bsd-g4a.u7.part-whole'],
        localContexts: ['学校买校服、足球', '深圳书城买练习本'],
        lecture: {
          title: '单价、数量与总价',
          minutes: 10,
          focus:
            '以学校买足球、校服的情境引出单价（每个多少元）、数量、总价，归纳 单价 × 数量 = 总价，再用同一个例子推出两个变式。例题一求总价（每套校服 125 元，买 36 套）；例题二求单价或数量（除以一位数，或整十数的口算）。数据是整数，除法都能整除。',
        },
        practice: [
          { generatorId: 'g4.quantity', variant: 'unit-price', minDifficulty: 1, maxDifficulty: 5 },
          {
            generatorId: 'g4.challenge',
            variant: 'quantity#stretch',
            tier: 'stretch',
            minDifficulty: 1,
            maxDifficulty: 5,
          },
          {
            generatorId: 'g4.challenge',
            variant: 'quantity#creative',
            tier: 'creative',
            minDifficulty: 1,
            maxDifficulty: 5,
          },
        ],
      },
      {
        slug: 'speed-time-distance',
        title: '速度、时间与路程',
        objectives: [
          '理解速度的含义，会读写速度单位（如千米/时、米/分）',
          '掌握 速度 × 时间 = 路程 及其变式',
          '能用这个关系解决简单行程问题',
        ],
        keyPoints: [
          '重点：路程 = 速度 × 时间，速度 = 路程 ÷ 时间，时间 = 路程 ÷ 速度',
          '难点：复合单位“千米/时”的意义',
          '常见错误：速度单位写成“千米”；数量关系用反',
        ],
        prerequisites: ['bsd-g4a.u7.unit-price'],
        localContexts: ['深圳地铁 11 号线的速度', '深圳北站开出的高铁每小时行驶的路程'],
        lecture: {
          title: '速度、时间与路程',
          minutes: 10,
          focus:
            '以“谁跑得快”的比较引出速度：单位时间里行的路程，写作“千米/时”“米/分”。归纳三个量的关系，并和“单价 × 数量 = 总价”对照。例题一求路程（高铁每小时行 300 千米，3 小时行多少）；例题二求速度或时间（除以一位数，或整十数的口算）。数据是整数，不涉及相遇问题。',
        },
        techniques: [
          {
            slug: 'know-two-find-one',
            title: '三个量，知二求一',
            minutes: 4,
            focus:
              '教行程题三步：①圈出题目里的速度、时间、路程，看缺哪一个；②缺路程用乘法，缺速度或时间用除法；③检查单位（速度带“/”）。演示求路程和求时间两例，对比把路程 ÷ 时间写成路程 × 时间的错误，做 1 道小练习。',
            remedies: ['relation-confused'],
          },
        ],
        practice: [
          { generatorId: 'g4.quantity', variant: 'speed', minDifficulty: 1, maxDifficulty: 5 },
          {
            generatorId: 'g4.challenge',
            variant: 'quantity#stretch',
            tier: 'stretch',
            minDifficulty: 1,
            maxDifficulty: 5,
          },
          {
            generatorId: 'g4.challenge',
            variant: 'quantity#creative',
            tier: 'creative',
            minDifficulty: 1,
            maxDifficulty: 5,
          },
        ],
      },
      {
        slug: 'meeting',
        title: '相遇问题',
        objectives: [
          '理解“同时出发、相向而行、相遇”的意思',
          '知道相遇时两人走的路程合起来是两地的距离',
          '会用“速度和 × 相遇时间 = 总路程”解决问题',
        ],
        keyPoints: [
          '重点：速度和 × 相遇时间 = 两地距离',
          '难点：画线段图表示两人走的路程',
          '常见错误：只算了一个人走的路程；把“还相距”当成两地距离',
        ],
        prerequisites: ['bsd-g4a.u7.speed-time-distance'],
        localContexts: ['两人从深圳湾公园步道两端同时出发', '两列地铁在隧道里相向开来'],
        lecture: {
          title: '相遇问题：两人一起走完全程',
          minutes: 10,
          focus:
            '用两人从两端同时出发、相向而行的动画讲：每分钟两人一共走近“速度和”米，相遇时两人走的路程合起来就是两地的距离。先画线段图，再给出两种方法：分别算两人的路程再相加，或 速度和 × 时间。例题一求两地距离，例题二求相遇时间（速度和是整十数，口算除法）。',
        },
        practice: [
          { generatorId: 'g4.quantity', variant: 'meeting', minDifficulty: 1, maxDifficulty: 5 },
          {
            generatorId: 'g4.challenge',
            variant: 'quantity#stretch',
            tier: 'stretch',
            minDifficulty: 1,
            maxDifficulty: 5,
          },
          {
            generatorId: 'g4.challenge',
            variant: 'quantity#creative',
            tier: 'creative',
            minDifficulty: 1,
            maxDifficulty: 5,
          },
        ],
      },
    ]),
    // ------------------------------------------------------------------ 八
    unit(B, 8, '数据的表示和分析（一）', [
      {
        slug: 'birthdays',
        title: '同学的生日',
        objectives: [
          '会用调查、记录的方法收集数据，并分类整理成统计表',
          '认识条形统计图，能根据统计表画条形统计图',
          '能从统计图中读出信息并提出问题',
        ],
        keyPoints: [
          '重点：用统计表和条形统计图表示数据',
          '难点：根据数据的大小选择一格表示几',
          '常见错误：直条画得高低和数据不符；漏掉标题和单位',
        ],
        prerequisites: [],
        localContexts: ['班里同学生日所在的月份', '深圳各季节的天数'],
        lecture: {
          title: '同学的生日：整理数据、画统计图',
          minutes: 10,
          focus:
            '以调查全班同学生日所在的月份（或季节）为例：先记录，再用画“正”字的方法整理成统计表，然后画条形统计图（一格表示 1 人），最后读图回答“哪个月过生日的人最多、比最少的多几人”。只用整数，不涉及平均数。',
        },
        practice: [],
      },
      {
        slug: 'award-age',
        title: '获奖时的年龄',
        objectives: [
          '会把数据按范围分段整理（如 30～39 岁）',
          '能读懂一格表示多个单位的条形统计图',
          '能根据统计结果作出简单的判断',
        ],
        keyPoints: [
          '重点：分段整理数据',
          '难点：一格表示 2、5、10 时读出直条表示的数',
          '常见错误：分段时同一个数据数了两次或漏数',
        ],
        prerequisites: ['bsd-g4a.u8.birthdays'],
        localContexts: ['深圳马拉松参赛者的年龄段'],
        lecture: {
          title: '获奖时的年龄：分段整理数据',
          minutes: 10,
          focus:
            '以一组获奖者（如科学家）获奖时的年龄为例：先确定分段（每 10 岁一段），逐个数据画记，整理成统计表，再画一格表示 2 人的条形统计图，读图说出哪个年龄段获奖的人最多。数据用整数，不涉及平均数和折线统计图。',
        },
        practice: [],
      },
      {
        slug: 'navigation',
        title: '综合实践：导航给的时间准吗',
        objectives: [
          '知道导航预估的时间是根据路程和速度估计出来的',
          '会记录实际出行时间，和导航给的时间比较',
          '能用数据说明导航的时间什么时候准、什么时候不准',
        ],
        keyPoints: [
          '重点：路程、速度与时间的关系在生活中的应用',
          '难点：收集、整理多次出行的数据并作比较',
          '常见错误：只根据一次记录就下结论',
        ],
        prerequisites: ['bsd-g4a.u7.speed-time-distance', 'bsd-g4a.u8.birthdays'],
        localContexts: ['从家到学校的导航时间', '周末去深圳湾公园的导航时间'],
        lecture: {
          title: '导航给的时间准吗：记录与比较',
          minutes: 9,
          focus:
            '以家长开车或乘地铁用手机导航为情境：记录几次出行导航预估的时间和实际用的时间，整理成统计表，算出相差几分钟，讨论堵车、红绿灯、天气对时间的影响，说明导航是用“路程 ÷ 速度”估计时间的。例题用虚构的整数数据，不涉及小数。',
        },
        practice: [],
      },
    ]),
  ],
};
