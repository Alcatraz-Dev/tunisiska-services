import {
  Image,
  ImageSourcePropType,
  View,
  TouchableOpacity,
} from "react-native";
import React, { useState } from "react";
import Animated, {
  FadeIn,
  LinearTransition,
  SlideInLeft,
  SlideInRight,
  SlideInUp,
} from "react-native-reanimated";
import { useRouter } from "expo-router";
import { useTheme } from "../context/ThemeContext";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { getPremiumGradient } from "../utils/getPremiumGradient";
import { useUser } from "@clerk/clerk-expo";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather } from "@expo/vector-icons";
import { AutoText } from "./ui/AutoText";

const gap = 10;

interface HeadTextProps {
  text?: string;
  side?: "left" | "right" | "center";
  image?: ImageSourcePropType;
}

const HeadText = ({ text, side, image }: HeadTextProps) => {
  const [totalWidth, setTotalWidth] = useState(0);
  const [textWidth, setTextWidth] = useState(0);
  const width = totalWidth - textWidth - gap;
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const Transition = LinearTransition.delay(1650)
    .springify()
    .damping(18)
    .stiffness(50);

  const LeftSlide = SlideInLeft.delay(1500)
    .springify()
    .damping(18)
    .stiffness(50);
  const RightSlide = SlideInRight.delay(1500)
    .springify()
    .damping(18)
    .stiffness(50);
  const CenterSlide = SlideInUp.delay(1500)
    .springify()
    .damping(18)
    .stiffness(50);

  const getResponsiveFontSize = (
    text: string,
    maxWidth: number,
    options = { baseFont: 20, minFont: 10, maxFont: 40 },
  ) => {
    if (!text) return options.baseFont;
    const charWidthRatio = 0.1;
    const estimatedTextWidth = text.length * options.baseFont * charWidthRatio;
    const scaleFactor = maxWidth / estimatedTextWidth;
    return Math.max(
      options.minFont,
      Math.min(options.maxFont, options.baseFont * scaleFactor),
    );
  };

  return (
    <Animated.View
      entering={FadeIn.delay(1000).springify().damping(18).stiffness(50)}
      layout={Transition}
      onLayout={(event) => setTotalWidth(event.nativeEvent.layout.width)}
      className={`mx-2 h-20 ${
        side === "center"
          ? "flex-col items-center justify-center"
          : "flex-row items-center justify-center"
      }`}
      style={{ gap }}
    >
      {/* Left */}
      {Boolean(width > 0) && side === "left" && (
        <Animated.View
          entering={LeftSlide}
          className="h-20 rounded-2xl overflow-hidden"
          style={{ width }}
        >
          <Image source={image} className="w-full h-full" />
        </Animated.View>
      )}

      {/* Text */}
      {Boolean(text) && side !== "center" && (
        <Animated.View
          layout={Transition}
          onLayout={(event) => setTextWidth(event.nativeEvent.layout.width)}
          style={{
            flexWrap: "wrap",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <AutoText
            style={{
              fontSize: getResponsiveFontSize(text || "", totalWidth || 300),
              fontWeight: "900",
              textAlign: "center",
              color: isDark ? "#fff" : "#000",
            }}
          >
            {text}
          </AutoText>
        </Animated.View>
      )}
      {Boolean(text) && side === "center" && (
        <Animated.View
          layout={Transition}
          onLayout={(event) => setTextWidth(event.nativeEvent.layout.width)}
          style={{
            flexWrap: "wrap",
            justifyContent: "center",
            alignItems: "center",
          }}
          className={"text-center -bottom-10"}
        >
          <AutoText
            style={{
              fontSize: getResponsiveFontSize(text || "", totalWidth || 300),
              fontWeight: "900",
              textAlign: "center",
              color: isDark ? "#fff" : "#000",
            }}
          >
            {text}
          </AutoText>
        </Animated.View>
      )}
      {/* Right */}
      {Boolean(width > 0) && side === "right" && (
        <Animated.View
          entering={RightSlide}
          className="h-20 rounded-2xl overflow-hidden"
          style={{ width }}
        >
          <Image source={image} className="w-full h-full" />
        </Animated.View>
      )}

      {/* Center → image on top, text below */}
      {Boolean(width > 0) && side === "center" && (
        <Animated.View
          entering={CenterSlide}
          className="h-20 rounded-2xl overflow-hidden -bottom-10"
          style={{ width }}
        >
          <Image source={image} className="w-full h-full" />
        </Animated.View>
      )}
    </Animated.View>
  );
};

export default function () {
  const { isLoaded, user } = useUser();
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const handleRoute = async () => {
    if (isLoaded && !user) {
      router.push("/sign-in");
      return;
    }

    try {
      const hasSeenOnboarding = await AsyncStorage.getItem("hasSeenOnboarding");
      if (!hasSeenOnboarding) {
        router.push("/onboarding");
        await AsyncStorage.setItem("hasSeenOnboarding", "true");
      } else {
        router.push("/");
      }
    } catch (error) {
      console.log("Error reading onboarding flag:", error);
      router.push("/");
    }
  };

  return (
    <View
      className={`flex-1 justify-center ${isDark ? "bg-dark" : "bg-light"}`}
    >
      <StatusBar style={isDark ? "light" : "dark"} />

      {/* Gradient */}
      <LinearGradient
        colors={getPremiumGradient() as [string, string]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{
          position: "absolute",
          bottom: 0,
          width: "100%",
          height: "100%",
          opacity: 0.3,
        }}
      />

      <View
        style={{ gap, marginHorizontal: 5 }}
        className="bottom-20 gap-5 mx-5"
      >
        <HeadText
          text="Snabb"
          side="left"
          image={require("../assets/images/welcome_fast_v2.jpg")}
        />
        <HeadText
          text="Trygg"
          side="right"
          image={require("../assets/images/welcome_safe_v2.jpg")}
        />
        <HeadText
          text="Smart"
          side="left"
          image={require("../assets/images/welcome_smart.jpg")}
        />
        <HeadText
          text="Stark"
          side="center"
          image={require("../assets/images/welcome_strong.jpg")}
        />

        {/* Button */}
        <Animated.View
          entering={SlideInUp.delay(1800).springify().damping(18).stiffness(80)}
          className="absolute -bottom-[200px] w-full items-center"
        >
          <TouchableOpacity
            onPress={handleRoute}
            className={`px-10 py-4 rounded-2xl flex-row items-center shadow-lg backdrop-blur-md gap-3 mx-5 ${
              isDark ? " bg-light" : "bg-dark"
            }`}
          >
            <AutoText
              className={`font-bold text-base ml-5 ${
                isDark ? "text-black" : "text-white"
              }`}
            >
              Gå vidare
            </AutoText>
            <Feather
              name="arrow-right"
              size={14}
              color={isDark ? "black" : "white"}
            />
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
}
