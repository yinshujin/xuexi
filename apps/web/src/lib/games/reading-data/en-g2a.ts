import type { ReadingBank, ReadingChoice } from './types';

/**
 * 英语 二年级上册 阅读题组：每单元 3 篇原创小短文（A/B/C 卷各一篇），
 * 20–40 个词，阅读理解（3 题，题目附中文）和完形填空（3 个空，每空 3 个选项）交替。
 * 只用本单元和前面单元学过的单词、句型。
 */

/** A 完形填空 blank: its options and which one is right. */
const blank = (options: string[], answer: number, explain: string): ReadingChoice => ({ q: '', options, answer, explain });

export const EN_G2A_READING: ReadingBank = {
  // ---------------------------------------------------------------- Unit 1 five senses
  'en-g2a.u1': [
    {
      mode: 'read',
      kp: 'words',
      title: 'In the garden',
      text: 'Kitty is in the garden. She can see a cat on a mat. She can hear a bird. She can smell the flowers with her nose. She can feel the soft grass with her hands.',
      questions: [
        { q: 'What can Kitty see?（Kitty 看见了什么？）', options: ['A cat.', 'A bird.', 'A hat.'], answer: 0, explain: '短文说 She can see a cat on a mat.（她看见垫子上有一只猫。）小鸟是她听见的。' },
        { q: 'What can Kitty smell?（Kitty 闻到了什么？）', options: ['The grass.', 'The flowers.', 'The cat.'], answer: 1, explain: 'She can smell the flowers with her nose.（她用鼻子闻花香。）' },
        { q: 'Kitty can feel the grass with her ___.（她用什么摸草？）', options: ['nose', 'ears', 'hands'], answer: 2, explain: 'She can feel the soft grass with her hands.（她用手摸软软的草。）' },
      ],
    },
    {
      mode: 'cloze',
      kp: 'talk',
      title: 'My nose, ears and mouth',
      text: 'I have a nose. I can {1} with my nose. I have two ears. I can {2} with my ears. I have a mouth. I can {3} a cake with my mouth. Yummy!',
      questions: [
        blank(['smell', 'hear', 'see'], 0, '用鼻子闻：smell。'),
        blank(['taste', 'hear', 'smell'], 1, '用耳朵听：hear。'),
        blank(['see', 'hear', 'taste'], 2, '用嘴巴尝蛋糕：taste a cake。'),
      ],
    },
    {
      mode: 'read',
      kp: 'words',
      title: "Sam's cat",
      text: "This is Sam's cat. It has a red hat. It is on a map. It can hear Mum. Mum is at the door. The cat runs to Mum. Then it takes a nap on the mat.",
      questions: [
        { q: "What colour is the cat's hat?（猫的帽子是什么颜色的？）", options: ['Black.', 'Red.', 'Green.'], answer: 1, explain: 'It has a red hat.（它有一顶红帽子。）' },
        { q: 'Who can the cat hear?（猫听到了谁的声音？）', options: ['Sam.', 'A bird.', 'Mum.'], answer: 2, explain: 'It can hear Mum.（它听到了妈妈的声音。）' },
        { q: 'Where does the cat take a nap?（猫在哪里睡午觉？）', options: ['On the mat.', 'On the map.', 'At the door.'], answer: 0, explain: 'Then it takes a nap on the mat.（它在垫子上睡了一小觉。）' },
      ],
    },
  ],

  // ---------------------------------------------------------------- Unit 2 family
  'en-g2a.u2': [
    {
      mode: 'cloze',
      kp: 'talk',
      title: 'A family photo',
      text: 'Look at this photo. This is my {1}. He is young. He has a big van. This is my {2}. She is my mum’s sister. That is my {3}, Lily. She is cute.',
      questions: [
        blank(['aunt', 'uncle', 'mum'], 1, '后面用 He（他），说的是男的，选 uncle（叔叔、舅舅）。'),
        blank(['aunt', 'uncle', 'cousin'], 0, '妈妈的姐妹是 aunt（阿姨）。'),
        blank(['uncle', 'grandpa', 'cousin'], 2, '后面用 She（她），uncle 和 grandpa 都是男的，选 cousin（表姐妹）。'),
      ],
    },
    {
      mode: 'read',
      kp: 'words',
      title: "Tom's family",
      text: "Hi, I'm Tom. This is my family. My grandpa is old. He likes jam. My aunt is young. She has a fan. My cousin Ben is cute. He is two.",
      questions: [
        { q: 'Who is old?（谁年纪大？）', options: ['Grandpa.', 'Aunt.', 'Ben.'], answer: 0, explain: 'My grandpa is old.（我的爷爷年纪大了。）' },
        { q: 'What does Grandpa like?（爷爷喜欢什么？）', options: ['Ham.', 'Jam.', 'A fan.'], answer: 1, explain: 'He likes jam.（他喜欢果酱。）扇子是阿姨的。' },
        { q: 'How old is Ben?（Ben 几岁？）', options: ['Ten.', 'Three.', 'Two.'], answer: 2, explain: 'He is two.（他两岁。）' },
      ],
    },
    {
      mode: 'cloze',
      kp: 'talk',
      title: 'Who is he?',
      text: "Who's he? He's my {1}. He is a cook. He has a big {2}. He makes ham and eggs in it. Who's she? She's my aunt. She is {3}. She is only twenty.",
      questions: [
        blank(['uncle', 'aunt', 'mum'], 0, '问的是 he（他），选 uncle。aunt 和 mum 都是女的。'),
        blank(['van', 'pan', 'fan'], 1, '在里面做火腿和鸡蛋的是平底锅 pan。'),
        blank(['old', 'big', 'young'], 2, '她只有二十岁，很年轻：young。'),
      ],
    },
  ],

  // ---------------------------------------------------------------- Unit 3 toys
  'en-g2a.u3': [
    {
      mode: 'read',
      kp: 'words',
      title: "May's toys",
      text: "Hello, I'm May. I have a lot of toys. I have a doll, a ball and a toy bear. My favourite toy is my robot. It is red. It can walk and talk.",
      questions: [
        { q: "What's May's favourite toy?（May 最喜欢什么玩具？）", options: ['Her doll.', 'Her toy bear.', 'Her robot.'], answer: 2, explain: 'My favourite toy is my robot.（我最喜欢的玩具是机器人。）' },
        { q: 'What colour is the robot?（机器人是什么颜色的？）', options: ['Red.', 'Blue.', 'Green.'], answer: 0, explain: 'It is red.（它是红色的。）' },
        { q: 'What can the robot do?（机器人会做什么？）', options: ['It can fly.', 'It can walk and talk.', 'It can swim.'], answer: 1, explain: 'It can walk and talk.（它会走路，还会说话。）' },
      ],
    },
    {
      mode: 'cloze',
      kp: 'talk',
      title: 'My favourite toy',
      text: "Tim: What's your favourite {1}, Lily?\nLily: My favourite toy is a toy {2}. It can fly.\nTim: My favourite toy is a {3}. I can kick it.",
      questions: [
        blank(['bed', 'toy', 'pet'], 1, '问最喜欢的玩具：What’s your favourite toy?'),
        blank(['plane', 'bear', 'net'], 0, '会飞的玩具是玩具飞机：a toy plane。'),
        blank(['doll', 'puzzle', 'ball'], 2, '能用脚踢的是球：ball。'),
      ],
    },
    {
      mode: 'read',
      kp: 'words',
      title: 'Ben and Max',
      text: 'Ben has a pet dog. Its name is Max. Max likes the red ball. Ben kicks the ball. Max runs and gets it. Oh, it rains! Max is wet. Ben and Max run home.',
      questions: [
        { q: 'What is Max?（Max 是什么？）', options: ['A cat.', 'A dog.', 'A toy.'], answer: 1, explain: 'Ben has a pet dog. Its name is Max.（Max 是 Ben 的宠物狗。）' },
        { q: 'What does Max like?（Max 喜欢什么？）', options: ['The red ball.', 'The bed.', 'The net.'], answer: 0, explain: 'Max likes the red ball.（Max 喜欢那个红色的球。）' },
        { q: 'Why is Max wet?（Max 为什么湿了？）', options: ['He is in the bath.', 'He swims.', 'It rains.'], answer: 2, explain: 'Oh, it rains! Max is wet.（下雨了，Max 淋湿了。）' },
      ],
    },
  ],

  // ---------------------------------------------------------------- Unit 4 around my home
  'en-g2a.u4': [
    {
      mode: 'cloze',
      kp: 'talk',
      title: 'Near my home',
      text: "Hi! I'm Kitty. There is a {1} near my home. I can fly my kite there. There is a {2} shop too. I buy apples there. Is there a {3}? Yes! I can see films there.",
      questions: [
        blank(['cinema', 'park', 'pet shop'], 1, '能放风筝的地方是公园：park。'),
        blank(['fruit', 'toy', 'pet'], 0, '买苹果的是水果店：fruit shop。'),
        blank(['zoo', 'park', 'cinema'], 2, '看电影的地方是电影院：cinema。'),
      ],
    },
    {
      mode: 'read',
      kp: 'words',
      title: "Peter's Sunday",
      text: "There is a big zoo near Peter's home. He goes there with his dad on Sundays. He likes the pigs and the hens. There is a toy shop near the zoo. Peter buys a pen there.",
      questions: [
        { q: "What is near Peter's home?（Peter 家附近有什么？）", options: ['A cinema.', 'A big zoo.', 'A fruit shop.'], answer: 1, explain: "There is a big zoo near Peter's home.（Peter 家附近有一个大动物园。）" },
        { q: 'What animals does Peter like?（Peter 喜欢什么动物？）', options: ['The pigs and the hens.', 'The cats and the dogs.', 'The ducks and the cows.'], answer: 0, explain: 'He likes the pigs and the hens.（他喜欢猪和母鸡。）' },
        { q: 'What does Peter buy?（Peter 买了什么？）', options: ['A ball.', 'A wig.', 'A pen.'], answer: 2, explain: 'Peter buys a pen there.（Peter 在那里买了一支钢笔。）' },
      ],
    },
    {
      mode: 'cloze',
      kp: 'talk',
      title: 'Is there a zoo?',
      text: "A: Is there a {1} shop near your home?\nB: Yes, there is. I can see dogs and cats there.\nA: Is there a zoo?\nB: No, there {2}. But there is a {3} park. I play there.",
      questions: [
        blank(['pet', 'fruit', 'toy'], 0, '能看到猫和狗的是宠物店：pet shop。'),
        blank(['is', 'isn’t', 'are'], 1, '回答是 No，所以用 No, there isn’t.'),
        blank(['dig', 'wig', 'big'], 2, '一个大公园：a big park。dig 是“挖”，wig 是“假发”。'),
      ],
    },
  ],

  // ---------------------------------------------------------------- Unit 5 farm
  'en-g2a.u5': [
    {
      mode: 'read',
      kp: 'talk',
      title: 'On the farm',
      text: "This is Uncle Wang's farm. I like the sheep. They're white and soft. My sister likes the chicks. They're small and cute. The pigs are fat. They like to sleep.",
      questions: [
        { q: 'What does the writer like?（作者喜欢什么？）', options: ['The chicks.', 'The sheep.', 'The pigs.'], answer: 1, explain: 'I like the sheep.（我喜欢绵羊。）小鸡是妹妹喜欢的。' },
        { q: 'What are the chicks like?（小鸡是什么样的？）', options: ['Small and cute.', 'Big and fat.', 'White and soft.'], answer: 0, explain: "They're small and cute.（它们又小又可爱。）" },
        { q: 'What do the pigs like to do?（猪喜欢做什么？）', options: ['Swim.', 'Run.', 'Sleep.'], answer: 2, explain: 'They like to sleep.（它们喜欢睡觉。）' },
      ],
    },
    {
      mode: 'cloze',
      kp: 'talk',
      title: 'Look at the farm!',
      text: 'Look at the farm! I like {1}. They are big. They give us milk. My brother likes {2}. They can swim. Quack, quack! The {3} are pink and fat.',
      questions: [
        blank(['chicks', 'cows', 'ducks'], 1, '又大又能给我们牛奶的是奶牛：cows。'),
        blank(['ducks', 'pigs', 'cows'], 0, '会游泳、嘎嘎叫的是鸭子：ducks。'),
        blank(['sheep', 'chicks', 'pigs'], 2, '粉粉的、胖胖的是猪：pigs。'),
      ],
    },
    {
      mode: 'read',
      kp: 'words',
      title: "Grandpa's farm",
      text: 'Grandpa has a farm near the sea. He has a small ship too. On Sundays, I go to the farm. I feed the chickens. I see a fish with a big fin in the sea.',
      questions: [
        { q: "Where is Grandpa's farm?（爷爷的农场在哪里？）", options: ['Near the sea.', 'Near the zoo.', 'In the city.'], answer: 0, explain: 'Grandpa has a farm near the sea.（爷爷的农场在海边。）' },
        { q: 'What does the writer feed?（作者喂什么？）', options: ['The cows.', 'The fish.', 'The chickens.'], answer: 2, explain: 'I feed the chickens.（我喂鸡。）' },
        { q: 'What does the fish have?（那条鱼有什么？）', options: ['A zip.', 'A big fin.', 'A pin.'], answer: 1, explain: 'a fish with a big fin（一条长着大鱼鳍的鱼）。' },
      ],
    },
  ],

  // ---------------------------------------------------------------- Unit 6 Mid-Autumn Festival
  'en-g2a.u6': [
    {
      mode: 'cloze',
      kp: 'talk',
      title: 'Mid-Autumn night',
      text: 'It is the Mid-Autumn Festival. My family is in the garden. We eat {1}. They are sweet. We play with {2}. They are red. We look at the {3}. It is big and round.',
      questions: [
        blank(['mooncakes', 'lanterns', 'riddles'], 0, '吃的、甜甜的是月饼：eat mooncakes。'),
        blank(['mooncakes', 'riddles', 'lanterns'], 2, '拿着玩的、红红的是灯笼：play with lanterns。'),
        blank(['sun', 'moon', 'lantern'], 1, '中秋晚上看又大又圆的月亮：look at the moon。'),
      ],
    },
    {
      mode: 'read',
      kp: 'words',
      title: "At Grandma's home",
      text: "At the Mid-Autumn Festival, Lucy goes to Grandma's home. Grandma makes mooncakes. Lucy and her cousin solve riddles. At night, they look at the moon. It's big and round.",
      questions: [
        { q: 'Where does Lucy go?（Lucy 去了哪里？）', options: ['The zoo.', "Grandma's home.", 'The cinema.'], answer: 1, explain: "Lucy goes to Grandma's home.（Lucy 去了奶奶家。）" },
        { q: 'Who makes mooncakes?（谁做月饼？）', options: ['Lucy.', 'Her cousin.', 'Grandma.'], answer: 2, explain: 'Grandma makes mooncakes.（奶奶做月饼。）' },
        { q: 'What is the moon like?（月亮是什么样的？）', options: ['Big and round.', 'Small and red.', 'Wet and cute.'], answer: 0, explain: "It's big and round.（月亮又大又圆。）" },
      ],
    },
    {
      mode: 'cloze',
      kp: 'talk',
      title: 'Riddle time',
      text: "Riddle time! It is round. It is sweet. We {1} it at the Mid-Autumn Festival. What is it? It's a {2}. It is in the sky at night. It is bright. What is it? It's the {3}.",
      questions: [
        blank(['play', 'eat', 'look'], 1, '圆圆的、甜甜的东西是用来吃的：eat。'),
        blank(['mooncake', 'lantern', 'riddle'], 0, '中秋节吃的圆圆的甜点是月饼：mooncake。'),
        blank(['sun', 'lantern', 'moon'], 2, '晚上挂在天上、亮亮的是月亮：moon。太阳白天才在天上。'),
      ],
    },
  ],
};
