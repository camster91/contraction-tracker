import ActivityKit
import SwiftUI
import WidgetKit

@main
struct OliveLiveActivityBundle: WidgetBundle {
    var body: some Widget {
        OliveLiveActivityWidget()
    }
}

struct OliveLiveActivityWidget: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: OliveTimerAttributes.self) { context in
            HStack(spacing: 12) {
                Image(systemName: "timer")
                    .font(.title2)
                    .foregroundStyle(Color(red: 0.91, green: 0.58, blue: 0.48))
                VStack(alignment: .leading, spacing: 2) {
                    Text("live_activity.timer_title")
                        .font(.headline)
                    Text(timerInterval: context.state.startDate...Date.distantFuture, countsDown: false)
                        .font(.system(.title2, design: .rounded).monospacedDigit())
                }
                Spacer()
                Text("live_activity.open_to_stop")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.trailing)
            }
            .padding()
            .activityBackgroundTint(Color(red: 0.10, green: 0.07, blue: 0.09))
            .activitySystemActionForegroundColor(.white)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    Image(systemName: "timer").foregroundStyle(Color(red: 0.91, green: 0.58, blue: 0.48))
                }
                DynamicIslandExpandedRegion(.center) {
                    Text("live_activity.timer_title").font(.headline)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    Text(timerInterval: context.state.startDate...Date.distantFuture, countsDown: false)
                        .font(.system(.title2, design: .rounded).monospacedDigit())
                }
            } compactLeading: {
                Image(systemName: "timer").foregroundStyle(Color(red: 0.91, green: 0.58, blue: 0.48))
            } compactTrailing: {
                Text(timerInterval: context.state.startDate...Date.distantFuture, countsDown: false)
                    .monospacedDigit()
                    .frame(width: 48)
            } minimal: {
                Image(systemName: "timer").foregroundStyle(Color(red: 0.91, green: 0.58, blue: 0.48))
            }
        }
    }
}
