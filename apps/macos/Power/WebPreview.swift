import SwiftUI
import WebKit

/// The rendered preview — the thing that makes the workspace feel like
/// Emergent's dashboard: what the run built, drawn live inside the app, not a
/// file listing. Loads whatever `PreviewLauncher.resolve` decides (a static
/// entry point in the repo, else the local dev port), and reloads whenever
/// `reloadToken` changes — the workspace bumps it when a build finishes, so
/// the preview always shows the latest implementation without being asked.
struct WebPreview: NSViewRepresentable {
    let repoDir: String
    let reloadToken: Int

    func makeNSView(context: Context) -> WKWebView {
        // No KVC into private preference keys — they crash across OS updates.
        // Sibling css/js access for file previews comes from loadFileURL's
        // allowingReadAccessTo covering the whole repo directory.
        let view = WKWebView(frame: .zero, configuration: WKWebViewConfiguration())
        load(into: view)
        return view
    }

    func updateNSView(_ view: WKWebView, context: Context) {
        // Reload only on an explicit token bump or a repo switch — never on
        // unrelated SwiftUI passes, which would flicker the page.
        if context.coordinator.lastToken != reloadToken
            || context.coordinator.lastRepo != repoDir {
            load(into: view)
            context.coordinator.lastToken = reloadToken
            context.coordinator.lastRepo = repoDir
        }
    }

    private func load(into view: WKWebView) {
        let target = PreviewLauncher.resolve(repoDir)
        if target.isFileURL {
            view.loadFileURL(target, allowingReadAccessTo: URL(fileURLWithPath: repoDir))
        } else {
            view.load(URLRequest(url: target))
        }
    }

    func makeCoordinator() -> Coordinator { Coordinator() }

    final class Coordinator {
        var lastToken = -1
        var lastRepo = ""
    }
}
