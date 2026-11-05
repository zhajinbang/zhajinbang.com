export type Member = {
  slug: string;
  name: string;
  role: string;
  note: string;
  menu: Array<{ label: string; detail: string }>;
};

export const members: Member[] = [
  {
    slug: "alpha",
    name: "曹先生",
    role: "the 17cmer",
    note: "把想法留在手上，而不是只留在聊天框里。",
    menu: [
      { label: "WORKBENCH", detail: "进行中的小制作" },
      { label: "PARTS BIN", detail: "零件与灵感库存" },
      { label: "AFTER HOURS", detail: "下班后的秘密项目" },
    ],
  },
  {
    slug: "beta",
    name: "田先生",
    role: "jerk king",
    note: "收集噪声、整理节奏、把偶然变成线索。",
    menu: [
      { label: "FREQUENCY", detail: "本周正在循环的声音" },
      { label: "FIELD NOTES", detail: "路上捡到的观察" },
      { label: "TRANSMIT", detail: "留给下一个人的讯号" },
    ],
  },
  {
    slug: "gamma",
    name: "盛先生",
    role: "the artist",
    note: "不急着抵达，先把绕路变成地图。",
    menu: [
      { label: "COORDINATES", detail: "想去和去过的地点" },
      { label: "SIDE QUESTS", detail: "主线之外的小任务" },
      { label: "ARCHIVE", detail: "留存的片段与照片" },
    ],
  },
  {
    slug: "delta",
    name: "陆先生",
    role: "the king",
    note: "保留一点无法预测，事情才有意思。",
    menu: [
      { label: "RANDOMIZER", detail: "今天的随机指令" },
      { label: "ODD JOBS", detail: "暂时无法归类的点子" },
      { label: "EMERGENCY EXIT", detail: "一键回到基地" },
    ],
  },
];

export function getMember(slug: string) {
  return members.find((member) => member.slug === slug);
}
