package expo.modules.tuniskaliveactivity

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.tuniskaliveactivity.TunisiskaDepartureWidgetProvider.Companion.Size

class TunisiskaLiveActivityModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("TunisiskaLiveActivity")

    // Android uses the Home Screen widgets. ActivityKit methods are iOS-only.
    AsyncFunction("updateTripWidget") { payload: String, language: String ->
      // `reactContext` is a weak reference and is absent in a bridgeless runtime,
      // so the widget snapshot must not depend on it alone: any of these
      // contexts can reach the app's SharedPreferences and AppWidgetManager.
      val context: Context? = appContext.reactContext ?: appContext.currentActivity

      val applicationContext = context?.applicationContext
      if (applicationContext == null) {
        false
      } else {
        val preferences = applicationContext.getSharedPreferences(
          TunisiskaDepartureWidgetProvider.PREFERENCES_NAME,
          Context.MODE_PRIVATE,
        )
        preferences.edit()
          .putString(TunisiskaDepartureWidgetProvider.PAYLOAD_KEY, payload)
          .putString(TunisiskaDepartureWidgetProvider.LANGUAGE_KEY, language)
          .apply()

        // Every size renders from the same snapshot, so all three are redrawn.
        val manager = AppWidgetManager.getInstance(applicationContext)
        providers.forEach { (provider, size) ->
          val component = ComponentName(applicationContext, provider)
          val widgetIds = manager.getAppWidgetIds(component)
          if (widgetIds.isNotEmpty()) {
            TunisiskaDepartureWidgetProvider.updateWidgets(
              applicationContext,
              manager,
              widgetIds,
              size,
            )
          }
          // Ask the launcher to re-read the widget even when it has not reported
          // its instances yet (a fresh widget, or a launcher that caches ids).
          applicationContext.sendBroadcast(
            Intent(AppWidgetManager.ACTION_APPWIDGET_UPDATE)
              .setComponent(component)
              .putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, widgetIds),
          )
        }
        true
      }
    }
  }

  private companion object {
    val providers = listOf(
      TunisiskaSmallDepartureWidgetProvider::class.java to Size.SMALL,
      TunisiskaMediumDepartureWidgetProvider::class.java to Size.MEDIUM,
      TunisiskaLargeDepartureWidgetProvider::class.java to Size.LARGE,
    )
  }
}
