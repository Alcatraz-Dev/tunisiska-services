import SwiftUI
import WidgetKit

/// The widget extension entry point.
///
/// The extension hosts exactly one widget: the next-departure Live Activity.
@main
struct NextDepartureWidgetBundle: WidgetBundle {
  var body: some Widget {
    NextDepartureWidget()
    NextDepartureHomeWidget()
  }
}
