# Tunisiska Mega — Swiss Motion App Ad

Two 30-second, vertical app ads in Swedish and Arabic, built in code with the Swiss Motion Graphics skill and the real service screens supplied for Tunisiska Mega.

## Finished files

- `09-swiss-motion-app-ad-sv.mp4` — Swedish, 1080 × 1920, 24 fps.
- `09-swiss-motion-app-ad-ar.mp4` — Arabic, 1080 × 1920, 24 fps.
- `sv.srt` and `ar.srt` — separate localized captions.
- `poster-sv.jpg` and `poster-ar.jpg` — localized stills.

The route and live-status sections use original graphic modules and show no dates, notifications, or live trip values. The original synthesized score has a 120 BPM pulse and two short near-silences.

## Rebuild

Run `sh build.sh`. It uses the shared Lemo-Opuscar library at `/Users/haythem_dhahri/lemo-opuscar`; set `LIB` to another library location if needed. Rendering requires Node, Chromium, Python, and FFmpeg. The final audio is normalized near −14 LUFS with additional peak headroom.

`CREDITS` lists the font, the rendering style toolkit, and the user supplied brand and interface assets. The Rubik OFL text is included with the bundled font files.
