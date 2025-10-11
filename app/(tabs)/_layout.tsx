
import WaveTabBar from "../components/WaveTabBar/WaveTabBar";
import { ThemeProvider } from "../context/ThemeContext";
import { SafeAreaProvider } from "react-native-safe-area-context";

export default function TabLayout() {
  return (
    <ThemeProvider>
      <SafeAreaProvider>
        <WaveTabBar />
      </SafeAreaProvider>
    </ThemeProvider>
  );
}
