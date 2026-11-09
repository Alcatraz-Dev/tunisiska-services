package expo.modules.tuniskaliveactivity

import expo.modules.tuniskaliveactivity.TunisiskaDepartureWidgetProvider.Companion.Size

/**
 * The three Home Screen widgets from the canvas.
 *
 * Each one declares its size up front, so the launcher gives it exactly the
 * cells the design was drawn for: the glance card at 2 × 2, the route card at
 * 4 × 2 and the departure briefing at 4 × 4.
 */
class TunisiskaSmallDepartureWidgetProvider : TunisiskaDepartureWidgetProvider() {
  override val fixedSize: Size = Size.SMALL
}

class TunisiskaMediumDepartureWidgetProvider : TunisiskaDepartureWidgetProvider() {
  override val fixedSize: Size = Size.MEDIUM
}

class TunisiskaLargeDepartureWidgetProvider : TunisiskaDepartureWidgetProvider() {
  override val fixedSize: Size = Size.LARGE
}
