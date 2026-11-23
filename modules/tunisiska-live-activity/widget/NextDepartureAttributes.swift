import ActivityKit
import Foundation

struct NextDepartureAttributes: ActivityAttributes {
  struct ContentState: Codable, Hashable {
    var status: String
    var departureDate: Date
    var capacity: Int?
    var available: Int?
  }

  var tripId: String
  var routeLabel: String
  var origin: String
  var destination: String
  var vehicle: String
  var language: String
  var timeZoneIdentifier: String?
}
