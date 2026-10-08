import ActivityKit
import SwiftUI
import WidgetKit

@main
struct OliveLiveActivityBundle: WidgetBundle {
    var body: some Widget {
        OliveLiveActivityWidget()
        OliveLockStartWidget()
    }
}

struct OliveLockStartEntry: TimelineEntry {
    let date: Date
}

struct OliveLockStartProvider: TimelineProvider {
    func placeholder(in context: Context) -> OliveLockStartEntry {
        OliveLockStartEntry(date: Date())
    }
    func getSnapshot(in context: Context, completion: @escaping (OliveLockStartEntry) -> Void) {
        completion(OliveLockStartEntry(date: Date()))
    }
    func getTimeline(in context: Context, completion: @escaping (Timeline<OliveLockStartEntry>) -> Void) {
        completion(Timeline(entries: [OliveLockStartEntry(date: Date())], policy: .never))
    }
}

struct OliveLockStartWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "OliveLockStart", provider: OliveLockStartProvider()) { _ in
            Link(destination: URL(string: "olive://start")!) {
                VStack(spacing: 4) {
                    Image(systemName: "timer")
                    Text("Start")
                        .font(.caption.weight(.semibold))
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
        }
        .configurationDisplayName("Olive Start")
        .description("Start a contraction from the Lock Screen.")
        .supportedFamilies([.accessoryCircular, .accessoryRectangular, .systemSmall])
    }
}

struct OliveLiveActivityWidget: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: OliveTimerAttributes.self) { context in
            HStack(spacing: 12) {
                Image(systemName: "timer")
                    .font(.title2)
                    .foregroundStyle(Color(red: 0.91, green: 0.68, blue: 0.55))
                VStack(alignment: .leading, spacing: 2) {
                    Text("live_activity.timer_title")
                        .font(.headline)
                    Text(timerInterval: context.state.startDate...Date.distantFuture, countsDown: false)
                        .font(.system(.title2, design: .rounded).monospacedDigit())
                }
                Spacer()
                Text("Tap to stop")
                    .font(.caption.weight(.semibold))
            }
            .padding()
            .foregroundStyle(Color(red: 0.96, green: 0.95, blue: 0.91))
            .widgetURL(URL(string: "olive://stop"))
            .activityBackgroundTint(Color(red: 0.15, green: 0.22, blue: 0.17))
            .activitySystemActionForegroundColor(.white)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    Image(systemName: "timer").foregroundStyle(Color(red: 0.91, green: 0.68, blue: 0.55))
                }
                DynamicIslandExpandedRegion(.center) {
                    Text("live_activity.timer_title").font(.headline)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    Text(timerInterval: context.state.startDate...Date.distantFuture, countsDown: false)
                        .font(.system(.title2, design: .rounded).monospacedDigit())
                }
            } compactLeading: {
                Image(systemName: "timer").foregroundStyle(Color(red: 0.91, green: 0.68, blue: 0.55))
            } compactTrailing: {
                Text(timerInterval: context.state.startDate...Date.distantFuture, countsDown: false)
                    .monospacedDigit()
                    .frame(width: 48)
            } minimal: {
                Image(systemName: "timer").foregroundStyle(Color(red: 0.91, green: 0.68, blue: 0.55))
            }
        }
    }
}
