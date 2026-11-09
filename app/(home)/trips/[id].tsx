import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/app/hooks/useLanguage";
import { useTranslationText } from "@/app/hooks/useTranslation";
import { ScrollView, Share, StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AppIcon from "@/app/components/ui/AppIcon";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeIn, FadeInDown, FadeInUp } from "react-native-reanimated";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";

import ThemedText from "@/app/components/ui/ThemedText";
import PressableScale from "@/app/components/ui/PressableScale";
import Badge from "@/app/components/ui/Badge";
import Skeleton from "@/app/components/ui/Skeleton";
import EmptyState from "@/app/components/ui/EmptyState";
import PrimaryButton from "@/app/components/ui/PrimaryButton";
import TransportArt from "@/app/components/ui/TransportArt";
import TripCard from "@/app/components/trips/TripCard";
import { useThemeColors } from "@/app/theme";
import { useTheme } from "@/app/context/ThemeContext";
import { radii, shadows, spacing } from "@/app/theme/spacing";
import { stagger } from "@/app/theme/motion";
import { getTrip } from "@/app/services/tripService";
import { governorateKey } from "@/app/lib/governorates";
import { sceneForTrip, slidesForTrip } from "@/app/lib/tripImagery";
import CrossfadeHero from "@/app/components/ui/CrossfadeHero";
import {
  formatDepartureTime,
  formatFullDate,
  formatRoute,
  formatStatus,
  timeUntilDeparture,
} from "@/app/lib/tripFormat";
import type { Trip, TripLocation, TripPoint } from "@/app/lib/tripTypes";

/**
 * Trip details.
 *
 * One scheduled departure: when it leaves, where it goes, which Tunisian
 * governorates **this** trip serves, where parcels are collected and delivered
 * for each of them, and how collection works on the Swedish side.
 *
 * Nothing here is assumed: governorates come from the trip's own
 * `tunisiaLocations`, and the Stockholm instructions from its
 * `swedenCollection`. When an administrator has not configured something the
 * screen says so rather than inventing a pickup point.
 */
export default function TripDetailsScreen() {
  const theme = useThemeColors();
  const { resolvedTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const [imageFailed, setImageFailed] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const { language } = useLanguage();
  const t = useTranslationText;

  const parcelDelivery = t("Parcel Delivery", language);
  const inTunisia = t("In Tunisia:", language);
  const selectGovernorate = t("Select your governorate", language);
  const notServedOnDeparture = t("Not served on this departure", language);
  const pickupSingular = t("pickup", language);
  const pickupPlural = t("pickups", language);
  const viewDetails = t("View Details", language);
  const hideDetails = t("Hide details", language);
  const collectionPointsTitle = t("Collection points", language);
  const deliveryPointsTitle = t("Delivery points", language);
  const collectionInSweden = t("Collection in Sweden", language);
  const postalService = t("Postal service", language);
  const personalHandover = t("Personal handover", language);
  const notesTitle = t("Notes", language);
  const tripInformation = t("Trip information", language);
  const trackShipment = t("Track a shipment", language);
  const routeDiagram = t("Route diagram", language);
  const cargoCapacity = t("Cargo capacity", language);
  const governoratesLabel = t("governorates", language);
  const governorateSingular = t("governorate", language);
  const closeLabel = t("Close", language);
  const shareLabel = t("Share departure", language);
  const governoratesNotPublished = t(
    "The governorates served on this departure have not been published yet.",
    language,
  );
  const governorateChangeLabel = t("Governorate {governorate}, change", language);
  const backLabel = t("Back", language);
  const noPickupPoints = t("No pickup points configured", language);

  const load = useCallback(async () => {
    if (!id) {
      setTrip(null);
      setNotFound(true);
      setLoadError(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(false);
    try {
      const result = await getTrip(id);
      setTrip(result);
      setNotFound(!result);
    } catch (error) {
      console.error("Could not load trip details:", error);
      setTrip(null);
      setNotFound(false);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setImageFailed(false);
    setPickerOpen(false);
    setSelectedLocation(null);
    setDetailsOpen(false);
  }, [id]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  /**
   * Locations served by this trip.
   *
   * Configured locations always win. When an administrator has not configured
   * any, the trip's own origin is used, because that is where the vehicle
   * actually departs from — no location is invented.
   */
  const locations = useMemo<TripLocation[]>(() => {
    if (!trip) return [];
    if (trip.tunisiaLocations.length > 0) return trip.tunisiaLocations;

    const originKey = governorateKey(trip.origin);
    if (!originKey) return [];

    return [
      {
        governorate: trip.origin,
        governorateKey: originKey,
        available: true,
        collectionPoints: [],
        deliveryPoints: [],
      },
    ];
  }, [trip]);

  const selected = useMemo(
    () => locations.find((l) => l.governorateKey === selectedLocation) ?? null,
    [locations, selectedLocation],
  );

  // Pre-compute the dynamic "Detailed addresses" translation so the hook is
  // always called in the same order (Rules of Hooks). Selecting a governorate
  // must not add or remove a hook call, or React loses the hook queue.
  const detailedAddressesFor = t(
    selected
      ? `Detailed addresses for ${selected.governorate} have not been published yet.`
      : "",
    language,
  );

  const scene = useMemo(
    () =>
      trip
        ? sceneForTrip({
            id: trip.id,
            routeValue: trip.routeValue,
            destinationCountry: trip.route.destinationCountry,
          })
        : null,
    [trip],
  );

  const slides = useMemo(
    () =>
      trip
        ? slidesForTrip({
            id: trip.id,
            routeValue: trip.routeValue,
            destinationCountry: trip.route.destinationCountry,
          })
        : [],
    [trip],
  );

  const heroFrames = useMemo(
    () => (slides.length > 0 ? slides : scene ? [scene] : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [trip?.id, trip?.routeValue, trip?.route.destinationCountry],
  );

  const status = formatStatus(trip?.status);

  const onShare = useCallback(async () => {
    if (!trip) return;
    try {
      await Share.share({
        message: `${trip.route.directionLabel} — ${formatFullDate(trip)} ${formatDepartureTime(
          trip,
        )} · ${formatRoute(trip)}`,
      });
    } catch {
      // Sharing is best-effort; dismissing the sheet is not an error.
    }
  }, [trip]);

  if (loading) {
    return (
      <SafeAreaView
        edges={["top", "left", "right"]}
        style={{ flex: 1, backgroundColor: theme.canvas }}
      >
        <StatusBar style={resolvedTheme === "dark" ? "light" : "dark"} />
        <View className="gap-3 px-5 pt-2">
          <Skeleton height={254} radius={26} />
          <Skeleton width={160} height={20} radius={10} />
          <Skeleton height={132} radius={20} />
        </View>
      </SafeAreaView>
    );
  }

  if (notFound || !trip) {
    return (
      <SafeAreaView
        edges={["top", "left", "right"]}
        style={{ flex: 1, backgroundColor: theme.canvas }}
      >
        <StatusBar style={resolvedTheme === "dark" ? "light" : "dark"} />
        <View style={{ paddingHorizontal: spacing.gutter, paddingTop: spacing.sm }}>
          <SurfaceIconButton
            icon="chevron-back"
            onPress={() =>
              router.canGoBack() ? router.back() : router.replace("/trips")
            }
            label={backLabel}
          />
        </View>
        <EmptyState
          icon="alert-circle-outline"
          title={loadError ? "Couldn’t load departure" : "Departure not found"}
          description={loadError ? "Check your connection and try again." : "This departure is no longer available. It may have been removed or unpublished."}
          action={
            <PrimaryButton
              label={loadError ? "Try again" : "See all departures"}
              variant="secondary"
              fullWidth={false}
              onPress={loadError ? load : () => router.replace("/trips")}
            />
          }
        />
      </SafeAreaView>
    );
  }

  const isTunisiaBound =
    trip.route.destinationCountry === "TN" || locations.length > 0;

  return (
    <SafeAreaView
      edges={["left", "right"]}
      style={{ flex: 1, backgroundColor: theme.canvas }}
    >
      <StatusBar style="light" />

      <ScrollView
        style={{ backgroundColor: theme.canvas }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 48 }}
      >
        {/* ── Hero ───────────────────────────────────────────────── */}
        <View
          style={{ height: 254, width: "100%", position: "relative", backgroundColor: "#0B1B33" }}
        >
          <TransportArt
            vehicle={trip.vehicle as any}
            fill
            style={StyleSheet.absoluteFill}
          />
          {trip.imageUrl && !imageFailed ? (
            <Image
              source={{ uri: trip.imageUrl }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              transition={240}
              cachePolicy="memory-disk"
              alt={`${formatRoute(trip)} departure`}
              onError={() => setImageFailed(true)}
            />
          ) : (
            <CrossfadeHero images={heroFrames} intervalMs={9000} fadeMs={2000} />
          )}

          <LinearGradient
            colors={["rgba(11,27,51,0.62)", "rgba(11,27,51,0.08)", "transparent"]}
            locations={[0, 0.55, 1]}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />

          {/* The same round surface buttons the Notifications and Services
              headers use: app surface, hairline border, primary icon. */}
          <View style={{ position: "absolute", top: insets.top + spacing.sm, left: spacing.md, right: spacing.md, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <SurfaceIconButton
              icon="chevron-back"
              onPress={() =>
                router.canGoBack() ? router.back() : router.replace("/trips")
              }
              label={backLabel}
            />

            <SurfaceIconButton
              icon="share-outline"
              onPress={onShare}
              label={shareLabel}
            />
          </View>
        </View>

        {/* ── Body ───────────────────────────────────────────────── */}
        <View style={{ marginTop: -28, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, paddingHorizontal: spacing.gutter, paddingTop: 28, paddingBottom: spacing.xl, backgroundColor: theme.canvas, overflow: "visible" }}>
          <View
            style={{ position: "absolute", top: -18, left: spacing.gutter, maxWidth: "90%", alignSelf: "flex-start", borderRadius: radii.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, backgroundColor: theme.surface, ...shadows.md }}
          >
            <ThemedText
              variant="caption"
              translate={false}
              numberOfLines={1}
              style={{ fontWeight: "700", letterSpacing: -0.1 }}
            >
              {formatFullDate(trip)}
            </ThemedText>
          </View>

          <Animated.View entering={FadeInDown.duration(380)}>
            <ThemedText
              variant="title1"
              style={{ letterSpacing: -0.6, lineHeight: 32 }}
            >
              {trip.route.directionLabel}
            </ThemedText>
            <ThemedText variant="bodySm" tone="secondary" style={{ marginTop: 2 }}>
              {formatRoute(trip)}
            </ThemedText>

            {/* Timeline */}
            {/* The hold, in the same manifest card the schedule uses. */}
            <View style={{ marginTop: spacing.md }}>
              <TripCard trip={trip} variant="lead" media={false} showRoute={false} showDate={false} capacityDisplay="summary" />
            </View>

            {/* Countdown and status sit below the hold rather than repeating the
                departure time the manifest card already states. */}
            <View
              className="mt-2.5 flex-row items-center gap-3 rounded-[16px] border px-4 py-3"
              style={{
                backgroundColor: theme.surface,
                borderColor: theme.borderSubtle,
              }}
            >
              <View
                className="h-9 w-9 items-center justify-center rounded-[10px]"
                style={{ backgroundColor: theme.primarySoft }}
              >
                <AppIcon name="time-outline" size={16} color={theme.primary} />
              </View>

              <ThemedText variant="bodySm" style={{ flex: 1 }}>
                {timeUntilDeparture(trip, new Date(now))}
              </ThemedText>

              {trip.status ? (
                <Badge label={status.label} tone={status.tone} />
              ) : null}
            </View>
          </Animated.View>

          {/* ── Parcel delivery in Tunisia ─────────────────────────── */}
          {isTunisiaBound ? (
            <Animated.View
              entering={FadeInDown.delay(stagger.step).duration(380)}
              style={{ marginTop: 16 }}
            >
              <View
                className="rounded-2xl border p-5"
                style={{
                  backgroundColor: theme.surface,
                  borderColor: theme.borderSubtle,
                }}
              >
                <View className="flex-row items-center gap-3">
                  <View
                    className="h-11 w-11 items-center justify-center rounded-xl"
                    style={{ backgroundColor: theme.accentSoft }}
                  >
                    <AppIcon name="cube" size={20} color={theme.accent} />
                  </View>
                  <ThemedText variant="title3" style={{ letterSpacing: -0.3 }}>
                    {parcelDelivery}
                  </ThemedText>
                </View>

                <View className="mt-4 mb-2">
                  <View
                    className="h-5 w-8 rounded"
                    style={{
                      backgroundColor: theme.accentSoft,
                      width: 32,
                      height: 3,
                    }}
                  />
                  <ThemedText
                    variant="caption"
                    tone="secondary"
                    style={{ marginTop: 10 }}
                  >
                    {inTunisia}
                  </ThemedText>
                </View>

                {locations.length === 0 ? (
                  <ThemedText
                    variant="bodySm"
                    tone="tertiary"
                    style={{ marginTop: 8 }}
                  >
                    {governoratesNotPublished}
                  </ThemedText>
                ) : (
                  <>
                    {/* Governorate picker trigger */}
                    <PressableScale
                      onPress={() => setPickerOpen((open) => !open)}
                      accessibilityRole="button"
                      accessibilityState={{ expanded: pickerOpen }}
                      accessibilityLabel={
                        selected
                          ? governorateChangeLabel.replace("{governorate}", selected.governorate)
                          : selectGovernorate
                      }
                      haptic="selection"
                      pressedScale={0.97}
                      style={{ width: "100%", marginTop: 10 }}
                    >
                      <View
                        className="rounded-xl border px-4 py-3.5"
                        style={{
                          backgroundColor: selected
                            ? theme.surfaceAlt
                            : theme.surface,
                          borderColor: selected
                            ? theme.accent
                            : theme.borderSubtle,
                          borderWidth: 1,
                        }}
                      >
                        <View className="flex-row items-center justify-between">
                          <View style={{ flex: 1 }}>
                            <ThemedText
                              variant="bodySm"
                              tone={selected ? "primary" : "secondary"}
                              style={{
                                fontWeight: selected ? "600" : "400",
                                lineHeight: 20,
                              }}
                            >
                              {selected ? selected.governorate : selectGovernorate}
                            </ThemedText>
                            {selected ? (
                              <ThemedText
                                variant="footnote"
                                tone="tertiary"
                                style={{ marginTop: 2 }}
                              >
                                {selected.collectionPoints.length > 0
                                  ? `${selected.collectionPoints.length} ${
                                      selected.collectionPoints.length === 1
                                        ? pickupSingular
                                        : pickupPlural
                                    }`
                                  : noPickupPoints}
                              </ThemedText>
                            ) : null}
                          </View>
                          <View
                            className="flex-row items-center gap-1.5"
                            style={{
                              opacity: selected ? 1 : 0.5,
                            }}
                          >
                            <View
                              className="h-8 w-8 items-center justify-center rounded-lg"
                              style={{
                                backgroundColor: theme.accentSoft,
                              }}
                            >
                              <AppIcon
                                name="location"
                                size={14}
                                color={theme.accent}
                              />
                            </View>
                            <AppIcon
                              name={pickerOpen ? "chevron-up" : "chevron-down"}
                              size={18}
                              color={theme.textTertiary}
                            />
                          </View>
                        </View>
                      </View>
                    </PressableScale>

                    {/* Governorate dropdown */}
                    {pickerOpen ? (
                      <Animated.View
                        entering={FadeInUp.duration(200)}
                        accessibilityRole="radiogroup"
                        style={{
                          marginTop: 8,
                          marginBottom: 8,
                          borderRadius: 16,
                          overflow: "hidden",
                        }}
                      >
                        <View
                          className="rounded-xl overflow-hidden"
                          style={{
                            backgroundColor: theme.surface,
                            borderWidth: 1,
                            borderColor: theme.borderSubtle,
                          }}
                        >
                          {/* Dropdown header */}
                          <View
                            className="flex-row items-center justify-between px-4 py-2.5"
                            style={{ backgroundColor: theme.surfaceAlt }}
                          >
                            <ThemedText variant="caption" tone="secondary">
                              {`${locations.length} ${
                                locations.length === 1
                                  ? governorateSingular
                                  : governoratesLabel
                              }`}
                            </ThemedText>
                            <PressableScale
                              onPress={() => setPickerOpen(false)}
                              accessibilityRole="button"
                              accessibilityLabel={closeLabel}
                              haptic="light"
                              style={{ padding: 4 }}
                            >
                              <AppIcon
                                name="close"
                                size={16}
                                color={theme.textTertiary}
                              />
                            </PressableScale>
                          </View>

                          {/* Option list */}
                          {locations.map((location, index) => {
                            const key =
                              location.governorateKey ??
                              governorateKey(location.governorate);
                            const active = selectedLocation === key;
                            const available = location.available !== false;
                            const pickupCount = location.collectionPoints.length;

                            return (
                              <PressableScale
                                key={key}
                                disabled={!available}
                                onPress={() => {
                                  setSelectedLocation(
                                    active ? null : key,
                                  );
                                  setDetailsOpen(false);
                                }}
                                accessibilityRole="radio"
                                accessibilityState={{
                                  selected: active,
                                  disabled: !available,
                                }}
                                accessibilityLabel={`${location.governorate}${
                                  available
                                    ? ""
                                    : ", " + notServedOnDeparture
                                }`}
                                haptic="selection"
                                pressedScale={0.98}
                                style={{ width: "100%" }}

                              >
                                <View
                                  className="flex-row items-center justify-between border-b last:border-b-0 px-4 py-3.5"
                                  style={{
                                    backgroundColor: active
                                      ? theme.accentSoft
                                      : "transparent",
                                    borderColor: theme.borderSubtle,
                                    borderBottomWidth: index < locations.length - 1 ? 1 : 0,
                                    opacity: available ? 1 : 0.5,
                                  }}
                                >
                                  <View style={{ flex: 1, paddingEnd: spacing.sm }}>
                                    <ThemedText
                                      variant="bodySm"
                                      style={{
                                        fontWeight: active
                                          ? "600"
                                          : "400",
                                        color: active
                                          ? theme.accent
                                          : undefined,
                                        lineHeight: 20,
                                      }}
                                    >
                                      {location.governorate}
                                    </ThemedText>
                                    {!available ? (
                                      <ThemedText
                                        variant="footnote"
                                        tone="tertiary"
                                        style={{ marginTop: 2 }}
                                      >
                                        {notServedOnDeparture}
                                      </ThemedText>
                                    ) : pickupCount > 0 ? (                                      <ThemedText
                                        variant="footnote"
                                        tone="tertiary"
                                        style={{ marginTop: 2 }}
                                      >
                                        {pickupCount === 1
                                          ? `${pickupCount} ${pickupSingular}`
                                          : `${pickupCount} ${pickupPlural}`
                                        }
                                      </ThemedText>
                                    ) : null}
                                  </View>

                                  {active ? (
                                    <View
                                      className="flex-row items-center gap-1"
                                    >
                                      <View
                                        className="h-1.5 w-1.5 rounded-full"
                                        style={{
                                          backgroundColor: theme.accent,
                                        }}
                                      />
                                      <View
                                        className="h-1.5 w-1.5 rounded-full"
                                        style={{
                                          backgroundColor: theme.accent,
                                        }}
                                      />
                                    </View>
                                  ) : (
                                    <View
                                      className="h-8 w-8 items-center justify-center rounded-lg"
                                      style={{
                                        backgroundColor: theme.surfaceAlt,
                                      }}
                                    >
                                      <AppIcon
                                        name="location-outline"
                                        size={13}
                                        color={theme.textTertiary}
                                      />
                                    </View>
                                  )}
                                </View>
                              </PressableScale>
                            );
                          })}
                        </View>
                      </Animated.View>
                    ) : null}

                    <View className="mt-3">
                      <PrimaryButton
                        label={detailsOpen ? hideDetails : viewDetails}
                        disabled={!selected}
                        onPress={() => setDetailsOpen((open) => !open)}
                      />
                    </View>

                    {detailsOpen && selected ? (
                      <Animated.View
                        entering={FadeIn.duration(220)}
                        style={{
                          marginTop: 16,
                          borderTopWidth: 1,
                          borderColor: theme.borderSubtle,
                          paddingTop: 14,
                        }}
                      >
                        {selected.collectionPoints.length > 0 ? (
                          <PointList
                            title={collectionPointsTitle}
                            points={selected.collectionPoints}
                          />
                        ) : null}

                        {selected.deliveryPoints.length > 0 ? (
                          <PointList
                            title={deliveryPointsTitle}
                            points={selected.deliveryPoints}
                          />
                        ) : null}

                        {selected.notes ? (
                          <ThemedText
                            variant="bodySm"
                            tone="secondary"
                            style={{ marginTop: 4 }}
                          >
                            {selected.notes}
                          </ThemedText>
                        ) : null}

                        {selected.collectionPoints.length === 0 &&
                        selected.deliveryPoints.length === 0 &&
                        !selected.notes ? (
                          <ThemedText variant="bodySm" tone="tertiary">
                            {detailedAddressesFor}
                          </ThemedText>
                        ) : null}
                      </Animated.View>
                    ) : null}
                  </>
                )}
              </View>
            </Animated.View>
          ) : null}

          {/* ── Collection in Sweden ───────────────────────────────── */}
          {trip.swedenCollection ? (
            <Animated.View
              entering={FadeInDown.delay(stagger.step * 2).duration(380)}
              style={{ marginTop: 16 }}
            >
              <View
                className="rounded-2xl border p-5"
                style={{
                  backgroundColor: theme.surface,
                  borderColor: theme.borderSubtle,
                }}
              >
                <View className="flex-row items-center gap-3">
                  <View
                    className="h-11 w-11 items-center justify-center rounded-xl"
                    style={{ backgroundColor: theme.primarySoft }}
                  >
                    <AppIcon name="mail" size={20} color={theme.primary} />
                  </View>
                  <ThemedText variant="title3" style={{ letterSpacing: -0.3 }}>
                    {collectionInSweden}
                  </ThemedText>
                </View>

                <View className="mt-3">
                  {trip.swedenCollection.postalInstructions ? (
                    <Instruction
                      icon="mail-outline"
                      title={postalService}
                      body={trip.swedenCollection.postalInstructions}
                    />
                  ) : null}
                  {trip.swedenCollection.personalHandoverInstructions ? (
                    <Instruction
                      icon="person-outline"
                      title={personalHandover}
                      body={trip.swedenCollection.personalHandoverInstructions}
                    />
                  ) : null}
                  {trip.swedenCollection.notes ? (
                    <Instruction
                      icon="information-circle-outline"
                      title={notesTitle}
                      body={trip.swedenCollection.notes}
                    />
                  ) : null}
                </View>
              </View>
            </Animated.View>
          ) : null}

          {/* ── Trip information ───────────────────────────────────── */}
          {trip.summary || trip.notes ? (
            <Animated.View
              entering={FadeInDown.delay(stagger.step * 3).duration(380)}
              style={{ marginTop: 16 }}
            >
              <View
                className="rounded-2xl border p-5"
                style={{
                  backgroundColor: theme.surface,
                  borderColor: theme.borderSubtle,
                }}
              >
                <ThemedText
                  variant="title3"
                  tone="secondary"
                  style={{ marginBottom: 10 }}
                >
                  {tripInformation}
                </ThemedText>
                {trip.summary ? (
                  <ThemedText variant="body" style={{ marginBottom: 8 }}>
                    {trip.summary}
                  </ThemedText>
                ) : null}
                {trip.notes ? (
                  <ThemedText variant="bodySm" tone="secondary">
                    {trip.notes}
                  </ThemedText>
                ) : null}
              </View>
            </Animated.View>
          ) : null}

          <View className="mt-6 gap-3">
            <View
              className="rounded-xl overflow-hidden"
              style={{
                backgroundColor: theme.primary,
                shadowColor: theme.primary,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 8,
              }}
            >
              <PrimaryButton
                label={trackShipment}
                icon="locate-outline"
                onPress={() => router.push("/(home)/trips/track")}
                style={{
                  backgroundColor: "transparent",
                  borderRadius: 0,
                  borderBottomLeftRadius: 16,
                  borderBottomRightRadius: 16,
                }}
              />
            </View>
            <View className="flex-row gap-3">
              <View
                className="flex-1 rounded-xl border"
                style={{
                  backgroundColor: theme.surface,
                  borderColor: theme.borderSubtle,
                }}
              >
                <PrimaryButton
                  label={routeDiagram}
                  icon="map-outline"
                  variant="secondary"
                  style={{
                    backgroundColor: theme.surface,
                    borderRadius: 0,
                    borderBottomLeftRadius: 16,
                  }}
                  onPress={() => router.push({ pathname: "/(home)/trips/route-diagram" as any, params: { id: trip.id } })}
                />
              </View>
              <View
                className="flex-1 rounded-xl border"
                style={{
                  backgroundColor: theme.surface,
                  borderColor: theme.borderSubtle,
                }}
              >
                <PrimaryButton
                  label={cargoCapacity}
                  icon="cube-outline"
                  variant="secondary"
                  style={{
                    backgroundColor: theme.surface,
                    borderRadius: 0,
                    borderBottomRightRadius: 16,
                  }}
                  onPress={() => router.push({ pathname: "/(home)/trips/stowage-manifest" as any, params: { id: trip.id } })}
                />
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function PointList({ title, points }: { title: string; points: TripPoint[] }) {
  const theme = useThemeColors();
  const { language } = useLanguage();
  const t = useTranslationText;

  return (
    <View className="mb-3">
      <ThemedText
        variant="caption"
        tone="secondary"
        style={{ marginBottom: 4 }}
      >
        {t(title, language)}
      </ThemedText>
      {points.map((point, index) => (
        <View
          key={`${point.name}-${index}`}
          className="flex-row items-start py-1.5"
        >
          <AppIcon
            name="location-outline"
            size={15}
            color={theme.textTertiary}
          />
          <View style={{ marginStart: 10, flex: 1 }}>
            <ThemedText variant="bodySm">{point.name}</ThemedText>
            {point.address ? (
              <ThemedText variant="footnote" tone="tertiary">
                {point.address}
              </ThemedText>
            ) : null}
            {point.notes ? (
              <ThemedText variant="footnote" tone="tertiary">
                {point.notes}
              </ThemedText>
            ) : null}
          </View>
        </View>
      ))}
    </View>
  );
}

/**
 * Round surface button, identical to the back/action buttons in the
 * Notifications and Services headers: 40pt circle on the app surface with a
 * hairline border and a primary-coloured icon.
 */
function SurfaceIconButton({
  icon,
  onPress,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  label: string;
}) {
  const theme = useThemeColors();

  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      haptic="light"
      style={{ alignSelf: "flex-start" }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: radii.pill,
          borderWidth: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: theme.surface,
          borderColor: theme.borderSubtle,
        }}
      >
        <AppIcon name={icon} size={20} color={theme.textPrimary} />
      </View>
    </PressableScale>
  );
}

function Instruction({
  icon,
  title,
  body,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
}) {
  const theme = useThemeColors();

  return (
    <View className="flex-row items-start border-b py-2.5" style={{ borderColor: theme.borderSubtle }}>
      <AppIcon name={icon} size={17} color={theme.textTertiary} />
      <View style={{ marginStart: 12, flex: 1 }}>
        <ThemedText variant="caption" tone="secondary">
          {title}
        </ThemedText>
        <ThemedText variant="bodySm" style={{ marginTop: 1 }}>
          {body}
        </ThemedText>
      </View>
    </View>
  );
}
