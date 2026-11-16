// View and interaction only. All legal moves and numeric outcomes come from SchoolGame.
(() => {
  "use strict";

  const { cards, slots, statLimits, createGame, fixedDie } = window.SchoolGame;
  const names = {
    I: "Intelligence", C: "Constitution", CH: "Charisma",
    K: "Knowledge", M: "Mental State", H: "Fullness", A: "Self-Belief", W: "Pocket Money",
  };
  const categories = { classroom: "Class", meal: "Meal", free: "Free Time", night: "Evening" };
  const byId = Object.fromEntries(cards.map((card) => [card.id, card]));
  const slotById = Object.fromEntries(slots.map((slot) => [slot.id, slot]));
  const element = (id) => document.getElementById(id);
  const signed = (value) => value < 0 ? `−${-value}` : `+${value}`;
  const avatar = window.SchoolAvatar.mount();
  let game = createGame();
  let selectedCardId = null;
  let shownLog = 0;
  let shownDayEnd = false;

  function diceLabel({ count, sides, bonus }) {
    return `${count}d${sides}${bonus ? signed(bonus) : ""}`;
  }

  function renderCharacter(state) {
    element("attributes").innerHTML = ["I", "C", "CH"].map((stat) => {
      const roll = state.player[stat];
      return `<div class="attribute"><span>${names[stat]}</span><strong>${roll ?? "—"}</strong>
        <small>${roll == null ? "2d6" : `2d6=${roll}`}</small></div>`;
    }).join("");
    element("roll").textContent = state.rollsUsed ? "Reroll Attributes" : "Roll Attributes";
    element("roll").disabled = state.rollsUsed >= 2;
    element("accept").disabled = !state.rollsUsed;
    element("fixed-rolls").disabled = Boolean(state.rollsUsed);
  }

  function renderSlots(state) {
    const planning = state.phase === "planning";
    const selected = byId[selectedCardId];
    element("slots").innerHTML = slots.map((slot, index) => {
      const assigned = byId[state.plan[slot.id]];
      const completed = index < state.slotIndex;
      const current = state.phase === "resolving" && index === state.slotIndex;
      const eligible = planning && selected?.allowedSlots.includes(slot.id);
      const classes = ["slot", eligible ? "eligible" : "", current ? "current" : "", completed ? "done" : ""];
      return `<button class="${classes.join(" ")}" type="button" data-slot="${slot.id}"
        ${planning ? "" : "disabled"} ${current ? 'aria-current="step"' : ""}>
        <span class="slot-time">${slot.time}</span>
        <span class="slot-name">${slot.name}</span>
        ${assigned
          ? `<span class="slot-card ${assigned.category}">${assigned.name}${completed ? '<small>Resolved</small>' : ""}</span>`
          : '<span class="slot-empty">Place a card</span>'}
      </button>`;
    }).join("");
  }

  function renderCards() {
    element("cards").innerHTML = cards.map((card) => {
      const rolls = card.diceEffects.map((die) => `Gain ${diceLabel(die)} ${names[die.stat]}.`);
      const fixed = card.fixedEffects.map(({ stat, delta }) => `${delta < 0 ? "Lose" : "Gain"} ${Math.abs(delta)} ${names[stat]}.`);
      const plays = card.allowedSlots.map((id) => slotById[id].time);
      return `<button type="button" class="card ${card.category}" data-card="${card.id}"
        aria-pressed="${selectedCardId === card.id}">
        <strong class="card-title">${card.name}</strong>
        <span class="card-type">${categories[card.category]}</span>
        <span class="card-rules">${[...rolls, ...fixed].map((line) => `<span>${line}</span>`).join("")}</span>
        <span class="card-slots">${plays.join(" · ")}</span>
      </button>`;
    }).join("");
  }

  function renderStatus(player) {
    element("stats").innerHTML = Object.entries(statLimits).map(([stat, max]) => {
      const value = player[stat];
      return `<div class="stat">
        <div class="stat-heading"><span>${names[stat]}</span><strong data-stat="${stat}">${value}</strong></div>
        <progress class="stat-bar" data-meter="${stat}" value="${value}" max="${max}" aria-label="${names[stat]}"></progress>
      </div>`;
    }).join("");
  }

  function effectLine({ stat, type, requested, delta, before, after }) {
    const label = { slotHunger: "Time block", nightHunger: "Low fullness" }[type];
    const change = requested === delta ? signed(delta) : `${signed(requested)} (${signed(delta)} applied)`;
    return `<li>${label ? `${label} · ` : ""}${names[stat]} ${change} <span>${before} → ${after}</span></li>`;
  }

  function journalEntry(result) {
    const rolls = result.dice.map((die) => {
      const factor = die.stat === "K" ? ` <span>· Learning ×${Number(die.multiplier.toFixed(4))}</span>` : "";
      return `${diceLabel(die)}=${die.base}${factor}`;
    });
    return `<li class="entry" data-result="${result.slotId}">
      <p class="entry-time">${slotById[result.slotId].time}</p>
      <h3>${byId[result.cardId].name}</h3>
      <p class="dice-result">${rolls.join(" / ")}</p>
      <ul class="effects">${result.effects.map(effectLine).join("")}</ul>
      <p class="flavor">${result.flavor}</p>
    </li>`;
  }

  function renderJournal(state) {
    element("progress").textContent = `${state.results.length} / ${slots.length}`;
    element("empty-journal").hidden = state.results.length > 0;
    const log = element("log");
    // The most recent result stays at the top of the log.
    for (const result of state.results.slice(shownLog)) {
      log.insertAdjacentHTML("afterbegin", journalEntry(result));
    }
    shownLog = state.results.length;
    if (state.dayEnd?.effects.length && !shownDayEnd) {
      log.insertAdjacentHTML("afterbegin", `<li class="entry night-total"><h3>End of Day</h3>
        <ul class="effects">${state.dayEnd.effects.map(effectLine).join("")}</ul></li>`);
      shownDayEnd = true;
    }
  }

  function render() {
    const state = game.getState();
    const phaseNames = { character: "Enrollment", planning: "Planning", resolving: "In Progress", dayComplete: "Day Complete", checkpoint: "Morning" };
    element("day-label").textContent = `Day ${state.day}`;
    element("phase-label").textContent = phaseNames[state.phase];
    element("enrollment").hidden = state.phase !== "character";
    element("workspace").hidden = state.phase === "character";
    if (state.phase === "character") {
      renderCharacter(state);
      return;
    }

    const planning = state.phase === "planning";
    const resolving = state.phase === "resolving";
    const checkpoint = state.phase === "checkpoint";
    element("workspace-title").textContent = {
      planning: "Plan Your Day",
      resolving: "Follow Your Schedule",
      dayComplete: "Day Complete",
      checkpoint: "The Next Morning",
    }[state.phase];
    element("workspace-help").textContent = {
      planning: "Select a card, then select a time block.",
      resolving: "Resolve each time block in order to see its roll and effects.",
      dayComplete: "All seven time blocks are complete.",
      checkpoint: "Yesterday's results are available in the day log.",
    }[state.phase];
    element("schedule-title").textContent = checkpoint ? "Yesterday's Schedule" : "Schedule";
    element("character-details").textContent = ["I", "C", "CH"].map((stat) => `${names[stat]} ${state.player[stat]}`).join(" · ");
    renderStatus(state.player);
    element("fill").hidden = !planning;
    element("deck").hidden = !planning;
    element("start").hidden = !planning;
    element("start").disabled = !Object.values(state.plan).every(Boolean);
    element("resolve").hidden = !resolving;
    if (resolving) element("resolve").textContent = `Resolve ${slots[state.slotIndex].time}`;
    element("advance").hidden = state.phase !== "dayComplete";
    element("restart").hidden = !checkpoint;
    renderSlots(state);
    if (planning) renderCards();
    renderJournal(state);
  }

  function feedback(message, error = false) {
    const status = element("feedback");
    status.textContent = message;
    status.classList.toggle("error", error);
  }

  function run(action, successMessage = "") {
    const result = action();
    if (result.ok) render();
    feedback(result.ok ? successMessage : result.message, !result.ok);
    return result.ok;
  }

  element("roll").addEventListener("click", () => {
    if (game.getState().rollsUsed === 0 && element("fixed-rolls").checked) game = createGame({ rollDie: fixedDie });
    run(game.rollAttributes);
    if (element("roll").disabled) element("accept").focus();
  });
  element("accept").addEventListener("click", () => {
    if (run(game.acceptAttributes)) element("workspace-title").focus();
  });
  element("fill").addEventListener("click", () => run(game.fillDefaults, "Default cards filled the empty blocks."));
  element("cards").addEventListener("click", (event) => {
    const button = event.target.closest("[data-card]");
    if (!button || game.getState().phase !== "planning") return;
    const { card } = button.dataset;
    selectedCardId = selectedCardId === card ? null : card;
    renderCards();
    renderSlots(game.getState());
    feedback(selectedCardId ? `Selected ${byId[card].name}. Choose a highlighted time block.` : "Card deselected.");
    element("cards").querySelector(`[data-card="${card}"]`).focus();
  });
  element("slots").addEventListener("click", (event) => {
    const button = event.target.closest("[data-slot]");
    if (!button || button.disabled) return;
    if (!selectedCardId) {
      feedback("Select an activity card first.", true);
      return;
    }
    const { slot } = button.dataset;
    if (run(() => game.setCard(slot, selectedCardId), `${byId[selectedCardId].name} set for ${slotById[slot].time}.`)) {
      element("slots").querySelector(`[data-slot="${slot}"]`).focus();
    }
  });
  element("start").addEventListener("click", () => {
    if (run(game.startDay)) {
      selectedCardId = null;
      element("resolve").focus();
    }
  });
  element("resolve").addEventListener("click", () => {
    if (run(game.resolveNext)) {
      const { results, phase } = game.getState();
      feedback(`${slotById[results.at(-1).slotId].time} resolved.`);
      if (phase === "dayComplete") element("advance").focus();
    }
  });
  element("advance").addEventListener("click", () => {
    if (run(game.advanceDay)) element("workspace-title").focus();
  });
  element("restart").addEventListener("click", () => {
    game = createGame();
    avatar.reset();
    selectedCardId = null;
    shownLog = 0;
    shownDayEnd = false;
    element("log").replaceChildren();
    element("workspace").querySelector("details").open = false;
    render();
    element("enrollment-title").focus();
  });

  render();
  element("startup-error").hidden = true;
})();

