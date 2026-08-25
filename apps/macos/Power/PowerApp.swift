import SwiftUI

/// Power for macOS, native edition.
///
/// This app is a peer of the Electron shell, not a replacement: both drive the
/// same compiled CLIs (`packages/core/dist`, `packages/gates/dist`), the same
/// `agents/*.md` prompts, and the same `claude` headless login — so the plugin,
/// the Electron app, and this app remain one product with three shells.
///
/// The app sandbox must stay OFF (no entitlements): the engine's entire job is
/// spawning `node` and `claude`, which a sandboxed process cannot do.
@main
struct PowerApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
                .frame(minWidth: 960, minHeight: 640)
        }
        .windowStyle(.hiddenTitleBar)
        .defaultSize(width: 1240, height: 820)
    }
}
