import { useAuth } from "@clerk/clerk-expo";
import { TouchableOpacity, Text, Alert, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";

export function SignOutButton() {
  const { signOut } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Sign Out",
        onPress: async () => {
          setLoading(true);
          try {
            await signOut();
          } catch (err) {
            console.error("Failed to sign out:", err);
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  return (
    <TouchableOpacity
      className={`flex-row items-center justify-center ${loading && "opacity-70"}`}
      onPress={handleSignOut}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator color="#EF4444" />
      ) : (
        <>
          <Ionicons name="log-out-outline" size={20} color="#EF4444" />
          <Text className="text-danger font-semibold ml-2">Sign Out</Text>
        </>
      )}
    </TouchableOpacity>
  );
}
