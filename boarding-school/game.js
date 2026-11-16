// Game/UI contract. Load cards.js first, then call SchoolGame.createGame({ rollDie? }).
// Actions: rollAttributes(), acceptAttributes(), setCard(slotId, cardId), fillDefaults(),
// startDay(), resolveNext(), advanceDay(). Each returns { ok, message? }.
// Read: getState() returns a detached snapshot. See results[].effects for actual deltas.
// Phases: character -> planning -> resolving -> dayComplete -> checkpoint (day 2).
// An optional rollDie(sides) must return an integer 1..sides. The UI can inject fixed rolls.
((root) => {
  "use strict";

  const slots = Object.freeze([
    { id: "07:00", end: "09:00", name: "Early Class", defaultCardId: "C01" },
    { id: "09:00", end: "11:00", name: "Morning Class", defaultCardId: "C06" },
    { id: "11:00", end: "13:00", name: "Lunch", defaultCardId: "E01" },
    { id: "13:00", end: "15:00", name: "Afternoon Class", defaultCardId: "C01" },
    { id: "15:00", end: "17:00", name: "Free Time", defaultCardId: "F03" },
    { id: "17:00", end: "19:00", name: "Dinner or Free Time", defaultCardId: "E01" },
    { id: "19:00", end: "21:00", name: "Evening", defaultCardId: "N01" },
  ].map(({ id, end, ...slot }) => Object.freeze({ id, time: `${id}–${end}`, ...slot })));
  const cards = root.SchoolCards;
  const cardsById = new Map(cards.map((card) => [card.id, card]));
  const slotIds = new Set(slots.map((slot) => slot.id));
  const statLimits = Object.freeze({ K: 240, M: 100, H: 20, A: 100, W: 99 });
  const accepted = Object.freeze({ ok: true });
  const reject = (message) => ({ ok: false, message });
  const clamp = (value, min, max) => Math.max(min, Math.min(value, max));
  const randomDie = (sides) => Math.floor(Math.random() * sides) + 1;
  const fixedDie = (sides) => Math.min(3, sides);

  function learningMultiplier({ I, C, M, H }) {
    const intelligence = [0.65, 0.85, 1, 1.2, 1.4][[4, 6, 8, 10, 12].findIndex((max) => I <= max)];
    const constitution = C <= 1 ? 0.7 : C <= 3 ? 0.8 : C <= 5 ? 0.9 : 1;
    const mood = M < 10 ? 0.5 : M < 20 ? 0.65 : M < 40 ? 0.85 : M >= 80 ? 1.1 : 1;
    const hunger = H <= 3 ? 0.65 : H <= 7 ? 0.85 : 1;
    return clamp(intelligence * constitution * mood * hunger, 0.35, 1.75);
  }

  function gainMultiplier(stat, card, player) {
    if (stat === "K") return learningMultiplier(player);
    if (stat === "M" && !card.tags.includes("recovery")) {
      if (player.H <= 3) return 0.7;
      if (player.H <= 7) return 0.85;
    }
    return 1;
  }

  function applyEffect(player, { stat, delta, type }) {
    const before = player[stat];
    const after = clamp(before + delta, 0, statLimits[stat]);
    player[stat] = after;
    return { stat, type, requested: delta, delta: after - before, before, after };
  }

  function createGame({ rollDie = randomDie } = {}) {
    const state = {
      day: 1,
      phase: "character",
      player: { I: null, C: null, CH: null, K: 8, M: 60, H: 14, A: 40, W: 8 },
      attributeRolls: null,
      rollsUsed: 0,
      plan: Object.fromEntries(slots.map(({ id }) => [id, null])),
      slotIndex: 0,
      results: [],
      dayEnd: null,
    };

    function rollDice(count, sides) {
      return Array.from({ length: count }, () => {
        const value = rollDie(sides);
        if (!Number.isInteger(value) || value < 1 || value > sides) {
          throw new RangeError(`Invalid result for d${sides}: ${value}`);
        }
        return value;
      });
    }

    function rollAttributes() {
      if (state.phase !== "character" || state.rollsUsed >= 2) return reject("You have used all your attribute rolls.");
      const attributes = ["I", "C", "CH"];
      const rolls = attributes.map(() => rollDice(2, 6));
      state.attributeRolls = Object.fromEntries(attributes.map((stat, index) => [stat, rolls[index]]));
      attributes.forEach((stat) => {
        state.player[stat] = state.attributeRolls[stat].reduce((sum, point) => sum + point, 0);
      });
      state.rollsUsed += 1;
      return accepted;
    }

    function acceptAttributes() {
      if (state.phase !== "character" || !state.rollsUsed) return reject("Roll your attributes first.");
      state.phase = "planning";
      return accepted;
    }

    function setCard(slotId, cardId) {
      if (state.phase !== "planning") return reject("The schedule can only be edited before the day starts.");
      if (!slotIds.has(slotId)) return reject("That time block does not exist.");
      const card = cardsById.get(cardId);
      if (!card) return reject("That card does not exist.");
      if (!card.allowedSlots.includes(slotId)) {
        const allowed = slots.filter(({ id }) => card.allowedSlots.includes(id)).map(({ time }) => time);
        return reject(`${card.name} can only be played at ${allowed.join(", ")}.`);
      }
      state.plan[slotId] = cardId;
      return accepted;
    }

    function fillDefaults() {
      if (state.phase !== "planning") return reject("The schedule can only be edited before the day starts.");
      for (const slot of slots) {
        state.plan[slot.id] ??= slot.defaultCardId;
      }
      return accepted;
    }

    function startDay() {
      if (state.phase !== "planning") return reject("The day has already started.");
      if (slots.some(({ id }) => !state.plan[id])) return reject("Fill every time block before starting the day.");
      state.phase = "resolving";
      return accepted;
    }

    function resolveNext() {
      if (state.phase !== "resolving") return reject("There is no time block to resolve.");
      const slot = slots[state.slotIndex];
      const card = cardsById.get(state.plan[slot.id]);
      const player = state.player;
      const dice = card.diceEffects.map(({ stat, count, sides, bonus }) => {
        const rolled = rollDice(count, sides);
        const base = rolled.reduce((sum, point) => sum + point, bonus);
        const multiplier = gainMultiplier(stat, card, player);
        const requested = base > 0 ? Math.max(1, Math.floor(base * multiplier + 0.5)) : 0;
        return { stat, count, sides, bonus, rolled, base, multiplier, requested };
      });

      const effects = dice.map(({ stat, requested }) => applyEffect(player, { stat, delta: requested, type: "dice" }));
      effects.push(...card.fixedEffects.map((effect) => applyEffect(player, { ...effect, type: "card" })));
      effects.push(applyEffect(player, { stat: "H", delta: -1, type: "slotHunger" }));
      state.results.push({ slotId: slot.id, cardId: card.id, dice, effects, flavor: card.flavor });
      state.slotIndex += 1;

      if (state.slotIndex === slots.length) {
        const effects = [];
        if (player.H <= 3) effects.push(applyEffect(player, { stat: "M", delta: -2, type: "nightHunger" }));
        state.dayEnd = { effects };
        state.phase = "dayComplete";
      }
      return accepted;
    }

    function advanceDay() {
      if (state.phase !== "dayComplete") return reject("Finish today's schedule first.");
      state.day += 1;
      state.phase = "checkpoint";
      return accepted;
    }

    return Object.freeze({
      getState: () => structuredClone(state),
      rollAttributes, acceptAttributes, setCard, fillDefaults, startDay, resolveNext, advanceDay,
    });
  }

  root.SchoolGame = Object.freeze({ cards, slots, statLimits, createGame, fixedDie });
})(window);
