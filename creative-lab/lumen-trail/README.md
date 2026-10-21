# Lumen Trail

A quiet light-routing puzzle by Chidera Emmanuel. Rotate the tiles, connect the left source to the right home, and work through six increasingly winding trails. No timer, paid API, libraries, external assets, account, or build step.

## Run

Serve `dist` with a static web server. From this project folder:

```sh
python3 -m http.server 8000 --directory dist
```

Open http://localhost:8000. The JavaScript uses ES modules, so opening `index.html` directly with `file://` is not supported. The `dist` folder is ready for any static host. Pushing this code to GitHub does not enable a live hosted website.

## Controls

- Tap or click a tile to rotate it 90 degrees clockwise. The source and home tiles stay fixed.
- Follow the glowing route. Light only enters tiles with a matching opening. Reach the home tile and its right exit to solve the level; unused tiles are allowed.
- **Undo** restores the previous board, turn count, and hint count.
- **A little hint** sets one incorrect tile on the intended route to its correct orientation. It counts as one turn and one hint. Repeated hints can complete every puzzle.
- **Restart this trail** restores its original layout and clears current turns and hints.
- Choose any of the six trails at any time. Changing a trail discards the current board. Solved trails gain a small completion mark.
- Completing a puzzle enables the next-trail button. The final trail's button returns to the first.

## Accessibility

All controls work with a keyboard. Tab enters the tile group; arrow keys move between tiles; Enter or Space rotates the focused tile. Every tile announces its row, column, openings, fixed status, and whether it is glowing. Fixed tiles use `aria-disabled`, retaining their focusability so their state can be read. Focus indicators are visible. Shapes and text supplement colour. Live status text announces actions and completion. Motion honours `prefers-reduced-motion`. The 5×5 grid scales to small screens without horizontal scrolling.

## Progress and limits

Completion marks and best turn counts for solves without hints are stored locally in this browser. Assisted completions are marked complete without creating a no-hint best score. Boards in progress are not saved. Storage errors are reported and play remains available. Progress does not sync between browsers or devices. There is no score server, audio, or network access after loading the static files. The intended paths are available in the source; this is a casual puzzle, not an anti-cheat system.

## Validation

```sh
node --check dist/app.mjs
node --test core.test.mjs
```

Tests cover all six trail geometries, reproducible unsolved starts, correct solutions, hints completing every level, mismatched connections, board-edge boundaries, false wins, rotation symmetry, undo snapshot isolation, and stored-progress validation.
