#!/bin/sh
set -eu
HERE=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
LIB=${LIB:-/Users/haythem_dhahri/lemo-opuscar}
FPS=24; SIZE=1080x1920
cd "$LIB"
node core/render/events.mjs "$HERE" --size "$SIZE"
node core/render/video.mjs "$HERE" --fps "$FPS" --workers 3 --size "$SIZE" --q 'lang=sv' --out "$HERE/out/12-launch-speed-ad-sv-picture.mp4"
node core/render/video.mjs "$HERE" --fps "$FPS" --workers 3 --size "$SIZE" --q 'lang=ar' --out "$HERE/out/12-launch-speed-ad-ar-picture.mp4"
python3 "$HERE/mix.py"
sh core/render/mux.sh "$HERE/out/12-launch-speed-ad-sv-picture.mp4" "$HERE/out/mix.wav" "$HERE/out/sv-normalized.mp4" "$FPS" 0
ffmpeg -y -loglevel error -i "$HERE/out/sv-normalized.mp4" -map 0:v -map 0:a -c:v copy -af volume=-0.7dB -c:a aac -b:a 256k -movflags +faststart "$HERE/12-launch-speed-ad-sv.mp4"
sh core/render/mux.sh "$HERE/out/12-launch-speed-ad-ar-picture.mp4" "$HERE/out/mix.wav" "$HERE/out/ar-normalized.mp4" "$FPS" 0
ffmpeg -y -loglevel error -i "$HERE/out/ar-normalized.mp4" -map 0:v -map 0:a -c:v copy -af volume=-0.7dB -c:a aac -b:a 256k -movflags +faststart "$HERE/12-launch-speed-ad-ar.mp4"
node core/render/still.mjs "$HERE" 27.5 --q 'lang=sv' --out "$HERE/out/poster-sv" --size "$SIZE"
node core/render/still.mjs "$HERE" 27.5 --q 'lang=ar' --out "$HERE/out/poster-ar" --size "$SIZE"
cp "$HERE/out/poster-sv/t_27.5.jpg" "$HERE/poster-sv.jpg"
cp "$HERE/out/poster-ar/t_27.5.jpg" "$HERE/poster-ar.jpg"
