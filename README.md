# Untitled city game

A language-discovery game for phones. You arrive by train in a city where nobody speaks your language,
and you pick it up by watching and listening. No text in any real language appears anywhere: not in the
world, not in the interface.

Open `index.html` in a browser. There is no build step.

## Controls

Touch anywhere and drag to walk. Arrow keys or WASD also work on a computer.

The two round buttons in the corner open:

- the **log**: every phrase you have seen, each with a picture of the moment you saw it
- the **dictionary**: every word you have seen; pick one to see each phrase it appeared in,
  and pick a phrase to see the moment again

Nothing in the game tells you what a word means, and nothing checks your guesses.

## The language (spoilers)

The finished intro will use 10 words. Words so far:

| Glyph id | Meaning |
|---|---|
| hello | greeting |
| train | train |
| go | go / leave |
| ticket | ticket |
| not | not / no |

## Code

- `js/glyphs.js`: the logograms, and drawing them on canvas or as SVG
- `js/world.js`: the map and how everything in it is drawn
- `js/main.js`: the game loop, input, people, trains, speech
- `js/panels.js`: log, dictionary and moment viewer
- `tools/bundle.py`: builds one self-contained HTML file
