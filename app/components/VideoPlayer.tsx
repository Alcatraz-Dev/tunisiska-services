import React from "react";
import { View } from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";

interface VideoPlayerProps {
  uri: string;
  loop?: boolean;
  muted?: boolean;
  aspectRatio?: number;
}

export default function VideoPlayer({
  uri,
  loop = true,
  muted = true,
  aspectRatio = 16 / 9,
}: VideoPlayerProps) {
  const player = useVideoPlayer({ uri }, (p) => {
    p.loop = loop;
    p.muted = muted;
    p.play();
  });

  return (
    <View
      style={{
        aspectRatio,
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      <VideoView
        style={{ width: "100%", height: "100%" }}
        player={player}
        surfaceType="textureView"
      />
    </View>
  );
}