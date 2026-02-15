import React from "react";
import { Image } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import icons from "@/app/constants/icons";
import { useTheme } from "@/app/context/ThemeContext";
import HomeScreen from "@/app/components/Homescreen";
import ProfileScreen from "@/app/(home)/profile";
import BookingScreen from "@/app/(home)/profile/booking";
import WalletScreen from "@/app/(home)/profile/wallet";
import MapOverviewScreen from "@/app/(home)/map/overview";
import { useLanguage } from "@/app/hooks/useLanguage";
import { useTranslationText } from "@/app/hooks/useTranslation";
import { useUser } from "@clerk/clerk-expo";
import { CustomTabBar } from "./CustomTabBar";

function WaveTabBar() {
  const { resolvedTheme } = useTheme();
  const { user } = useUser();
  const isDark = resolvedTheme === "dark";
  const ACTIVE_COLOR = isDark ? "#F3F4F6" : "#2c2c2e";
  const INACTIVE_COLOR = "#9CA3AF";
  const { language } = useLanguage();

  // Translate tab titles
  const getTitle = (text: string) => useTranslationText(text, language);

  const Tab = createBottomTabNavigator();

  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName="Home"
      tabBar={(props) => <CustomTabBar {...props} />}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: getTitle("Home"),
          tabBarIcon: ({ focused }) => (
            <Image
              source={icons.homeIcon}
              style={{
                width: 24,
                height: 24,
                tintColor: focused ? ACTIVE_COLOR : INACTIVE_COLOR,
              }}
              resizeMode="contain"
            />
          ),
        }}
      />
      <Tab.Screen
        name="Booking"
        component={BookingScreen}
        options={{
          title: getTitle("Booking"),
          tabBarIcon: ({ focused }) => (
            <Image
              source={icons.calendar}
              style={{
                width: 24,
                height: 24,
                tintColor: focused ? ACTIVE_COLOR : INACTIVE_COLOR,
              }}
              resizeMode="contain"
            />
          ),
        }}
      />
      <Tab.Screen
        name="Wallet"
        component={WalletScreen}
        options={{
          title: getTitle("Wallet"),
          tabBarIcon: ({ focused }) => (
            <Image
              source={icons.wallet}
              style={{
                width: 24,
                height: 24,
                tintColor: focused ? ACTIVE_COLOR : INACTIVE_COLOR,
              }}
              resizeMode="contain"
            />
          ),
        }}
      />
      <Tab.Screen
        name="Map"
        component={MapOverviewScreen}
        options={{
          title: getTitle("Map"),
          tabBarIcon: ({ focused }) => (
            <Image
              source={icons.map}
              style={{
                width: 24,
                height: 24,
                tintColor: focused ? ACTIVE_COLOR : INACTIVE_COLOR,
              }}
              resizeMode="contain"
            />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: getTitle("Profile"),
          tabBarIcon: ({ focused }) => (
            <Image
              source={user?.imageUrl ? { uri: user.imageUrl } : icons.person}
              style={{
                width: 24,
                height: 24,
                borderRadius: user?.imageUrl ? 12 : 0,
                tintColor: user?.imageUrl ? undefined : focused ? ACTIVE_COLOR : INACTIVE_COLOR,
              }}
              resizeMode="contain"
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export default WaveTabBar;
