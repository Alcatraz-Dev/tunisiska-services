import SwiftUI
import WidgetKit

/// The next-departure home-screen widget and the Lock Screen accessories.
///
/// One `StaticConfiguration` serves four presentations:
///   • systemSmall  — countdown card
///   • systemMedium — route, departure and cargo bar
///   • systemLarge  — departure briefing with the two stops and deep links
///   • accessoryCircular / accessoryRectangular / accessoryInline — Lock Screen
///
/// All of them read the same snapshot the app publishes through the shared
/// app group, so the widget, the Lock Screen card and the Live Activity can
/// never disagree about the next departure.

private let widgetGroup = "group.com.alcatrazdev.tunisiskaservices"

private enum Brand {
  static let navy = Color(red: 0.075, green: 0.169, blue: 0.333)
  static let navyLight = Color(red: 0.118, green: 0.259, blue: 0.470)
  static let navyDeep = Color(red: 0.055, green: 0.125, blue: 0.251)
  static let orange = Color(red: 0.949, green: 0.463, blue: 0.106)
  static let orangePale = Color(red: 1.0, green: 0.698, blue: 0.478)
  static let pale = Color.white.opacity(0.72)
  static let line = Color.white.opacity(0.16)

  static var field: LinearGradient {
    LinearGradient(
      colors: [navyLight, navy, navyDeep],
      startPoint: .topLeading,
      endPoint: .bottomTrailing
    )
  }
}

private struct DepartureSnapshot: Codable {
  var route: String
  var tripId: String?
  var origin: String
  var destination: String
  var vehicle: String
  var date: Double
  var language: String
  var capacity: Int?
  var available: Int?
  var status: String?
  var timeZoneIdentifier: String?
}

private struct DepartureEntry: TimelineEntry {
  let date: Date
  let departure: DepartureSnapshot?
  let language: String
}

private struct DepartureProvider: TimelineProvider {
  func placeholder(in context: Context) -> DepartureEntry {
    DepartureEntry(
      date: .now,
      departure: DepartureSnapshot(
        route: "Stockholm → Tunis",
        tripId: nil,
        origin: "Stockholm",
        destination: "Tunis",
        vehicle: "Cargo van",
        date: Date.now.addingTimeInterval(86400 * 5).timeIntervalSince1970 * 1000,
        language: "en",
        capacity: 24,
        available: 19,
        status: "available",
        timeZoneIdentifier: "Europe/Stockholm"
      ),
      language: "en"
    )
  }

  func getSnapshot(in context: Context, completion: @escaping (DepartureEntry) -> Void) {
    completion(Self.makeEntry())
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<DepartureEntry>) -> Void) {
    completion(Timeline(entries: [Self.makeEntry()], policy: .after(.now.addingTimeInterval(30 * 60))))
  }

  private static func makeEntry() -> DepartureEntry {
    let defaults = UserDefaults(suiteName: widgetGroup)
    return DepartureEntry(
      date: .now,
      departure: readDeparture(),
      language: defaults?.string(forKey: "nextDepartureWidgetLanguage") ?? "en"
    )
  }

  private static func readDeparture() -> DepartureSnapshot? {
    guard let data = UserDefaults(suiteName: widgetGroup)?.data(forKey: "nextDepartureWidget") else { return nil }
    return try? JSONDecoder().decode(DepartureSnapshot.self, from: data)
  }
}

struct NextDepartureHomeWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "TunisiskaNextDepartureHomeWidget", provider: DepartureProvider()) { entry in
      DepartureWidgetView(entry: entry)
        .environment(\.locale, Brand.locale(entry.language))
        .environment(\.layoutDirection, .leftToRight)
    }
    .configurationDisplayName("Next departure")
    .description("Your upcoming Tunisiska trip, cargo space and departure briefing.")
    .supportedFamilies(Self.families)
  }

  private static var families: [WidgetFamily] {
    var families: [WidgetFamily] = [.systemSmall, .systemMedium, .systemLarge]
    if #available(iOSApplicationExtension 16.0, *) {
      families.append(contentsOf: [.accessoryCircular, .accessoryRectangular, .accessoryInline])
    }
    return families
  }
}

// MARK: - Shared view

private struct DepartureWidgetView: View {
  let entry: DepartureEntry
  @Environment(\.widgetFamily) private var family

  private var isAccessory: Bool {
    family == .accessoryCircular || family == .accessoryRectangular || family == .accessoryInline
  }

  var body: some View {
    if isAccessory {
      AccessoryDepartureView(entry: entry, family: family)
    } else {
      HomeDepartureContainer(entry: entry, family: family)
    }
  }
}

// MARK: - Home screen families

private struct HomeDepartureContainer: View {
  let entry: DepartureEntry
  let family: WidgetFamily

  var body: some View {
    Group {
      if let trip = entry.departure {
        HomeDepartureView(trip: trip, language: entry.language, family: family)
      } else {
        HomeEmptyView(language: entry.language)
      }
    }
    .widgetNavyBackground()
  }
}

private struct HomeDepartureView: View {
  let trip: DepartureSnapshot
  let language: String
  let family: WidgetFamily

  private var departureDate: Date { Date(timeIntervalSince1970: trip.date / 1000) }
  private var calendarDays: Int {
    let calendar = Calendar.current
    let from = calendar.startOfDay(for: .now)
    let to = calendar.startOfDay(for: departureDate)
    return max(0, calendar.dateComponents([.day], from: from, to: to).day ?? 0)
  }

  var body: some View {
    Group {
      switch family {
      case .systemLarge:
        largeLayout.padding(16)
      case .systemMedium:
        mediumLayout.padding(15)
      default:
        smallLayout.padding(15)
      }
    }
    .widgetURL(Brand.deepLink(trip.tripId))
  }

  // MARK: Small — countdown card

  private var smallLayout: some View {
    VStack(alignment: .leading, spacing: 0) {
      HeaderRow(language: language, status: trip.status, showsStatus: false)
      Spacer(minLength: 6)
      Text(Brand.departureDay(trip.date, timeZone: trip.timeZoneIdentifier, language: language))
        .font(.system(size: 21, weight: .bold, design: .rounded))
        .foregroundStyle(.white)
        .lineLimit(1)
        .minimumScaleFactor(0.7)
      Text(Brand.departureMeta(trip.date, timeZone: trip.timeZoneIdentifier, vehicle: trip.vehicle, language: language))
        .font(.system(size: 10, weight: .medium, design: .rounded))
        .foregroundStyle(Brand.pale)
        .lineLimit(1)
        .minimumScaleFactor(0.8)
        .padding(.top, 3)
      Text(trip.route)
        .font(.system(size: 10, weight: .medium, design: .rounded))
        .foregroundStyle(Brand.pale.opacity(0.9))
        .lineLimit(1)
        .minimumScaleFactor(0.75)
        .padding(.top, 6)
      if let capacity = trip.capacity, capacity > 0 {
        CapacityBar(available: trip.available ?? capacity, capacity: capacity)
          .padding(.top, 7)
      }
    }
  }

  // MARK: Medium — route and capacity

  private var mediumLayout: some View {
    VStack(alignment: .leading, spacing: 0) {
      HeaderRow(language: language, status: trip.status, showsStatus: true, days: calendarDays)
      Spacer(minLength: 8)
      HStack(spacing: 8) {
        Text(trip.origin)
          .font(.system(size: 15, weight: .bold, design: .rounded))
          .foregroundStyle(.white)
          .lineLimit(1)
          .minimumScaleFactor(0.7)
        RouteLine()
        Text(trip.destination)
          .font(.system(size: 15, weight: .bold, design: .rounded))
          .foregroundStyle(.white)
          .lineLimit(1)
          .minimumScaleFactor(0.7)
      }
      Text(Brand.departureMeta(trip.date, timeZone: trip.timeZoneIdentifier, vehicle: trip.vehicle, language: language))
        .font(.system(size: 10, weight: .medium, design: .rounded))
        .foregroundStyle(Brand.pale)
        .lineLimit(1)
        .padding(.top, 7)
      Spacer(minLength: 6)
      if let capacity = trip.capacity, capacity > 0 {
        HStack(spacing: 8) {
          CapacityBar(available: trip.available ?? capacity, capacity: capacity)
          Text(Brand.capacityShort(trip.available ?? capacity, capacity))
            .font(.system(size: 9, weight: .semibold, design: .rounded))
            .foregroundStyle(Brand.pale)
            .lineLimit(1)
            .layoutPriority(1)
        }
      }
    }
  }

  // MARK: Large — departure briefing

  private var largeLayout: some View {
    VStack(alignment: .leading, spacing: 0) {
      HeaderRow(language: language, status: trip.status, showsStatus: true, days: calendarDays)
      HStack(alignment: .firstTextBaseline, spacing: 7) {
        Text(String(format: "%02d", calendarDays))
          .font(.system(size: 32, weight: .heavy, design: .rounded))
          .foregroundStyle(.white)
          .monospacedDigit()
        Text(Brand.daysUnit(language))
          .font(.system(size: 10, weight: .bold, design: .rounded))
          .foregroundStyle(Brand.orangePale)
        Spacer(minLength: 4)
        Text(Brand.departureDayTime(trip.date, timeZone: trip.timeZoneIdentifier, language: language))
          .font(.system(size: 10, weight: .semibold, design: .rounded))
          .foregroundStyle(Brand.pale)
          .multilineTextAlignment(.trailing)
      }
      .padding(.top, 10)

      Rectangle()
        .fill(Brand.line)
        .frame(height: 1)
        .padding(.vertical, 10)

      VStack(spacing: 8) {
        StopRow(badge: "A", title: trip.origin, note: Brand.collectionNote(trip.date, timeZone: trip.timeZoneIdentifier, language: language), filled: true)
        StopRow(badge: "B", title: trip.destination, note: Brand.deliveryNote(language), filled: false)
      }

      Spacer(minLength: 8)

      if let capacity = trip.capacity, capacity > 0 {
        HStack(spacing: 8) {
          Text(Brand.capacityShort(trip.available ?? capacity, capacity))
            .font(.system(size: 9, weight: .semibold, design: .rounded))
            .foregroundStyle(Brand.pale)
            .layoutPriority(1)
          CapacityBar(available: trip.available ?? capacity, capacity: capacity)
        }
        .padding(.bottom, 9)
      }

      HStack(spacing: 6) {
        Link(destination: Brand.deepLink(trip.tripId)) {
          Text(Brand.text("view_trip", language))
            .font(.system(size: 10, weight: .bold, design: .rounded))
            .foregroundStyle(Brand.navyDeep)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 7)
            .background(Brand.orange, in: Capsule())
        }
        Link(destination: URL(string: "tunisiska-mega-service://trips/track") ?? Brand.deepLink(trip.tripId)) {
          Text(Brand.text("track_parcel", language))
            .font(.system(size: 10, weight: .bold, design: .rounded))
            .foregroundStyle(.white)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 7)
            .background(Color.white.opacity(0.14), in: Capsule())
            .overlay(Capsule().stroke(Brand.line, lineWidth: 1))
        }
      }
    }
  }
}

// MARK: - Home screen pieces

private struct HeaderRow: View {
  let language: String
  var status: String?
  var showsStatus: Bool
  var days: Int?

  private var statusColor: Color {
    switch (status ?? "").lowercased() {
    case "cancelled": return Color(red: 0.96, green: 0.64, blue: 0.66)
    case "full", "sold_out", "unavailable": return Brand.orangePale
    case "departed", "completed": return Brand.pale
    default: return Color(red: 0.49, green: 0.85, blue: 0.66)
    }
  }

  var body: some View {
    HStack(spacing: 6) {
      Circle()
        .fill(Brand.orange)
        .frame(width: 6, height: 6)
      Text(Brand.text("next_departure", language))
        .font(.system(size: 9, weight: .bold, design: .rounded))
        .tracking(0.9)
        .foregroundStyle(Color(red: 0.66, green: 0.73, blue: 0.82))
        .lineLimit(1)
      Spacer(minLength: 4)
      if showsStatus, let status, !status.isEmpty {
        Text(Brand.statusLabel(status, language))
          .font(.system(size: 8, weight: .bold, design: .rounded))
          .tracking(0.4)
          .foregroundStyle(statusColor)
          .padding(.horizontal, 6)
          .padding(.vertical, 3)
          .background(statusColor.opacity(0.16), in: Capsule())
          .lineLimit(1)
      } else if let days {
        Text(Brand.daysAway(days, language))
          .font(.system(size: 8, weight: .bold, design: .rounded))
          .foregroundStyle(Brand.orangePale)
          .lineLimit(1)
      }
    }
  }
}

private struct RouteLine: View {
  var body: some View {
    HStack(spacing: 0) {
      DottedLine()
      ZStack {
        Circle()
          .fill(Brand.navyDeep)
          .frame(width: 17, height: 17)
        Image(systemName: "truck.box.fill")
          .font(.system(size: 8, weight: .bold))
          .foregroundStyle(Brand.orange)
      }
      DottedLine()
    }
    .frame(maxWidth: .infinity)
  }
}

private struct DottedLine: View {
  var body: some View {
    Rectangle()
      .fill(Color.white.opacity(0.38))
      .frame(height: 1)
  }
}

private struct CapacityBar: View {
  let available: Int
  let capacity: Int
  var height: CGFloat = 4

  private var ratio: CGFloat {
    guard capacity > 0 else { return 0 }
    return CGFloat(max(0, min(available, capacity))) / CGFloat(capacity)
  }

  var body: some View {
    GeometryReader { geometry in
      Capsule()
        .fill(Color.white.opacity(0.16))
        .overlay(alignment: .leading) {
          Capsule()
            .fill(Brand.orange)
            .frame(width: geometry.size.width * ratio)
        }
    }
    .frame(height: height)
  }
}

private struct StopRow: View {
  let badge: String
  let title: String
  let note: String
  let filled: Bool

  var body: some View {
    HStack(spacing: 8) {
      Text(badge)
        .font(.system(size: 8, weight: .heavy, design: .rounded))
        .foregroundStyle(filled ? Brand.navyDeep : .white)
        .frame(width: 17, height: 17)
        .background(filled ? Brand.orange : Color.white.opacity(0.16), in: Circle())
      VStack(alignment: .leading, spacing: 1) {
        Text(title)
          .font(.system(size: 10, weight: .bold, design: .rounded))
          .foregroundStyle(.white)
          .lineLimit(1)
        Text(note)
          .font(.system(size: 8, weight: .medium, design: .rounded))
          .foregroundStyle(Brand.pale.opacity(0.9))
          .lineLimit(1)
      }
      Spacer(minLength: 0)
    }
  }
}

private struct HomeEmptyView: View {
  let language: String

  var body: some View {
    VStack(alignment: .leading, spacing: 7) {
      Image(systemName: "shippingbox.fill")
        .font(.system(size: 19, weight: .bold))
        .foregroundStyle(Brand.orange)
      Text("Tunisiska Mega")
        .font(.system(size: 14, weight: .bold, design: .rounded))
        .foregroundStyle(.white)
      Text(Brand.text("empty_message", language))
        .font(.system(size: 10, weight: .medium, design: .rounded))
        .foregroundStyle(Brand.pale)
        .lineLimit(2)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
    .padding(15)
    .widgetURL(Brand.deepLink(nil))
  }
}

// MARK: - Lock Screen accessories

private struct AccessoryDepartureView: View {
  let entry: DepartureEntry
  let family: WidgetFamily

  private var trip: DepartureSnapshot? { entry.departure }

  var body: some View {
    switch family {
    case .accessoryInline:
      inline
    case .accessoryCircular:
      circular
    default:
      rectangular
    }
  }

  private var days: Int {
    guard let trip else { return 0 }
    let calendar = Calendar.current
    let from = calendar.startOfDay(for: .now)
    let to = calendar.startOfDay(for: Date(timeIntervalSince1970: trip.date / 1000))
    return max(0, calendar.dateComponents([.day], from: from, to: to).day ?? 0)
  }

  private var inline: some View {
    Group {
      if let trip {
        Text("\(Brand.text("next_short", entry.language)) · \(Brand.departureDayTime(trip.date, timeZone: trip.timeZoneIdentifier, language: entry.language))")
      } else {
        Text("Tunisiska · \(Brand.text("empty_short", entry.language))")
      }
    }
  }

  private var circular: some View {
    ZStack {
      AccessoryWidgetBackground()
      Circle()
        .stroke(Color.primary.opacity(0.22), lineWidth: 3.5)
      Circle()
        .trim(from: 0, to: ringProgress)
        .stroke(Color.primary, style: StrokeStyle(lineWidth: 3.5, lineCap: .round))
        .rotationEffect(.degrees(-90))
      VStack(spacing: -1) {
        if trip == nil {
          Image(systemName: "shippingbox.fill")
            .font(.system(size: 14, weight: .bold))
        } else {
          Text(String(format: "%02d", days))
            .font(.system(size: 16, weight: .heavy, design: .rounded))
            .widgetAccentable()
          Text(Brand.daysUnit(entry.language))
            .font(.system(size: 6, weight: .bold, design: .rounded))
            .foregroundStyle(.secondary)
        }
      }
    }
  }

  /// How far into the seven days before departure we are — a full ring means
  /// the departure is imminent or today.
  private var ringProgress: CGFloat {
    guard trip != nil else { return 0 }
    let clamped = CGFloat(min(days, 7))
    return (7 - clamped) / 7
  }

  private var rectangular: some View {
    VStack(alignment: .leading, spacing: 2) {
      if let trip {
        Text(Brand.text("next_short", entry.language))
          .font(.system(size: 9, weight: .bold, design: .rounded))
          .tracking(0.6)
          .foregroundStyle(.secondary)
        Text(Brand.departureDayTime(trip.date, timeZone: trip.timeZoneIdentifier, language: entry.language))
          .font(.system(size: 14, weight: .bold, design: .rounded))
          .widgetAccentable()
          .lineLimit(1)
        Text(trip.route)
          .font(.system(size: 10, weight: .medium, design: .rounded))
          .foregroundStyle(.secondary)
          .lineLimit(1)
        Text(Brand.capacityShort(trip.available ?? trip.capacity ?? 0, trip.capacity ?? 0))
          .font(.system(size: 9, weight: .medium, design: .rounded))
          .foregroundStyle(.secondary)
          .lineLimit(1)
      } else {
        Text("Tunisiska Mega")
          .font(.system(size: 12, weight: .bold, design: .rounded))
        Text(Brand.text("empty_short", entry.language))
          .font(.system(size: 10, weight: .medium, design: .rounded))
          .foregroundStyle(.secondary)
          .lineLimit(2)
      }
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
  }
}

// MARK: - Background

private extension View {
  @ViewBuilder
  func widgetNavyBackground() -> some View {
    if #available(iOSApplicationExtension 17.0, *) {
      containerBackground(for: .widget) { Brand.field }
    } else {
      background(Brand.field)
    }
  }
}

// MARK: - Formatting and copy

private extension Brand {
  static func locale(_ language: String) -> Locale {
    switch language {
    case "ar": return Locale(identifier: "ar")
    case "sv": return Locale(identifier: "sv_SE")
    default: return Locale(identifier: "en_US")
    }
  }

  static func formatter(_ format: String, _ language: String, _ timeZoneIdentifier: String?) -> DateFormatter {
    let formatter = DateFormatter()
    formatter.dateFormat = format
    formatter.locale = locale(language)
    if let timeZoneIdentifier, let zone = TimeZone(identifier: timeZoneIdentifier) {
      formatter.timeZone = zone
    }
    return formatter
  }

  /// `15 Nov` — the day the countdown lands on.
  static func departureDay(_ timestamp: Double, timeZone: String?, language: String) -> String {
    formatter("d MMM", language, timeZone).string(from: Date(timeIntervalSince1970: timestamp / 1000))
  }

  /// `15 Nov · 14:00`
  static func departureDayTime(_ timestamp: Double, timeZone: String?, language: String) -> String {
    formatter("d MMM · HH:mm", language, timeZone).string(from: Date(timeIntervalSince1970: timestamp / 1000))
  }

  /// `14:00 · Cargo van`
  static func departureMeta(_ timestamp: Double, timeZone: String?, vehicle: String, language: String) -> String {
    let time = formatter("HH:mm", language, timeZone).string(from: Date(timeIntervalSince1970: timestamp / 1000))
    return "\(time) · \(vehicleLabel(vehicle, language))"
  }

  static func collectionNote(_ timestamp: Double, timeZone: String?, language: String) -> String {
    let day = formatter("d MMM HH:mm", language, timeZone).string(from: Date(timeIntervalSince1970: timestamp / 1000))
    switch language {
    case "sv": return "Upphämtning · \(day)"
    case "ar": return "الاستلام · \(day)"
    default: return "Collection · \(day)"
    }
  }

  static func deliveryNote(_ language: String) -> String {
    switch language {
    case "sv": return "Leveranspunkt"
    case "ar": return "نقطة التسليم"
    default: return "Delivery point"
    }
  }

  static func daysAway(_ days: Int, _ language: String) -> String {
    if days <= 0 {
      switch language {
      case "sv": return "IDAG"
      case "ar": return "اليوم"
      default: return "TODAY"
      }
    }
    switch language {
    case "sv": return "OM \(days) DAGAR"
    case "ar": return "بعد \(days) أيام"
    default: return "IN \(days) DAYS"
    }
  }

  static func daysUnit(_ language: String) -> String {
    switch language {
    case "sv": return "dagar"
    case "ar": return "أيام"
    default: return "days"
    }
  }

  static func capacityShort(_ available: Int, _ capacity: Int) -> String {
    guard capacity > 0 else { return "" }
    return "\(available) / \(capacity)"
  }

  static func vehicleLabel(_ vehicle: String, _ language: String) -> String {
    let normalized = vehicle.lowercased()
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
    default: return vehicle
    }
  }

  /// Display state published by the app: `scheduled`, `departing_soon`,
  /// `full`, `cancelled` or `departed`. Legacy CMS values still resolve.
  static func statusLabel(_ status: String, _ language: String) -> String {
    let token = statusToken(status)
    switch (token, language) {
    case ("scheduled", "sv"): return "PLANERAD"
    case ("scheduled", "ar"): return "مجدول"
    case ("departing_soon", "sv"): return "AVGÅR SNART"
    case ("departing_soon", "ar"): return "تغادر قريبًا"
    case ("full", "sv"): return "FULL"
    case ("full", "ar"): return "ممتلئ"
    case ("cancelled", "sv"): return "INSTÄLLD"
    case ("cancelled", "ar"): return "ملغى"
    case ("departed", "sv"): return "AVGÅNGEN"
    case ("departed", "ar"): return "غادر"
    case ("scheduled", _): return "SCHEDULED"
    case ("departing_soon", _): return "DEPARTING SOON"
    case ("full", _): return "FULL"
    case ("cancelled", _): return "CANCELLED"
    case ("departed", _): return "DEPARTED"
    default: return status.uppercased()
    }
  }

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

  static func text(_ key: String, _ language: String) -> String {
    switch (key, language) {
    case ("next_departure", "sv"): return "NÄSTA AVGÅNG"
    case ("next_departure", "ar"): return "الرحلة القادمة"
    case ("next_departure", _): return "NEXT DEPARTURE"
    case ("next_short", "sv"): return "Nästa avgång"
    case ("next_short", "ar"): return "الرحلة القادمة"
    case ("next_short", _): return "Next departure"
    case ("empty_message", "sv"): return "Öppna appen för att se kommande avgångar."
    case ("empty_message", "ar"): return "افتح التطبيق لمعرفة مواعيد الرحلات القادمة."
    case ("empty_message", _): return "Open the app to see upcoming departures."
    case ("empty_short", "sv"): return "öppna appen"
    case ("empty_short", "ar"): return "افتح التطبيق"
    case ("empty_short", _): return "open the app"
    case ("view_trip", "sv"): return "Visa resa"
    case ("view_trip", "ar"): return "عرض الرحلة"
    case ("view_trip", _): return "View trip"
    case ("track_parcel", "sv"): return "Spåra paket"
    case ("track_parcel", "ar"): return "تتبع الطرد"
    case ("track_parcel", _): return "Track parcel"
    default: return key
    }
  }

  static func deepLink(_ tripId: String?) -> URL {
    URL(string: tripId.map { "tunisiska-mega-service://trips/\($0)" } ?? "tunisiska-mega-service://trips")
      ?? URL(string: "https://tunisiska.com")!
  }
}
