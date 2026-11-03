// 生成演示数据：npm run seed
// 除“北京味道”外，档口、菜品和评论都是虚构的。使用固定随机种子，结果可复现。
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

type DishDef = [name: string, price: number, spicy: boolean, offset: number, listedDaysAgo?: number];

interface StallDef {
  id: string;
  name: string;
  cuisine: string;
  intro: string;
  target: number;
  reviewsPerDish: number;
  dishes: DishDef[];
}

const OLD = 120;

// 各档口的招牌菜：评论多、评分高，让综合榜不被单个档口占满
const SIGNATURE = new Set(["老北京炸酱面", "水煮牛肉饭", "招牌牛肉面", "小炒黄牛肉", "蜜汁叉烧饭"]);
const SIGNATURE_REVIEWS = 12;
const SIGNATURE_TARGET = 5.3;

const STALLS: StallDef[] = [
  {
    id: "beijing", name: "北京味道", cuisine: "京味", intro: "炸酱面和京酱肉丝是招牌，饭点要排队。", target: 4.85, reviewsPerDish: 5,
    dishes: [
      ["老北京炸酱面", 14, false, 0.1], ["京酱肉丝饭", 16, false, 0], ["烤鸭卷饼", 22, false, 0], ["宫保鸡丁饭", 15, true, -0.1],
      ["糖醋里脊", 16, false, 0], ["木须肉饭", 14, false, 0], ["打卤面", 13, false, 0], ["门钉肉饼", 8, false, -0.1],
      ["羊肉烧麦", 12, false, -0.1], ["红烧狮子头", 17, false, -0.2], ["卤煮小碗", 15, true, -0.4], ["豆汁配焦圈", 7, false, -0.9],
      ["青椒肉丝烩饼", 13, true, -0.1, 5],
    ],
  },
  {
    id: "chuanyu", name: "川渝小馆", cuisine: "川渝", intro: "麻辣够劲，不能吃辣的同学记得看标签。", target: 4.6, reviewsPerDish: 5,
    dishes: [
      ["水煮牛肉饭", 22, true, 0.3], ["麻婆豆腐饭", 12, true, 0.3], ["毛血旺", 24, true, 0.2], ["回锅肉饭", 16, true, 0.2], ["鱼香肉丝饭", 14, true, 0.1],
      ["辣子鸡丁", 18, true, 0], ["酸菜鱼", 25, true, 0], ["番茄肥牛饭", 19, false, -0.1], ["红油抄手", 13, true, -0.2], ["冰粉", 6, false, -0.6],
      ["藤椒鸡饭", 18, true, 0, 3],
    ],
  },
  {
    id: "lanzhou", name: "兰州牛肉面", cuisine: "西北", intro: "现拉现煮，粗细可选。", target: 4.4, reviewsPerDish: 4,
    dishes: [
      ["招牌牛肉面", 16, false, 0.4], ["油泼辣子面", 14, true, 0.2], ["牛肉炒面", 18, false, 0.1], ["孜然羊肉盖饭", 21, true, 0], ["凉拌牛肉", 15, true, 0],
      ["卤蛋牛肉面", 18, false, 0.1], ["臊子面", 15, true, -0.1], ["酸汤水饺", 14, true, -0.3], ["胡萝卜拌面", 12, false, -0.5],
      ["番茄牛腩面", 20, false, 0.2, 9],
    ],
  },
  {
    id: "xiangwei", name: "湘味小炒", cuisine: "湘菜", intro: "现炒出锅，下饭首选。", target: 4.1, reviewsPerDish: 4,
    dishes: [
      ["小炒黄牛肉", 24, true, 0.5], ["剁椒鱼头", 26, true, 0.3], ["农家小炒肉", 17, true, 0.3], ["外婆菜炒蛋", 12, true, 0], ["干锅花菜", 13, true, -0.1],
      ["手撕包菜", 10, true, -0.3], ["冬瓜排骨汤", 12, false, -0.5], ["腊味合蒸", 20, true, -0.8],
      ["擂椒皮蛋", 11, true, 0, 12], ["莲藕排骨饭", 19, false, 0.1, 7],
    ],
  },
  {
    id: "yueshi", name: "粤式烧腊", cuisine: "粤菜", intro: "烧鸭和叉烧每天限量，口味清淡。", target: 3.8, reviewsPerDish: 4,
    dishes: [
      ["蜜汁叉烧饭", 19, false, 0.6], ["烧鸭饭", 21, false, 0.5], ["双拼饭", 25, false, 0.3], ["白切鸡饭", 18, false, 0.1], ["豉汁排骨饭", 18, false, -0.2],
      ["干炒牛河", 17, false, 0], ["皮蛋瘦肉粥", 10, false, -0.5], ["例汤", 6, false, -0.9], ["煲仔饭", 22, false, -0.2],
    ],
  },
  {
    id: "huaiyang", name: "淮扬小笼", cuisine: "淮扬", intro: "小笼和汤面都偏甜口。", target: 3.5, reviewsPerDish: 4,
    dishes: [
      ["蟹粉小笼", 18, false, 0.9], ["鲜肉小笼", 13, false, 0.5], ["扬州炒饭", 14, false, 0.2], ["生煎包", 10, false, 0.3], ["阳春面", 9, false, -0.2],
      ["鸭血粉丝汤", 13, false, -0.5], ["大煮干丝", 15, false, -0.7], ["梅干菜扣肉饭", 18, false, -1],
      ["荠菜馄饨", 12, false, 0.2, 2],
    ],
  },
  {
    id: "dongbei", name: "东北饺子馆", cuisine: "东北", intro: "份量大，价格实在。", target: 3.2, reviewsPerDish: 4,
    dishes: [
      ["猪肉酸菜水饺", 14, false, 1.1], ["锅包肉", 22, false, 0.8], ["地三鲜饭", 13, false, 0.2], ["韭菜鸡蛋水饺", 13, false, 0.2],
      ["小鸡炖蘑菇", 20, false, -0.3], ["东北拉皮", 12, true, -0.5], ["乱炖", 16, false, -0.9], ["冻饺配蘸料", 11, false, -1.3],
    ],
  },
  {
    id: "yunnan", name: "云南过桥米线", cuisine: "滇味", intro: "汤底很烫，先放肉再放菜。", target: 2.9, reviewsPerDish: 4,
    dishes: [
      ["招牌过桥米线", 22, false, 1], ["酸辣米线", 16, true, 0.5], ["汽锅鸡米线", 24, false, 0.2], ["小锅米线", 15, true, -0.1],
      ["傣味柠檬鸡", 20, true, -0.7], ["菌菇汤米线", 19, false, -0.8], ["豆花米线", 14, false, -1.2],
    ],
  },
  {
    id: "shanxi", name: "山西刀削面", cuisine: "晋味", intro: "面条筋道，浇头差异较大。", target: 2.6, reviewsPerDish: 4,
    dishes: [
      ["番茄鸡蛋刀削面", 13, false, 1.1], ["肉臊刀削面", 15, false, 0.6], ["老陈醋凉皮", 10, true, 0.1],
      ["过油肉饭", 18, false, -0.4], ["莜面栲栳栳", 16, false, -0.9], ["羊杂汤", 18, true, -1.3],
    ],
  },
  {
    id: "xinjiang", name: "新疆风味", cuisine: "新疆", intro: "大盘鸡分量足，但出餐较慢。", target: 2.2, reviewsPerDish: 4,
    dishes: [
      ["大盘鸡拌面", 25, true, 1.2], ["羊肉抓饭", 24, false, 0.5], ["烤包子", 8, false, 0, 11],
      ["过油肉拌面", 20, true, -0.5], ["手抓羊肉", 30, false, -0.9],
    ],
  },
  {
    id: "xibei", name: "西北面食", cuisine: "陕甘", intro: "最近换了师傅，评价起伏较大。", target: 1.75, reviewsPerDish: 5,
    dishes: [
      ["肉夹馍", 10, false, 1], ["凉皮", 9, true, 0.2], ["油泼面", 14, true, -0.5], ["羊肉泡馍", 26, false, -0.75],
    ],
  },
  {
    id: "minnan", name: "闽南沙茶面", cuisine: "闽南", intro: "新开档口，主打沙茶汤底，欢迎来尝鲜。", target: 0, reviewsPerDish: 0,
    dishes: [
      ["沙茶面", 16, true, 0, 1], ["海蛎煎", 18, false, 0, 6], ["卤肉饭", 15, false, 0, 10], ["四果汤", 9, false, 0, 13],
    ],
  },
];

const AUTHORS = ["未名湖边的猫", "学五常客", "燕园干饭人", "图书馆占座王", "三教早八人", "博雅塔下", "今天吃什么", "匿名同学", "二层老熟客", "研二在读", "大一新生", "夜跑归来", "实验室打工人", "社团跑腿", "减脂失败"];

const TEMPLATES: Record<number, string[]> = {
  5: ["{d}真的绝了，连吃三天都不腻。", "排队也值得，{d}是这层的天花板。", "分量足味道正，{d}强烈推荐。", "朋友带我吃过{d}之后就回不去了。", "这个价格能吃到这样的{d}，很满足。", "下课直奔这里，{d}从来没让我失望。"],
  4: ["{d}挺好吃，就是饭点要等一会儿。", "味道稳定，{d}可以常吃。", "{d}整体不错，分量可以再多一点。", "第二次点{d}了，比上次更入味。", "{d}性价比还行，日常吃够用。"],
  3: ["{d}中规中矩，没有惊喜也不踩雷。", "{d}味道一般，赶时间可以吃。", "{d}偏咸了一点，配饭还行。", "吃得饱，但{d}不会特地再来。", "{d}时好时坏，看师傅。"],
  2: ["{d}有点油，吃到后面腻了。", "等了很久才拿到{d}，味道也一般。", "{d}分量偏少，感觉不太值。", "{d}端上来已经不热了。", "和想象差距有点大，{d}不太推荐。"],
  1: ["{d}踩雷了，吃了两口就放下了。", "不建议点{d}，又贵又没味道。", "{d}口感很差，再也不点了。", "{d}太咸，喝了一下午水。"],
};
const SPICY_TEMPLATES: Record<number, string[]> = {
  5: ["{d}辣得很过瘾，越吃越香。"],
  4: ["{d}辣度刚好，不太能吃辣也能接受。"],
  3: ["{d}辣得有点单调，香味不够。"],
  2: ["{d}只有辣没有别的味道。"],
  1: ["{d}辣得胃不舒服，慎点。"],
};
const OVERALL: Record<number, string[]> = {
  5: ["整个档口都很稳，出餐也快。", "阿姨很热情，每道菜都用心。"],
  4: ["这家总体不错，高峰期排队稍久。", "选择挺多，换着吃不容易腻。"],
  3: ["总体一般，胜在离楼梯近。", "味道还行，就是价格涨了一点。"],
  2: ["最近水平有点下滑，出餐也慢。", "窗口卫生可以再注意一些。"],
  1: ["连着踩雷两次，暂时不会再来了。", "等了二十分钟还上错菜。"],
};

// mulberry32：小而可复现的随机数
function createRng(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = createRng(20261102);
const pick = <T,>(items: T[]): T => items[Math.floor(rng() * items.length)];

function drawStars(target: number): number {
  const noisy = target + (rng() + rng() - 1) * 0.9;
  return Math.min(5, Math.max(1, Math.round(noisy)));
}

// 打散摆放，避免颜色沿着墙面呈规律渐变。0–5 后墙，6–8 左墙，9–11 右墙
const SLOT_BY_STALL = [2, 8, 4, 10, 0, 6, 3, 11, 5, 7, 1, 9];
const stalls = STALLS.map(({ id, name, cuisine, intro }, i) => ({ id, name, slotIndex: SLOT_BY_STALL[i], cuisine, intro }));
const dishes: object[] = [];
const reviews: object[] = [];
let reviewId = 0;

function addReview(stallId: string, dishId: string | null, stars: number, text: string, createdDaysAgo: number) {
  reviews.push({ id: `seed-${++reviewId}`, stallId, dishId, author: pick(AUTHORS), stars, text, createdDaysAgo });
}

for (const stall of STALLS) {
  stall.dishes.forEach(([name, price, spicy, offset, listed], i) => {
    const dishId = `${stall.id}-${i + 1}`;
    const listedDaysAgo = listed ?? OLD + Math.floor(rng() * 200);
    dishes.push({ id: dishId, stallId: stall.id, name, price, spicy, listedDaysAgo });
    if (stall.reviewsPerDish === 0) return;

    // 新菜的评论少，贝叶斯排序才有东西可以体现
    const signature = SIGNATURE.has(name);
    const count = signature ? SIGNATURE_REVIEWS : listed !== undefined ? 1 + Math.floor(rng() * 2) : stall.reviewsPerDish + Math.floor(rng() * 2);
    for (let k = 0; k < count; k++) {
      const stars = drawStars(signature ? SIGNATURE_TARGET : stall.target + offset);
      const pool = spicy && rng() < 0.4 ? SPICY_TEMPLATES[stars] : TEMPLATES[stars];
      const daysAgo = 1 + Math.floor(rng() * Math.min(listedDaysAgo, 150));
      addReview(stall.id, dishId, stars, pick(pool).replace("{d}", name), daysAgo);
    }
  });

  if (stall.reviewsPerDish > 0) {
    for (let k = 0; k < 3; k++) {
      const stars = drawStars(stall.target);
      addReview(stall.id, null, stars, pick(OVERALL[stars]), 1 + Math.floor(rng() * 90));
    }
  }
}

const outDir = join(dirname(fileURLToPath(import.meta.url)), "../src/data/seed");
mkdirSync(outDir, { recursive: true });
for (const [file, data] of Object.entries({ stalls, dishes, reviews })) {
  writeFileSync(join(outDir, `${file}.json`), JSON.stringify(data, null, 1) + "\n");
}

// 打印分布，方便核对 SPEC 的分布要求
type Row = { stallId: string; dishId: string | null; stars: number };
for (const stall of STALLS) {
  const rows = (reviews as Row[]).filter((r) => r.stallId === stall.id);
  const avg = rows.length ? rows.reduce((s, r) => s + r.stars, 0) / rows.length : 0;
  const rated = new Set(rows.flatMap((r) => (r.dishId ? [r.dishId] : []))).size;
  console.log(`${stall.name.padEnd(8, "　")} 评分 ${avg.toFixed(2)}  评论 ${String(rows.length).padStart(3)}  有评论的菜 ${rated}/${stall.dishes.length}`);
}
console.log(`共 ${stalls.length} 个档口，${dishes.length} 道菜，${reviews.length} 条评论`);
