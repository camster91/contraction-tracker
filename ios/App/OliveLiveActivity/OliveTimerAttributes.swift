import ActivityKit
import Foundation

struct OliveTimerAttributes: ActivityAttributes {
    struct ContentState: Codable, Hashable {
        var startDate: Date
    }
}
