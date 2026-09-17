export type ReleaseNote = {
  version: string;
  date: string;
  title: string;
  changes: string[];
};

export const RELEASES: ReleaseNote[] = [
  {
    version: "1.3",
    date: "2026-09-17",
    title: "比賽記錄操作與計分規則更新",
    changes: [
      "好球改為紅色、壞球改為綠色，並放大好壞球操作按鈕。",
      "本壘新增手動得分調整，可指定壘上跑者回壘，或直接加減失分。",
      "修正雙殺時三壘跑者消失且未計分的問題。",
      "責任失分改由讓跑者上壘的投手承擔；提前換局時，每位殘壘跑者折算 0.33 分。",
      "投球局數改以出局數顯示，並新增重設局數功能。",
      "三振與保送統計改為 K/9 與 BB/9。",
    ],
  },
];