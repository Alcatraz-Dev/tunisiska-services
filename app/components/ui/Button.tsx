import { useLanguage } from "@/app/hooks/useLanguage";
import { useTranslationText } from "@/app/hooks/useTranslation";
import { TouchableOpacity, Text } from "react-native";


export default function Button() {
  const { language } = useLanguage();
  const label = useTranslationText("Submit", language);

  return (
    <TouchableOpacity style={{ padding: 12, backgroundColor: "#0ea5e9", borderRadius: 8 }}>
      <Text style={{ color: "#fff" }}>{label}</Text>
    </TouchableOpacity>
  );
}