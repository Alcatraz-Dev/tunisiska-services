import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, ImageStyle, StyleProp, StyleSheet, View } from "react-native";
import { Image } from "expo-image";

import type { SceneImage } from "@/app/lib/tripImagery";

type CrossfadeHeroProps = {
  images: SceneImage[];
  /** ms each frame stays fully visible before fading to the next. */
  intervalMs?: number;
  /** fade duration in ms. */
  fadeMs?: number;
  style?: StyleProp<ImageStyle>;
};

/**
 * Slow hero rotation with a true crossfade.
 *
 * The outgoing frame stays mounted underneath while the incoming frame fades
 * in on top, so there is never a flash between slides. A solid base layer
 * covers the vector fallback once photos mount, and all frames are prefetched
 * up front to avoid pop-in on first cycle. The `images` identity is reduced
 * to a URI key so parent re-renders with a fresh array don't restart the
 * rotation mid-fade.
 */
export default function CrossfadeHero({
  images,
  intervalMs = 9000,
  fadeMs = 2000,
  style,
}: CrossfadeHeroProps) {
  const key = useMemo(() => images.map((frame) => frame.uri).join("|"), [images]);
  const count = images.length;
  const [current, setCurrent] = useState(0);
  const [previous, setPrevious] = useState<number | null>(null);
  const opacity = useRef(new Animated.Value(1)).current;
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Preload every frame so cycling never flashes.
  useEffect(() => {
    images.forEach((frame) => {
      Image.prefetch(frame.uri).catch(() => undefined);
    });
  }, [images]);

  // Reset only when the actual set changes (e.g. navigating between trips).
  useEffect(() => {
    setCurrent(0);
    setPrevious(null);
    opacity.setValue(1);
  }, [key, opacity]);

  useEffect(() => {
    if (count < 2) return;
    timer.current = setInterval(() => {
      const next = (current + 1) % count;
      setPrevious(current);
      setCurrent(next);
      opacity.setValue(0);
      Animated.timing(opacity, {
        toValue: 1,
        duration: fadeMs,
        useNativeDriver: true,
      }).start(() => setPrevious((old) => (old === current ? null : old)));
    }, intervalMs);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [count, current, fadeMs, intervalMs, opacity]);

  if (count === 0) return null;

  const active = images[current % count];
  const below = previous !== null ? images[previous % count] : null;

  return (
    <>
      {/* Opaque base: once photos mount the vector fallback never peeks through. */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: "#0B1B33" }]} />
      {below ? (
        <Image
          source={{ uri: below.uri }}
          style={[StyleSheet.absoluteFill, style]}
          contentFit="cover"
          cachePolicy="memory-disk"
          alt={below.description}
        />
      ) : null}
      <Animated.View style={[StyleSheet.absoluteFill, { opacity }]}>
        <Image
          key={active.uri}
          source={{ uri: active.uri }}
          style={[StyleSheet.absoluteFill, style]}
          contentFit="cover"
          cachePolicy="memory-disk"
          alt={active.description}
        />
      </Animated.View>
    </>
  );
}
