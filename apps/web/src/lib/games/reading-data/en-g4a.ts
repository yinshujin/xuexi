import type { ReadingBank, ReadingChoice } from './types';

/**
 * 英语 四年级上册 阅读题组：每单元 3 篇原创短文（A/B/C 卷各一篇），
 * 50–90 个词，阅读理解（3–4 题）和完形填空（3–4 个空，每空 3 个选项）交替。
 * 用本单元的单词和句型（Where do … live? / How many … / How much … / It gets … /
 * It has … / Don't … / do exercise …）。
 */

const blank = (options: string[], answer: number, explain: string): ReadingChoice => ({ q: '', options, answer, explain });

export const EN_G4A_READING: ReadingBank = {
  // ---------------------------------------------------------------- Unit 1 Where do people live?
  'en-g4a.u1': [
    {
      mode: 'read',
      kp: 'words',
      title: 'City and country',
      text: 'My name is Li Hua. I live in Shenzhen. It is a big city with many tall buildings. My family lives in a flat on the twentieth floor. My grandparents don’t live in the city. They live in the country. They have a small house with a garden, and they have a farm too. They grow rice and vegetables. I visit them every summer. I like the city, but I love the quiet country too.',
      questions: [
        { q: 'Where does Li Hua live?', options: ['In a house in the country.', 'On a farm.', 'In a flat in Shenzhen.'], answer: 2, explain: 'Li Hua 住在深圳，一家人住在一套公寓里（a flat）。' },
        { q: "Which floor is Li Hua's flat on?", options: ['The twentieth floor.', 'The twelfth floor.', 'The second floor.'], answer: 0, explain: 'a flat on the twentieth floor：在二十楼。' },
        { q: 'What do the grandparents grow?', options: ['Flowers and trees.', 'Rice and vegetables.', 'Apples and pears.'], answer: 1, explain: 'They grow rice and vegetables.（他们种水稻和蔬菜。）' },
        { q: 'When does Li Hua visit the grandparents?', options: ['Every weekend.', 'Every winter.', 'Every summer.'], answer: 2, explain: 'I visit them every summer.（我每年夏天去看他们。）' },
      ],
    },
    {
      mode: 'cloze',
      kp: 'grammar',
      title: 'Tom and Amy',
      text: "Hello! I'm Tom. I live {1} a flat in the city. My flat is on Green {2}. There are many shops near my home. My friend Amy doesn't live in the city. She lives {3} a farm in the country. Her {4} is big and old. There are cows and sheep near it.",
      questions: [
        blank(['on', 'in', 'under'], 1, '住在公寓里：live in a flat。'),
        blank(['Street', 'Farm', 'Country'], 0, '在 Green 街上：on Green Street。'),
        blank(['in', 'under', 'on'], 2, '住在农场上：live on a farm。'),
        blank(['house', 'street', 'city'], 0, '她的房子又大又旧：Her house is big and old。'),
      ],
    },
    {
      mode: 'read',
      kp: 'grammar',
      title: 'Where do people live?',
      text: 'People live in different places. Many people live in cities. They live in flats in tall buildings. Some people live in the country. They live in houses near their farms. Some people live on boats! They catch fish in the sea every day. Where do you live? I live in a flat in Shenzhen. I can see the sea from my window.',
      questions: [
        { q: 'Where do many people in cities live?', options: ['On boats.', 'In flats in tall buildings.', 'On farms.'], answer: 1, explain: 'They live in flats in tall buildings.（城里很多人住在高楼的公寓里。）' },
        { q: 'What do the people on boats do every day?', options: ['They catch fish.', 'They grow rice.', 'They go to the cinema.'], answer: 0, explain: 'They catch fish in the sea every day.（他们每天在海上捕鱼。）' },
        { q: 'What can the writer see from the window?', options: ['A farm.', 'A park.', 'The sea.'], answer: 2, explain: 'I can see the sea from my window.（我能从窗户看到大海。）' },
      ],
    },
  ],

  // ---------------------------------------------------------------- Unit 2 Where do animals live?
  'en-g4a.u2': [
    {
      mode: 'cloze',
      kp: 'grammar',
      title: 'Animal homes',
      text: "Animals live in different places. Let's find out! Where's the eagle? {1} on the high hill. It has a big nest there. Where are the honeybees? {2} in the garden. They like the flowers. Where's the owl? It's in the {3}. It sleeps in the day. Where are the fish? They're {4} the river.",
      questions: [
        blank(["They're", "It's", 'Its'], 1, '问一只老鹰 Where’s the eagle? 用 It’s 回答。'),
        blank(["It's", 'There', "They're"], 2, '问很多蜜蜂 Where are the honeybees? 用 They’re 回答。'),
        blank(['tree', 'river', 'sea'], 0, '猫头鹰白天在树上睡觉：in the tree。'),
        blank(['on', 'in', 'under'], 1, '鱼在河里：in the river。'),
      ],
    },
    {
      mode: 'read',
      kp: 'words',
      title: 'Owen the owl',
      text: "Hi, I'm Owen the owl. I live in a big tree in the forest. I sleep in the day. At night, I open my big eyes and look for mice. My friend Eddie is an eagle. He lives on a high hill. He can fly very high. The honeybees live in the garden near the forest. They are busy all day. They make sweet honey.",
      questions: [
        { q: 'Where does Owen live?', options: ['On a high hill.', 'In a big tree.', 'In the garden.'], answer: 1, explain: 'I live in a big tree in the forest.（我住在森林里的一棵大树上。）' },
        { q: 'When does Owen look for food?', options: ['At night.', 'In the morning.', 'At noon.'], answer: 0, explain: 'At night, I open my big eyes and look for mice.（猫头鹰晚上找老鼠吃。）' },
        { q: 'What can Eddie do?', options: ['Make honey.', 'Swim in the river.', 'Fly very high.'], answer: 2, explain: 'Eddie 是老鹰：He can fly very high.' },
        { q: 'What do the honeybees make?', options: ['Nests.', 'Honey.', 'Flowers.'], answer: 1, explain: 'They make sweet honey.（蜜蜂酿甜甜的蜂蜜。）' },
      ],
    },
    {
      mode: 'cloze',
      kp: 'grammar',
      title: 'A rainy day in the park',
      text: "It's a rainy day in the park. {1} the ducks? They're on the lake. They like the rain. Where's the cat? It's {2} the car. It stays dry there. Where are the birds? {3} in their nest in the tree. The nest keeps them dry. Where are you? I'm at home. I'm dry too!",
      questions: [
        blank(["Where's", 'Where are', 'What are'], 1, 'ducks 是很多只，问地点用 Where are …?'),
        blank(['under', 'on', 'near'], 0, '猫待在那里不会淋湿，是躲在车底下：under the car。'),
        blank(["It's", 'Its', "They're"], 2, 'birds 是很多只，用 They’re。'),
      ],
    },
  ],

  // ---------------------------------------------------------------- Unit 3 How do we use numbers?
  'en-g4a.u3': [
    {
      mode: 'read',
      kp: 'grammar',
      title: 'Fruit salad',
      text: "Today we make fruit salad in class. \"How many apples do we have?\" asks Miss Chen. \"We have six apples,\" says Lily. \"How many bananas do we have?\" \"We have four bananas.\" \"Do we have any pears?\" \"No, we don't have any pears.\" Miss Chen writes on the board: six plus four equals ten. \"Ten is an even number,\" says Tom.",
      questions: [
        { q: 'How many apples do they have?', options: ['Four.', 'Six.', 'Ten.'], answer: 1, explain: 'We have six apples.（我们有六个苹果。）' },
        { q: "What fruit don't they have?", options: ['Pears.', 'Apples.', 'Bananas.'], answer: 0, explain: "No, we don't have any pears.（我们没有梨。）" },
        { q: 'What does Miss Chen write on the board?', options: ['Six minus four equals two.', 'Four plus four equals eight.', 'Six plus four equals ten.'], answer: 2, explain: 'six plus four equals ten：6 + 4 = 10。' },
        { q: 'What does Tom say about ten?', options: ['It is an odd number.', 'It is an even number.', 'It is not a number.'], answer: 1, explain: 'Ten is an even number.（10 是双数。）' },
      ],
    },
    {
      mode: 'cloze',
      kp: 'words',
      title: 'A number game',
      text: "Let's play a number game! Look at these numbers: 1, 3, 5, 7. They are {1} numbers. 2, 4, 6, 8 are {2} numbers. Now, what is nine {3} three? The answer is six. What is five plus seven? The {4} is twelve. Now it's your turn. Make a number question for your friend!",
      questions: [
        blank(['even', 'odd', 'big'], 1, '1、3、5、7 是单数（奇数）：odd numbers。'),
        blank(['even', 'odd', 'small'], 0, '2、4、6、8 是双数（偶数）：even numbers。'),
        blank(['plus', 'equals', 'minus'], 2, '9 和 3 得 6，是减法：nine minus three。'),
        blank(['plus', 'answer', 'apple'], 1, '5 + 7 的答案是 12：The answer is twelve。'),
      ],
    },
    {
      mode: 'read',
      kp: 'words',
      title: 'Numbers in my day',
      text: "Numbers are everywhere. In the morning, I take Bus 25 to school. My classroom is Room 302. In maths class, we learn plus and minus. At noon, I buy lunch. It is fifteen yuan. After school, I call my mum. Her phone number starts with 138. At night, I look at the clock. It's nine o'clock. Time for bed!",
      questions: [
        { q: 'Which bus does the writer take to school?', options: ['Bus 302.', 'Bus 138.', 'Bus 25.'], answer: 2, explain: 'I take Bus 25 to school.（我坐 25 路公交车上学。）' },
        { q: 'How much is lunch?', options: ['Fifteen yuan.', 'Fifty yuan.', 'Five yuan.'], answer: 0, explain: 'It is fifteen yuan.（午饭十五元。）' },
        { q: 'When does the writer go to bed?', options: ['At noon.', "At nine o'clock.", 'After school.'], answer: 1, explain: "It's nine o'clock. Time for bed!（九点了，该睡觉了。）" },
      ],
    },
  ],

  // ---------------------------------------------------------------- Unit 4 What do we buy?
  'en-g4a.u4': [
    {
      mode: 'cloze',
      kp: 'words',
      title: 'At the supermarket',
      text: 'Mum and I go to the supermarket. Mum wants a {1} of rice and a {2} of eggs. I\'d like a {3} of orange juice. "How {4} is the juice?" I ask. "It\'s eight yuan," says the shop assistant. We also buy some apples. Mum pays with her phone, and we walk home together.',
      questions: [
        blank(['bottle', 'bag', 'glass'], 1, '一袋大米：a bag of rice。'),
        blank(['box', 'bottle', 'glass'], 0, '一盒鸡蛋：a box of eggs。'),
        blank(['bag', 'piece', 'bottle'], 2, '一瓶橙汁：a bottle of orange juice。'),
        blank(['many', 'much', 'old'], 1, '问价钱用 How much：How much is the juice?'),
      ],
    },
    {
      mode: 'read',
      kp: 'grammar',
      title: 'The school fair',
      text: "Tom's class has a school fair. Tom sells his old toys and books. A girl comes to his desk. \"What would you like?\" asks Tom. \"I'd like this toy car. How much is it?\" \"It's five yuan.\" \"How much are these two books?\" \"They're three yuan each.\" The girl buys the car and the two books. She gives Tom twenty yuan.",
      questions: [
        { q: 'What does Tom sell?', options: ['Food and drinks.', 'His old toys and books.', 'New clothes.'], answer: 1, explain: 'Tom sells his old toys and books.（Tom 卖他的旧玩具和旧书。）' },
        { q: 'How much is the toy car?', options: ['Five yuan.', 'Three yuan.', 'Six yuan.'], answer: 0, explain: "It's five yuan.（玩具车五元。）" },
        { q: 'How much does the girl pay for the car and the two books?', options: ['Eight yuan.', 'Twenty yuan.', 'Eleven yuan.'], answer: 2, explain: '车 5 元，两本书每本 3 元：5 + 3 + 3 = 11 元。' },
        { q: 'How much money does Tom give back to her?', options: ['Nine yuan.', 'Eleven yuan.', 'Fifteen yuan.'], answer: 0, explain: '她给了 20 元，一共花 11 元：20 − 11 = 9 元。' },
      ],
    },
    {
      mode: 'cloze',
      kp: 'grammar',
      title: 'Buying milk',
      text: "Shop assistant: Can I help you?\nAmy: Yes. I'd {1} a bottle of milk. How {2} is it?\nShop assistant: It's six yuan.\nAmy: How {3} bottles do you have? I need three.\nShop assistant: We have five.\nAmy: Great! I'd like three, please.\nShop assistant: That's eighteen yuan.\nAmy: OK. Here is the {4}.\nShop assistant: Thank you. Goodbye!",
      questions: [
        blank(['likes', 'like', 'liking'], 1, 'I’d like …（我想要……），like 用原形。'),
        blank(['much', 'many', 'old'], 0, '问价钱：How much is it?'),
        blank(['much', 'old', 'many'], 2, '问瓶数，瓶子可以数：How many bottles?'),
        blank(['milk', 'shop', 'money'], 2, '付钱时说：Here is the money.'),
      ],
    },
  ],

  // ---------------------------------------------------------------- Unit 5 seasons
  'en-g4a.u5': [
    {
      mode: 'read',
      kp: 'grammar',
      title: 'Harbin and Shenzhen',
      text: "In Harbin, the four seasons are very different. It gets warm in spring. It gets hot in summer, but not very hot. In autumn, it gets cool and the leaves turn yellow. Winter is long and very cold. It snows a lot, and people make ice lanterns. In Shenzhen, it doesn't snow in winter. It gets very hot in summer, and it rains a lot. My favourite season is winter in Harbin, because I love snow.",
      questions: [
        { q: 'What do people in Harbin make in winter?', options: ['Kites.', 'Mooncakes.', 'Ice lanterns.'], answer: 2, explain: 'It snows a lot, and people make ice lanterns.（哈尔滨冬天雪很多，人们做冰灯。）' },
        { q: 'What is summer like in Shenzhen?', options: ['It gets very hot, and it rains a lot.', 'It snows a lot.', 'It gets cold.'], answer: 0, explain: 'It gets very hot in summer, and it rains a lot.（深圳夏天很热，雨很多。）' },
        { q: "What is the writer's favourite season?", options: ['Summer in Shenzhen.', 'Winter in Harbin.', 'Spring in Harbin.'], answer: 1, explain: 'My favourite season is winter in Harbin.（我最喜欢哈尔滨的冬天。）' },
        { q: 'Which sentence is TRUE?', options: ['Winter in Harbin is short.', 'It gets very hot in Harbin in summer.', "It doesn't snow in Shenzhen in winter."], answer: 2, explain: "短文说 In Shenzhen, it doesn't snow in winter. 哈尔滨的冬天很长，夏天也不是很热。" },
      ],
    },
    {
      mode: 'cloze',
      kp: 'words',
      title: 'Four seasons',
      text: 'There are four {1} in a year. In spring, it gets {2}. Flowers come out. In summer, it gets hot. We go swimming. In autumn, it gets {3}. We fly kites. In winter, it gets cold. In Beijing, it {4} in winter, but in Shenzhen it doesn\'t. My favourite season is summer, because I love swimming.',
      questions: [
        blank(['seasons', 'months', 'days'], 0, '一年有四个季节：four seasons。'),
        blank(['cold', 'warm', 'snow'], 1, '春天变暖和：In spring, it gets warm。'),
        blank(['hot', 'snow', 'cool'], 2, '秋天变凉爽：In autumn, it gets cool。'),
        blank(['snow', 'snowing', 'snows'], 2, '主语是 it，动词加 s：it snows。'),
      ],
    },
    {
      mode: 'read',
      kp: 'grammar',
      title: 'Kitty wants to see snow',
      text: "Kitty lives in Shenzhen. It doesn't get very cold here in winter, and it doesn't snow. Kitty's cousin Ben lives in Beijing. It gets very cold there in winter, and it often snows. Ben likes making snowmen. This winter, Kitty is going to visit Ben. She is very excited. She wants to see snow for the first time. Mum says, \"Take your warm coat!\"",
      questions: [
        { q: 'Where does Ben live?', options: ['In Shenzhen.', 'In Beijing.', 'In Harbin.'], answer: 1, explain: "Kitty's cousin Ben lives in Beijing.（Ben 住在北京。）" },
        { q: 'What does Ben like doing in winter?', options: ['Making snowmen.', 'Swimming.', 'Flying kites.'], answer: 0, explain: 'Ben likes making snowmen.（Ben 喜欢堆雪人。）' },
        { q: 'Why is Kitty excited?', options: ['She has a new coat.', 'She will go swimming.', 'She will see snow for the first time.'], answer: 2, explain: 'She wants to see snow for the first time.（她第一次要看到雪。）' },
      ],
    },
  ],

  // ---------------------------------------------------------------- Unit 6 plants
  'en-g4a.u6': [
    {
      mode: 'cloze',
      kp: 'grammar',
      title: 'My sunflower',
      text: 'I have a sunflower in my garden. It is very {1}. It is taller than me! It {2} a big yellow flower. It has big green {3}. Its roots are in the {4}. It gets water from there. Sunflowers have lots of seeds. We can eat them. Birds like them too! I water my sunflower every morning.',
      questions: [
        blank(['short', 'tall', 'small'], 1, '它比我还高：It is very tall。'),
        blank(['has', 'have', "doesn't have"], 0, '主语是 it，用 has：It has a big yellow flower。'),
        blank(['leaf', 'soil', 'leaves'], 2, 'big green 后面要用复数：big green leaves。'),
        blank(['leaf', 'soil', 'flower'], 1, '根长在土壤里：in the soil。'),
      ],
    },
    {
      mode: 'read',
      kp: 'words',
      title: 'Amazing plants',
      text: "Plants are amazing. A cactus lives in the desert. It doesn't have big leaves, so it doesn't lose much water. It has sharp spines. A lotus lives in the water. It has big round leaves and pretty pink flowers. An apple tree has white flowers in spring and red fruit in autumn. All plants need sunlight, water and air to grow.",
      questions: [
        { q: 'Where does a cactus live?', options: ['In the water.', 'In the desert.', 'In the garden.'], answer: 1, explain: 'A cactus lives in the desert.（仙人掌生活在沙漠里。）' },
        { q: "Why doesn't a cactus lose much water?", options: ["It doesn't have big leaves.", 'It has pink flowers.', 'It lives in the water.'], answer: 0, explain: "It doesn't have big leaves, so it doesn't lose much water.（它没有大叶子，所以不怎么失水。）" },
        { q: 'When does an apple tree have red fruit?', options: ['In spring.', 'In winter.', 'In autumn.'], answer: 2, explain: 'red fruit in autumn：秋天结红苹果，春天开白花。' },
        { q: 'What do all plants need to grow?', options: ['Only soil.', 'Sunlight, water and air.', 'Only water.'], answer: 1, explain: 'All plants need sunlight, water and air to grow.' },
      ],
    },
    {
      mode: 'cloze',
      kp: 'grammar',
      title: 'My bean diary',
      text: 'This is my plant diary.\nDay 1: I put a bean {1} in the soil and give it some water.\nDay 5: It {2} a little green shoot now.\nDay 10: It has two small {3}.\nDay 30: It is tall now, but it {4} have any flowers yet.\nDay 40: Now it has two small white flowers. I am so happy!',
      questions: [
        blank(['leaf', 'seed', 'fruit'], 1, '放进土里的是豆子的种子：a bean seed。'),
        blank(['has', 'have', "don't"], 0, '主语是 it，用 has：It has a little green shoot。'),
        blank(['flowers', 'soils', 'leaves'], 2, '第 30 天还没有花，第 10 天长出的是两片小叶子：leaves。'),
        blank(["don't", "doesn't", "isn't"], 1, '主语是 it，否定用 doesn’t have。'),
      ],
    },
  ],

  // ---------------------------------------------------------------- Unit 7 road safety
  'en-g4a.u7': [
    {
      mode: 'read',
      kp: 'words',
      title: 'On the way to school',
      text: "Peter walks to school with his dad every day. There is a busy road near the school. At the crossing, Dad says, \"Look! The light is red. We must wait.\" When the light turns green, they look left and right. Then they cross the road. A boy is playing football near the road. Dad tells him, \"Don't play near the road. It isn't safe.\"",
      questions: [
        { q: 'How does Peter go to school?', options: ['He takes a bus.', 'He rides a bike.', 'He walks with his dad.'], answer: 2, explain: 'Peter walks to school with his dad every day.（Peter 每天和爸爸走路上学。）' },
        { q: 'What do they do at the red light?', options: ['They wait.', 'They cross the road.', 'They run.'], answer: 0, explain: 'The light is red. We must wait.（红灯，我们必须等。）' },
        { q: 'What do they do before they cross the road?', options: ['They play football.', 'They look left and right.', 'They run fast.'], answer: 1, explain: 'they look left and right. Then they cross the road.（先左右看，再过马路。）' },
        { q: 'Why does Dad talk to the boy?', options: ['The boy is his son.', 'The boy is late for school.', "Playing near the road isn't safe."], answer: 2, explain: "Don't play near the road. It isn't safe.（别在马路边玩，不安全。）" },
      ],
    },
    {
      mode: 'cloze',
      kp: 'grammar',
      title: 'Road safety rules',
      text: 'Mr Li gives his class some road safety rules.\n1. {1} for the green light.\n2. Look {2} and right before you cross.\n3. {3} run across the road.\n4. Don\'t {4} football on the road.\n5. Cross the road at the zebra crossing.\n6. Hold a grown-up\'s hand.\nRemember these rules and be safe on the road!',
      questions: [
        blank(['Cross', 'Wait', 'Walk'], 1, '等绿灯：Wait for the green light。'),
        blank(['left', 'up', 'down'], 0, '过马路前左右看：look left and right。'),
        blank(['Do', 'Please', "Don't"], 2, '不要跑着过马路：Don’t run across the road。'),
        blank(['plays', 'play', 'playing'], 1, 'Don’t 后面用动词原形：Don’t play。'),
      ],
    },
    {
      mode: 'read',
      kp: 'grammar',
      title: "Kitty's safety poster",
      text: "Kitty makes a safety poster for her class. Red light means stop. Green light means go. Cross the road at the zebra crossing. Hold a grown-up's hand. Don't run. Don't look at your phone when you cross the road. At night, wear bright clothes, so drivers can see you. Be careful and keep safe!",
      questions: [
        { q: 'What does a red light mean?', options: ['Go.', 'Stop.', 'Run.'], answer: 1, explain: 'Red light means stop.（红灯表示停。）' },
        { q: 'Where should you cross the road?', options: ['At the zebra crossing.', 'Between the cars.', 'Anywhere you like.'], answer: 0, explain: 'Cross the road at the zebra crossing.（走斑马线过马路。）' },
        { q: 'Why should you wear bright clothes at night?', options: ["Because it's cold.", 'Because they are new.', 'So drivers can see you.'], answer: 2, explain: 'wear bright clothes, so drivers can see you（穿亮色衣服，司机才能看见你）。' },
      ],
    },
  ],

  // ---------------------------------------------------------------- Unit 8 grandparents
  'en-g4a.u8': [
    {
      mode: 'cloze',
      kp: 'words',
      title: 'A busy day',
      text: 'My grandparents live with us. They are busy every day. In the morning, Grandpa does {1} in the park. He runs and does taijiquan. Grandma goes {2} at the market. She buys fresh vegetables. In the afternoon, Grandpa does {3}. He waters the flowers. Grandma often {4} the internet. She chats with her friends online.',
      questions: [
        blank(['housework', 'exercise', 'gardening'], 1, '在公园跑步、打太极拳是锻炼身体：do exercise。'),
        blank(['shopping', 'swimming', 'exercise'], 0, '在市场买菜是去购物：go shopping。'),
        blank(['shopping', 'exercise', 'gardening'], 2, '浇花是做园艺：do gardening。'),
        blank(['use', 'using', 'uses'], 2, 'Grandma 是第三人称单数，often 后面用 uses。'),
      ],
    },
    {
      mode: 'read',
      kp: 'grammar',
      title: "Mike's grandparents",
      text: "Hi, I'm Mike. My grandpa is seventy. He goes for a walk after dinner every day. He also likes using the internet. He reads the news on his tablet. My grandma is sixty-eight. She often does housework. She cooks nice food for us. On Sundays, she does gardening with me. We grow tomatoes on the balcony. I love my grandparents.",
      questions: [
        { q: "How old is Mike's grandpa?", options: ['Sixty-eight.', 'Seventeen.', 'Seventy.'], answer: 2, explain: 'My grandpa is seventy.（爷爷七十岁。）68 岁的是奶奶。' },
        { q: 'When does Grandpa go for a walk?', options: ['After dinner.', 'In the morning.', 'On Sundays.'], answer: 0, explain: 'He goes for a walk after dinner every day.（他每天晚饭后散步。）' },
        { q: 'What does Grandma do on Sundays?', options: ['She goes shopping.', 'She does gardening with Mike.', 'She uses the internet.'], answer: 1, explain: 'On Sundays, she does gardening with me.（星期天她和我一起做园艺。）' },
        { q: 'Where do they grow tomatoes?', options: ['On a farm.', 'In the park.', 'On the balcony.'], answer: 2, explain: 'We grow tomatoes on the balcony.（我们在阳台上种西红柿。）' },
      ],
    },
    {
      mode: 'cloze',
      kp: 'grammar',
      title: 'A letter to Grandma',
      text: 'Dear Grandma,\nHow are you? I miss you. Do you still {1} for a walk every evening? I often {2} exercise at school. I play basketball with my friends. I also do housework at home. I wash the dishes every day. Mum says you can {3} the internet now. Let\'s have a video chat this Sunday!\nLove,\nAmy',
      questions: [
        blank(['do', 'go', 'use'], 1, '去散步：go for a walk。'),
        blank(['go', 'use', 'do'], 2, '锻炼身体：do exercise。'),
        blank(['use', 'do', 'go'], 0, '上网：use the internet。'),
      ],
    },
  ],
};
