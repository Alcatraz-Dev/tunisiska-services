#!/bin/sh
set -eu
HERE=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
LIB=${LIB:-/Users/haythem_dhahri/lemo-opuscar}
cd "$LIB"
SIZE=1080x1920
FPS=24
node core/render/events.mjs "$HERE" --size "$SIZE"
node core/render/video.mjs "$HERE" --fps "$FPS" --workers 3 --size "$SIZE" --q 'lang=sv' --out "$HERE/out/09-swiss-motion-app-ad-sv-picture.mp4"
node core/render/video.mjs "$HERE" --fps "$FPS" --workers 3 --size "$SIZE" --q 'lang=ar' --out "$HERE/out/09-swiss-motion-app-ad-ar-picture.mp4"
python3 "$HERE/mix.py"
sh core/render/mux.sh "$HERE/out/09-swiss-motion-app-ad-sv-picture.mp4" "$HERE/out/mix.wav" "$HERE/out/sv-normalized.mp4" "$FPS" 0
ffmpeg -y -loglevel error -i "$HERE/out/sv-normalized.mp4" -map 0:v -map 0:a -c:v copy -af volume=-0.5dB -c:a aac -b:a 256k -movflags +faststart "$HERE/09-swiss-motion-app-ad-sv.mp4"
sh core/render/mux.sh "$HERE/out/09-swiss-motion-app-ad-ar-picture.mp4" "$HERE/out/mix.wav" "$HERE/out/ar-normalized.mp4" "$FPS" 0
ffmpeg -y -loglevel error -i "$HERE/out/ar-normalized.mp4" -map 0:v -map 0:a -c:v copy -af volume=-0.5dB -c:a aac -b:a 256k -movflags +faststart "$HERE/09-swiss-motion-app-ad-ar.mp4"
