import type { Polyphone } from './types';

/**
 * 语文 四年级上册（统编版 2026 修订）多音字。kp = 知识点 id 去掉 "yw-g4a."；每个字只出现一次。
 *
 * 前一部分是第一、二单元课文里出现的多音字（kp = 所在课文，例句改写自课文原句）；
 * 后一部分（kp = 'u2.polyphones'）是四年级上册常练的其他多音字，例句为自编生活句。
 * 读音依据《现代汉语词典》：轻声不标调；有争议读音的词（如 灯笼、倒车、旋转、将军、记号）一律不收。
 */
export const YW_G4A_POLY: Polyphone[] = [
  // ------------------------------------------------------------------ 观潮
  {
    kp: 'u1.tide',
    level: 2,
    char: '闷',
    readings: [
      { pinyin: 'mēn', meaning: '空气不流通、不透气；不出声', words: ['闷热', '闷头'] },
      { pinyin: 'mèn', meaning: '声音低沉；心里不痛快', words: ['闷雷', '烦闷', '沉闷'] },
    ],
    sentences: [{ text: '远处传来隆隆的响声，好像「闷」雷滚动。', pinyin: 'mèn' }],
  },
  {
    kp: 'u1.tide',
    level: 3,
    char: '薄',
    readings: [
      { pinyin: 'báo', meaning: '（东西）不厚，多单用或用在口语词里', words: ['薄饼', '薄片'] },
      { pinyin: 'bó', meaning: '轻微、不浓；不强', words: ['薄雾', '单薄', '稀薄', '薄弱'] },
      { pinyin: 'bò', meaning: '薄荷，一种有清凉香味的植物', words: ['薄荷', '薄荷糖'] },
    ],
    sentences: [{ text: '江面上笼罩着一层蒙蒙的「薄」雾。', pinyin: 'bó' }],
  },
  {
    kp: 'u1.tide',
    level: 2,
    char: '笼',
    readings: [
      { pinyin: 'lóng', meaning: '关鸟、鸡等的器具；蒸东西的器具', words: ['鸟笼', '鸡笼', '蒸笼', '笼子'] },
      { pinyin: 'lǒng', meaning: '像笼子一样罩住；大概、不具体', words: ['笼罩', '笼统'] },
    ],
    sentences: [{ text: '雨后的江面上「笼」罩着一层薄雾。', pinyin: 'lǒng' }],
  },
  {
    kp: 'u1.tide',
    level: 2,
    char: '号',
    readings: [
      { pinyin: 'háo', meaning: '大声叫喊；大声哭', words: ['号叫', '号啕大哭'] },
      { pinyin: 'hào', meaning: '名称、标记；号码', words: ['号码', '口号', '问号'] },
    ],
    sentences: [{ text: '潮头过去了，江面上依旧风「号」浪吼。', pinyin: 'háo' }],
  },
  {
    kp: 'u1.tide',
    level: 2,
    char: '卷',
    readings: [
      { pinyin: 'juǎn', meaning: '把东西弯转成圆筒形；（风、浪）裹住带走', words: ['花卷', '卷尺', '卷心菜'] },
      { pinyin: 'juàn', meaning: '书本、画卷；考试的卷子', words: ['试卷', '画卷', '答卷'] },
    ],
    sentences: [{ text: '余波还在漫天「卷」地般涌来。', pinyin: 'juǎn' }],
  },
  {
    kp: 'u1.tide',
    level: 2,
    char: '涨',
    readings: [
      { pinyin: 'zhǎng', meaning: '（水位、价格）升高', words: ['涨潮', '上涨', '涨价'] },
      { pinyin: 'zhàng', meaning: '（脸）充血；头脑发胀', words: ['涨红', '头昏脑涨'] },
    ],
    sentences: [{ text: '看看堤下，江水已经「涨」了两丈来高。', pinyin: 'zhǎng' }],
  },
  {
    kp: 'u1.tide',
    level: 2,
    char: '横',
    readings: [
      { pinyin: 'héng', meaning: '跟地面平行的；从左到右的', words: ['横线', '纵横', '横七竖八'] },
      { pinyin: 'hèng', meaning: '粗暴、不讲理；意外的', words: ['蛮横', '专横', '横财'] },
    ],
    sentences: [
      { text: '宽阔的钱塘江「横」卧在眼前。', pinyin: 'héng' },
      { text: '屋子里「横」七竖八地拉了许多绳子。', pinyin: 'héng' },
    ],
  },
  {
    kp: 'u1.tide',
    level: 3,
    char: '奔',
    readings: [
      { pinyin: 'bēn', meaning: '很快地跑', words: ['奔跑', '飞奔', '奔腾'] },
      { pinyin: 'bèn', meaning: '投靠、朝着目标去；可指望的前途', words: ['投奔', '奔头'] },
    ],
    sentences: [
      { text: '浪潮像千万匹白色战马飞「奔」而来。', pinyin: 'bēn' },
      { text: '霎时，潮头「奔」腾西去。', pinyin: 'bēn' },
    ],
  },
  {
    kp: 'u1.tide',
    level: 3,
    char: '颤',
    readings: [
      { pinyin: 'chàn', meaning: '（物体）快速地抖动', words: ['颤动', '颤抖'] },
      { pinyin: 'zhàn', meaning: '（人因为冷或害怕）发抖，同“战”', words: ['打颤', '颤栗'] },
    ],
    sentences: [{ text: '好像大地都被震得「颤」动起来。', pinyin: 'chàn' }],
  },
  {
    kp: 'u1.tide',
    level: 2,
    char: '相',
    readings: [
      { pinyin: 'xiāng', meaning: '互相，彼此', words: ['互相', '相信', '相同'] },
      { pinyin: 'xiàng', meaning: '样子、外貌；照片', words: ['照相', '相机', '真相'] },
    ],
    sentences: [{ text: '东边水天「相」接的地方出现了一条白线。', pinyin: 'xiāng' }],
  },
  {
    kp: 'u1.tide',
    level: 2,
    char: '奇',
    readings: [
      { pinyin: 'qí', meaning: '少见的、特别的；让人惊讶的', words: ['奇怪', '神奇', '奇观'] },
      { pinyin: 'jī', meaning: '单数（不能被 2 整除的数）', words: ['奇数', '奇偶'] },
    ],
    sentences: [{ text: '钱塘江大潮自古被称为天下「奇」观。', pinyin: 'qí' }],
  },

  // ------------------------------------------------------------------ 现代诗二首
  {
    kp: 'u1.modern-poems',
    level: 2,
    char: '尽',
    readings: [
      { pinyin: 'jǐn', meaning: '尽管、尽早：不必顾虑；力求', words: ['尽管', '尽快', '尽早'] },
      { pinyin: 'jìn', meaning: '完、到头；全部用出来', words: ['尽力', '尽头', '尽情'] },
    ],
    sentences: [{ text: '归巢的鸟儿，「尽」管是倦了，还驮着斜阳。', pinyin: 'jǐn' }],
  },
  {
    kp: 'u1.modern-poems',
    level: 1,
    char: '还',
    readings: [
      { pinyin: 'hái', meaning: '仍然；另外又有', words: ['还是', '还有'] },
      { pinyin: 'huán', meaning: '把东西送回去', words: ['归还', '还书', '还钱'] },
    ],
    sentences: [{ text: '鸟儿倦了，「还」驮着斜阳回去。', pinyin: 'hái' }],
  },
  {
    kp: 'u1.modern-poems',
    level: 1,
    char: '地',
    readings: [
      { pinyin: 'dì', meaning: '土地、地面；地方', words: ['草地', '土地', '地球'] },
      { pinyin: 'de', meaning: '用在动作前面，表示怎样做（……地做）', words: ['慢慢地', '轻轻地'] },
    ],
    sentences: [
      { text: '花牛在草「地」里坐。', pinyin: 'dì' },
      { text: '太阳偷偷「地」爬过了西山头。', pinyin: 'de' },
    ],
  },
  {
    kp: 'u1.modern-poems',
    level: 3,
    char: '得',
    readings: [
      { pinyin: 'dé', meaning: '得到、获得', words: ['得到', '得意', '获得'] },
      { pinyin: 'de', meaning: '用在词语后面，不单独表示意思', words: ['觉得', '记得', '跑得快'] },
      { pinyin: 'děi', meaning: '必须、需要', words: ['总得', '非得'] },
    ],
    sentences: [{ text: '花牛的小尾巴甩「得」滴溜溜。', pinyin: 'de' }],
  },

  // ------------------------------------------------------------------ 繁星
  {
    kp: 'u1.stars',
    level: 1,
    char: '数',
    readings: [
      { pinyin: 'shǔ', meaning: '一个一个地查点', words: ['数星星', '数不清'] },
      { pinyin: 'shù', meaning: '数目、数字', words: ['数学', '数字', '无数'] },
    ],
    sentences: [{ text: '深蓝色的天空里悬着无「数」半明半昧的星。', pinyin: 'shù' }],
  },
  {
    kp: 'u1.stars',
    level: 3,
    char: '似',
    readings: [
      { pinyin: 'sì', meaning: '像；好像', words: ['似乎', '相似', '类似', '好似'] },
      { pinyin: 'shì', meaning: '用在“……似的”里，表示跟什么差不多', words: ['似的', '飞似的'] },
    ],
    sentences: [
      { text: '我仿佛回到了母亲的怀里「似」的。', pinyin: 'shì' },
      { text: '豆子说：我「似」乎觉得外面发生了一些事情。', pinyin: 'sì' },
    ],
  },
  {
    kp: 'u1.stars',
    level: 2,
    char: '便',
    readings: [
      { pinyin: 'biàn', meaning: '方便；就（“便”等于“就”）', words: ['方便', '顺便', '随便'] },
      { pinyin: 'pián', meaning: '便宜：价钱低', words: ['便宜', '占便宜'] },
    ],
    sentences: [{ text: '每晚我打开后门，「便」看见一个静寂的夜。', pinyin: 'biàn' }],
  },
  {
    kp: 'u1.stars',
    level: 1,
    char: '觉',
    readings: [
      { pinyin: 'jué', meaning: '感到、觉察', words: ['觉得', '感觉', '自觉'] },
      { pinyin: 'jiào', meaning: '睡眠', words: ['睡觉', '午觉'] },
    ],
    sentences: [{ text: '星光使我们「觉」得光明无处不在。', pinyin: 'jué' }],
  },
  {
    kp: 'u1.stars',
    level: 2,
    char: '模',
    readings: [
      { pinyin: 'mó', meaning: '照着做的样子；不清楚（模糊）', words: ['模糊', '模型', '模仿', '模范'] },
      { pinyin: 'mú', meaning: '模子；长相、样子', words: ['模样', '模子', '模具'] },
    ],
    sentences: [{ text: '渐渐地，我的眼睛「模」糊了。', pinyin: 'mó' }],
  },
  {
    kp: 'u1.stars',
    level: 1,
    char: '空',
    readings: [
      { pinyin: 'kōng', meaning: '天空；里面没有东西', words: ['天空', '空气', '空中'] },
      { pinyin: 'kòng', meaning: '空闲的时间；空着的地方', words: ['有空', '空白', '填空'] },
    ],
    sentences: [{ text: '我躺在舱面上，仰望天「空」。', pinyin: 'kōng' }],
  },
  {
    kp: 'u1.stars',
    level: 2,
    char: '处',
    readings: [
      { pinyin: 'chù', meaning: '地方；方面', words: ['到处', '好处', '住处'] },
      { pinyin: 'chǔ', meaning: '跟人一起生活、交往；办理', words: ['处理', '相处', '处罚'] },
    ],
    sentences: [
      { text: '星光让我们觉得光明无「处」不在。', pinyin: 'chù' },
      { text: '蝙蝠像没头苍蝇一样到「处」乱撞。', pinyin: 'chù' },
    ],
  },
  {
    kp: 'u1.stars',
    level: 1,
    char: '中',
    readings: [
      { pinyin: 'zhōng', meaning: '中间、里面', words: ['中间', '中午', '心中'] },
      { pinyin: 'zhòng', meaning: '正好对上；受到', words: ['打中', '中奖', '中暑'] },
    ],
    sentences: [{ text: '在星的怀抱「中」，我微笑着。', pinyin: 'zhōng' }],
  },

  // ------------------------------------------------------------------ 习作：推荐一个好地方
  {
    kp: 'u1.recommend-place',
    level: 1,
    char: '好',
    readings: [
      { pinyin: 'hǎo', meaning: '优点多的、让人满意的', words: ['好人', '好看', '美好'] },
      { pinyin: 'hào', meaning: '喜欢、爱', words: ['爱好', '好奇', '好客'] },
    ],
    sentences: [{ text: '我想向大家推荐一个「好」地方。', pinyin: 'hǎo' }],
  },

  // ------------------------------------------------------------------ 一个豆荚里的五粒豆
  {
    kp: 'u2.peas',
    level: 3,
    char: '称',
    readings: [
      { pinyin: 'chēng', meaning: '叫作；说好话；量轻重', words: ['称赞', '称呼', '名称'] },
      { pinyin: 'chèn', meaning: '合适、相配', words: ['相称', '对称', '称心'] },
    ],
    sentences: [
      { text: '这才像个豆荚，和我的身份非常相「称」。', pinyin: 'chèn' },
      { text: '钱塘江大潮被「称」为天下奇观。', pinyin: 'chēng' },
    ],
  },
  {
    kp: 'u2.peas',
    level: 3,
    char: '挣',
    readings: [
      { pinyin: 'zhèng', meaning: '用劳动换来（钱）；用力摆脱', words: ['挣钱', '挣脱', '挣开'] },
      { pinyin: 'zhēng', meaning: '挣扎：用力支撑或摆脱', words: ['挣扎', '垂死挣扎'] },
    ],
    sentences: [{ text: '母亲到外面去「挣」点生活的费用。', pinyin: 'zhèng' }],
  },
  {
    kp: 'u2.peas',
    level: 2,
    char: '盛',
    readings: [
      { pinyin: 'shèng', meaning: '兴旺、茂盛；丰富', words: ['盛开', '茂盛', '丰盛'] },
      { pinyin: 'chéng', meaning: '把东西放进碗、盆等里面', words: ['盛饭', '盛汤'] },
    ],
    sentences: [{ text: '她面前是一朵「盛」开的豌豆花。', pinyin: 'shèng' }],
  },
  {
    kp: 'u2.peas',
    level: 2,
    char: '当',
    readings: [
      { pinyin: 'dāng', meaning: '应该；正在（那时候）；担任', words: ['当然', '当时', '当心'] },
      { pinyin: 'dàng', meaning: '当作；合适；被骗', words: ['当作', '上当', '恰当'] },
    ],
    sentences: [
      { text: '孩子说豆子正好可以「当」作子弹用。', pinyin: 'dàng' },
      { text: '「当」母亲要出去工作时，阳光照了进来。', pinyin: 'dāng' },
    ],
  },
  {
    kp: 'u2.peas',
    level: 2,
    char: '倒',
    readings: [
      { pinyin: 'dǎo', meaning: '（人或东西）躺下来、翻下来', words: ['摔倒', '倒下', '打倒'] },
      { pinyin: 'dào', meaning: '上下颠倒；把东西倒出来；表示“反而、却”', words: ['倒水', '倒影', '倒立'] },
    ],
    sentences: [{ text: '最小的豆子说：我「倒」想知道谁走得最远！', pinyin: 'dào' }],
  },
  {
    kp: 'u2.peas',
    level: 2,
    char: '强',
    readings: [
      { pinyin: 'qiáng', meaning: '力气大、健壮；好，胜过', words: ['强壮', '坚强', '强大'] },
      { pinyin: 'qiǎng', meaning: '硬要、勉强', words: ['勉强', '强迫'] },
    ],
    sentences: [
      { text: '那个穷苦的女人很「强」壮，也很勤俭。', pinyin: 'qiáng' },
      { text: '齐威王每个等级的马都比田忌的「强」。', pinyin: 'qiáng' },
    ],
  },
  {
    kp: 'u2.peas',
    level: 2,
    char: '缝',
    readings: [
      { pinyin: 'fèng', meaning: '裂开或空着的窄长地方', words: ['裂缝', '门缝', '缝隙'] },
      { pinyin: 'féng', meaning: '用针线连起来', words: ['缝补', '缝衣服', '缝纫'] },
    ],
    sentences: [{ text: '豆子钻进了顶楼窗下的一条裂「缝」里。', pinyin: 'fèng' }],
  },
  {
    kp: 'u2.peas',
    level: 2,
    char: '担',
    readings: [
      { pinyin: 'dān', meaning: '承担、负责；挂念', words: ['担心', '分担', '担任'] },
      { pinyin: 'dàn', meaning: '挑的东西；责任', words: ['担子', '重担'] },
    ],
    sentences: [{ text: '善良的上帝分「担」了我的愁苦。', pinyin: 'dān' }],
  },
  {
    kp: 'u2.peas',
    level: 1,
    char: '长',
    readings: [
      { pinyin: 'cháng', meaning: '两端距离大，不短', words: ['长短', '长城', '长江'] },
      { pinyin: 'zhǎng', meaning: '生长、长大；领头的人', words: ['生长', '长大', '校长'] },
    ],
    sentences: [{ text: '窗外这粒豆子「长」得好极了。', pinyin: 'zhǎng' }],
  },
  {
    kp: 'u2.peas',
    level: 1,
    char: '发',
    readings: [
      { pinyin: 'fā', meaning: '产生、出现；送出', words: ['发生', '出发', '发芽'] },
      { pinyin: 'fà', meaning: '头发', words: ['头发', '理发', '白发'] },
    ],
    sentences: [{ text: '我觉得外面「发」生了一些事情。', pinyin: 'fā' }],
  },
  {
    kp: 'u2.peas',
    level: 2,
    char: '钻',
    readings: [
      { pinyin: 'zuān', meaning: '穿过、进入；深入研究', words: ['钻进', '钻研', '钻空子'] },
      { pinyin: 'zuàn', meaning: '打洞的工具；钻石', words: ['钻石', '电钻', '钻头'] },
    ],
    sentences: [{ text: '最后一粒豆子正好「钻」进了一个裂缝里。', pinyin: 'zuān' }],
  },
  {
    kp: 'u2.peas',
    level: 1,
    char: '种',
    readings: [
      { pinyin: 'zhǒng', meaning: '种子；种类', words: ['种子', '各种', '种类'] },
      { pinyin: 'zhòng', meaning: '把种子或幼苗埋在土里', words: ['种地', '种花', '种树'] },
    ],
    sentences: [{ text: '是上帝亲自「种」下了这颗豌豆。', pinyin: 'zhòng' }],
  },
  {
    kp: 'u2.peas',
    level: 2,
    char: '应',
    readings: [
      { pinyin: 'yīng', meaning: '应该、应当', words: ['应该', '应当'] },
      { pinyin: 'yìng', meaning: '回答、配合；适合', words: ['应用', '适应', '反应'] },
    ],
    sentences: [{ text: '她「应」该到天上的姐姐那儿去。', pinyin: 'yīng' }],
  },
  {
    kp: 'u2.peas',
    level: 2,
    char: '挨',
    readings: [
      { pinyin: 'āi', meaning: '靠近；按顺序一个一个地', words: ['挨近', '挨着', '挨个儿'] },
      { pinyin: 'ái', meaning: '遭受、忍受', words: ['挨打', '挨饿', '挨骂'] },
    ],
    sentences: [{ text: '病孩子的床被搬得更「挨」近窗子。', pinyin: 'āi' }],
  },
  {
    kp: 'u2.peas',
    level: 1,
    char: '难',
    readings: [
      { pinyin: 'nán', meaning: '不容易', words: ['困难', '难过', '难道'] },
      { pinyin: 'nàn', meaning: '灾祸、不幸的遭遇', words: ['灾难', '遇难', '难民'] },
    ],
    sentences: [{ text: '「难」道我们永远在这儿坐下去吗？', pinyin: 'nán' }],
  },
  {
    kp: 'u2.peas',
    level: 2,
    char: '为',
    readings: [
      { pinyin: 'wéi', meaning: '当作、成为；做', words: ['以为', '成为', '作为', '认为'] },
      { pinyin: 'wèi', meaning: '表示原因或目的', words: ['因为', '为了', '为什么'] },
    ],
    sentences: [{ text: '豆子们以「为」整个世界都是绿的。', pinyin: 'wéi' }],
  },
  {
    kp: 'u2.peas',
    level: 2,
    char: '弹',
    readings: [
      { pinyin: 'tán', meaning: '用手指拨动；有弹性、能跳起来', words: ['弹琴', '弹簧', '弹跳'] },
      { pinyin: 'dàn', meaning: '可以射出去的小丸或爆炸物', words: ['子弹', '炸弹', '弹弓'] },
    ],
    sentences: [{ text: '孩子把豆子当作豌豆枪的子「弹」。', pinyin: 'dàn' }],
  },

  // ------------------------------------------------------------------ 夜间飞行的秘密
  {
    kp: 'u2.night-flight',
    level: 2,
    char: '系',
    readings: [
      { pinyin: 'jì', meaning: '打结、扣上', words: ['系鞋带', '系红领巾'] },
      { pinyin: 'xì', meaning: '关联；成套的', words: ['关系', '联系', '系统'] },
    ],
    sentences: [
      { text: '屋子里拉满了绳子，绳子上「系」着铃铛。', pinyin: 'jì' },
      { text: '母亲把线的一端「系」在窗槛上。', pinyin: 'jì' },
    ],
  },
  {
    kp: 'u2.night-flight',
    level: 3,
    char: '塞',
    readings: [
      { pinyin: 'sāi', meaning: '把东西填进去、堵住；堵口的东西', words: ['瓶塞', '塞子'] },
      { pinyin: 'sè', meaning: '不通（多用在书面词语里）', words: ['堵塞', '阻塞', '闭塞'] },
      { pinyin: 'sài', meaning: '边境上险要的地方', words: ['边塞', '要塞', '塞外'] },
    ],
    sentences: [{ text: '科学家把蝙蝠的耳朵「塞」上。', pinyin: 'sāi' }],
  },
  {
    kp: 'u2.night-flight',
    level: 3,
    char: '屏',
    readings: [
      { pinyin: 'píng', meaning: '像屏风一样挡着的东西；显示画面的屏', words: ['屏风', '屏幕', '荧光屏'] },
      { pinyin: 'bǐng', meaning: '暂时止住（呼吸）', words: ['屏息', '屏气', '屏住呼吸'] },
    ],
    sentences: [{ text: '驾驶员从雷达的荧光「屏」上看清前方。', pinyin: 'píng' }],
  },
  {
    kp: 'u2.night-flight',
    level: 2,
    char: '蒙',
    readings: [
      { pinyin: 'méng', meaning: '遮盖、盖住；使明白', words: ['蒙住', '启蒙'] },
      { pinyin: 'měng', meaning: '蒙古族、蒙古', words: ['蒙古', '内蒙古', '蒙古包'] },
    ],
    sentences: [{ text: '科学家把蝙蝠的眼睛「蒙」上，让它飞。', pinyin: 'méng' }],
  },
  {
    kp: 'u2.night-flight',
    level: 3,
    char: '着',
    readings: [
      { pinyin: 'zhe', meaning: '跟在动作后面，表示正在进行', words: ['看着', '笑着', '听着'] },
      { pinyin: 'zháo', meaning: '接触到；达到目的；燃烧', words: ['着急', '睡着', '着火'] },
      { pinyin: 'zhuó', meaning: '接触、挨上；穿（衣服）', words: ['着陆', '着想', '衣着'] },
    ],
    sentences: [{ text: '那么多绳子，蝙蝠一根也没碰「着」。', pinyin: 'zháo' }],
  },
  {
    kp: 'u2.night-flight',
    level: 2,
    char: '传',
    readings: [
      { pinyin: 'chuán', meaning: '由一方交给另一方；散布开', words: ['传说', '传递', '传播'] },
      { pinyin: 'zhuàn', meaning: '记录人一生事迹的文字', words: ['传记', '自传', '水浒传'] },
    ],
    sentences: [{ text: '回声「传」到蝙蝠的耳朵里。', pinyin: 'chuán' }],
  },

  // ------------------------------------------------------------------ 方帽子店
  {
    kp: 'u2.square-hats',
    level: 3,
    char: '溜',
    readings: [
      { pinyin: 'liū', meaning: '滑行；偷偷地走开', words: ['溜冰', '溜走', '溜达'] },
      { pinyin: 'liù', meaning: '一溜烟：形容跑得飞快；一溜儿：一排', words: ['一溜烟', '一溜儿'] },
    ],
    sentences: [{ text: '他一「溜」烟似的跑远了。', pinyin: 'liù' }],
  },

  // ------------------------------------------------------------------ 田忌赛马
  {
    kp: 'u2.horse-race',
    level: 2,
    char: '调',
    readings: [
      { pinyin: 'diào', meaning: '调动、调换；声音的高低', words: ['调换', '调查', '音调'] },
      { pinyin: 'tiáo', meaning: '配合得均匀；调整；顽皮', words: ['调皮', '调整', '调和'] },
    ],
    sentences: [{ text: '孙膑让田忌「调」换了马的出场顺序。', pinyin: 'diào' }],
  },
  {
    kp: 'u2.horse-race',
    level: 2,
    char: '将',
    readings: [
      { pinyin: 'jiàng', meaning: '带兵打仗的人', words: ['大将', '将领', '猛将'] },
      { pinyin: 'jiāng', meaning: '快要、就要', words: ['将来', '将要', '即将'] },
    ],
    sentences: [{ text: '齐国的大「将」田忌很喜欢赛马。', pinyin: 'jiàng' }],
  },
  {
    kp: 'u2.horse-race',
    level: 2,
    char: '兴',
    readings: [
      { pinyin: 'xìng', meaning: '对事物喜爱的情绪', words: ['高兴', '兴趣', '扫兴'] },
      { pinyin: 'xīng', meaning: '旺盛；开始、发动', words: ['兴奋', '兴旺', '复兴'] },
    ],
    sentences: [{ text: '田忌输了比赛，觉得很扫「兴」。', pinyin: 'xìng' }],
  },
  {
    kp: 'u2.horse-race',
    level: 3,
    char: '丧',
    readings: [
      { pinyin: 'sàng', meaning: '失去；情绪低落', words: ['丧气', '丧失', '垂头丧气'] },
      { pinyin: 'sāng', meaning: '跟人去世有关的事', words: ['丧事', '丧礼'] },
    ],
    sentences: [{ text: '田忌垂头「丧」气地准备离开赛马场。', pinyin: 'sàng' }],
  },
  {
    kp: 'u2.horse-race',
    level: 2,
    char: '了',
    readings: [
      { pinyin: 'le', meaning: '用在句子或词语后面，表示完成、结束', words: ['算了', '罢了'] },
      { pinyin: 'liǎo', meaning: '明白；完、能做到', words: ['了解', '了不起', '受不了'] },
    ],
    sentences: [
      { text: '齐威王的马比你的马快不「了」多少。', pinyin: 'liǎo' },
      { text: '田忌三场两胜，赢「了」齐威王。', pinyin: 'le' },
    ],
  },
  {
    kp: 'u2.horse-race',
    level: 2,
    char: '更',
    readings: [
      { pinyin: 'gèng', meaning: '更加、越发', words: ['更加', '更好'] },
      { pinyin: 'gēng', meaning: '改变、换；古时夜里的计时单位', words: ['更换', '更新', '三更半夜'] },
    ],
    sentences: [{ text: '孙膑说：一匹马也不需要「更」换。', pinyin: 'gēng' }],
  },
  {
    kp: 'u2.horse-race',
    level: 3,
    char: '结',
    readings: [
      { pinyin: 'jié', meaning: '打结；联合；结束', words: ['结束', '团结', '打结'] },
      { pinyin: 'jiē', meaning: '长出（果实）；结实、结巴', words: ['结实', '结巴', '开花结果'] },
    ],
    sentences: [{ text: '比赛的「结」果是田忌赢了齐威王。', pinyin: 'jié' }],
  },
  {
    kp: 'u2.horse-race',
    level: 2,
    char: '转',
    readings: [
      { pinyin: 'zhuǎn', meaning: '改变方向、位置或情况', words: ['转身', '转弯', '转告'] },
      { pinyin: 'zhuàn', meaning: '绕着中心转动', words: ['转动', '打转', '转圈'] },
    ],
    sentences: [{ text: '只换了出场顺序，就能「转」败为胜。', pinyin: 'zhuǎn' }],
  },
  {
    kp: 'u2.horse-race',
    level: 2,
    char: '分',
    readings: [
      { pinyin: 'fēn', meaning: '分开、分成几部分', words: ['分成', '分开', '分数'] },
      { pinyin: 'fèn', meaning: '成分；应有的限度', words: ['过分', '水分', '成分'] },
    ],
    sentences: [{ text: '他们把各自的马「分」成上、中、下三等。', pinyin: 'fēn' }],
  },

  // ------------------------------------------------------------------ 四年级上册常练多音字
  {
    kp: 'u2.polyphones',
    level: 3,
    char: '露',
    readings: [
      { pinyin: 'lù', meaning: '露水；显出来（多用在书面词语里）', words: ['露水', '露珠', '暴露', '揭露'] },
      { pinyin: 'lòu', meaning: '显出来（多用在口语里）', words: ['露面', '露脸', '露一手'] },
    ],
    sentences: [
      { text: '早上，草叶上挂满了「露」珠。', pinyin: 'lù' },
      { text: '他好久没在班上「露」面了。', pinyin: 'lòu' },
    ],
  },
  {
    kp: 'u2.polyphones',
    level: 2,
    char: '朝',
    readings: [
      { pinyin: 'zhāo', meaning: '早晨', words: ['朝霞', '朝气', '朝夕'] },
      { pinyin: 'cháo', meaning: '对着、向着；朝代', words: ['朝向', '朝代', '唐朝'] },
    ],
    sentences: [
      { text: '天边的「朝」霞红彤彤的。', pinyin: 'zhāo' },
      { text: '我家的窗户「朝」南开。', pinyin: 'cháo' },
    ],
  },
  {
    kp: 'u2.polyphones',
    level: 1,
    char: '重',
    readings: [
      { pinyin: 'zhòng', meaning: '分量大；要紧', words: ['重要', '重量', '重大'] },
      { pinyin: 'chóng', meaning: '再一次；一层层', words: ['重复', '重新', '重叠'] },
    ],
    sentences: [
      { text: '这箱书很「重」，我搬不动。', pinyin: 'zhòng' },
      { text: '请你「重」新读一遍。', pinyin: 'chóng' },
    ],
  },
  {
    kp: 'u2.polyphones',
    level: 1,
    char: '教',
    readings: [
      { pinyin: 'jiāo', meaning: '把知识或本领传给别人', words: ['教书', '教给'] },
      { pinyin: 'jiào', meaning: '教育；上课的地方', words: ['教室', '教育', '教师'] },
    ],
    sentences: [
      { text: '妈妈「教」我包饺子。', pinyin: 'jiāo' },
      { text: '上课铃响了，我们走进「教」室。', pinyin: 'jiào' },
    ],
  },
  {
    kp: 'u2.polyphones',
    level: 2,
    char: '散',
    readings: [
      { pinyin: 'sàn', meaning: '分开、离开；随意走走', words: ['散步', '散开', '解散'] },
      { pinyin: 'sǎn', meaning: '松开的、零碎的；不紧凑', words: ['散文', '散装', '懒散'] },
    ],
    sentences: [{ text: '晚饭后，爷爷去公园「散」步。', pinyin: 'sàn' }],
  },
  {
    kp: 'u2.polyphones',
    level: 2,
    char: '曾',
    readings: [
      { pinyin: 'céng', meaning: '曾经，以前有过', words: ['曾经', '未曾', '不曾'] },
      { pinyin: 'zēng', meaning: '隔两代的亲属', words: ['曾祖父', '曾孙'] },
    ],
    sentences: [{ text: '我「曾」经在海边捡过贝壳。', pinyin: 'céng' }],
  },
  {
    kp: 'u2.polyphones',
    level: 2,
    char: '扇',
    readings: [
      { pinyin: 'shàn', meaning: '扇子；用于门窗的量词', words: ['扇子', '电扇', '一扇门'] },
      { pinyin: 'shān', meaning: '摇动扇子等让空气流动', words: ['扇动', '扇风'] },
    ],
    sentences: [{ text: '他轻轻推开了那「扇」门。', pinyin: 'shàn' }],
  },
  {
    kp: 'u2.polyphones',
    level: 1,
    char: '背',
    readings: [
      { pinyin: 'bèi', meaning: '身体后面；凭记忆念出', words: ['背影', '背诵', '背后'] },
      { pinyin: 'bēi', meaning: '用背驮着', words: ['背包', '背负', '背书包'] },
    ],
    sentences: [
      { text: '我「背」起书包去上学。', pinyin: 'bēi' },
      { text: '我能「背」出这首古诗。', pinyin: 'bèi' },
    ],
  },
  {
    kp: 'u2.polyphones',
    level: 3,
    char: '鲜',
    readings: [
      { pinyin: 'xiān', meaning: '新的、不陈旧；颜色明亮', words: ['新鲜', '鲜花', '鲜艳'] },
      { pinyin: 'xiǎn', meaning: '少、不多', words: ['鲜为人知', '鲜见'] },
    ],
    sentences: [{ text: '花园里开满了「鲜」艳的花。', pinyin: 'xiān' }],
  },
  {
    kp: 'u2.polyphones',
    level: 3,
    char: '冲',
    readings: [
      { pinyin: 'chōng', meaning: '很快地向前闯；用水冲洗', words: ['冲锋', '冲洗', '冲刷'] },
      { pinyin: 'chòng', meaning: '对着、向着；劲头足', words: ['冲着', '冲劲儿'] },
    ],
    sentences: [{ text: '小狗「冲」着我摇尾巴。', pinyin: 'chòng' }],
  },
  {
    kp: 'u2.polyphones',
    level: 1,
    char: '乐',
    readings: [
      { pinyin: 'lè', meaning: '快乐、高兴', words: ['快乐', '乐观', '欢乐'] },
      { pinyin: 'yuè', meaning: '音乐', words: ['音乐', '乐器', '乐队'] },
    ],
  },
  {
    kp: 'u2.polyphones',
    level: 1,
    char: '行',
    readings: [
      { pinyin: 'xíng', meaning: '走；可以', words: ['行走', '旅行', '步行'] },
      { pinyin: 'háng', meaning: '行列；行业', words: ['银行', '行业', '一行字'] },
    ],
    sentences: [{ text: '爸爸去银「行」取钱。', pinyin: 'háng' }],
  },
  {
    kp: 'u2.polyphones',
    level: 1,
    char: '假',
    readings: [
      { pinyin: 'jiǎ', meaning: '不真的', words: ['真假', '假话', '假装'] },
      { pinyin: 'jià', meaning: '不用上学、上班的日子', words: ['放假', '寒假', '请假'] },
    ],
    sentences: [{ text: '放「假」了，我们去海边玩。', pinyin: 'jià' }],
  },
  {
    kp: 'u2.polyphones',
    level: 2,
    char: '省',
    readings: [
      { pinyin: 'shěng', meaning: '节约；省份', words: ['节省', '省力', '广东省'] },
      { pinyin: 'xǐng', meaning: '检查自己；明白过来', words: ['反省', '省悟', '不省人事'] },
    ],
  },
  {
    kp: 'u2.polyphones',
    level: 2,
    char: '降',
    readings: [
      { pinyin: 'jiàng', meaning: '从高处往下落', words: ['降落', '下降', '降温'] },
      { pinyin: 'xiáng', meaning: '投降；使驯服', words: ['投降', '降服'] },
    ],
  },
  {
    kp: 'u2.polyphones',
    level: 2,
    char: '藏',
    readings: [
      { pinyin: 'cáng', meaning: '躲起来；收存', words: ['躲藏', '收藏', '捉迷藏'] },
      { pinyin: 'zàng', meaning: '储存东西的地方；西藏、藏族', words: ['宝藏', '西藏', '藏族'] },
    ],
  },
  {
    kp: 'u2.polyphones',
    level: 2,
    char: '挑',
    readings: [
      { pinyin: 'tiāo', meaning: '选；用肩膀担', words: ['挑选', '挑水', '挑食'] },
      { pinyin: 'tiǎo', meaning: '挑起、引起', words: ['挑战', '挑拨'] },
    ],
  },
  {
    kp: 'u2.polyphones',
    level: 2,
    char: '圈',
    readings: [
      { pinyin: 'quān', meaning: '圆形的环', words: ['圆圈', '圈子', '画圈'] },
      { pinyin: 'juàn', meaning: '养猪、羊等的棚栏', words: ['猪圈', '羊圈'] },
    ],
  },
  {
    kp: 'u2.polyphones',
    level: 2,
    char: '答',
    readings: [
      { pinyin: 'dá', meaning: '回答问题', words: ['回答', '答案', '问答'] },
      { pinyin: 'dā', meaning: '用在“答应、答理”里，表示同意或理睬', words: ['答应', '答理'] },
    ],
    sentences: [{ text: '他爽快地「答」应了我的请求。', pinyin: 'dā' }],
  },
  {
    kp: 'u2.polyphones',
    level: 1,
    char: '几',
    readings: [
      { pinyin: 'jǐ', meaning: '多少', words: ['几个', '几天'] },
      { pinyin: 'jī', meaning: '差不多；小桌子', words: ['几乎', '茶几'] },
    ],
    sentences: [{ text: '我「几」乎每天都去跑步。', pinyin: 'jī' }],
  },
  {
    kp: 'u2.polyphones',
    level: 2,
    char: '量',
    readings: [
      { pinyin: 'liàng', meaning: '数量、多少', words: ['数量', '力量', '质量'] },
      { pinyin: 'liáng', meaning: '用工具测长短、多少', words: ['测量', '丈量', '量体温'] },
    ],
    sentences: [{ text: '护士给我「量」了体温。', pinyin: 'liáng' }],
  },
  {
    kp: 'u2.polyphones',
    level: 2,
    char: '削',
    readings: [
      { pinyin: 'xiāo', meaning: '用刀斜着去掉表面一层（口语）', words: ['削皮', '削铅笔'] },
      { pinyin: 'xuē', meaning: '减少、削弱（书面词语）', words: ['剥削', '削弱'] },
    ],
  },
  {
    kp: 'u2.polyphones',
    level: 2,
    char: '参',
    readings: [
      { pinyin: 'cān', meaning: '加入', words: ['参加', '参观'] },
      { pinyin: 'shēn', meaning: '人参、海参', words: ['人参', '海参'] },
    ],
  },
  {
    kp: 'u2.polyphones',
    level: 3,
    char: '剥',
    readings: [
      { pinyin: 'bāo', meaning: '去掉外面的皮或壳（口语）', words: ['剥皮', '剥花生'] },
      { pinyin: 'bō', meaning: '去掉、夺去（书面词语）', words: ['剥削', '剥夺'] },
    ],
  },
  {
    kp: 'u2.polyphones',
    level: 3,
    char: '恶',
    readings: [
      { pinyin: 'è', meaning: '很坏的', words: ['凶恶', '恶劣', '罪恶'] },
      { pinyin: 'wù', meaning: '讨厌、憎恨', words: ['可恶', '厌恶'] },
    ],
  },
  {
    kp: 'u2.polyphones',
    level: 3,
    char: '泊',
    readings: [
      { pinyin: 'bó', meaning: '船靠岸停下', words: ['停泊', '淡泊'] },
      { pinyin: 'pō', meaning: '湖；一大片液体', words: ['湖泊', '血泊'] },
    ],
  },
  {
    kp: 'u2.polyphones',
    level: 2,
    char: '冠',
    readings: [
      { pinyin: 'guān', meaning: '帽子；像帽子的东西', words: ['鸡冠', '皇冠', '衣冠'] },
      { pinyin: 'guàn', meaning: '第一名', words: ['冠军', '夺冠'] },
    ],
    sentences: [{ text: '我们班在拔河比赛中夺「冠」了。', pinyin: 'guàn' }],
  },
  {
    kp: 'u2.polyphones',
    level: 2,
    char: '创',
    readings: [
      { pinyin: 'chuàng', meaning: '开始做、第一次做出来', words: ['创造', '创新', '创作'] },
      { pinyin: 'chuāng', meaning: '伤口', words: ['创伤', '创口'] },
    ],
  },
  {
    kp: 'u2.polyphones',
    level: 2,
    char: '宁',
    readings: [
      { pinyin: 'níng', meaning: '安静、平安', words: ['安宁', '宁静'] },
      { pinyin: 'nìng', meaning: '宁可、宁愿：两件事里选一件', words: ['宁可', '宁愿'] },
    ],
  },
  {
    kp: 'u2.polyphones',
    level: 1,
    char: '看',
    readings: [
      { pinyin: 'kàn', meaning: '用眼睛瞧', words: ['看书', '看见'] },
      { pinyin: 'kān', meaning: '守着、照料', words: ['看守', '看家', '看门'] },
    ],
    sentences: [{ text: '小狗在门口「看」家。', pinyin: 'kān' }],
  },
];
