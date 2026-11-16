window.SchoolEvents = {
  thoughts: [
    { id: "writer", name: "A Story of My Own", cardId: "F05" },
    { id: "physics", name: "Physics Beyond the Textbook", cardId: "F08" },
    { id: "business", name: "My Own Business", flag: "business", effects: [{ stat: "A", delta: 1 }] },
    { id: "work", name: "Money of My Own", flag: "work", effects: [{ stat: "A", delta: 1 }] },
    { id: "outside", name: "A World Outside School", effects: [{ stat: "M", delta: 1 }, { stat: "A", delta: 1 }] },
    { id: "signal", name: "A Signal to the Stars", flag: "alienSignal", effects: [{ stat: "A", delta: 2 }] },
    { id: "sleep", name: "What I Really Want Is Sleep", cardId: "N03" },
    { id: "today", name: "Write Down Today", effects: [{ stat: "A", delta: 2 }] },
  ],
  familiarThought: { name: "A Familiar Daydream", effects: [{ stat: "A", delta: 1 }] },
  calledOn: { name: "Called on in Class", effects: [{ stat: "M", delta: -3 }] },
  teacher: [
    { id: "encouragement", name: "A Word of Encouragement", weight: 40, effects: [{ stat: "M", delta: 5 }, { stat: "A", delta: 1 }] },
    { id: "criticism", name: "Criticized in Front of the Class", weight: 35, effects: [{ stat: "M", delta: -6 }] },
    { id: "joke", name: "The Butt of a Joke", weight: 25, effects: [{ stat: "M", delta: -10 }, { stat: "A", delta: -2 }] },
  ],
  family: [
    { id: "food", name: "A Surprise Meal Delivery", weight: 25, supply: "E06" },
    { id: "pressure", name: "Pressure from Home", weight: 25, effects: [{ stat: "M", delta: -7 }] },
    { id: "conflict", name: "A Difficult Night at Home", weight: 10, effects: [{ stat: "M", delta: -12 }, { stat: "C", delta: -1 }] },
    { id: "kindness", name: "An Unexpected Kindness", weight: 30, effects: [{ stat: "M", delta: 7 }, { stat: "A", delta: 1 }] },
  ],
  steady: { name: "Things Make a Little More Sense", effects: [{ stat: "M", delta: 5 }, { stat: "A", delta: 1 }] },
  empty: { name: "Nothing Feels Quite Real", effects: [{ stat: "M", delta: -5 }, { stat: "A", delta: 2 }] },
};
