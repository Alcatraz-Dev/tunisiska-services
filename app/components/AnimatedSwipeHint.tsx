import React, { useEffect } from "react";
import { View, Text } from "react-native";
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { MaterialIcons } from "@expo/vector-icons";

export default function AutoSwipeHint() {
  const translateX = useSharedValue(0);

  useEffect(() => {
    // Automatic left-right animation
    translateX.value = withRepeat(
      withTiming(15, { duration: 300, easing: Easing.inOut(Easing.ease) }),
      -1,
      true // reverse back and forth
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View className="absolute bottom-[400px] left-0 right-0 items-center">
      <Reanimated.View
        style={animatedStyle}
        className="flex-col items-center mb-5 mr-3  "
      >
        <MaterialIcons name="swipe" size={30} color="white" />
      </Reanimated.View>
      <Text className="items-center text-white font-semibold text-sm bg-black/40 px-4 py-2 rounded-full">
        Svep för att fortsätta
      </Text>
    </View>
  );
}
