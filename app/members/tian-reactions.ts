import type { TianReaction } from "./tian-game";

export const caughtCaption = "这下田先生可惨了！";
export const caughtImage = "/tian-runner/memes/caught.jpg";
export const struggleImage = "/tian-runner/memes/struggle.jpg";
export const rescuedImage = "/tian-runner/memes/rescued.jpg";
export const baitImage = "/tian-runner/memes/bait.jpg";
export const baitSuccessCaption = "勾引完就跑，只留下一根腋毛！";
export const baitCaughtCaption = "被就地正法了";

export const tianReactions: Record<TianReaction, { name: string; caption: string; image: string; condition: string }> = {
  tongue: { name: "吐舌头", caption: "suck my dick", image: "/tian-runner/memes/tongue.jpg", condition: "连续跳过 3 辆轿车" },
  grin: { name: "怪笑", caption: "gulp gulp gulp", image: "/tian-runner/memes/grin.jpg", condition: "本局每吃到 18 枚金币" },
  shush: { name: "嘘", caption: "低调点，东子", image: "/tian-runner/memes/shush.jpg", condition: "无磕绊 · 每 1,000 米触发" },
  smirk: { name: "得意微笑", caption: "好酥服啊", image: "/tian-runner/memes/smirk.jpg", condition: "开局 / 刷新最高纪录" },
  fear: { name: "惊恐", caption: "呀咩喽！", image: "/tian-runner/memes/fear.jpg", condition: "第一次磕绊后触发" },
};
