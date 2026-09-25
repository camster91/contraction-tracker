import Capacitor

final class OliveBridgeViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginType(OliveLiveActivityPlugin.self)
    }
}
