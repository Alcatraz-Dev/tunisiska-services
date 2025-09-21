import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  Animated,
} from "react-native";
import { useRouter } from "expo-router";
import Slider from "./Slider";
import Slide from "./Slide";
import AnimatedRe, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  Extrapolate,
  interpolate,
} from "react-native-reanimated";
import { AutoText } from "../ui/AutoText";

const DOT_SIZE = 10;
const DOT_SPACING = 12;

const slides = [
  {
    color: "#3B82F6",
    title: "Frakt mellan Sverige & Tunisien",
    description:
      "Snabb och säker frakt av paket mellan Sverige och Tunisien direkt via appen.",
    picture: require("../../assets/images/ExpressDeliveryStickers.png"),
    // {
      
    //   uri: "https://cdn-icons-png.flaticon.com/512/3022/3022237.png", // cube / shipping
    // },
    icon: "cube-outline",
  },
  {
    color: "#10B981",
    title: "Hemstädning & Flytt",
    description:
      "Boka professionell hemstädning med flytthjälp enkelt via appen.",
    picture: require("../../assets/images/HouseStickers.png"),
    // {
    //   uri: "https://cdn-icons-png.flaticon.com/512/1046/1046784.png", // house / cleaning
    // },
    icon: "home-outline",
  },
  {
    color: "#F59E0B",
    title: "Flytt utan städning",
    description:
      "Enkel flytthjälp för att flytta möbler och tillhörigheter utan städning.",
    picture: require("../../assets/images/Truck.png"),
    // {
    //   uri: "https://cdn-icons-png.flaticon.com/512/1046/1046774.png", // moving box
    // },
    icon: "cube",
  },
  {
    color: "#EF4444",
    title: "Taxi till flygplats",
    description:
      "Boka transport till och från flygplatser smidigt via appen.",
    picture: require("../../assets/images/TaxiIcon-1.png"),
    //  {
    //   uri: "https://cdn-icons-png.flaticon.com/512/743/743131.png", // car / taxi
    // },

    icon: "car-outline",
  },
  {
    color: "#F2AD62",
    title: "Planera din resa enkelt",
    description:
      "Se alla dina bokningar och tjänster samlade på ett ställe – allt under kontroll.",
    picture: require("../../assets/images/JulyIcon.png"),
    //  {
    //   uri: "https://cdn-icons-png.flaticon.com/512/2922/2922510.png", // calendar
    // },
    icon: "calendar-outline",
  },
  {
    color: "#8B5CF6",
    title: "Exklusiva erbjudanden",
    description:
      "Få tillgång till specialerbjudanden och rabatter för våra trogna användare.",
    picture: 
    require("../../assets/images/GiftBoxIcon.png"),
    // {
    //   uri: "https://cdn-icons-png.flaticon.com/512/2910/2910760.png", // gift
    // },
    icon: "gift-outline",
  },
  {
    color: "#F472B6",
    title: "Support 24/7",
    description:
      "Vår support är alltid redo att hjälpa dig med bokningar och frågor.",
    picture: require("../../assets/images/CustomerServiceStickers.png"),
    // {
    //   uri: "https://cdn-icons-png.flaticon.com/512/3524/3524632.png", // headset / support
    // },
    icon: "headset-outline",
  },
  {
    color: "#34D399",
    title: "Smidiga betalningar",
    description:
      "Betala direkt i appen på ett säkert och enkelt sätt.",
    picture: 
    require("../../assets/images/CardIcon.png"),
    //  {
    //   uri: "https://cdn-icons-png.flaticon.com/512/2942/2942044.png", // credit card
    // },
    icon: "card-outline",
  },
];

const LiquidSwipe = () => {
  const [index, setIndex] = useState(0);
  const router = useRouter();
  const prev = slides[index - 1];
  const next = slides[index + 1];

  // Fade animation for auto-navigation
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Liquid Dots animation
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withSpring(index, { damping: 12, stiffness: 100 });
  }, [index]);

  // Auto navigate to home on last slide
  useEffect(() => {
    if (index === slides.length - 1) {
      const timer = setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }).start(() => {
          router.replace("/");
        });
      }, 3000); // 3 second delay

      return () => clearTimeout(timer);
    }
  }, [index]);

  return (
    <>
      {/* Liquid Dots */}
      <View className="absolute top-20 left-0 right-0 flex-row justify-center items-center z-50">
        {slides.map((slide, i) => {
          const style = useAnimatedStyle(() => {
            const scale = interpolate(
              progress.value,
              [i - 1, i, i + 1],
              [0.7, 1.8, 0.7],
              Extrapolate.CLAMP
            );
            const widthAnim = interpolate(
              progress.value,
              [i - 1, i, i + 1],
              [DOT_SIZE, DOT_SIZE * 3, DOT_SIZE],
              Extrapolate.CLAMP
            );
            const color =
              i === Math.round(progress.value) ? slide.color : "#ffffff66";
            return {
              width: widthAnim,
              height: DOT_SIZE ,
              borderRadius: DOT_SIZE,
              backgroundColor: color,
              transform: [{ scale }],
              marginHorizontal: DOT_SPACING * 0.8,
            };
          });
          return <AnimatedRe.View key={i} style={style} />;
        })}
      </View>

      {/* Slider */}
      <Slider
        key={index}
        index={index}
        setIndex={setIndex}
        prev={prev && <Slide slide={prev} />}
        next={next && <Slide slide={next} />}
      >
        <Slide slide={slides[index]!}   />
      </Slider>

      {/* Skip Button */}
      {index < slides.length - 1 && (
        <View className="absolute bottom-12 w-full items-center">
          <TouchableOpacity
            onPress={() => router.replace("/")}
            className="items-center"
            activeOpacity={0.8}
          >
            <AutoText className="text-gray-200 text-sm font-bold drop-shadow-md">
              Hoppa Över
            </AutoText>
          </TouchableOpacity>
        </View>
      )}

      {/* Auto-navigate indicator on last screen */}
      {index === slides.length - 1 && (
        <Animated.View
          style={{ opacity: fadeAnim }}
          className="absolute bottom-10 w-full items-center"
        >
          <AutoText className="text-white text-sm bg-dark/40 rounded-full px-4 py-2">
            Omdirigerar till startsidan...
          </AutoText>
        </Animated.View>
      )}
    </>
  );
};

export default LiquidSwipe;
