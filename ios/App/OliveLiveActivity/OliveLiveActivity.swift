//
// OliveLiveActivity.swift — Lock Screen & Dynamic Island widget for Olive
// Shows the current contraction timer, gap since last, or 5-1-1 alert.
//
// The web app posts state updates to this widget via App Groups (UserDefaults
// shared between the main app and the widget extension).
//
// To enable: add a Widget Extension target in Xcode, copy this file into it,
// and configure App Groups (group.com.ashbi.olive) in Signing & Capabilities.

import WidgetKit
import SwiftUI
import ActivityKit

// MARK: - Shared Data Model
// The web app posts JSON to UserDefaults(suiteName: "group.com.ashbi.olive")
// under the key "oliveLiveActivity". This struct mirrors that payload.

struct OliveTimerState: Codable, Equatable {
    enum Phase: String, Codable, Equatable {
        case idle       // no active timer, show "Tap to start"
        case active     // contraction in progress, show countdown
        case between    // between contractions, show gap
        case alert      // 5-1-1 fired, show alert state
        case laborEnded // labor complete
    }

    var phase: Phase = .idle
    var elapsedSeconds: Int = 0          // active: current duration
    var sinceLastSeconds: Int = 0        // between: gap since last ended
    var contractionCount: Int = 0        // total contractions so far
    var fiveOneOneActive: Bool = false   // 5-1-1 pattern detected
    var sessionName: String = "Labor"    // display name
}

// MARK: - Live Activity Attributes
// ActivityKit requires a static ContentState type.

struct OliveAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        var phase: String        // "active" | "between" | "alert" | "idle"
        var elapsedSeconds: Int
        var sinceLastSeconds: Int
        var contractionCount: Int
        var fiveOneOneActive: Bool
    }
}

// MARK: - Widget Entry
struct OliveActivityEntry: TimelineEntry {
    let date: Date
    let state: OliveAttributes.ContentState
}

// MARK: - Provider (reads from UserDefaults shared with app)
struct OliveActivityProvider: TimelineProvider {
    func placeholder(in context: Context) -> OliveActivityEntry {
        OliveActivityEntry(date: Date(), state: OliveAttributes.ContentState(
            phase: "idle", elapsedSeconds: 0, sinceLastSeconds: 0,
            contractionCount: 0, fiveOneOneActive: false))
    }

    func getSnapshot(in context: Context, completion: @escaping (OliveActivityEntry) -> Void) {
        completion(placeholder(in: context))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<OliveActivityEntry>) -> Void) {
        let state = readSharedState()
        let entry = OliveActivityEntry(date: Date(), state: state)
        let timeline = Timeline(entries: [entry], policy: .after(Date().addingTimeInterval(1)))
        completion(timeline)
    }

    private func readSharedState() -> OliveAttributes.ContentState {
        guard let defaults = UserDefaults(suiteName: "group.com.ashbi.olive"),
              let data = defaults.data(forKey: "oliveLiveActivity"),
              let decoded = try? JSONDecoder().decode(OliveTimerState.self, from: data)
        else {
            return OliveAttributes.ContentState(
                phase: "idle", elapsedSeconds: 0, sinceLastSeconds: 0,
                contractionCount: 0, fiveOneOneActive: false)
        }
        return OliveAttributes.ContentState(
            phase: decoded.phase.rawValue,
            elapsedSeconds: decoded.elapsedSeconds,
            sinceLastSeconds: decoded.sinceLastSeconds,
            contractionCount: decoded.contractionCount,
            fiveOneOneActive: decoded.fiveOneOneActive)
    }
}

// MARK: - Main Widget View
struct OliveLiveActivityView: View {
    let state: OliveAttributes.ContentState

    var body: some View {
        HStack(spacing: 12) {
            // Left: status icon
            statusIcon
                .font(.system(size: 20))

            // Center: big timer
            VStack(alignment: .leading, spacing: 2) {
                Text(bigText)
                    .font(.system(size: 28, weight: .light, design: .serif))
                    .foregroundColor(textColor)
                    .contentTransition(.numericText())

                Text(subtitle)
                    .font(.system(size: 10, weight: .medium))
                    .foregroundColor(subtitleColor)
                    .textCase(.uppercase)
            }

            Spacer()

            // Right: quick action hint
            VStack(alignment: .trailing, spacing: 4) {
                if state.phase == "active" {
                    Image(systemName: "stop.fill")
                        .font(.system(size: 14))
                        .foregroundColor(roseColor)
                        .padding(8)
                        .background(roseColor.opacity(0.15))
                        .clipShape(Circle())
                } else {
                    Image(systemName: "play.fill")
                        .font(.system(size: 14))
                        .foregroundColor(sageColor)
                        .padding(8)
                        .background(sageColor.opacity(0.15))
                        .clipShape(Circle())
                }
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(backgroundColor)
    }

    // MARK: - Computed Properties

    private var bigText: String {
        switch state.phase {
        case "active":
            let m = state.elapsedSeconds / 60
            let s = state.elapsedSeconds % 60
            return String(format: "%d:%02d", m, s)
        case "between":
            let m = state.sinceLastSeconds / 60
            let s = state.sinceLastSeconds % 60
            return String(format: "%d:%02d", m, s)
        case "alert":
            return "5-1-1"
        case "idle":
            return "— : —"
        default:
            return "— : —"
        }
    }

    private var subtitle: String {
        switch state.phase {
        case "active": return "contraction"
        case "between": return "since last"
        case "alert": return "time to go"
        case "idle": return "tap to start"
        default: return ""
        }
    }

    private var statusIcon: some View {
        switch state.phase {
        case "active":
            return Image(systemName: "heart.fill")
                .foregroundColor(roseColor)
        case "between":
            return Image(systemName: "timer")
                .foregroundColor(sageColor)
        case "alert":
            return Image(systemName: "exclamationmark.triangle.fill")
                .foregroundColor(amberColor)
        case "idle":
            return Image(systemName: "moon.stars.fill")
                .foregroundColor(mutedColor)
        default:
            return Image(systemName: "moon.stars.fill")
                .foregroundColor(mutedColor)
        }
    }

    // MARK: - Colors (matching Olive's dark plum theme)

    private var backgroundColor: Color { Color(red: 0.071, green: 0.047, blue: 0.063) } // #120c10
    private var textColor: Color { Color(red: 0.980, green: 0.965, blue: 0.957) }       // #faf6f4
    private var roseColor: Color { Color(red: 0.910, green: 0.584, blue: 0.478) }        // #e8957a
    private var sageColor: Color { Color(red: 0.659, green: 0.722, blue: 0.624) }        // #a8b89f
    private var amberColor: Color { Color(red: 0.984, green: 0.749, blue: 0.141) }       // #fbbf24
    private var mutedColor: Color { Color(red: 0.541, green: 0.435, blue: 0.396) }       // #8a6f64
    private var subtitleColor: Color { mutedColor }
}

// MARK: - Widget Configuration
@main
struct OliveWidgetBundle: WidgetBundle {
    var body: some Widget {
        OliveLiveActivity()
    }
}

struct OliveLiveActivity: Widget {
    let kind: String = "OliveLiveActivity"

    var body: some WidgetConfiguration {
        ActivityConfiguration(for: OliveAttributes.self) { context in
            // Lock Screen / Dynamic Island expanded view
            OliveLiveActivityView(state: context.state)
                .activityBackgroundTint(Color(red: 0.071, green: 0.047, blue: 0.063))
                .activitySystemActionForegroundColor(Color(red: 0.659, green: 0.722, blue: 0.624))

        } dynamicIsland: { context in
            // Dynamic Island compact presentation
            DynamicIsland {
                // Expanded (long-press)
                DynamicIslandExpandedRegion(.leading) {
                    Text(context.state.phase == "active" ? "CONTRACTION" : "SINCE LAST")
                        .font(.system(size: 10, weight: .semibold))
                        .foregroundColor(Color(red: 0.910, green: 0.584, blue: 0.478))
                }
                DynamicIslandExpandedRegion(.center) {
                    OliveLiveActivityView(state: context.state)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Text("\(context.state.contractionCount)")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(Color(red: 0.541, green: 0.435, blue: 0.396))
                }
            } compactLeading: {
                Image(systemName: "heart.fill")
                    .foregroundColor(Color(red: 0.910, green: 0.584, blue: 0.478))
            } compactTrailing: {
                Text(context.state.phase == "active"
                     ? String(format: "%d:%02d", context.state.elapsedSeconds / 60, context.state.elapsedSeconds % 60)
                     : "—")
                    .font(.system(size: 12, weight: .medium, design: .monospaced))
            } minimal: {
                Image(systemName: "heart.fill")
                    .foregroundColor(Color(red: 0.910, green: 0.584, blue: 0.478))
            }
        }
    }
}
