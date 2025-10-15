import React from "react";
import { Text, Image, View } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import AnimatedTabBar, { TabsConfigsType } from "curved-bottom-navigation-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import icons from "@/app/constants/icons";
import { useTheme } from "@/app/context/ThemeContext";
import HomeScreen from "@/app/components/Homescreen";
import ProfileScreen from "@/app/(home)/profile";
import WalletScreen from "@/app/(home)/profile/wallet";
import BookingScreen from "@/app/(home)/profile/booking";
import { useLanguage } from "@/app/hooks/useLanguage";
import { useTranslationText } from "@/app/hooks/useTranslation";
const TAB_HEIGHT = 55;
export default function WaveTabBar() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const ACTIVE_COLOR_DOT = isDark ? "#1b1b1c" : "#F3F4F6";
  const ACTIVE_COLOR = isDark ? "#F3F4F6" : "#2c2c2e";
  const INACTIVE_COLOR = "#9CA3AF";
  const BAR_COLOR = isDark ? "#2c2c2e" : "#F3F4F6";
  const BORDER_COLOR = isDark ? "#ffffff" : "#2c2c2e";
  const { language } = useLanguage();
  // Translate tab titles
  const getTitle = (text: string) => useTranslationText(text, language);
  const tabs: TabsConfigsType = {
    Home: {
      icon: ({ focused }) => (
        <Image
          source={icons.homeIcon}
          style={{
            width: 26,
            height: 26,
            marginTop: focused ? 8 : 20, // Added space from top of bar
            marginBottom: 4, // Space between icon and title
            tintColor: focused ? ACTIVE_COLOR : INACTIVE_COLOR,
          }}
          resizeMode="contain"
        />
      ),
      renderTitle: ({ focused, title }) => (
        <Text
          style={{
            color: focused ? ACTIVE_COLOR : INACTIVE_COLOR,
            fontWeight: "600",
            fontSize: 10,
            marginTop: 2, // Space between icon and title
          }}
        >
        {getTitle("Home")}
        </Text>
      ),
    },
    Profile: {
      icon: ({ focused }) => (
        <Image
          source={icons.person}
          style={{
            width: 26,
            height: 26,
            marginTop: focused ? 8 : 20, // Added space from top of bar
            marginBottom: 4, // Space between icon and title
            tintColor: focused ? ACTIVE_COLOR : INACTIVE_COLOR,
          }}
          resizeMode="contain"
        />
      ),
      renderTitle: ({ focused, title }) => (
        <Text
          style={{
            color: focused ? ACTIVE_COLOR : INACTIVE_COLOR,
            fontWeight: "600",
            fontSize: 10,
            marginTop: 2, // Space between icon and title
          }}
        >
        {getTitle("Profile")}
        </Text>
      ),
    },
    Wallet: {
      icon: ({ focused }) => (
        <Image
          source={icons.wallet}
          style={{
            width: 26,
            height: 26,
            marginTop: focused ? 8 : 20, // Added space from top of bar
            marginBottom: 4, // Space between icon and title
            tintColor: focused ? ACTIVE_COLOR : INACTIVE_COLOR,
          }}
          resizeMode="contain"
        />
      ),
      renderTitle: ({ focused, title }) => (
        <Text
          style={{
            color: focused ? ACTIVE_COLOR : INACTIVE_COLOR,
            fontWeight: "600",
            fontSize: 10,
            marginTop: 2, // Space between icon and title
          }}
        >
         {getTitle("Wallet")}
        </Text>
      ),
    },
    Booking: {
      icon: ({ focused }) => (
        <Image
          source={icons.calendar}
          style={{
            width: 26,
            height: 26,
            marginTop: focused ? 8 : 20, // Added space from top of bar
            marginBottom: 4, // Space between icon and title
            tintColor: focused ? ACTIVE_COLOR : INACTIVE_COLOR,
          }}
          resizeMode="contain"
        />
      ),
      renderTitle: ({ focused }) => (
        <Text
          style={{
            color: focused ? ACTIVE_COLOR : INACTIVE_COLOR,
            fontWeight: "600",
            fontSize: 10,
            marginTop: 2, // Space between icon and title
          }}
        >
        {getTitle("Booking")}
        </Text>
      ),
    },
  };
  const Tab = createBottomTabNavigator();
  return (
    <SafeAreaProvider>
      <Tab.Navigator
        screenOptions={{ headerShown: false }}
        tabBar={(props) => (
          <View
            style={{
              borderTopWidth: 2,
              borderTopColor: BORDER_COLOR,
              backgroundColor: BAR_COLOR,
            }}
          >
            <AnimatedTabBar
              {...props}
              dotColor={ACTIVE_COLOR_DOT}
              tabs={tabs}
              barColor={BAR_COLOR}
              barHeight={TAB_HEIGHT}
              titleShown={true}
            />
          </View>
        )}
      >
        <Tab.Screen
          name="Home"
          component={HomeScreen}
          options={{ title: "Hem" }}
        />
        <Tab.Screen
          name="Booking"
          component={BookingScreen}
          options={{ title: "Bokningar" }}
        />
        <Tab.Screen
          name="Wallet"
          component={WalletScreen}
          options={{ title: "Wallet" }}
        />
        <Tab.Screen
          name="Profile"
          component={ProfileScreen}
          options={{ title: "Profil" }}
        />
      </Tab.Navigator>
    </SafeAreaProvider>
  );
}
