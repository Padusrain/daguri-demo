// Game/UI contract. Load card-text.js, cards.js and events.js before creating a game.
// Actions: rollAttributes(), acceptAttributes(), setCard(slotId, cardId), fillDefaults(),
// startDay(), resolveNext(), advanceDay(), planNextDay(). Each returns { ok, message? }.
// Read: getState() returns a detached snapshot. See results[].effects for actual deltas.
// Phases: character -> planning -> resolving (or replanning) -> dayComplete -> checkpoint.
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
  const events = root.SchoolEvents;
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
    const after = clamp(before + delta, 0, stat === "C" ? 12 : statLimits[stat]);
    player[stat] = after;
    return { stat, type, requested: delta, delta: after - before, before, after };
  }

  function createGame({ rollDie = randomDie } = {}) {
    const emptyPlan = () => Object.fromEntries(slots.map(({ id }) => [id, null]));
    const state = {
      day: 1,
      phase: "character",
      player: { I: null, C: null, CH: null, K: 8, M: 60, H: 14, A: 40, W: 8 },
      attributeRolls: null,
      rollsUsed: 0,
      plan: emptyPlan(),
      slotIndex: 0,
      results: [],
      dayEnd: null,
      unlockedCards: cards.filter((card) => !card.unlock).map((card) => card.id),
      chanceEventsToday: 0,
      seenThoughts: [],
      inventory: {},
      environmentLastNight: null,
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

    function isPlanning() {
      return state.phase === "planning" || state.phase === "replanning";
    }

    function cardStatus(cardId) {
      const card = cardsById.get(cardId);
      if (!card) return reject("That card does not exist.");
      if (card.consumable) {
        if (!state.inventory[cardId]) return reject("You do not have a serving of this meal.");
      } else if (!state.unlockedCards.includes(cardId)) {
        return reject("This card is still locked.");
      }
      if (card.dailyLimit && state.results.filter((result) => result.cardId === cardId).length >= card.dailyLimit) {
        return reject("Already used today.");
      }
      return accepted;
    }

    function canPlaceCard(slotId, cardId) {
      if (!isPlanning()) return reject("The schedule is locked while time is being resolved.");
      if (!slotIds.has(slotId)) return reject("That time block does not exist.");
      if (slots.slice(0, state.slotIndex).some(({ id }) => id === slotId)) {
        return reject("This time block has already been resolved.");
      }
      const status = cardStatus(cardId);
      if (!status.ok) return status;
      const card = cardsById.get(cardId);
      if (!card.allowedSlots.includes(slotId)) {
        const allowed = slots.filter(({ id }) => card.allowedSlots.includes(id)).map(({ time }) => time);
        return reject(`${card.name} can only be played at ${allowed.join(", ")}.`);
      }
      if (card.dailyLimit || card.consumable) {
        const alreadyPlanned = slots.slice(state.slotIndex).some(({ id }) => id !== slotId && state.plan[id] === cardId);
        if (alreadyPlanned) return reject(`${card.name} is already assigned to another time block.`);
      }
      return accepted;
    }

    function setCard(slotId, cardId) {
      const status = canPlaceCard(slotId, cardId);
      if (!status.ok) return status;
      state.plan[slotId] = cardId;
      return accepted;
    }

    function fillDefaults() {
      if (!isPlanning()) return reject("The schedule is locked while time is being resolved.");
      for (const slot of slots.slice(state.slotIndex)) {
        state.plan[slot.id] ??= slot.defaultCardId;
      }
      return accepted;
    }

    function startDay() {
      if (!isPlanning()) return reject("The day has already started.");
      if (slots.slice(state.slotIndex).some(({ id }) => !state.plan[id])) return reject("Fill every remaining time block first.");
      state.phase = "resolving";
      return accepted;
    }

    function unlockCard(cardId) {
      if (state.unlockedCards.includes(cardId)) return false;
      state.unlockedCards.push(cardId);
      return true;
    }

    function eventResult(event, rolls) {
      const effects = [...(event.effects ?? [])];
      let unlockedCardId = null;
      if (event.cardId) {
        if (unlockCard(event.cardId)) unlockedCardId = event.cardId;
        else effects.push({ stat: "M", delta: 1 });
      }
      if (event.supply) state.inventory[event.supply] = 1;
      return {
        name: event.name, rolls, unlockedCardId, supplyCardId: event.supply ?? null,
        effects: effects.map((effect) => applyEffect(state.player, { ...effect, type: "event" })),
      };
    }

    function unlockOptions(cardId) {
      const card = cardsById.get(cardId);
      return events.cardRewards.filter((reward) =>
        (card.classroom || card.category === reward.category) && !state.unlockedCards.includes(reward.cardId)
      );
    }

    function drawCardEvent(card) {
      if (state.chanceEventsToday >= 2) return null;
      const rewards = unlockOptions(card.id);
      const chance = card.daydreamChance ?? rewards.reduce((total, reward) => total + reward.chance, 0);
      if (!chance) return null;
      const [gate] = rollDice(1, 100);
      const rolls = [`1d100=${gate} · ${chance}% chance`];
      if (gate > chance) return { rolls };
      state.chanceEventsToday += 1;
      if (!card.daydreamChance) {
        let end = 0;
        const reward = rewards.find((item) => (end += item.chance) >= gate);
        return eventResult(reward, rolls);
      }
      const unseen = events.thoughts.filter(({ id }) => !state.seenThoughts.includes(id));
      if (!unseen.length) return eventResult(events.familiarThought, rolls);
      const [draw] = rollDice(1, unseen.length);
      const thought = unseen[draw - 1];
      state.seenThoughts.push(thought.id);
      return eventResult(thought, [...rolls, `1d${unseen.length}=${draw}`]);
    }

    function drawNightEvent() {
      const previous = state.environmentLastNight;
      state.environmentLastNight = null;
      const knowledge = state.player.K;
      const chance = knowledge < 30 ? 2 : knowledge < 60 ? 4 : knowledge < 100 ? 7 : 10;
      const [thoughtRoll] = rollDice(1, 100);
      if (thoughtRoll <= 2 * chance) {
        return eventResult(thoughtRoll <= chance ? events.steady : events.empty, [`1d100=${thoughtRoll}`]);
      }
      const [gate] = rollDice(1, 100);
      if (gate > 30) return null;
      const [poolRoll] = rollDice(1, 100);
      const pool = poolRoll <= 60 ? events.teacher : events.family;
      const candidates = pool.filter((event) => event.id !== previous && !(event.supply && state.inventory[event.supply]));
      if (!candidates.length) return null;
      const total = candidates.reduce((sum, event) => sum + event.weight, 0);
      const [draw] = rollDice(1, total);
      let cumulative = 0;
      const event = candidates.find((candidate) => (cumulative += candidate.weight) >= draw);
      state.environmentLastNight = event.id;
      return eventResult(event, [`1d100=${gate} · 30% chance`, `1d100=${poolRoll}`, `1d${total}=${draw}`]);
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

      const fixed = card.fixedEffects.map(({ stat, delta }) => ({
        stat, delta: delta > 0 ? Math.max(1, Math.floor(delta * gainMultiplier(stat, card, player) + 0.5)) : delta,
      }));
      const effects = dice.map(({ stat, requested }) => applyEffect(player, { stat, delta: requested, type: "dice" }));
      effects.push(...fixed.map((effect) => applyEffect(player, { ...effect, type: "card" })));
      effects.push(applyEffect(player, { stat: "H", delta: -1, type: "slotHunger" }));
      if (card.consumable) state.inventory[card.id] -= 1;
      const event = drawCardEvent(card);
      state.results.push({ slotId: slot.id, cardId: card.id, dice, effects, flavor: card.flavor, event });
      state.slotIndex += 1;

      if (state.slotIndex === slots.length) {
        const effects = [];
        if (player.H <= 3) effects.push(applyEffect(player, { stat: "M", delta: -2, type: "nightHunger" }));
        state.dayEnd = { effects, event: drawNightEvent() };
        state.phase = "dayComplete";
      } else if (event?.unlockedCardId && slots.slice(state.slotIndex).some(({ id }) => cardsById.get(event.unlockedCardId).allowedSlots.includes(id))) {
        state.phase = "replanning";
      }
      return accepted;
    }

    function advanceDay() {
      if (state.phase !== "dayComplete") return reject("Finish today's schedule first.");
      state.day += 1;
      state.phase = "checkpoint";
      return accepted;
    }

    function planNextDay() {
      if (state.phase !== "checkpoint") return reject("Finish today's schedule first.");
      state.phase = "planning";
      state.plan = emptyPlan();
      state.slotIndex = 0;
      state.results = [];
      state.dayEnd = null;
      state.chanceEventsToday = 0;
      return accepted;
    }

    return Object.freeze({
      getState: () => structuredClone(state),
      rollAttributes, acceptAttributes, cardStatus, unlockOptions, canPlaceCard, setCard, fillDefaults,
      startDay, resolveNext, advanceDay, planNextDay,
    });
  }

  root.SchoolGame = Object.freeze({ cards, slots, statLimits, createGame, fixedDie });
})(window);
