import { Link, Stack, useRouter } from "expo-router";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { AutoText } from "./components/ui/AutoText";
import { useTheme } from "./context/ThemeContext";

export default function NotFoundScreen() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const router = useRouter();

  return (
    <>
      <Stack.Screen options={{ title: "Sidan hittades inte", headerShown: false }} />
      <LinearGradient
        colors={isDark ? ["#0a0a0a", "#1a1a2e"] : ["#f8fafc", "#eff6ff"]}
        style={styles.container}
      >
        <View style={styles.content}>
          <View style={[styles.iconContainer, isDark ? styles.darkIcon : styles.lightIcon]}>
            <Ionicons 
              name="navigate-circle-outline" 
              size={120} 
              color={isDark ? "#3b82f6" : "#2563eb"} 
            />
          </View>

          <AutoText style={[styles.title, isDark ? styles.darkText : styles.lightText]}>
            Hoppsan!
          </AutoText>
          <AutoText style={[styles.message, isDark ? styles.darkSubtext : styles.lightSubtext]}>
            Vi kan inte hitta sidan du letar efter. Den kan ha flyttats eller raderats.
          </AutoText>

          <Link href="/" asChild>
            <TouchableOpacity style={styles.button}>
              <LinearGradient
                colors={["#3b82f6", "#2563eb"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.buttonGradient}
              >
                <Ionicons name="home" size={20} color="#fff" style={styles.buttonIcon} />
                <AutoText style={styles.buttonText}>Tillbaka till hem</AutoText>
              </LinearGradient>
            </TouchableOpacity>
          </Link>

          <TouchableOpacity 
            onPress={() => router.back()} 
            style={styles.backButton}
          >
            <AutoText style={[styles.backText, isDark ? styles.darkSubtext : styles.lightSubtext]}>
              Gå tillbaka
            </AutoText>
          </TouchableOpacity>
        </View>

        {/* Decorative background elements */}
        <View style={[styles.decoration, styles.decoration1, { backgroundColor: isDark ? "#3b82f615" : "#3b82f605" }]} />
        <View style={[styles.decoration, styles.decoration2, { backgroundColor: isDark ? "#6366f115" : "#6366f105" }]} />
      </LinearGradient>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  iconContainer: {
    marginBottom: 40,
    padding: 30,
    borderRadius: 60,
  },
  lightIcon: {
    backgroundColor: "#fff",
    shadowColor: "#2563eb",
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  darkIcon: {
    backgroundColor: "#111827",
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 20,
  },
  title: {
    fontSize: 42,
    fontWeight: "900",
    marginBottom: 16,
    textAlign: "center",
  },
  message: {
    fontSize: 18,
    textAlign: "center",
    marginBottom: 48,
    lineHeight: 26,
    paddingHorizontal: 20,
  },
  lightText: { color: "#0f172a" },
  darkText: { color: "#f8fafc" },
  lightSubtext: { color: "#64748b" },
  darkSubtext: { color: "#94a3b8" },
  button: {
    width: "100%",
    borderRadius: 24,
    overflow: "hidden",
    shadowColor: "#2563eb",
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  buttonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    paddingHorizontal: 24,
  },
  buttonIcon: {
    marginRight: 10,
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  backButton: {
    marginTop: 24,
    padding: 12,
  },
  backText: {
    fontSize: 16,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  decoration: {
    position: "absolute",
    borderRadius: 200,
    zIndex: 0,
  },
  decoration1: {
    width: 300,
    height: 300,
    top: -50,
    right: -100,
  },
  decoration2: {
    width: 250,
    height: 250,
    bottom: -50,
    left: -80,
  },
});
