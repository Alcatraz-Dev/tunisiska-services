import React from "react";
import { Image, StyleProp, ImageStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import icons from "@/app/constants/icons";

type IconName = keyof typeof Ionicons.glyphMap;

const PROJECT_ICONS: Partial<Record<IconName, (typeof icons)[keyof typeof icons]>> = {
  home: icons.home,
  "home-outline": icons.home,
  search: icons.search,
  person: icons.person,
  "person-outline": icons.person,
  "notifications": icons.bell,
  "notifications-outline": icons.bell,
  "calendar": icons.calendar,
  "calendar-outline": icons.calendar,
  "language": icons.language,
  "language-outline": icons.language,
  "wallet": icons.wallet,
  "wallet-outline": icons.wallet,
  "arrow-back": icons.backArrow,
  "chevron-back": icons.backArrow,
  "chevron-forward": icons.rightArrow,
  "star": icons.star,
  "star-outline": icons.star,
  "heart": icons.heart,
  "heart-outline": icons.heart,
  "filter": icons.filter,
  "filter-outline": icons.filter,
  "information-circle": icons.info,
  "information-circle-outline": icons.info,
  "people": icons.people,
  "people-outline": icons.people,
  "shield": icons.shield,
  "shield-outline": icons.shield,
  "mail": icons.mail,
  "mail-outline": icons.mail,
  "lock-closed": icons.lock,
  "lock-closed-outline": icons.lock,
  "location": icons.location,
  "location-outline": icons.location,
  "map": icons.map,
  "map-outline": icons.map,
  "share-social": icons.sheare,
  "share-social-outline": icons.sheare,
  "copy": icons.copie,
  "copy-outline": icons.copie,
  "globe": icons.glob,
  "globe-outline": icons.glob,
  "log-out": icons.logout,
  "log-out-outline": icons.logout,
};

type AppIconProps = {
  name: IconName;
  size?: number;
  color: string;
  style?: StyleProp<ImageStyle>;
  accessibilityLabel?: string;
};

/** Prefer the app's bundled icon artwork; use Ionicons for uncovered symbols. */
export default function AppIcon({
  name,
  size = 24,
  color,
  style,
  accessibilityLabel,
}: AppIconProps) {
  const source = PROJECT_ICONS[name];

  if (source) {
    return (
      <Image
        source={source}
        resizeMode="contain"
        style={[{ width: size, height: size, tintColor: color }, style]}
        accessibilityLabel={accessibilityLabel}
        accessible={!!accessibilityLabel}
        accessibilityIgnoresInvertColors
      />
    );
  }

  return (
    <Ionicons
      name={name}
      size={size}
      color={color}
      style={style as any}
      accessibilityLabel={accessibilityLabel}
    />
  );
}
