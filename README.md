# 🔥 (Big Fire)

A small language-discovery puzzle game for phones, in the spirit of *Chants of Sennaar*.
Everything in the game, including menus, is written in an invented glyph language.
There is no text in any real language; you learn by watching what people say and do.

Open `index.html` in a browser (no build step, no dependencies). It works from a static host
such as GitHub Pages, or straight from the file system.

## How to play

- Tap people to hear them speak. Tap signs to read them up close.
- Tap an item in your bag, then tap a person (or thing) to give it to them.
- Some people ask you a question. Build an answer from the glyphs you have seen and press the speech bubble.
- The book (top right) is your journal. When you have seen enough glyphs, a page of pictures appears.
  Put a glyph under each picture. When the whole page is right, it locks in gold, and those meanings
  show up under the glyphs everywhere in the game. Glyphs you have placed but not confirmed show up faded,
  as your own notes.

The goal is to relight the great fire at the top of the tower.

## The language (spoilers)

26 words, one glyph each. Verbs share a line underneath. Colours share a hook on top. Numbers share a bar on top.

| Glyph id | Meaning | Glyph id | Meaning |
|---|---|---|---|
| hello | greeting | flower | flower |
| me | I / me | red, blue, yellow | colours |
| you | you | fire | fire |
| want | want | big | big |
| give | give | what | question marker |
| go | go | not | not / no |
| open | open | one, two | numbers |
| fish | fish | door | door |
| food | bread / food | key | key |
| water | water | yes | yes |
| tree | tree / forest | good | good / thanks |
| house | house / village | | |

Grammar:

- Subject, verb, object: `me want fish`.
- Adjectives and numbers come after the noun: `flower yellow`, `food two`, `fire big` (the tower beacon).
- `not` goes before the word it negates: `you not go`, `not fire big`.
- `what` at the end makes a question: `you want fish what`.

## Walkthrough (spoilers)

1. Shore: the fisher offers a fish. Answer *yes*.
2. Village: the baker wants fish and gives bread. The tower guard wants **two** bread, so fetch a second fish.
3. Take water from the well to the gardener in the forest. The flowers bloom.
4. The crying child wants the **yellow** flower and gives you a key.
5. Feed the guard two bread. When asked what you want, say something with *go* (e.g. `me go`).
6. Hall: the sign says the red and yellow doors are *not good*. Take the blue door.
7. Unlock the stairs door with the key. The keeper at the top says `me want fire`.
8. Go back to the old woman by the campfire and ask for fire (e.g. `me want fire`). Bring it to the keeper.

## Code

- `js/data.js`: glyph shapes, journal pictures, pages, items
- `js/art.js`: SVG scenery and icons
- `js/game.js`: engine, scenes, character scripts, journal, composer
- `style.css`: layout, sized for portrait phones
