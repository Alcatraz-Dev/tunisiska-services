import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Animated,
  Dimensions,
  FlatList,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { FontAwesome, Ionicons, MaterialIcons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useTheme } from "../context/ThemeContext";
import AnimatedSwipeHint from "./AnimatedSwipeHint";
import { AutoText } from "./ui/AutoText";

const { width, height } = Dimensions.get("window");

const onboardingData = [
  {
    id: "1",
    title: "Välkommen till Appen",
    description:
      "Upptäck alla fantastiska funktioner vår app erbjuder för att förenkla din vardag.",
    image:
      "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    icon: "rocket",
    color: "#6366f1",
  },
  {
    id: "2",
    title: "Personliga Erbjudanden",
    description:
      "Få skräddarsydda erbjudanden baserade på dina preferenser och behov.",
    image:
      "https://images.unsplash.com/photo-1563013544-824ae1b704d3?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    icon: "gift",
    color: "#10b981",
  },
  {
    id: "3",
    title: "Snabbt Support",
    description:
      "Vår support är här för dig dygnet runt för att hjälpa dig med alla frågor.",
    image:
      "https://images.unsplash.com/photo-1579389083078-4e7018379f7e?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    icon: "headset",
    color: "#f59e0b",
  },
  {
    id: "4",
    title: "Klar att Komma Igång?",
    description:
      "Skapa ett konto nu och börja uppleva alla fördelar med vår tjänst.",
    image:
      "https://images.unsplash.com/photo-1552664730-d307ca884978?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    icon: "checkmark-circle",
    color: "#ec4899",
  },
];

export default function OnboardingScreen() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const [currentIndex, setCurrentIndex] = useState(0);
  const [overlayVisible, setOverlayVisible] = useState(true);
  const scrollX = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef<FlatList>(null);
  const router = useRouter();

  const overlayOpacity = useRef(new Animated.Value(1)).current;
  const iconBounce = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Bounce animation for the overlay icon
    Animated.loop(
      Animated.sequence([
        Animated.timing(iconBounce, {
          toValue: 1.2,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(iconBounce, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    // Automatically navigate to home when reaching the last screen
    if (currentIndex === onboardingData.length - 1) {
      const timer = setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }).start(() => {
          router.replace("/");
        });
      }, 1000); // 1 seconds delay on the last screen

      return () => clearTimeout(timer);
    }
  }, [currentIndex]);

  const handleScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const newIndex = Math.round(offsetX / width);

    if (overlayVisible) {
      // Hide overlay on first scroll
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => {
        setOverlayVisible(false);
      });
    }

    if (newIndex !== currentIndex) setCurrentIndex(newIndex);
  };

  const handleScrollToIndex = (index: number) => {
    flatListRef.current?.scrollToIndex({
      index,
      animated: true,
    });
    setCurrentIndex(index);
  };

  const renderItem = ({ item }: any) => (
    <View style={{ width, height }} className="flex-1">
      <Image
        source={{ uri: item.image }}
        style={{ width: "100%", height: "100%" }}
        resizeMode="cover"
      />

      <LinearGradient
        colors={["rgba(0,0,0,0.3)", "rgba(0,0,0,0.7)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
        }}
      />

      <View
        style={{
          position: "absolute",
          bottom: 140,
          width: "100%",
          paddingHorizontal: 32,
        }}
        className="items-center"
      >
        <Animated.View
          style={{
            transform: [{ scale: iconBounce }],
            backgroundColor: item.color,
          }}
          className="w-20 h-20 rounded-full justify-center items-center mb-6 shadow-xl"
        >
          <Ionicons name={item.icon} size={36} color="#fff" />
        </Animated.View>

        <AutoText className="text-3xl font-bold text-white text-center mb-4 drop-shadow-md">
          {item.title}
        </AutoText>

        <AutoText className="text-sm text-gray-50 text-center leading-7 drop-shadow-md">
          {item.description}
        </AutoText>
      </View>
    </View>
  );

  return (
    <Animated.View
      style={{ opacity: fadeAnim }}
      className={`flex-1 ${isDark ? "bg-gray-900" : "bg-gray-50"}`}
    >
      <StatusBar style={isDark ? "light" : "dark"} />

      <FlatList
        ref={flatListRef}
        data={onboardingData}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          {
            useNativeDriver: false,
            listener: handleScroll,
          }
        )}
        scrollEventThrottle={16}
        getItemLayout={(_, index) => ({
          length: width,
          offset: width * index,
          index,
        })}
      />

      {/* Progress Dots */}
      <View className="absolute top-[70px] w-full flex-row justify-center">
        {onboardingData.map((_, i) => {
          const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
          const dotWidth = scrollX.interpolate({
            inputRange,
            outputRange: [8, 24, 8],
            extrapolate: "clamp",
          });

          const opacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.4, 1, 0.4],
            extrapolate: "clamp",
          });

          return (
            <TouchableOpacity
              key={i}
              onPress={() => handleScrollToIndex(i)}
              activeOpacity={0.7}
            >
              <Animated.View
                className="h-2 rounded-full mx-2"
                style={{
                  width: dotWidth,
                  opacity,
                  backgroundColor: onboardingData[i].color,
                }}
              />
            </TouchableOpacity>
          );
        })}
      </View>
      {/* Overlay Scroll Hint */}
      {overlayVisible && <AnimatedSwipeHint />}
      {/* Skip Button - Only show if not on the last screen */}
      {currentIndex < onboardingData.length - 1 && (
        <View className="absolute bottom-10 w-full items-center">
          <TouchableOpacity
            onPress={() => router.replace("/")}
            className="px-8 py-3 rounded-full bg-white bg-opacity-20"
          >
            <AutoText className="text-black text-base font-semibold">
              Hoppa Över
            </AutoText>
          </TouchableOpacity>
        </View>
      )}

      {/* Auto-navigate indicator on last screen */}
      {currentIndex === onboardingData.length - 1 && (
        <View className="absolute bottom-10 w-full items-center">
          <AutoText className="text-white text-sm bg-dark/40  rounded-full px-4 py-2">
            Omdirigerar till startsidan...
          </AutoText>
        </View>
      )}
    </Animated.View>
  );
}
