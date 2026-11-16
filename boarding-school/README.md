# Boarding School

[Play in your browser](https://padusrain.github.io/daguri-demo/boarding-school/) or clone the repository once and open `boarding-school/index.html`.

Choose hair and an outfit, roll your attributes, and select **Enroll**. Place activity cards into the seven time blocks or use **Fill Empty Blocks**. Start the day to resolve each block and see the result.

- `card-text.js` contains English card titles, descriptions, and log text.
- `cards.js` contains categories, allowed time slots, dice, and base effects.
- `events.js` contains chance rules and event rewards.
- `game.js` defines the day schedule and gameplay rules.
- `index.html`, `style.css`, and `ui.js` define the screens.
- `avatar.js` and `assets/avatar/` contain the character options and artwork.

Keep player-facing game text in English.

## Edit the English card text

Open [`card-text.js`](./card-text.js), click the pencil icon, and find the card ID, for example `C03`. Change only the English text inside the quotation marks:

- `name`: title on the card.
- `description`: text shown on the card, above the effects.
- `flavor`: the line shown in the Day Log after the card resolves.

For example, change `description: "Let your mind wander beyond the classroom.",` to `description: "Watch the clouds drift past the classroom window.",`.

Select **Commit changes** when done. For gameplay changes, use the card ID and specify the desired effect, its chance, and when it should happen. Numeric effect lines and unlock chances are generated from the rules files.
