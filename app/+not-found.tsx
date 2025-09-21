import { Link, Stack } from "expo-router";
import { StyleSheet, View, Text } from "react-native";
import { AutoText } from "./components/ui/AutoText";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Oops!" }} />
      <View style={styles.container}>
        <AutoText>This screen doesn't exist.</AutoText>
        <Link href="/" style={styles.link}>
          <AutoText>Go to home screen!</AutoText>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
});
