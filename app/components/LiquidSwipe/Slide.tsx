import { Ionicons } from "@expo/vector-icons";
import Color from "color";
import React from "react";
import { View, Text, Dimensions, Image } from "react-native";
import Svg, { RadialGradient, Defs, Rect, Stop } from "react-native-svg";
import Animated, { FadeInUp } from "react-native-reanimated";
import { AutoText } from "../ui/AutoText";

const { width, height } = Dimensions.get("screen");
const SIZE = width - 200;

export interface SlideProps {
  slide: {
    color: string;
    title: string;
    description: string;
    picture: any;
    icon: string;
    showImage?: boolean;
    showIcon?: boolean;
  };
}

const Slide = ({
  slide: { picture, color, title, description, icon, showImage = true, showIcon = true },
}: SlideProps) => {
  const lighterColor = Color(color).lighten(0.8).toString();

  return (
    <>
      {/* background RadialGradient */}
      <Svg className="absolute inset-0">
        <Defs>
          <RadialGradient id="gradient" cx="50%" cy="35%">
            <Stop offset="0%" stopColor={lighterColor} />
            <Stop offset="100%" stopColor={color} />
          </RadialGradient>
        </Defs>
        <Rect x={0} y={0} width={width} height={height} fill="url(#gradient)" />
      </Svg>

      {/* content */}
      <View className="absolute inset-0 px-[75px] pt-[150px] items-center">
        {showImage && picture && (
          <Animated.Image
            entering={FadeInUp.delay(200)}
            source={picture}
            style={{ width: SIZE, height: SIZE }}
            className="mt-5"
            resizeMode="contain"
          />
        )}
        
        <View className={`items-center ${!showImage ? "top-[40%]" : "top-[10%]"}`}>
          {showIcon && icon && (
            <Animated.View entering={FadeInUp.delay(400)}>
              <Ionicons
                name={icon as any}
                size={25}
                color="white"
                style={{ marginBottom: 20 }}
              />
            </Animated.View>
          )}
          <Animated.View
            entering={FadeInUp.delay(600)}
            
          >
            <AutoText className="text-white text-center mb-4 text-2xl font-extrabold drop-shadow-md">{title}</AutoText>
          </Animated.View>
          <Animated.View
            entering={FadeInUp.delay(800)}
          
          >
            <AutoText   className="text-white text-center text-sm drop-shadow-md">{description}</AutoText>
          </Animated.View>
        </View>
      </View>
    </>
  );
};

export default Slide;