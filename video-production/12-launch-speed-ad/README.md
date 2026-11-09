# Tunisiska Mega — Launch-speed motion ads

A new, faster 30-second Swedish and Arabic paid-ad pair using the launch-film and frame-accurate JavaScript animation workflows from iart-ai's motion-skills project. The style replaces the previous slow card/sketchbook compositions with an immediate route hook, 9-second brand reveal, bold benefit montage and clean CTA.

## Masters

- `12-launch-speed-ad-sv.mp4` — Swedish, H.264/AAC, vertical 1080×1920, 24 fps
- `12-launch-speed-ad-ar.mp4` — Arabic, H.264/AAC, vertical 1080×1920, 24 fps
- `sv.srt`, `ar.srt` — localized captions
- `poster-sv.jpg`, `poster-ar.jpg` — end-card preview posters

The orange route connects travel, parcel/container freight, moving and cleaning, airport taxi, booking and tracking motifs. Navy, orange, cream, and the app's Rubik typography carry the visual identity. All scenes are drawn in code; the supplied logo is the only image asset. No app screenshots or screen recordings are used.

## Editable source

- `index.html` — deterministic Canvas animation with localized copy and scene cues
- `timeline.json` — 120 BPM beat grid, scene times and reveal/cut cues
- `mix.py` — original synthesized score with the brand reveal landing on the 9.000-second drop
- `build.sh` — full Swedish/Arabic render and encode
- `TREATMENT.md`, `CREDITS` — concept, storyboard, asset and method notes

Run `./build.sh` with the Lemo-Opuscar renderer available at `/Users/haythem_dhahri/lemo-opuscar` (or set `LIB`). The motion-skills references are linked in `CREDITS`; their demo art and code are not included.
