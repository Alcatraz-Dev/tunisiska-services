import React from "react";
import { View } from "react-native";
import Svg, {
  Circle,
  Defs,
  G,
  LinearGradient,
  Path,
  Rect,
  Stop,
} from "react-native-svg";

import { navy, orange } from "@/app/theme/colors";

type TransportArtProps = {
  /** Which vehicle silhouette to draw. */
  vehicle?:
    | "truck"
    | "cargo_van"
    | "container_ship"
    | "air_freight"
    | "route"
    | "hero";
  width?: number;
  height?: number;
  /** Stretch the artwork to fill its container instead of using a fixed size. */
  fill?: boolean;
  /** Accent colour for the highlight details. */
  accent?: string;
  style?: any;
};

/**
 * Branded transport artwork.
 *
 * The company has no approved transport photography in the project or in the
 * Sanity asset library, so the app cannot ship photographs that would not
 * represent real company operations. Instead the visual layer falls back to
 * first-party vector artwork drawn in the brand palette — deliberately
 * illustrated rather than pretending to be a photo.
 *
 * When an administrator attaches a real transport image to a schedule
 * (the `image` field on `shippingSchedule`), that image is used instead.
 */
export default function TransportArt({
  vehicle = "truck",
  width = 320,
  height = 200,
  fill = false,
  accent = orange[400],
  style,
}: TransportArtProps) {
  const vb = "0 0 320 200";

  return (
    <View style={style}>
      <Svg
        width={fill ? "100%" : width}
        height={fill ? "100%" : height}
        viewBox={vb}
        preserveAspectRatio="xMidYMid slice"
      >
        <Defs>
          <LinearGradient id="sky" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={navy[700]} />
            <Stop offset="0.55" stopColor={navy[800]} />
            <Stop offset="1" stopColor={navy[900]} />
          </LinearGradient>
          <LinearGradient id="beam" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={accent} stopOpacity="0" />
            <Stop offset="0.5" stopColor={accent} stopOpacity="0.35" />
            <Stop offset="1" stopColor={accent} stopOpacity="0" />
          </LinearGradient>
        </Defs>

        {/* Sky / horizon wash */}
        <Rect x="0" y="0" width="320" height="200" fill="url(#sky)" />

        {/* Distant sun disc */}
        <Circle cx="248" cy="46" r="30" fill={accent} opacity={0.16} />
        <Circle cx="248" cy="46" r="18" fill={accent} opacity={0.22} />

        {/* Road */}
        <Rect x="0" y="152" width="320" height="48" fill={navy[900]} opacity={0.85} />
        <Path
          d="M0 156 H320"
          stroke={accent}
          strokeWidth="1.5"
          opacity={0.35}
          strokeDasharray="10 12"
        />

        {/* Light beam across the horizon */}
        <Rect x="0" y="150" width="320" height="3" fill="url(#beam)" />

        {vehicle === "truck" ? <TruckArt accent={accent} /> : null}
        {vehicle === "cargo_van" ? <VanArt accent={accent} /> : null}
        {vehicle === "container_ship" ? <ShipArt accent={accent} /> : null}
        {vehicle === "air_freight" ? <PlaneArt accent={accent} /> : null}
        {vehicle === "route" ? <RouteArt accent={accent} /> : null}
        {vehicle === "hero" ? (
          <G>
            <G transform="translate(28 18) scale(0.62)">
              <PlaneArt accent={accent} />
            </G>
            <G transform="translate(0 6)">
              <TruckArt accent={accent} />
            </G>
          </G>
        ) : null}
      </Svg>
    </View>
  );
}

function TruckArt({ accent }: { accent: string }) {
  return (
    <G>
      {/* Trailer */}
      <Rect x="26" y="78" width="150" height="72" rx="6" fill="#FFFFFF" opacity={0.95} />
      <Rect x="26" y="78" width="150" height="16" rx="6" fill={navy[600]} opacity={0.12} />
      {/* Cab */}
      <Path d="M176 104 h26 l24 26 v20 h-50 z" fill={navy[500]} />
      <Path d="M204 108 h-2 l20 22 h-18 z" fill="#DCE8F8" opacity={0.9} />
      <Rect x="176" y="104" width="50" height="46" rx="5" fill={navy[500]} />
      <Path d="M202 110 h4 l20 20 h-24 z" fill="#DCE8F8" opacity={0.92} />
      {/* Accent stripe */}
      <Rect x="26" y="136" width="150" height="6" fill={accent} opacity={0.85} />
      <Rect x="176" y="136" width="50" height="6" fill={accent} opacity={0.85} />
      {/* Wheels */}
      <Circle cx="66" cy="152" r="15" fill={navy[900]} />
      <Circle cx="66" cy="152" r="6" fill="#E8EEF7" opacity={0.9} />
      <Circle cx="112" cy="152" r="15" fill={navy[900]} />
      <Circle cx="112" cy="152" r="6" fill="#E8EEF7" opacity={0.9} />
      <Circle cx="204" cy="152" r="15" fill={navy[900]} />
      <Circle cx="204" cy="152" r="6" fill="#E8EEF7" opacity={0.9} />
      {/* Headlight */}
      <Rect x="222" y="134" width="8" height="6" rx="3" fill={accent} />
    </G>
  );
}

function VanArt({ accent }: { accent: string }) {
  return (
    <G>
      <Path
        d="M62 74 h140 a10 10 0 0 1 10 10 v58 h-160 v-58 a10 10 0 0 1 10 -10 z"
        fill="#FFFFFF"
        opacity={0.95}
      />
      <Path d="M212 92 h26 l22 24 v26 h-48 z" fill={navy[500]} />
      <Path d="M236 96 h2 l18 20 h-20 z" fill="#DCE8F8" opacity={0.9} />
      <Rect x="62" y="130" width="198" height="6" fill={accent} opacity={0.85} />
      <Circle cx="108" cy="150" r="15" fill={navy[900]} />
      <Circle cx="108" cy="150" r="6" fill="#E8EEF7" opacity={0.9} />
      <Circle cx="218" cy="150" r="15" fill={navy[900]} />
      <Circle cx="218" cy="150" r="6" fill="#E8EEF7" opacity={0.9} />
    </G>
  );
}

function ShipArt({ accent }: { accent: string }) {
  return (
    <G>
      {/* Hull */}
      <Path d="M44 128 h232 l-24 32 H70 z" fill="#FFFFFF" opacity={0.95} />
      <Rect x="44" y="120" width="232" height="10" rx="4" fill={accent} opacity={0.85} />
      {/* Containers */}
      <Rect x="88" y="88" width="52" height="32" rx="3" fill={navy[500]} />
      <Rect x="144" y="88" width="52" height="32" rx="3" fill={navy[400]} />
      <Rect x="200" y="88" width="52" height="32" rx="3" fill={navy[600]} />
      <Rect x="116" y="56" width="52" height="32" rx="3" fill={navy[400]} opacity={0.9} />
      <Rect x="172" y="56" width="52" height="32" rx="3" fill={navy[500]} opacity={0.9} />
      {/* Bridge */}
      <Rect x="52" y="92" width="32" height="28" rx="3" fill={navy[600]} />
      {/* Water */}
      <Path
        d="M0 162 q20 -8 40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 V200 H0 Z"
        fill={navy[500]}
        opacity={0.35}
      />
      <Path
        d="M0 176 q20 -8 40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 V200 H0 Z"
        fill={accent}
        opacity={0.16}
      />
    </G>
  );
}

function PlaneArt({ accent }: { accent: string }) {
  return (
    <G>
      <Path
        d="M40 108 l236 -56 l14 8 l-232 62 z"
        fill="#FFFFFF"
        opacity={0.95}
      />
      <Path d="M140 96 l34 34 l-16 4 l-30 -30 z" fill={navy[500]} />
      <Path d="M188 72 l-8 -30 l14 -4 l18 30 z" fill={navy[400]} opacity={0.9} />
      <Rect x="40" y="104" width="236" height="6" fill={accent} opacity={0.85} transform="rotate(-13 40 104)" />
      <Circle cx="284" cy="58" r="3" fill={accent} />
    </G>
  );
}

function RouteArt({ accent }: { accent: string }) {
  return (
    <G>
      {/* Connection arc between two markers */}
      <Path
        d="M64 128 C 120 40, 200 40, 256 116"
        stroke="#FFFFFF"
        strokeOpacity="0.55"
        strokeWidth="3"
        fill="none"
        strokeDasharray="1 0"
        strokeLinecap="round"
      />
      <Path
        d="M64 128 C 120 40, 200 40, 256 116"
        stroke={accent}
        strokeWidth="2"
        fill="none"
        strokeDasharray="8 10"
        strokeLinecap="round"
        opacity={0.85}
      />
      {/* Markers */}
      <Circle cx="64" cy="128" r="15" fill="#FFFFFF" />
      <Circle cx="64" cy="128" r="8" fill={navy[700]} />
      <Circle cx="256" cy="116" r="15" fill={accent} />
      <Circle cx="256" cy="116" r="7" fill={navy[900]} />
      {/* Ground shadow */}
      <Rect x="0" y="150" width="320" height="50" fill={navy[900]} opacity={0.7} />
    </G>
  );
}
