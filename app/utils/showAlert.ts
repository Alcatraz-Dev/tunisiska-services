import { Alert, AlertButton, Platform } from "react-native";
import { useLanguageStore } from "@/app/hooks/useLanguage";
import { translate } from "@/app/hooks/useTranslation"; // async function

export async function showAlert(
  title: string,
  message: string,
  buttons?: AlertButton[]
) {
  const { language } = useLanguageStore.getState();

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

  // `Alert.alert` is a no-op on react-native-web, so every confirmation
  // silently did nothing in the browser — including "Sign out", which made the
  // web app impossible to log out of. Render the same dialog with the browser's
  // native alert/confirm instead.
  if (Platform.OS === "web") {
    showWebAlert(translatedTitle, translatedMessage, translatedButtons);
    return;
  }

  Alert.alert(translatedTitle, translatedMessage, translatedButtons);
}

function showWebAlert(title: string, message: string, buttons: AlertButton[]) {
  if (typeof window === "undefined") return;

  const body = message ? `${title}\n\n${message}` : title;

  const cancelButton = buttons.find((button) => button.style === "cancel");
  const actionButtons = buttons.filter(
    (button) => button !== cancelButton && button.style !== "cancel"
  );

  // Informational alert: nothing to choose.
  if (actionButtons.length === 0) {
    window.alert(body);
    cancelButton?.onPress?.();
    return;
  }

  // A single choice behaves like an acknowledgement.
  if (actionButtons.length === 1 && !cancelButton) {
    window.alert(body);
    actionButtons[0].onPress?.();
    return;
  }

  // Confirm dialogs only offer two outcomes, so the primary action is the first
  // non-cancel button and everything else stays a no-op.
  const confirmLabel = actionButtons[0].text ?? "OK";
  const accepted = window.confirm(`${body}\n\n${confirmLabel}?`);

  if (accepted) {
    actionButtons[0].onPress?.();
  } else {
    cancelButton?.onPress?.();
  }
}
