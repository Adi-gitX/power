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
                // 250 sidebar + 520 preview + dividers leaves the chat column
                // ≥ 420pt at minimum — it can no longer be crushed to a sliver.
                .frame(minWidth: 1200, minHeight: 720)
        }
        .windowStyle(.hiddenTitleBar)
        .defaultSize(width: 1360, height: 860)
    }
}
