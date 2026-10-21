# Pocket Groove

A small, tactile drum machine by Chidera Emmanuel. Four synthesised voices, sixteen steps, and a warm hardware-inspired interface. No libraries, network requests, samples, accounts, API keys, or build step.

## Run

Serve the `dist` folder with any static web server. For example, from this project folder:

```sh
python3 -m http.server 8000 --directory dist
```

Open http://localhost:8000. ES modules require HTTP serving; opening the HTML directly as a `file://` URL is not supported. Deploy `dist` to any static host if desired. The GitHub branch stores the source; no public website hosting is enabled by this project.

## Make a groove

- Press **Play groove** to enable Web Audio and start the loop. Press it again to stop. No sound starts before this gesture.
- Tap step pads to turn beats on or off. Edit while playback runs.
- Each row's speaker button mutes that voice. The pressed state means muted.
- Choose Soft start, Night bus, or Sunroom for a starting point. Loading a preset stops playback and resets track mutes.
- Set tempo from 60–160 BPM, swing from 0–40%, and volume from 0–100%. Swing delays alternate steps without changing the total length of a bar.
- **Mix it up** generates a playable starting pattern. **Clear pattern** stops playback and clears all steps.
- **Save loop** keeps one pattern, tempo, swing, and mute settings in this browser's local storage. Saving again replaces it. **Load saved loop** restores it. Volume is intentionally not saved. Storage may be unavailable in private/restricted browser sessions; errors are reported in the page.

## Keyboard and small screens

Tab reaches each control and the beat grid. Arrow keys move between steps and voices; Enter or Space toggles a focused pad. Space on the page background starts/stops playback. Buttons and sliders keep their normal native keyboard behaviour. The wide grid scrolls sideways on small screens, preserving usable pad sizes. The page respects reduced-motion settings and labels each pad with voice, step, and pressed state.

## Audio and limits

Kick uses a pitched oscillator, snare combines noise and a triangle oscillator, hats use filtered noise, and claps use a pulsed noise envelope. Audio is scheduled on the Web Audio clock ahead of time; the visual playhead follows that clock. Playback stops when the tab becomes hidden to avoid background timer throttling. Returning to the tab requires pressing Play again. No microphone or device permissions are requested. This is a loop sketchpad; it does not record audio or export WAV/MIDI.

## Validation

```sh
node --check dist/app.mjs
node --test core.test.mjs
```

The tests cover saved-loop round trips, malformed storage, tempo consistency under swing, generated-pattern validity, and row independence. Use a modern browser with Web Audio and ES module support. Speaker/headphone output depends on the device, browser, and system volume.
