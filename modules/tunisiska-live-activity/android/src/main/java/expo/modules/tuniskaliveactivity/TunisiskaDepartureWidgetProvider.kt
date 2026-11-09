package expo.modules.tuniskaliveactivity

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.View
import android.widget.RemoteViews
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import java.util.concurrent.TimeUnit

/**
 * The Home Screen widget.
 *
 * The canvas designs three presentations — 2 × 2, 4 × 2 and 4 × 4 — so each is
 * registered as its own provider with an exact size. A launcher cannot then
 * hand the briefing layout a 2 × 2 box (or the glance card a 4 × 4 one) because
 * it misreports the current span, which is the one thing Android does not tell
 * a provider reliably.
 *
 * The container comes from resources: a white surface in light mode, the brand
 * navy field in dark mode, with the accent carrying the cargo bar, the countdown
 * ring and the status pill. The payload is the same snapshot the app publishes
 * for the iOS widget and the Live Activity, so all three surfaces agree about
 * the next departure.
 */
open class TunisiskaDepartureWidgetProvider : AppWidgetProvider() {
  /** The presentation this provider always renders, or null to follow the span. */
  protected open val fixedSize: Size? = null

  override fun onUpdate(context: Context, manager: AppWidgetManager, widgetIds: IntArray) {
    updateWidgets(context, manager, widgetIds, fixedSize)
  }

  /**
   * Fixed-size providers only need a redraw; a provider that follows the
   * launcher's span also waits for the settled options, because they arrive a
   * moment after the gesture ends.
   */
  override fun onAppWidgetOptionsChanged(
    context: Context,
    manager: AppWidgetManager,
    widgetId: Int,
    newOptions: Bundle,
  ) {
    updateWidgets(context, manager, intArrayOf(widgetId), fixedSize)
    if (fixedSize != null) return
    Handler(Looper.getMainLooper()).postDelayed(
      { updateWidgets(context, manager, intArrayOf(widgetId), null) },
      SIZE_SETTLE_DELAY_MS,
    )
  }

  companion object {
    const val PREFERENCES_NAME = "tunisiska_next_departure_widget"
    const val PAYLOAD_KEY = "nextDepartureWidget"
    const val LANGUAGE_KEY = "nextDepartureWidgetLanguage"

    private const val URI_SCHEME = "tunisiska-mega-service"
    private const val SIZE_SETTLE_DELAY_MS = 500L
    private const val ACTION_PRIMARY_BASE = 20_000
    private const val ACTION_SECONDARY_BASE = 40_000

    enum class Size { SMALL, MEDIUM, LARGE }

    /**
     * Render every instance of a provider. `size` is the provider's fixed
     * presentation; when it is null the launcher's reported span decides.
     */
    fun updateWidgets(
      context: Context,
      manager: AppWidgetManager,
      widgetIds: IntArray,
      size: Size?,
    ) {
      val preferences = context.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)
      val payload = preferences.getString(PAYLOAD_KEY, null)
      val language = preferences.getString(LANGUAGE_KEY, "en") ?: "en"
      val trip = payload?.takeIf { it.isNotBlank() }?.let {
        runCatching { JSONObject(it) }.getOrNull()
      }
      val tripId = trip?.optString("tripId")?.takeIf { it.isNotBlank() }

      widgetIds.forEach { widgetId ->
        val presentation = size ?: sizeFor(manager.getAppWidgetOptions(widgetId))
        val views = RemoteViews(context.packageName, layoutFor(presentation))

        if (trip == null) {
          showEmptyState(views, language)
        } else {
          showDeparture(context, views, presentation, trip, language)
        }

        views.setOnClickPendingIntent(
          R.id.widget_root,
          tripPendingIntent(context, tripId, widgetId),
        )
        if (presentation == Size.LARGE) {
          views.setOnClickPendingIntent(
            R.id.widget_action_primary,
            tripPendingIntent(context, tripId, ACTION_PRIMARY_BASE + widgetId),
          )
          views.setOnClickPendingIntent(
            R.id.widget_action_secondary,
            trackPendingIntent(context, ACTION_SECONDARY_BASE + widgetId),
          )
        }

        manager.updateAppWidget(widgetId, views)
      }
    }

    // MARK: Layout selection

    /**
     * 2 × 2 is roughly 110 × 110 dp, 4 × 2 is 250 × 110 dp and 4 × 4 is
     * 250 × 250 dp, so the height alone separates the briefing from the rest
     * and the width separates the two compact cards.
     *
     * Launchers report the width of the portrait span in `minWidth`, but their
     * `minHeight` is often pinned to the widget's minimum (two rows) even when
     * the instance is taller. The upper bound tracks the span more closely, so
     * the taller of the two heights decides whether the briefing fits.
     */
    private fun sizeFor(options: Bundle): Size {
      val width = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 250)
      val height = maxOf(
        options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, 110),
        options.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT, 110),
      )
      return when {
        width >= 200 && height >= 240 -> Size.LARGE
        width >= 180 -> Size.MEDIUM
        else -> Size.SMALL
      }
    }

    fun layoutFor(size: Size): Int = when (size) {
      Size.SMALL -> R.layout.tunisiska_departure_widget_small
      Size.MEDIUM -> R.layout.tunisiska_departure_widget_medium
      Size.LARGE -> R.layout.tunisiska_departure_widget_large
    }

    // MARK: Rendering

    private fun showEmptyState(views: RemoteViews, language: String) {
      views.setViewVisibility(R.id.widget_departure_content, View.GONE)
      views.setViewVisibility(R.id.widget_empty_content, View.VISIBLE)
      views.setTextViewText(R.id.widget_empty_title, text(language, "no_trip"))
      views.setTextViewText(R.id.widget_empty_message, text(language, "empty_message"))
      views.setContentDescription(R.id.widget_root, text(language, "empty_message"))
    }

    private fun showDeparture(
      context: Context,
      views: RemoteViews,
      size: Size,
      trip: JSONObject,
      language: String,
    ) {
      views.setViewVisibility(R.id.widget_empty_content, View.GONE)
      views.setViewVisibility(R.id.widget_departure_content, View.VISIBLE)

      val locale = localeFor(language)
      val zone = zoneFor(trip.optString("timeZoneIdentifier"))
      val origin = trip.optString("origin").ifBlank { trip.optString("route") }
      val destination = trip.optString("destination")
      val route = trip.optString("route").ifBlank { "$origin → $destination" }
      val vehicle = trip.optString("vehicle").ifBlank { text(language, "transport") }
      val departureMillis = trip.optLong("date", 0L)
      val days = daysUntil(departureMillis, zone)
      val status = statusToken(trip.optString("status", "scheduled"))
      val capacity = trip.optInt("capacity", 0).coerceAtLeast(0)
      val available = trip.optInt("available", capacity).coerceIn(0, capacity)

      val dayNumber = format(departureMillis, "d", locale, zone, text(language, "date_pending"))
      val monthTime = format(departureMillis, "MMM · HH:mm", locale, zone, text(language, "date_pending"))
      val dateTime = format(departureMillis, "d MMM · HH:mm", locale, zone, text(language, "date_pending"))

      views.setTextViewText(
        R.id.widget_title,
        text(language, if (size == Size.SMALL) "next_trip" else "next_departure"),
      )

      when (size) {
        Size.SMALL -> {
          views.setTextViewText(R.id.widget_day, dayNumber)
          views.setTextViewText(R.id.widget_meta, monthTime)
          views.setTextViewText(R.id.widget_route, route)
        }

        Size.MEDIUM -> {
          views.setTextViewText(R.id.widget_origin, origin)
          views.setTextViewText(R.id.widget_destination, destination)
          views.setTextViewText(R.id.widget_meta, "$dateTime · $vehicle")
          applyCapacity(views, capacity, available)
          applyCountdown(views, departureMillis, days, language)
          views.setTextViewText(R.id.widget_track, text(language, "track"))
          applyStatus(context, views, status, language)
        }

        Size.LARGE -> {
          applyCountdown(views, departureMillis, days, language)
          views.setTextViewText(R.id.widget_date_time, dateTime)
          views.setTextViewText(R.id.widget_origin, origin)
          views.setTextViewText(
            R.id.widget_origin_note,
            "${text(language, "collection")} · $dateTime",
          )
          views.setTextViewText(R.id.widget_destination, destination)
          views.setTextViewText(R.id.widget_destination_note, text(language, "delivery"))
          applyCapacity(views, capacity, available)
          views.setTextViewText(R.id.widget_action_primary, text(language, "view_trip"))
          views.setTextViewText(R.id.widget_action_secondary, text(language, "track_parcel"))
          applyStatus(context, views, status, language)
        }
      }

      views.setContentDescription(
        R.id.widget_root,
        "$route · $vehicle · ${capacityText(available, capacity, language)}",
      )
    }

    private fun applyCapacity(views: RemoteViews, capacity: Int, available: Int) {
      if (capacity > 0) {
        views.setViewVisibility(R.id.widget_capacity_container, View.VISIBLE)
        views.setTextViewText(R.id.widget_capacity, "$available / $capacity")
        views.setProgressBar(R.id.widget_capacity_progress, capacity, available, false)
      } else {
        views.setViewVisibility(R.id.widget_capacity_container, View.GONE)
      }
    }

    /**
     * Days lead while the departure is further out; inside the last day the
     * same slot counts hours, so the widget never shows a stale "00 days".
     */
    private fun applyCountdown(
      views: RemoteViews,
      departureMillis: Long,
      days: Int,
      language: String,
    ) {
      val remaining = departureMillis - System.currentTimeMillis()
      val value: String
      val unit: String
      if (departureMillis <= 0L) {
        value = "—"
        unit = ""
      } else if (remaining <= 0L) {
        value = "—"
        unit = ""
      } else if (days > 0) {
        value = String.format(Locale.US, "%02d", days)
        unit = text(language, "days")
      } else {
        val hours = TimeUnit.MILLISECONDS.toHours(remaining).coerceAtLeast(0L)
        value = String.format(Locale.US, "%02d", hours)
        unit = text(language, "hours")
      }

      views.setTextViewText(R.id.widget_days, value)
      views.setTextViewText(R.id.widget_days_unit, unit)
    }

    private fun applyStatus(
      context: Context,
      views: RemoteViews,
      status: String,
      language: String,
    ) {
      val (background, foreground) = when (status) {
        "scheduled" -> R.drawable.tunisiska_widget_pill_success to
          R.color.tunisiska_widget_pill_success_fg
        "departing_soon", "full" -> R.drawable.tunisiska_widget_pill_warning to
          R.color.tunisiska_widget_pill_warning_fg
        "cancelled" -> R.drawable.tunisiska_widget_pill_danger to
          R.color.tunisiska_widget_pill_danger_fg
        else -> R.drawable.tunisiska_widget_pill_neutral to
          R.color.tunisiska_widget_pill_neutral_fg
      }

      views.setViewVisibility(R.id.widget_status, View.VISIBLE)
      views.setTextViewText(R.id.widget_status, statusLabel(status, language))
      views.setInt(R.id.widget_status, "setBackgroundResource", background)
      views.setTextColor(R.id.widget_status, context.getColor(foreground))
    }

    // MARK: Deep links

    private fun tripPendingIntent(context: Context, tripId: String?, requestCode: Int): PendingIntent {
      val destination = if (tripId == null) "trips" else "trips/$tripId"
      return deepLink(context, destination, requestCode)
    }

    private fun trackPendingIntent(context: Context, requestCode: Int): PendingIntent =
      deepLink(context, "trips/track", requestCode)

    private fun deepLink(context: Context, destination: String, requestCode: Int): PendingIntent {
      val intent = Intent(Intent.ACTION_VIEW, Uri.parse("$URI_SCHEME://$destination"))
        .setPackage(context.packageName)
      intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
      return PendingIntent.getActivity(
        context,
        requestCode,
        intent,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
      )
    }

    // MARK: Formatting

    private fun localeFor(language: String): Locale = when (language) {
      "sv" -> Locale.forLanguageTag("sv-SE")
      "ar" -> Locale.forLanguageTag("ar-TN")
      else -> Locale.forLanguageTag("en-US")
    }

    private fun zoneFor(identifier: String): TimeZone {
      if (identifier.isBlank()) return TimeZone.getDefault()
      return if (TimeZone.getAvailableIDs().contains(identifier)) {
        TimeZone.getTimeZone(identifier)
      } else {
        TimeZone.getDefault()
      }
    }

    private fun format(
      millis: Long,
      pattern: String,
      locale: Locale,
      zone: TimeZone,
      fallback: String,
    ): String {
      if (millis <= 0L) return fallback
      return SimpleDateFormat(pattern, locale)
        .apply { timeZone = zone }
        .format(Date(millis))
    }

    /** Whole days between today and the departure, both in the origin's zone. */
    private fun daysUntil(departureMillis: Long, zone: TimeZone): Int {
      if (departureMillis <= 0L) return 0
      val today = Calendar.getInstance(zone).apply { startOfDay() }
      val target = Calendar.getInstance(zone).apply {
        timeInMillis = departureMillis
        startOfDay()
      }
      val days = TimeUnit.MILLISECONDS.toDays(target.timeInMillis - today.timeInMillis)
      return days.coerceAtLeast(0L).toInt()
    }

    private fun Calendar.startOfDay() {
      set(Calendar.HOUR_OF_DAY, 0)
      set(Calendar.MINUTE, 0)
      set(Calendar.SECOND, 0)
      set(Calendar.MILLISECOND, 0)
    }

    // MARK: Copy

    private fun text(language: String, key: String): String = when (language) {
      "sv" -> when (key) {
        "next_departure" -> "NÄSTA AVGÅNG"
        "next_trip" -> "NÄSTA"
        "no_trip" -> "Ingen kommande resa"
        "empty_message" -> "Öppna appen för att se nästa avgång."
        "date_pending" -> "Datum meddelas"
        "transport" -> "Transport"
        "days" -> "dagar"
        "hours" -> "tim"
        "track" -> "SPÅRA"
        "track_parcel" -> "Spåra paket"
        "view_trip" -> "Visa resa"
        "collection" -> "Upphämtning"
        "delivery" -> "Leveranspunkt"
        else -> ""
      }
      "ar" -> when (key) {
        "next_departure" -> "الرحلة القادمة"
        "next_trip" -> "التالية"
        "no_trip" -> "لا توجد رحلة قادمة"
        "empty_message" -> "افتح التطبيق لمعرفة موعد المغادرة التالي."
        "date_pending" -> "سيُعلن عن الموعد لاحقًا"
        "transport" -> "النقل"
        "days" -> "أيام"
        "hours" -> "س"
        "track" -> "تتبع"
        "track_parcel" -> "تتبع الطرد"
        "view_trip" -> "عرض الرحلة"
        "collection" -> "الاستلام"
        "delivery" -> "نقطة التسليم"
        else -> ""
      }
      else -> when (key) {
        "next_departure" -> "NEXT DEPARTURE"
        "next_trip" -> "NEXT"
        "no_trip" -> "No upcoming trip"
        "empty_message" -> "Open the app to see the next departure."
        "date_pending" -> "Date to be announced"
        "transport" -> "Transport"
        "days" -> "days"
        "hours" -> "h"
        "track" -> "TRACK"
        "track_parcel" -> "Track parcel"
        "view_trip" -> "View trip"
        "collection" -> "Collection"
        "delivery" -> "Delivery point"
        else -> ""
      }
    }

    /** The app publishes `scheduled`, `departing_soon`, `full`, `cancelled` or `departed`. */
    private fun statusToken(raw: String): String {
      val value = raw.lowercase(Locale.ROOT)
      return when {
        value.contains("cancel") -> "cancelled"
        value.contains("departing") -> "departing_soon"
        value.contains("depart") || value.contains("complet") -> "departed"
        value in setOf("full", "sold_out", "unavailable") -> "full"
        value.isBlank() || value == "available" || value == "scheduled" -> "scheduled"
        else -> value
      }
    }

    private fun statusLabel(status: String, language: String): String = when (language) {
      "sv" -> when (status) {
        "scheduled" -> "PLANERAD"
        "departing_soon" -> "AVGÅR SNART"
        "full" -> "FULL"
        "cancelled" -> "INSTÄLLD"
        "departed" -> "AVGÅNGEN"
        else -> status.uppercase(Locale.getDefault())
      }
      "ar" -> when (status) {
        "scheduled" -> "مجدول"
        "departing_soon" -> "تغادر قريبًا"
        "full" -> "ممتلئ"
        "cancelled" -> "ملغى"
        "departed" -> "غادر"
        else -> status.uppercase(Locale.getDefault())
      }
      else -> when (status) {
        "scheduled" -> "SCHEDULED"
        "departing_soon" -> "DEPARTING SOON"
        "full" -> "FULL"
        "cancelled" -> "CANCELLED"
        "departed" -> "DEPARTED"
        else -> status.uppercase(Locale.US)
      }
    }

    private fun capacityText(available: Int, capacity: Int, language: String): String {
      if (capacity <= 0) {
        return when (language) {
          "sv" -> "Kapacitet ej angiven"
          "ar" -> "السعة غير محددة"
          else -> "Capacity not shared"
        }
      }
      return when (language) {
        "sv" -> "$available av $capacity platser lediga"
        "ar" -> "$available من أصل $capacity مكانًا متاحًا"
        else -> "$available of $capacity spaces left"
      }
    }
  }
}
