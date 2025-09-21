import { Alert, AlertButton } from "react-native";
import { useLanguage } from "@/app/hooks/useLanguage";
import { translate } from "@/app/hooks/useTranslation"; // async function

export async function showAlert(
  title: string,
  message: string,
  buttons?: AlertButton[]
) {
  const { language } = useLanguage.getState();

  // 🔄 Translate title & message
  const translatedTitle = await translate(title, language);
  const translatedMessage = await translate(message, language);

  // 🔄 Translate button labels
  const translatedButtons = buttons
    ? await Promise.all(
        buttons.map(async (btn) => ({
          ...btn,
          text: await translate(btn.text as string, language),
        }))
      )
    : [
        {
          text: await translate("OK", language),
          style: "default" as const,
        },
      ];

  Alert.alert(translatedTitle, translatedMessage, translatedButtons);
}