# Hand-drawn Tunisiska Mega ads

Two screenshot-free, code-drawn paid-social ads in Swedish and Arabic. Each is 30 seconds, vertical 1080×1920 at 24 fps, with original synthesized music, localized captions and poster.

## Creative

A hand-drawn route connects Sweden and Tunisia, then turns into illustrated trips, parcel/container freight, moving, airport taxi, booking and tracking. The look uses warm sketchbook paper, wobbling sepia ink and watercolor-like navy/orange washes while retaining the app's recognizable palette and content. The supplied brand logo is the only bitmap visual.

## Files

- `11-hand-drawn-app-ad-sv.mp4` — Swedish master
- `11-hand-drawn-app-ad-ar.mp4` — Arabic master
- `sv.srt`, `ar.srt` — localized captions
- `poster-sv.jpg`, `poster-ar.jpg` — preview stills
- `index.html`, `mix.py`, `timeline.json`, `build.sh` — editable animation, original score and rebuild workflow
- `TREATMENT.md`, `CREDITS` — story, app/design analysis, asset and font notes

Run `./build.sh` with the Lemo-Opuscar library available at `/Users/haythem_dhahri/lemo-opuscar` (or set `LIB`). This project expects the Rubik assets in `assets/fonts/` and the system fonts Marker Felt and Geeza Pro for the localized handwritten titles.

The screenshots were analyzed only to understand the product. They are not included in the video project or rendered in either ad.
