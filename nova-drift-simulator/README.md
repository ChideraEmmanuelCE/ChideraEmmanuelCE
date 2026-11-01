# NOVA DRIFT — Flight Playground

A cinematic, playable 3D flight simulator built with **Three.js** and vanilla JavaScript, designed for desktop and mobile. No 3D assets, paid services, login, or build process required.

## Live demo
https://nova-drift-cyberflight.vercel.app

## Features
- **Three selectable geometric aircraft:** NOVA X (balanced), STRIX GT (fast), AURORA M (wide-wing glider). Each has different visual geometry, color, speed, and steering feel.
- **Three steering modes:** tap the left/right half of the flight screen; optional on-screen left/right buttons; or tilt the phone (with native motion permission on supported browsers).
- **Long boost:** double tap anywhere on the canvas or steering buttons to activate an 8-second speed boost, followed by an 8-second cooldown.
- **Relaxed course:** four spaced-apart obstacles with a generous safe opening, more collectible energy cores, replenishing shield.
- **Cinematic visuals:** low-poly flight craft, exhaust effects, parallax clouds, moon halo, 3D towers, runway arches, dynamic camera FOV, warp speed streaks, subtle camera motion and atmospheric fog.
- **Three camera views:** chase, cinematic and cockpit.
- **Audio:** generated engine hum, collectible tones, boost and impact sounds, with mute switch. Uses Web Audio only; there are no external sound files.
- Compact responsive HUD with speed, distance, cores, shield, boost recharge; pause/restart; personal best stored locally.

## Controls

| Action | Desktop | Mobile |
|---|---|---|
| Steer | A / D or Left / Right arrows | Tap and hold left/right screen half (default) |
| Alternative steer | — | Two arrow buttons or motion tilt in Settings |
| Boost | Space | Double tap anywhere on the playfield or an arrow button |
| Camera | C or top camera icon | Camera icon |
| Sound | M or top sound icon | Sound icon |
| Pause | P / Escape | Pause icon |
| Change plane | Aircraft icon | Aircraft icon |

**Tilt:** On iOS, grant motion permission after tapping "TILT PHONE" in flight settings. Motion sensors need HTTPS, browser support, and an explicit user gesture. If your device/browser doesn't expose motion data, use tap or button steering.

## Running locally

Start a static web server in this directory:

```bash
python3 -m http.server 8080
```

Open http://localhost:8080. Three.js v0.170.0 loads as an ES module from jsDelivr. Use internet access; the simulator does not need npm dependencies.

## Deployment
Source files live in the `nova-drift-simulator/` folder of the GitHub profile repository. Vercel deployment is published as `nova-drift-cyberflight`.

## License
MIT. © 2026 Chidera Emmanuel Okpala. Three.js is MIT licensed.
