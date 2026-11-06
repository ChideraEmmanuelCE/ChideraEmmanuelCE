# SKYBOUND — Open World Flight Simulator

**Skybound** is a self-contained, responsive Three.js flight simulator with ten selectable aircraft, three 3D airports, free-flight physics, walk-around/boarding, cockpit and chase cameras, Web Audio engine synthesis, weather that tracks the calendar, and a mobile-first flight stick.

## Features

- **Ten flyable aircraft:** Cessna 172, Piper Super Cub, Cirrus SR22, Beechcraft Baron G58, King Air 350i, Pilatus PC-12 NGX, ATR 72-600, Airbus A320neo, Boeing 787 Dreamliner, F-16 Fighting Falcon. Aircraft are stylized custom procedural 3D geometry, not licensed manufacturer's exact models.
- **Three free-roam regions:** Verdant Bay, Alpine Frontier, Red Rock Desert. Each includes three runway-equipped airports, apron/terminal, tower, ground vehicles, mountains, vegetation, parked aircraft, and nav map. Switching region respawns the player.
- **Flight model:** throttle, lift threshold, stalls, pitch, bank, rudder, airspeed, altitude, vertical speed, hard-landing detection, gear-related crashes and smooth landings.
- **On-foot exploration:** after stopping, press `F` to leave the aircraft. Walk to a parked aircraft, then press `F` or click **Board Aircraft** to fly it.
- **Calendar-driven weather:** November autumn palette, December snow and terminal lights, January frost, spring/summer. Override from World & Weather.
- **Minimal touch UI:** virtual stick, throttle slider and brake; responsive flight readouts, keyboard and Gamepad API support.
- **Four cameras:** chase, cockpit, wing and control tower.
- **Audio:** procedural engine sounds (propeller/turboprop/jet), audio gate to respect browser autoplay policies. No paid or third-party audio files.
- **Local preferences:** persist selected aircraft, region and season override.

## Run locally

This is a static ES-module website. No npm, build step, paid APIs or external assets are required except Three.js from the pinned jsDelivr CDN and optional Google Fonts. Serve it using any HTTP server:

```bash
python3 -m http.server 4173
# Open http://localhost:4173
```

Or deploy the repository to Vercel with **Framework Preset: Other** and **Output Directory: .**.

## Desktop controls

| Command | Key |
|---|---|
| Pitch up/down | W / S, ↑ / ↓ |
| Bank left/right | A / D, ← / → |
| Rudder | Q / E |
| Increase / decrease throttle | Shift / Ctrl |
| Ground brake | Space |
| Change camera | C / V |
| Landing gear | G |
| Exit or board (when stopped) | F |
| Change world / season | M |
| Reset at airfield | R |
| Flight menu | Esc |

Gamepad left stick is mapped to pitch/bank and triggers to throttle.

## Design/technical notes

The flight physics are intended for accessible browser gameplay; this is not a certified aeronautical training simulator. Aircraft models are original **procedural approximations** of aircraft categories and have independently tuned parameters. No external GLTF licensing is required.

WebGL 2 is required. Renderer pixel density, terrain density and forest geometry scale for mobile devices. Airport geometry is procedural and shared to minimize overhead; aircraft engine audio is synthesized through the Web Audio API. The site needs internet access to load the pinned `three@0.180.0` CDN library.

## Structure

- `index.html` — app layout, all overlays and controls
- `styles.css` — responsive cinematic UI
- `src/main.js` — input binding, state, scene loop and camera
- `src/flight.js` — testable flight model, aircraft catalog, airport/map configurations, seasonal palette
- `src/aircraft.js` — parametric 3D aircraft + on-foot character
- `src/world.js` — airports, landscape, terminal buildings, vegetation, mountains, clouds and snow
- `src/audio.js` — synthesized 3D flight ambiance/engines

## Testing

```bash
node --test tests/flight.test.mjs
node --check src/main.js
```

## Roadmap

Replace procedural airport/aircraft meshes with licensed, optimized GLTF/PBR models; add taxiing AI and ATC; add aerodynamic surfaces, real METAR, controller remapping and persistent career progression.
