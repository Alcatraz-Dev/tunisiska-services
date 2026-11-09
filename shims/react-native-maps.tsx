/**
 * Web shim for `react-native-maps`.
 *
 * react-native-maps has no web implementation: it imports React Native
 * internals (`codegenNativeCommands`) that Metro refuses to bundle for the web
 * platform. Because Expo Router bundles every file under `app/`, one import of
 * the native map module in `app/(home)/map/overview.tsx` failed the entire web
 * build — `npm run web` could not start at all.
 *
 * Native builds (iOS / Android) still resolve the real package. This shim is
 * resolved only when `platform === "web"`; see the resolver in `metro.config.js`.
 */
import React from "react";
import { StyleSheet, Text, View } from "react-native";

export const PROVIDER_GOOGLE = "google";

type LooseProps = {
  children?: React.ReactNode;
  style?: any;
  [key: string]: any;
};

/** Marker, Callout and Polyline have no meaning in the browser. */
export const Marker = (_props: LooseProps) => null;
export const Callout = (_props: LooseProps) => null;
export const Polyline = (_props: LooseProps) => null;

const MapView = React.forwardRef<any, LooseProps>(({ children, style }, ref) => {
  React.useImperativeHandle(ref, () => ({
    fitToCoordinates: () => {},
    animateToRegion: () => {},
    animateCamera: () => {},
  }));

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.label}>Route map is available in the iOS and Android apps</Text>
      {children}
    </View>
  );
});

MapView.displayName = "MapView";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F2F5FA",
    padding: 24,
  },
  label: {
    fontSize: 13,
    color: "#55627A",
    textAlign: "center",
  },
});

export default MapView;
