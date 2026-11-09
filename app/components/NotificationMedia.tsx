import React, { useState } from "react";
import { Image, Modal, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AppIcon from "@/app/components/ui/AppIcon";
import PressableScale from "@/app/components/ui/PressableScale";
import VideoPlayer from "@/app/components/VideoPlayer";
import { useThemeColors } from "@/app/theme";
import { radii, spacing } from "@/app/theme/spacing";

/**
 * Thumbnail for media attached to a notification.
 *
 * Used by the admin sent list and the customer inbox so both show the same
 * thing: an image, or a play tile when the attachment is a video. Tapping opens
 * the full picture or plays the video over a scrim.
 */
export default function NotificationMedia({
  imageUrl,
  videoUrl,
  size = 64,
}: {
  imageUrl?: string;
  videoUrl?: string;
  size?: number;
}) {
  const theme = useThemeColors();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);

  if (!imageUrl && !videoUrl) return null;

  const isVideo = Boolean(videoUrl);
  const label = isVideo ? "Play attached video" : "Open attached image";

  return (
    <>
      <PressableScale
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={label}
        haptic="light"
        style={{
          width: size,
          height: size,
          borderRadius: radii.md,
          overflow: "hidden",
          backgroundColor: theme.surfaceSunken ?? theme.surfaceAlt,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 1,
          borderColor: theme.borderSubtle,
        }}
      >
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
        ) : null}

        {isVideo ? (
          <View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: imageUrl ? "rgba(6,16,31,0.45)" : "transparent",
            }}
          >
            <AppIcon name="play-circle" size={size > 48 ? 26 : 20} color="#FFFFFF" />
          </View>
        ) : null}
      </PressableScale>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(6,16,31,0.92)",
            paddingTop: insets.top + spacing.lg,
            paddingBottom: insets.bottom + spacing.lg,
            paddingHorizontal: spacing.md,
          }}
        >
          <PressableScale
            onPress={() => setOpen(false)}
            accessibilityRole="button"
            accessibilityLabel="Close media"
            haptic="light"
            style={{
              alignSelf: "flex-end",
              width: 40,
              height: 40,
              borderRadius: 20,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "rgba(255,255,255,0.14)",
              marginBottom: spacing.md,
            }}
          >
            <AppIcon name="close" size={20} color="#FFFFFF" />
          </PressableScale>

          <View style={{ flex: 1, justifyContent: "center" }}>
            {isVideo && videoUrl ? (
              <VideoPlayer uri={videoUrl} muted={false} />
            ) : (
              <Image
                source={{ uri: imageUrl }}
                style={{ width: "100%", height: "100%" }}
                resizeMode="contain"
                accessibilityIgnoresInvertColors
              />
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}
