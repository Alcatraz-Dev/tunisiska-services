import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Animated,
  PanResponder,
  Platform,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import * as Haptics from "expo-haptics";

import AppIcon from "./AppIcon";
import PressableScale from "./PressableScale";
import ThemedText from "./ThemedText";
import { radii } from "@/app/theme/spacing";

/** Width of the revealed action, in points. */
const ACTION_WIDTH = 92;
/** How far past the action the row may be dragged, for a little give. */
const OVERSHOOT = 24;
/** Horizontal travel must beat vertical travel by this factor to claim the gesture. */
const HORIZONTAL_BIAS = 1.4;

type SwipeToDeleteProps = {
  children: React.ReactNode;
  /** Runs when the revealed action is pressed — confirm there, not during the swipe. */
  onDelete: () => void;
  /** Already-translated action label, e.g. "Delete". */
  actionLabel: string;
  style?: StyleProp<ViewStyle>;
};

/** Imperative handle, so a button elsewhere can open the same action. */
export type SwipeToDeleteHandle = {
  open: () => void;
  close: () => void;
};

/**
 * A row that can be swiped left to reveal a delete action.
 *
 * The delete action is deliberately not fired by the swipe itself: swiping
 * reveals it, pressing it asks for confirmation, so a stray gesture can never
 * destroy data. A tap anywhere on the open row closes it again.
 *
 * Built on `PanResponder` rather than the gesture-handler API so it behaves the
 * same inside any scroll container without extra setup.
 */
const SwipeToDelete = forwardRef<SwipeToDeleteHandle, SwipeToDeleteProps>(
  function SwipeToDelete({ children, onDelete, actionLabel, style }, ref) {
  const translateX = useRef(new Animated.Value(0)).current;
  const openRef = useRef(false);
  const [open, setOpen] = useState(false);

  const settle = useCallback(
    (toOpen: boolean, notify = false) => {
      if (notify && toOpen !== openRef.current) {
        try {
          Haptics.selectionAsync();
        } catch {
          // Haptics are best-effort.
        }
      }
      openRef.current = toOpen;
      setOpen(toOpen);
      Animated.spring(translateX, {
        toValue: toOpen ? -ACTION_WIDTH : 0,
        useNativeDriver: true,
        bounciness: 0,
        speed: 18,
      }).start();
    },
    [translateX],
  );

  // Any button can reveal the same action; the delete itself stays single-path.
  useImperativeHandle(
    ref,
    () => ({ open: () => settle(true), close: () => settle(false) }),
    [settle],
  );

  const responder = useMemo(
    () =>
      PanResponder.create({
        // Only claim clearly horizontal drags, so vertical scrolling wins ties.
        onMoveShouldSetPanResponder: (_event, gesture) =>
          Math.abs(gesture.dx) > 10 &&
          Math.abs(gesture.dx) > Math.abs(gesture.dy) * HORIZONTAL_BIAS,

        onPanResponderMove: (_event, gesture) => {
          const base = openRef.current ? -ACTION_WIDTH : 0;
          const next = Math.max(
            -ACTION_WIDTH - OVERSHOOT,
            Math.min(0, base + gesture.dx),
          );
          translateX.setValue(next);
        },

        onPanResponderRelease: (_event, gesture) => {
          const base = openRef.current ? -ACTION_WIDTH : 0;
          const travel = base + gesture.dx;
          settle(travel < -ACTION_WIDTH / 2, true);
        },

        onPanResponderTerminate: () => settle(openRef.current),
      }),
    // The handlers read only refs and a stable callback.
    [settle, translateX],
  );

  return (
    <View style={[{ borderRadius: radii.lg, overflow: "hidden" }, style]}>
      {/* Action sits underneath, revealed as the row slides. */}
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            alignItems: "flex-end",
            justifyContent: "center",
            backgroundColor: "#DC2626",
          },
        ]}
      >
        <PressableScale
          onPress={onDelete}
          haptic="light"
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          pressedScale={0.94}
          style={{
            width: ACTION_WIDTH,
            height: "100%",
            alignItems: "center",
            justifyContent: "center",
            gap: 4,
          }}
        >
          <AppIcon name="trash-outline" size={19} color="#FFFFFF" />
          <ThemedText
            variant="footnote"
            translate={false}
            style={{ color: "#FFFFFF", fontWeight: "700" }}
          >
            {actionLabel}
          </ThemedText>
        </PressableScale>
      </View>

      <Animated.View
        {...responder.panHandlers}
        style={{ transform: [{ translateX }] }}
      >
        {children}
      </Animated.View>

      {open ? (
        <PressableScale
          onPress={() => settle(false)}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          style={[
            styles.closeCatcher,
            // Leave the action strip tappable.
            { right: ACTION_WIDTH },
          ]}
        >
          <View />
        </PressableScale>
      ) : null}
    </View>
  );
  },
);

export default SwipeToDelete;

const styles = StyleSheet.create({
  closeCatcher: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    // Android needs an explicit background to receive the touch.
    backgroundColor: Platform.OS === "android" ? "transparent" : "transparent",
  },
});
