// Pure card data. UI and game logic share these IDs and effects.
window.SchoolCards = Object.freeze([
  {
    id: "C01", name: "Half-Listen in Class", category: "classroom", allowedSlots: ["07:00", "09:00", "13:00"],
    diceEffects: [{ stat: "K", count: 1, sides: 2, bonus: 0 }],
    fixedEffects: [{ stat: "M", delta: -1 }], tags: ["learning"],
    flavor: "You hear the teacher and the shuffle of slippers in the hall. You remember about half of each.",
  },
  {
    id: "C06", name: "Copy the Board", category: "classroom", allowedSlots: ["07:00", "09:00", "13:00"],
    diceEffects: [{ stat: "K", count: 1, sides: 2, bonus: 1 }],
    fixedEffects: [{ stat: "M", delta: -1 }], tags: ["learning"],
    flavor: "Your notes are getting neater. You're still working out how much you understand.",
  },
  {
    id: "E01", name: "Eat at the Canteen", category: "meal", allowedSlots: ["11:00", "17:00"],
    diceEffects: [{ stat: "H", count: 1, sides: 6, bonus: 0 }],
    fixedEffects: [], tags: [],
    flavor: "The food tastes the same as always. By the time your tray is empty, you're ready for whatever comes next.",
  },
  {
    id: "F01", name: "Study Through Break", category: "free", allowedSlots: ["15:00", "17:00"],
    diceEffects: [{ stat: "K", count: 1, sides: 4, bonus: 1 }],
    fixedEffects: [{ stat: "M", delta: -2 }], tags: ["learning"],
    flavor: "You get one step closer to solving the problem. The bell is one step closer, too.",
  },
  {
    id: "F03", name: "Walk the Track", category: "free", allowedSlots: ["15:00", "17:00"],
    diceEffects: [{ stat: "M", count: 1, sides: 4, bonus: 1 }],
    fixedEffects: [], tags: ["recovery"],
    flavor: "A breeze crosses the track. For one lap, the future can wait.",
  },
  {
    id: "N01", name: "Get Some Sleep", category: "night", allowedSlots: ["19:00"],
    diceEffects: [{ stat: "M", count: 1, sides: 6, bonus: 2 }],
    fixedEffects: [], tags: ["recovery"],
    flavor: "The dorm lights go out. Whatever is left of today can wait until morning.",
  },
].map((card) => Object.freeze({
  ...card,
  allowedSlots: Object.freeze(card.allowedSlots),
  diceEffects: Object.freeze(card.diceEffects.map((effect) => Object.freeze(effect))),
  fixedEffects: Object.freeze(card.fixedEffects.map((effect) => Object.freeze(effect))),
  tags: Object.freeze(card.tags),
})));
