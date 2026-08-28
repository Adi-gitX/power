import Foundation

/// The dev-server half of "see your app live, in one place."
///
/// A static entry point renders directly, but most real web apps are a
/// `dev` script and a port. This manages that process so the user never
/// touches a terminal: detect the script and the package manager from the
/// repo, spawn it with a real PATH, watch its output for the port it chose,
/// and kill it cleanly on stop or app exit. The preview pane prefers the
/// detected live port over every static fallback.
@MainActor
final class DevServerManager: ObservableObject {
    @Published private(set) var isRunning = false
    @Published private(set) var port: Int?
    @Published private(set) var lastLine = ""

    private var process: Process?
    private var currentRepo: String?

    /// The runnable script, if this repo is a dev-server project at all.
    nonisolated static func detectScript(_ repoDir: String) -> String? {
        guard
            let data = FileManager.default.contents(atPath: "\(repoDir)/package.json"),
            let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
            let scripts = json["scripts"] as? [String: Any]
        else { return nil }
        for candidate in ["dev", "start", "serve"] where scripts[candidate] != nil {
            return candidate
        }
        return nil
    }

    /// pnpm/yarn/npm — decided by the lockfile, the way the repo's author did.
    nonisolated static func packageManager(_ repoDir: String) -> String {
        let fm = FileManager.default
        if fm.fileExists(atPath: "\(repoDir)/pnpm-lock.yaml") { return "pnpm" }
        if fm.fileExists(atPath: "\(repoDir)/yarn.lock") { return "yarn" }
        return "npm"
    }

    func start(_ repoDir: String) {
        guard !isRunning, let script = Self.detectScript(repoDir) else { return }
        let process = Process()
        process.executableURL = URL(fileURLWithPath: "/usr/bin/env")
        process.arguments = [Self.packageManager(repoDir), "run", script]
        process.currentDirectoryURL = URL(fileURLWithPath: repoDir)
        var env = ProcessInfo.processInfo.environment
        env["PATH"] = PowerPaths.spawnPATH
        process.environment = env

        let pipe = Pipe()
        process.standardOutput = pipe
        process.standardError = pipe
        pipe.fileHandleForReading.readabilityHandler = { [weak self] handle in
            guard let text = String(data: handle.availableData, encoding: .utf8),
                  !text.isEmpty else { return }
            Task { @MainActor in self?.consume(text) }
        }
        process.terminationHandler = { [weak self] _ in
            pipe.fileHandleForReading.readabilityHandler = nil
            Task { @MainActor in
                self?.isRunning = false
                self?.port = nil
            }
        }

        do {
            try process.run()
            self.process = process
            self.currentRepo = repoDir
            isRunning = true
        } catch {
            lastLine = "could not start dev server: \(error.localizedDescription)"
        }
    }

    func stop() {
        process?.terminate()
        process = nil
        isRunning = false
        port = nil
    }

    /// Restart when the workspace switches repos — one server, one session.
    func syncTo(repoDir: String?) {
        if let current = currentRepo, current != repoDir { stop() }
    }

    private func consume(_ text: String) {
        for raw in text.split(separator: "\n") {
            let line = String(raw).trimmingCharacters(in: .whitespaces)
            if line.isEmpty { continue }
            lastLine = line
            // The two shapes dev servers actually print:
            //   "http://localhost:5173/"  ·  "Local: http://127.0.0.1:3000"
            //   "listening on port 8080"
            if port == nil {
                if let match = line.range(of: #"(?:localhost|127\.0\.0\.1):(\d{2,5})"#,
                                          options: .regularExpression) {
                    port = Int(line[match].split(separator: ":").last.map(String.init) ?? "")
                } else if let match = line.range(of: #"port\s+(\d{2,5})"#,
                                                 options: [.regularExpression, .caseInsensitive]) {
                    port = Int(line[match].split(separator: " ").last.map(String.init) ?? "")
                }
            }
        }
    }

    deinit {
        process?.terminate()
    }
}
