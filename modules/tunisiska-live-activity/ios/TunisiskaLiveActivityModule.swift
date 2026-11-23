import ActivityKit
import ExpoModulesCore
import Foundation
import WidgetKit

/**
 * The native Live Activity bridge.
 *
 * Every ActivityKit call is made on the main actor: `Activity.request`,
 * `update` and `end` are UI-adjacent system calls, and an Expo async function
 * runs off the main thread by default. Requesting an activity from a
 * background queue is what made the Dynamic Island stay empty while the app
 * believed the activity had started, so the calls are hopped onto the main
 * actor explicitly.
 *
 * Failures are logged with the `TunisiskaLiveActivity` prefix rather than
 * returned as a silent `nil`, so a missing entitlement, a disabled setting or a
 * missing widget extension is visible in the device log.
 */
internal struct StartActivityOptions: Record {
  @Field var tripId: String = ""
  @Field var routeLabel: String = ""
  @Field var origin: String = ""
  @Field var destination: String = ""
  @Field var vehicle: String = ""
  @Field var language: String = ""
  @Field var status: String = ""
  @Field var timeZoneIdentifier: String = ""
  @Field var departureDate: Double = 0
  @Field var departureTimestamp: Double = 0
  @Field var capacity: Int = 0
  @Field var available: Int = 0
}

public final class TunisiskaLiveActivityModule: Module {
  private static let logPrefix = "TunisiskaLiveActivity"
  private let appGroup = "group.com.alcatrazdev.tunisiskaservices"
  private let widgetPayloadKey = "nextDepartureWidget"
  private let widgetLanguageKey = "nextDepartureWidgetLanguage"

  public func definition() -> ModuleDefinition {
    Name("TunisiskaLiveActivity")

    AsyncFunction("areActivitiesEnabled") { () async -> Bool in
      guard #available(iOS 16.2, *) else { return false }
      return await Self.activitiesEnabled()
    }

    AsyncFunction("start") { (options: StartActivityOptions) async -> String? in
      guard #available(iOS 16.2, *) else { return nil }
      let departureTime = options.departureTimestamp > 0 ? options.departureTimestamp : options.departureDate
      return await Self.start(
        tripId: options.tripId, routeLabel: options.routeLabel, origin: options.origin,
        destination: options.destination, vehicle: options.vehicle, language: options.language,
        status: options.status, timeZoneIdentifier: options.timeZoneIdentifier,
        departureTimestamp: departureTime, capacity: options.capacity, available: options.available
      )
    }

    AsyncFunction("update") { (id: String, status: String, departureTimestamp: Double,
      capacity: Int, available: Int) async -> Bool in
      guard #available(iOS 16.2, *) else { return false }
      return await Self.update(
        id: id, status: status, departureTimestamp: departureTimestamp,
        capacity: capacity, available: available
      )
    }

    AsyncFunction("end") { (id: String) async -> Bool in
      guard #available(iOS 16.2, *) else { return false }
      return await Self.end(id: id)
    }

    AsyncFunction("listRunning") { () async -> [[String: String]] in
      guard #available(iOS 16.2, *) else { return [] }
      return await Self.listRunning()
    }

    AsyncFunction("endAll") { () async -> Bool in
      guard #available(iOS 16.2, *) else { return false }
      return await Self.endAll()
    }

    AsyncFunction("updateTripWidget") { (payload: String, language: String) -> Bool in
      guard let defaults = UserDefaults(suiteName: self.appGroup) else {
        NSLog("[%@] app group %@ is unavailable", Self.logPrefix, self.appGroup)
        return false
      }
      defaults.set(language, forKey: self.widgetLanguageKey)
      if payload.isEmpty {
        defaults.removeObject(forKey: self.widgetPayloadKey)
      } else {
        guard let data = payload.data(using: .utf8) else { return false }
        defaults.set(data, forKey: self.widgetPayloadKey)
      }
      if #available(iOS 14.0, *) {
        WidgetCenter.shared.reloadTimelines(ofKind: "TunisiskaNextDepartureHomeWidget")
      }
      return true
    }
  }

  // MARK: - ActivityKit, on the main actor

  @available(iOS 16.2, *)
  @MainActor
  private static func activitiesEnabled() -> Bool {
    ActivityAuthorizationInfo().areActivitiesEnabled
  }

  @available(iOS 16.2, *)
  @MainActor
  private static func start(
    tripId: String,
    routeLabel: String,
    origin: String,
    destination: String,
    vehicle: String,
    language: String,
    status: String,
    timeZoneIdentifier: String,
    departureTimestamp: Double,
    capacity: Int,
    available: Int
  ) async -> String? {
    guard ActivityAuthorizationInfo().areActivitiesEnabled else {
      NSLog("[%@] Live Activities are disabled for this device", logPrefix)
      return nil
    }

    let attributes = NextDepartureAttributes(
      tripId: tripId, routeLabel: routeLabel, origin: origin, destination: destination,
      vehicle: vehicle, language: language, timeZoneIdentifier: timeZoneIdentifier
    )
    let state = NextDepartureAttributes.ContentState(
      status: status,
      departureDate: Date(timeIntervalSince1970: departureTimestamp / 1000),
      capacity: capacity,
      available: available
    )
    let content = ActivityContent(state: state, staleDate: nil)

    // One activity at a time: the island always tracks a single departure.
    for activity in Activity<NextDepartureAttributes>.activities {
      await activity.end(nil, dismissalPolicy: .immediate)
    }

    do {
      let activity = try Activity.request(attributes: attributes, content: content, pushType: nil)
      NSLog("[%@] started activity %@", logPrefix, activity.id)
      return activity.id
    } catch {
      NSLog("[%@] could not start the Live Activity: %@", logPrefix, String(describing: error))
      return nil
    }
  }

  @available(iOS 16.2, *)
  @MainActor
  private static func update(
    id: String,
    status: String,
    departureTimestamp: Double,
    capacity: Int,
    available: Int
  ) async -> Bool {
    guard let activity = Activity<NextDepartureAttributes>.activities.first(where: { $0.id == id }) else {
      NSLog("[%@] no running activity with id %@", logPrefix, id)
      return false
    }
    let state = NextDepartureAttributes.ContentState(
      status: status,
      departureDate: Date(timeIntervalSince1970: departureTimestamp / 1000),
      capacity: capacity,
      available: available
    )
    await activity.update(ActivityContent(state: state, staleDate: nil))
    return true
  }

  @available(iOS 16.2, *)
  @MainActor
  private static func end(id: String) async -> Bool {
    guard let activity = Activity<NextDepartureAttributes>.activities.first(where: { $0.id == id }) else {
      return false
    }
    await activity.end(nil, dismissalPolicy: .immediate)
    return true
  }

  @available(iOS 16.2, *)
  @MainActor
  private static func listRunning() -> [[String: String]] {
    Activity<NextDepartureAttributes>.activities.map { activity in
      [
        "id": activity.id,
        "tripId": activity.attributes.tripId,
        "language": activity.attributes.language,
        "routeLabel": activity.attributes.routeLabel,
        "origin": activity.attributes.origin,
        "destination": activity.attributes.destination,
        "vehicle": activity.attributes.vehicle,
        "timeZoneIdentifier": activity.attributes.timeZoneIdentifier ?? "",
      ]
    }
  }

  @available(iOS 16.2, *)
  @MainActor
  private static func endAll() async -> Bool {
    let running = Activity<NextDepartureAttributes>.activities
    for activity in running {
      await activity.end(nil, dismissalPolicy: .immediate)
    }
    return true
  }
}
