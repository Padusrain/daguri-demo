// Card rules. Edit card-text.js for player-facing card wording.
window.SchoolCardCategories = Object.freeze({
  learning: "Learning", social: "Social", eating: "Eating", rest: "Rest",
  romance: "Romance", business: "Business", aliens: "Aliens",
});

window.SchoolCards = Object.freeze([
  {
    id: "C01", category: "learning", classroom: true, allowedSlots: ["07:00", "09:00", "13:00"],
    diceEffects: [{ stat: "K", count: 1, sides: 2, bonus: 0 }],
    fixedEffects: [{ stat: "M", delta: -1 }], tags: ["learning"],
  },
  {
    id: "C02", category: "rest", classroom: true, allowedSlots: ["07:00", "09:00", "13:00"],
    diceEffects: [{ stat: "M", count: 1, sides: 4, bonus: 0 }],
    fixedEffects: [], tags: ["recovery"],
  },
  {
    id: "C03", category: "learning", classroom: true, allowedSlots: ["07:00", "09:00", "13:00"],
    diceEffects: [], fixedEffects: [{ stat: "M", delta: 1 }], tags: [], daydreamChance: 40,
  },
  {
    id: "C06", category: "learning", classroom: true, allowedSlots: ["07:00", "09:00", "13:00"],
    diceEffects: [{ stat: "K", count: 1, sides: 2, bonus: 1 }],
    fixedEffects: [{ stat: "M", delta: -1 }], tags: ["learning"],
  },
  {
    id: "E01", category: "eating", allowedSlots: ["11:00", "17:00"],
    diceEffects: [{ stat: "H", count: 1, sides: 6, bonus: 0 }],
    fixedEffects: [], tags: [],
  },
  {
    id: "E06", category: "eating", allowedSlots: ["11:00", "17:00"],
    diceEffects: [{ stat: "H", count: 2, sides: 6, bonus: 2 }],
    fixedEffects: [{ stat: "M", delta: 2 }], tags: [], unlock: true, consumable: true,
  },
  {
    id: "F01", category: "learning", allowedSlots: ["15:00", "17:00"],
    diceEffects: [{ stat: "K", count: 1, sides: 4, bonus: 1 }],
    fixedEffects: [{ stat: "M", delta: -2 }], tags: ["learning"],
  },
  {
    id: "F02", category: "social", allowedSlots: ["15:00", "17:00"],
    diceEffects: [{ stat: "M", count: 1, sides: 4, bonus: 0 }],
    fixedEffects: [], tags: [],
  },
  {
    id: "F03", category: "rest", allowedSlots: ["15:00", "17:00"],
    diceEffects: [{ stat: "M", count: 1, sides: 4, bonus: 1 }],
    fixedEffects: [], tags: ["recovery"],
  },
  {
    id: "F05", category: "rest", allowedSlots: ["15:00", "17:00"],
    diceEffects: [{ stat: "M", count: 1, sides: 4, bonus: 0 }, { stat: "A", count: 1, sides: 2, bonus: 0 }],
    fixedEffects: [], tags: ["recovery"], dailyLimit: 1,
  },
  {
    id: "F08", category: "learning", allowedSlots: ["15:00", "17:00"],
    diceEffects: [{ stat: "K", count: 2, sides: 4, bonus: 1 }],
    fixedEffects: [{ stat: "M", delta: -3 }], tags: ["learning"], unlock: true,
  },
  {
    id: "N01", category: "rest", allowedSlots: ["19:00"],
    diceEffects: [{ stat: "M", count: 1, sides: 6, bonus: 2 }],
    fixedEffects: [], tags: ["recovery"],
  },
  {
    id: "N03", category: "rest", allowedSlots: ["19:00"],
    diceEffects: [{ stat: "M", count: 2, sides: 4, bonus: 2 }],
    fixedEffects: [], tags: ["recovery"], unlock: true,
  },
].map((card) => {
  const { name, description, flavor } = window.SchoolCardText[card.id];
  return Object.freeze({
    ...card, name, description, flavor,
    allowedSlots: Object.freeze(card.allowedSlots),
    diceEffects: Object.freeze(card.diceEffects.map((effect) => Object.freeze(effect))),
    fixedEffects: Object.freeze(card.fixedEffects.map((effect) => Object.freeze(effect))),
    tags: Object.freeze(card.tags),
  });
}));
