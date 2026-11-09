import ActivityKit
import SwiftUI
import WidgetKit

// MARK: - Brand palette

private enum Brand {
  static let navy = Color(red: 0.075, green: 0.169, blue: 0.333)
  static let orange = Color(red: 0.949, green: 0.463, blue: 0.106)
  static let orangeSoft = Color(red: 1.0, green: 0.957, blue: 0.925)
  static let ink = Color(red: 0.047, green: 0.086, blue: 0.149)
  static let muted = Color(red: 0.333, green: 0.384, blue: 0.478)
  static let line = Color(red: 0.894, green: 0.914, blue: 0.941)
}

// MARK: - Widget

struct NextDepartureWidget: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: NextDepartureAttributes.self) { context in
      LockScreenView(context: context)
        .activityBackgroundTint(.white)
        .activitySystemActionForegroundColor(Brand.navy)
        .environment(\.layoutDirection, .leftToRight)
        .environment(\.locale, Brand.locale(context.attributes.language))
    } dynamicIsland: { context in
      DynamicIsland {
        DynamicIslandExpandedRegion(.leading) {
          HStack(spacing: 8) {
            ZStack {
              Circle().fill(Brand.orangeSoft).frame(width: 32, height: 32)
              ActivityPulseIcon(size: 13, color: Brand.orange)
            }
            VStack(alignment: .leading, spacing: 2) {
              Text(Brand.text("next", context.attributes.language))
                .font(.caption2.weight(.medium))
                .foregroundStyle(Brand.muted)
              Text(context.attributes.routeLabel)
                .font(.caption.weight(.bold))
                .foregroundStyle(Brand.ink)
                .lineLimit(1)
            }
          }
          .environment(\.layoutDirection, .leftToRight)
          .environment(\.locale, Brand.locale(context.attributes.language))
        }

        DynamicIslandExpandedRegion(.trailing) {
          VStack(alignment: .trailing, spacing: 2) {
            Text(Self.departureText(context.state.departureDate, attributes: context.attributes))
              .font(.caption.weight(.bold))
              .foregroundStyle(Brand.ink)
              .monospacedDigit()
            Text(context.state.departureDate, style: .relative)
              .font(.caption2.weight(context.state.status == "departing_soon" ? .bold : .regular))
              .foregroundStyle(context.state.status == "departing_soon" ? Brand.orange : Brand.muted)
              .lineLimit(1)
          }
          .environment(\.layoutDirection, .leftToRight)
          .environment(\.locale, Brand.locale(context.attributes.language))
        }

        DynamicIslandExpandedRegion(.bottom) {
          VStack(spacing: 9) {
            HStack(spacing: 8) {
              HStack(spacing: 5) {
                Image(systemName: "mappin.and.ellipse")
                  .foregroundStyle(Brand.navy)
                Text("\(context.attributes.origin) → \(context.attributes.destination)")
                  .lineLimit(1)
              }
              .font(.caption2.weight(.medium))
              .foregroundStyle(Brand.muted)

              Spacer(minLength: 0)

              HStack(spacing: 5) {
                Image(systemName: "truck.box.fill")
                Text(Brand.vehicle(context.attributes.vehicle, context.attributes.language))
              }
              .font(.caption2.weight(.semibold))
              .foregroundStyle(Brand.navy)
            }
            if let capacity = context.state.capacity, capacity > 0 {
              HStack(spacing: 8) {
                StatusPill(status: context.state.status, language: context.attributes.language)
                ProgressView(
                  value: Double(max(0, min(context.state.available ?? capacity, capacity))),
                  total: Double(capacity)
                )
                .tint(Brand.orange)
                Text("\(context.state.available ?? capacity)/\(capacity)")
                  .font(.caption2.weight(.bold).monospacedDigit())
                  .foregroundStyle(Brand.ink)
                  .contentTransition(.numericText())
              }
              .transition(.opacity.combined(with: .move(edge: .bottom)))
            }
          }
          .font(.caption2)
          .padding(.top, 4)
          .animation(.spring(response: 0.36, dampingFraction: 0.82), value: context.state.available)
          .animation(.spring(response: 0.36, dampingFraction: 0.82), value: context.state.status)
          .environment(\.layoutDirection, .leftToRight)
          .environment(\.locale, Brand.locale(context.attributes.language))
        }
      } compactLeading: {
        HStack(spacing: 4) {
          Circle()
            .fill(Brand.orange)
            .frame(width: 6, height: 6)
          ActivityPulseIcon(size: 14, color: Brand.orange)
        }
      } compactTrailing: {
        Text(Self.compactTime(context.state.departureDate, attributes: context.attributes))
          .font(.caption2.weight(.bold))
          .foregroundStyle(context.state.status == "departing_soon" ? Brand.orange : .white)
          .monospacedDigit()
          .contentTransition(.numericText())
      } minimal: {
        HStack(spacing: 2) {
          ActivityPulseIcon(size: 11, color: Brand.orange)
          Text(Self.compactDays(context.state.departureDate, attributes: context.attributes))
            .font(.system(size: 10, weight: .bold, design: .rounded))
            .foregroundStyle(.white)
            .monospacedDigit()
        }
      }
      .widgetURL(URL(string: "tunisiska-mega-service://trips/\(context.attributes.tripId)"))
      .keylineTint(Brand.orange)
    }
  }

  // MARK: - Formatting

  /// `14:00` in the departure's own local time.
  static func departureText(_ date: Date, attributes: NextDepartureAttributes) -> String {
    let formatter = DateFormatter()
    formatter.dateFormat = "d MMM · HH:mm"
    formatter.timeZone = TimeZone(identifier: attributes.timeZoneIdentifier ?? "") ?? .current
    formatter.locale = Brand.locale(attributes.language)
    return formatter.string(from: date)
  }

  /// `5d` / `2h` — the countdown the minimal presentation shows.
  static func compactDays(_ date: Date, attributes: NextDepartureAttributes) -> String {
    let calendar = Calendar.current
    let days = max(
      0,
      calendar.dateComponents(
        [.day],
        from: calendar.startOfDay(for: .now),
        to: calendar.startOfDay(for: date)
      ).day ?? 0
    )
    if days > 0 {
      return attributes.language == "ar" ? "\(days)ي" : "\(days)d"
    }
    let hours = max(0, calendar.dateComponents([.hour], from: .now, to: date).hour ?? 0)
    switch attributes.language {
    case "ar": return "\(hours)س"
    case "sv": return "\(hours)t"
    default: return "\(hours)h"
    }
  }

  /// `14:00` — compact form for the Dynamic Island.
  static func compactTime(_ date: Date, attributes: NextDepartureAttributes) -> String {
    let formatter = DateFormatter()
    formatter.dateFormat = "HH:mm"
    formatter.timeZone = TimeZone(identifier: attributes.timeZoneIdentifier ?? "") ?? .current
    formatter.locale = Brand.locale(attributes.language)
    return formatter.string(from: date)
  }
}

// MARK: - Lock screen / banner

private struct LockScreenView: View {
  let context: ActivityViewContext<NextDepartureAttributes>

  /// The ring reports remaining cargo; 0.64 is the decorative arc used when a
  /// departure has no published capacity.
  private var capacityRatio: Double {
    guard let capacity = context.state.capacity, capacity > 0 else { return 0.64 }
    let available = context.state.available ?? capacity
    return Double(max(0, min(available, capacity))) / Double(capacity)
  }

  var body: some View {
    VStack(alignment: .leading, spacing: 12) {
      HStack(spacing: 11) {
        ZStack {
          RoundedRectangle(cornerRadius: 11).fill(Brand.orangeSoft).frame(width: 42, height: 42)
          ActivityPulseIcon(size: 17, color: Brand.orange)
        }

        VStack(alignment: .leading, spacing: 3) {
          Text(Brand.text("next", context.attributes.language))
            .font(.system(size: 10, weight: .semibold, design: .rounded))
            .textCase(.uppercase)
            .tracking(0.8)
            .foregroundStyle(Brand.muted.opacity(0.8))
          Text(NextDepartureWidget.departureText(context.state.departureDate, attributes: context.attributes))
            .font(.system(size: 15, weight: .bold, design: .rounded))
            .foregroundStyle(Brand.ink)
          Text(context.attributes.routeLabel)
            .font(.system(size: 11, weight: .regular, design: .rounded))
            .foregroundStyle(Brand.muted)
        }

        Spacer(minLength: 4)

        ZStack {
          Circle().stroke(Brand.line, lineWidth: 4)
          Circle()
            .trim(from: 0, to: capacityRatio)
            .stroke(Brand.orange, style: StrokeStyle(lineWidth: 4, lineCap: .round))
            .rotationEffect(.degrees(-90))
            .animation(.spring(response: 0.42, dampingFraction: 0.85), value: capacityRatio)
          Image(systemName: "arrow.up")
            .font(.system(size: 10, weight: .bold))
            .foregroundStyle(Brand.navy)
        }
        .frame(width: 36, height: 36)
      }

      HStack(spacing: 6) {
        Image(systemName: "mappin.and.ellipse")
          .foregroundStyle(Brand.navy)
        Text("\(context.attributes.origin) → \(context.attributes.destination)")
          .lineLimit(1)
        Spacer(minLength: 0)
        Image(systemName: "truck.box.fill")
          .foregroundStyle(Brand.navy)
        Text(Brand.vehicle(context.attributes.vehicle, context.attributes.language))
          .fontWeight(.semibold)
          .foregroundStyle(Brand.navy)
      }
      .font(.system(size: 10, weight: .regular, design: .rounded))
      .foregroundStyle(Brand.muted)
      .padding(.horizontal, 10)
      .padding(.vertical, 8)
      .background(Color(red: 0.949, green: 0.961, blue: 0.980), in: RoundedRectangle(cornerRadius: 13))

      if let capacity = context.state.capacity, capacity > 0 {
        HStack(spacing: 9) {
          StatusPill(status: context.state.status, language: context.attributes.language)
          VStack(alignment: .leading, spacing: 5) {
            HStack {
              Text(Brand.capacity(context.attributes.language))
              Spacer(minLength: 4)
              Text("\(context.state.available ?? capacity) / \(capacity)")
                .monospacedDigit()
                .contentTransition(.numericText())
            }
            .font(.system(size: 10, weight: .semibold, design: .rounded))
            .foregroundStyle(Brand.muted)
            ProgressView(
              value: Double(max(0, min(context.state.available ?? capacity, capacity))),
              total: Double(capacity)
            )
            .tint(Brand.orange)
          }
        }
        .transition(.opacity.combined(with: .move(edge: .bottom)))
      }
    }
    .padding(.horizontal, 16)
    .padding(.vertical, 14)
    .animation(.spring(response: 0.36, dampingFraction: 0.82), value: context.state.available)
    .animation(.spring(response: 0.36, dampingFraction: 0.82), value: context.state.status)
    .environment(\.layoutDirection, .leftToRight)
  }
}

private struct ActivityPulseIcon: View {
  let size: CGFloat
  let color: Color

  var body: some View {
    if #available(iOS 17.0, *) {
      Image(systemName: "truck.box.fill")
        .font(.system(size: size, weight: .bold))
        .foregroundStyle(color)
        .symbolEffect(.pulse, options: .repeating)
    } else {
      Image(systemName: "truck.box.fill")
        .font(.system(size: size, weight: .bold))
        .foregroundStyle(color)
    }
  }
}

private struct StatusPill: View {
  let status: String
  let language: String?

  var body: some View {
    Text(Brand.status(status, language))
      .font(.system(size: 9, weight: .bold, design: .rounded))
      .textCase(.uppercase)
      .tracking(0.45)
      .foregroundStyle(Brand.statusColor(status))
      .padding(.horizontal, 8)
      .padding(.vertical, 5)
      .background(Brand.statusColor(status).opacity(0.1), in: Capsule())
      .overlay(Capsule().stroke(Brand.statusColor(status).opacity(0.16), lineWidth: 1))
  }
}

private extension Brand {
  static func locale(_ language: String?) -> Locale {
    switch language {
    case "ar": return Locale(identifier: "ar")
    case "sv": return Locale(identifier: "sv_SE")
    default: return Locale(identifier: "en_US")
    }
  }

  static func text(_ key: String, _ language: String?) -> String {
    switch (key, language) {
    case ("next", "sv"): return "Nästa avgång"
    case ("next", "ar"): return "المغادرة القادمة"
    default: return "Next departure"
    }
  }

  static func vehicle(_ key: String?, _ language: String?) -> String {
    let normalized = key?.lowercased() ?? ""
    switch (normalized, language) {
    case ("truck", "sv"): return "Lastbil"
    case ("truck", "ar"): return "شاحنة"
    case ("cargo_van", "sv"): return "Skåpbil"
    case ("cargo_van", "ar"): return "شاحنة صغيرة"
    case ("container_ship", "sv"): return "Containerskepp"
    case ("container_ship", "ar"): return "سفينة حاويات"
    case ("air_freight", "sv"): return "Flygfrakt"
    case ("air_freight", "ar"): return "شحن جوي"
    case ("truck", _): return "Truck"
    case ("cargo_van", _): return "Cargo van"
    case ("container_ship", _): return "Container ship"
    case ("air_freight", _): return "Air freight"
    default:
      switch language {
      case "sv": return "Transport"
      case "ar": return "وسيلة النقل"
      default: return "Transport"
      }
    }
  }

  static func capacity(_ language: String?) -> String {
    switch language {
    case "sv": return "Lastutrymme"
    case "ar": return "سعة الشحن"
    default: return "Cargo capacity"
    }
  }

  /// Display state published by the app: `scheduled`, `departing_soon`,
  /// `full`, `cancelled` or `departed`.
  static func status(_ status: String, _ language: String?) -> String {
    switch (statusToken(status), language) {
    case ("scheduled", "sv"): return "Planerad"
    case ("scheduled", "ar"): return "مجدول"
    case ("departing_soon", "sv"): return "Avgår snart"
    case ("departing_soon", "ar"): return "تغادر قريبًا"
    case ("full", "sv"): return "Full"
    case ("full", "ar"): return "ممتلئ"
    case ("cancelled", "sv"): return "Inställd"
    case ("cancelled", "ar"): return "ملغى"
    case ("departed", "sv"): return "Avgången"
    case ("departed", "ar"): return "غادر"
    case ("scheduled", _): return "Scheduled"
    case ("departing_soon", _): return "Departing soon"
    case ("full", _): return "Full"
    case ("cancelled", _): return "Cancelled"
    case ("departed", _): return "Departed"
    default: return status.replacingOccurrences(of: "_", with: " ")
    }
  }

  static func statusColor(_ status: String) -> Color {
    switch statusToken(status) {
    case "cancelled": return Color(red: 0.72, green: 0.18, blue: 0.2)
    case "full", "departing_soon": return orange
    default: return Color(red: 0.08, green: 0.48, blue: 0.28)
    }
  }

  /// Normalise CMS values and the app's display tokens onto one vocabulary.
  static func statusToken(_ status: String) -> String {
    switch status.lowercased() {
    case "full", "sold_out", "unavailable": return "full"
    case "cancelled", "canceled": return "cancelled"
    case "departed", "completed": return "departed"
    case "departing_soon": return "departing_soon"
    case "scheduled", "available": return "scheduled"
    default: return status.lowercased()
    }
  }
}
