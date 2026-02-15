import React from "react";
import { View, TouchableOpacity, Text, Image, StyleSheet } from "react-native";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useTheme } from "@/app/context/ThemeContext";
import Animated, {
    useAnimatedStyle,
    withSpring,
    useSharedValue,
    withTiming,
} from "react-native-reanimated";

export function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === "dark";

    const ACTIVE_COLOR = isDark ? "#F3F4F6" : "#2c2c2e";
    const INACTIVE_COLOR = "#9CA3AF";
    const BAR_COLOR = isDark ? "#2c2c2e" : "#F3F4F6";

    return (
        <View
            style={[
                styles.container,
                {
                    backgroundColor: BAR_COLOR,
                    borderTopColor: isDark ? "#3f3f46" : "#e5e7eb",
                },
            ]}
        >
            {state.routes.map((route, index) => {
                const { options } = descriptors[route.key];
                const label =
                    options.tabBarLabel !== undefined
                        ? options.tabBarLabel
                        : options.title !== undefined
                            ? options.title
                            : route.name;

                const isFocused = state.index === index;

                const onPress = () => {
                    const event = navigation.emit({
                        type: "tabPress",
                        target: route.key,
                        canPreventDefault: true,
                    });

                    if (!isFocused && !event.defaultPrevented) {
                        navigation.navigate(route.name);
                    }
                };

                const onLongPress = () => {
                    navigation.emit({
                        type: "tabLongPress",
                        target: route.key,
                    });
                };

                // Get icon from options
                const icon = options.tabBarIcon
                    ? options.tabBarIcon({
                        focused: isFocused,
                        color: isFocused ? ACTIVE_COLOR : INACTIVE_COLOR,
                        size: 24,
                    })
                    : null;

                return (
                    <TouchableOpacity
                        key={route.key}
                        accessibilityRole="button"
                        accessibilityState={isFocused ? { selected: true } : {}}
                        accessibilityLabel={options.tabBarAccessibilityLabel}
                        onPress={onPress}
                        onLongPress={onLongPress}
                        style={styles.tab}
                    >
                        <Animated.View
                            style={[
                                styles.iconContainer,
                                {
                                    transform: [
                                        {
                                            scale: isFocused ? 1.1 : 1,
                                        },
                                    ],
                                },
                            ]}
                        >
                            {icon}
                        </Animated.View>
                        <Text
                            style={[
                                styles.label,
                                {
                                    color: isFocused ? ACTIVE_COLOR : INACTIVE_COLOR,
                                    fontWeight: isFocused ? "600" : "400",
                                },
                            ]}
                        >
                            {typeof label === "string" ? label : ""}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: "row",
        height: 65,
        borderTopWidth: 1,
        paddingBottom: 8,
        paddingTop: 8,
        elevation: 8,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: -2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3,
    },
    tab: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    iconContainer: {
        marginBottom: 4,
    },
    label: {
        fontSize: 10,
    },
});
