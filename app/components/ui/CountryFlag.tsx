import React from "react";
import { View } from "react-native";
import { SvgXml } from "react-native-svg";
import type { CountryCode } from "@/app/lib/routes";

/**
 * Flags are drawn as vectors, never emoji: emoji flags are missing on Android
 * and Windows and render at inconsistent sizes everywhere else.
 *
 * Each flag declares its real proportions in its own viewBox and the artwork is
 * cropped to the component's rounded rectangle with `xMidYMid slice`, so the
 * cross and the crescent keep their shape at every size instead of stretching.
 */

const SWEDEN_BLUE = "#005293";
const SWEDEN_YELLOW = "#FECB00";
const TUNISIA_RED = "#E70013";

/* 16:10 — blue fields 5/2/9 across, 4/2/4 down. */
const SWEDEN = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 10" preserveAspectRatio="xMidYMid slice">
  <rect width="16" height="10" fill="${SWEDEN_BLUE}"/>
  <rect x="5" y="0" width="2" height="10" fill="${SWEDEN_YELLOW}"/>
  <rect x="0" y="4" width="16" height="2" fill="${SWEDEN_YELLOW}"/>
</svg>`;

/* 3:2 — white disc, red crescent opening to the fly, red five-pointed star. */
const TUNISIA_STAR =
  "M62 33.5 L63.53 37.9 L68.18 37.99 L64.47 40.8 L65.82 45.26 L62 42.6 " +
  "L58.18 45.26 L59.53 40.8 L55.82 37.99 L60.47 37.9 Z";

const TUNISIA = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 80" preserveAspectRatio="xMidYMid slice">
  <rect width="120" height="80" fill="${TUNISIA_RED}"/>
  <circle cx="60" cy="40" r="20" fill="#FFFFFF"/>
  <circle cx="60" cy="40" r="15" fill="${TUNISIA_RED}"/>
  <circle cx="63.6" cy="40" r="13.2" fill="#FFFFFF"/>
  <path d="${TUNISIA_STAR}" fill="${TUNISIA_RED}"/>
</svg>`;

const FLAGS: Record<CountryCode, string> = { SE: SWEDEN, TN: TUNISIA };

type CountryFlagProps = {
  country: CountryCode;
  size?: number;
  radius?: number;
  style?: any;
};

export default function CountryFlag({ country, size = 36, radius = 8, style }: CountryFlagProps) {
  const width = size;
  const height = (size / 16) * 10;

  return (
    <View
      style={[
        {
          width,
          height,
          borderRadius: radius,
          overflow: "hidden",
          backgroundColor: "#FFFFFF",
        },
        style,
      ]}
    >
      <SvgXml
        xml={FLAGS[country] ?? SWEDEN}
        width={width}
        height={height}
        preserveAspectRatio="xMidYMid slice"
      />
    </View>
  );
}
