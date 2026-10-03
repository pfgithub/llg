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

25 words, one glyph each. Verbs share a line underneath. Colours share a hook on top. Numbers share a bar on top.

| Glyph id | Meaning | Glyph id | Meaning |
|---|---|---|---|
| hello | greeting | flower | flower |
| me | I / me | red, blue, yellow | colours |
| you | you | fire | fire |
| want | want | big | big |
| give | give | what | question marker |
| go | go | not | not / no |
| fish | fish | one, two | numbers |
| food | bread / food | door | door |
| water | water / the sea | key | key |
| tree | tree / forest | yes | yes |
| house | house / village | good | good / thanks |

Grammar:

- Subject, verb, object: `me want fish`.
- Adjectives and numbers come after the noun: `flower yellow`, `food two`, `fire big` (the tower beacon).
- `not` goes before the word it negates: `you not go`, `not fire big`.
- `what` at the end makes a question: `you want what`.

## Pacing

The story is a chain, and each step brings in only a few new glyphs:

| Step | New glyphs |
|---|---|
| Fisher on the shore | hello, fish, yes, not |
| Baker | me, want, good, food (signs: house, water, tree, fire, big) |
| Tower guard | you, go, one, two, what |
| Hall of doors | door, red, yellow |
| Keeper | give, key |
| Forest | flower, blue |

## Walkthrough (spoilers)

1. Shore: answer the fisher's greeting, then say *yes* to the fish.
2. Village: give the fish to the baker for bread. The old woman is asleep and the forest gate is locked.
3. Tower gate: the guard wants **two** bread, so fetch a second fish. When asked what you want, say something with *go* (e.g. `me go`).
4. Hall: the sign says the red and yellow doors are *not good*. Take the blue door.
5. The keeper at the top says `not fire big`, `me want fire`, and gives you a key.
6. The old woman is awake now. Ask her for fire (e.g. `me want fire`). She wants a yellow flower.
7. Unlock the forest gate. The gardener wants water from the well; then the flowers bloom.
8. Give the yellow flower to the old woman, take her fire to the keeper.

## Code

- `js/data.js`: glyph shapes, journal pictures, pages, items
- `js/art.js`: SVG scenery and icons
- `js/game.js`: engine, scenes, character scripts, journal, composer
- `style.css`: layout, sized for portrait phones
- `tools/bundle.py`: builds a single self-contained HTML file
