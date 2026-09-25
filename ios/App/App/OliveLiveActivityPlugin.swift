import ActivityKit
import Capacitor
import Foundation

@objc(OliveLiveActivityPlugin)
public class OliveLiveActivityPlugin: CAPPlugin, CAPBridgedPlugin {
    private let activityStateLock = NSLock()
    private var activityGeneration = 0

    private func advanceActivityGeneration() -> Int {
        activityStateLock.lock()
        defer { activityStateLock.unlock() }
        activityGeneration += 1
        return activityGeneration
    }

    private func isCurrentGeneration(_ generation: Int) -> Bool {
        activityStateLock.lock()
        defer { activityStateLock.unlock() }
        return activityGeneration == generation
    }

    public let identifier = "OliveLiveActivityPlugin"
    public let jsName = "OliveLiveActivity"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "start", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stop", returnType: CAPPluginReturnPromise)
    ]

    @objc func start(_ call: CAPPluginCall) {
        guard #available(iOS 16.2, *) else {
            call.resolve(["supported": false])
            return
        }
        guard ActivityAuthorizationInfo().areActivitiesEnabled else {
            call.resolve(["supported": true, "enabled": false])
            return
        }
        guard let startEpochMs = call.getDouble("startEpochMs"), startEpochMs > 0 else {
            call.reject("A valid startEpochMs is required")
            return
        }

        let startDate = Date(timeIntervalSince1970: startEpochMs / 1000)
        let generation = advanceActivityGeneration()
        Task {
            for activity in Activity<OliveTimerAttributes>.activities {
                await activity.end(nil, dismissalPolicy: .immediate)
            }
            guard self.isCurrentGeneration(generation) else {
                call.resolve(["supported": true, "enabled": false, "reason": "superseded"])
                return
            }
            do {
                let state = OliveTimerAttributes.ContentState(startDate: startDate)
                let content = ActivityContent(state: state, staleDate: nil)
                let requested = try Activity.request(attributes: OliveTimerAttributes(), content: content)
                guard self.isCurrentGeneration(generation) else {
                    await requested.end(nil, dismissalPolicy: .immediate)
                    call.resolve(["supported": true, "enabled": false, "reason": "superseded"])
                    return
                }
                call.resolve(["supported": true, "enabled": true])
            } catch {
                call.reject("Could not start the Live Activity", nil, error)
            }
        }
    }

    @objc func stop(_ call: CAPPluginCall) {
        guard #available(iOS 16.2, *) else {
            call.resolve()
            return
        }
        _ = advanceActivityGeneration()
        Task {
            for activity in Activity<OliveTimerAttributes>.activities {
                await activity.end(nil, dismissalPolicy: .immediate)
            }
            call.resolve()
        }
    }
}
