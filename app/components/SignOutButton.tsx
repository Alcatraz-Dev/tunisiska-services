import { useAuth } from "@clerk/clerk-expo";
import { TouchableOpacity, Text, Alert, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { AutoText } from "./ui/AutoText";
import { showAlert } from "../utils/showAlert";

export function SignOutButton() {
  const { signOut } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleSignOut = () => {
    showAlert("Logga ut av appen", "Vill du logga ut av appen ? ",[
      {
        text: "Avbryt",
        style: "cancel",
      },
      {
        text: "Logga ut",
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
          <AutoText className="text-danger font-semibold ml-2">Logga ut</AutoText>
        </>
      )}
    </TouchableOpacity>
  );
}
