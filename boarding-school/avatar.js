(() => {
  "use strict";

  const hairs = [
    { id: "swept", label: "Honey-Blond Sweep" },
    { id: "bob", label: "Chestnut Bob" },
    { id: "twins", label: "Low Pigtails" },
    { id: "curls", label: "Brown Curls" },
    { id: "", label: "No Hair" },
  ];
  const outfits = [
    { id: "jacket", label: "Blue Uniform" },
    { id: "tracksuit", label: "Tracksuit" },
    { id: "sweater", label: "Knit Sweater" },
    { id: "summer", label: "Summer Uniform" },
    { id: "", label: "No Outfit" },
  ];
  const defaults = { hair: hairs[0], outfit: outfits[0] };
  const bare = { hair: hairs.at(-1), outfit: outfits.at(-1) };
  const element = (id) => document.getElementById(id);

  function layer(filename) {
    const image = document.createElement("img");
    image.src = window.SchoolAvatarAssets?.[filename] ?? `assets/avatar/${filename}.png`;
    image.alt = "";
    image.width = 64;
    image.height = 64;
    image.draggable = false;
    return image;
  }

  function draw(sprite, { hair, outfit }) {
    const layers = [layer("base")];
    if (outfit.id) layers.push(layer(`outfit-${outfit.id}`));
    if (hair.id) layers.push(layer(`hair-${hair.id}`));
    sprite.replaceChildren(...layers);
    sprite.dataset.hair = hair.id;
    sprite.dataset.outfit = outfit.id;
  }

  function mount() {
    const preview = element("avatar-preview");
    const dayAvatar = element("workspace-avatar");
    const caption = element("avatar-caption");
    const buttons = [];
    let look = { ...defaults };

    function render() {
      const description = `${look.hair.label} · ${look.outfit.label}`;
      caption.textContent = description;
      preview.setAttribute("aria-label", `Avatar preview, ${description}`);
      dayAvatar.setAttribute("aria-label", `Your avatar, ${description}`);
      draw(preview, look);
      draw(dayAvatar, look);
      for (const { button, kind, part } of buttons) {
        button.setAttribute("aria-pressed", String(look[kind] === part));
      }
    }

    function addOptions(kind, parts) {
      const group = element(`avatar-${kind}-options`);
      for (const part of parts) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "avatar-option";
        button.dataset.part = part.id || "none";
        const crop = document.createElement("span");
        crop.className = `avatar-option-crop avatar-option-${kind}`;
        crop.setAttribute("aria-hidden", "true");
        const sprite = document.createElement("span");
        sprite.className = "avatar-sprite avatar-thumbnail";
        draw(sprite, { ...bare, [kind]: part });
        crop.append(sprite);
        const label = document.createElement("span");
        label.textContent = part.label;
        button.append(crop, label);
        button.addEventListener("click", () => {
          if (look[kind] === part) return;
          look[kind] = part;
          render();
        });
        buttons.push({ button, kind, part });
        group.append(button);
      }
    }

    addOptions("hair", hairs);
    addOptions("outfit", outfits);
    element("avatar-base").addEventListener("click", () => {
      look = { ...bare };
      render();
    });
    render();

    return {
      reset() {
        look = { ...defaults };
        render();
      },
    };
  }

  window.SchoolAvatar = { mount };
})();

