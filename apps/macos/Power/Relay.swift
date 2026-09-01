import Foundation

/// Relay — Power's own inference router, managed natively.
///
/// Relay is first-party code shipped inside Power's runtime (`packages/relay`),
/// so there is nothing to install: `start()` just spawns the bundled server via
/// the same `node` the engine already uses. No npm, no global prefix, no disk
/// check, no third-party dependency — all the fragility of the old managed
/// gateway is gone.
///
/// The invariant is unchanged: a routed run must not dispatch until Relay
/// answers its health check, or the first stage fails against a dead endpoint.
/// The engine calls `ensureRunning()` before a run that routes to Relay, and a
/// background monitor keeps it alive.
@MainActor
final class RelayManager: ObservableObject {
    enum State: Equatable {
        case checking, stopped, starting, running
        case error(String)
    }

    @Published var state: State = .checking

    private var server: Process?
    private var supervise = false
    private var starting = false
    private var monitor: Task<Void, Never>?

    // MARK: Status

    func refresh() async {
        state = .checking
        state = await ping() ? .running : .stopped
    }

    func ping(timeout: TimeInterval = 1.0) async -> Bool {
        guard let url = URL(string: relayDefaultBase + "/health") else { return false }
        var req = URLRequest(url: url); req.timeoutInterval = timeout
        do {
            let (_, response) = try await URLSession.shared.data(for: req)
            let code = (response as? HTTPURLResponse)?.statusCode ?? 0
            return (200..<300).contains(code)
        } catch { return false }
    }

    // MARK: Lifecycle

    @discardableResult
    func start(waitFor seconds: Int = 20) async -> Bool {
        if await ping() { state = .running; startMonitor(); return true }
        if starting {
            for _ in 0..<(seconds * 2) {
                if await ping() { state = .running; return true }
                try? await Task.sleep(nanoseconds: 500_000_000)
            }
            return false
        }
        starting = true
        defer { starting = false }
        state = .starting

        guard let root = PowerPaths.resolveRoot() else {
            state = .error("Power runtime not found — set POWER_ROOT or keep the repo at ~/Library/power.")
            return false
        }
        let cli = root.appendingPathComponent("packages/relay/dist/cli.js")
        guard FileManager.default.fileExists(atPath: cli.path) else {
            state = .error("Relay isn't built yet. Run `pnpm typecheck` to build it.")
            return false
        }
        // Write the current provider config before launch so Relay reads it.
        RelayStore.writeConfig()

        let p = Process()
        p.executableURL = URL(fileURLWithPath: "/usr/bin/env")
        p.arguments = ["node", cli.path, "--port", String(relayPort), "--config", RelayStore.configPath.path]
        var env = ProcessInfo.processInfo.environment
        env["PATH"] = PowerPaths.spawnPATH
        p.environment = env
        // Run from our app-private dir, never inheriting a broad cwd (home /
        // Downloads) that would make macOS attribute child file access to Power.
        p.currentDirectoryURL = PowerPaths.appSupport
        // Discard the server's output — an undrained pipe would fill and wedge it.
        p.standardOutput = FileHandle.nullDevice
        p.standardError = FileHandle.nullDevice
        do { try p.run() } catch { state = .error("Could not launch Relay."); return false }
        server = p

        for _ in 0..<(seconds * 2) {
            if await ping() { state = .running; startMonitor(); return true }
            try? await Task.sleep(nanoseconds: 500_000_000)
        }
        state = .error("Relay did not answer its health check in time.")
        return false
    }

    /// Keep Relay alive while supervised: poll health, respawn on unexpected death.
    private func startMonitor() {
        supervise = true
        monitor?.cancel()
        monitor = Task { [weak self] in
            while !Task.isCancelled {
                try? await Task.sleep(nanoseconds: 15_000_000_000)
                guard let self, self.supervise else { return }
                if await self.ping() { continue }
                if !self.supervise { return }
                _ = await self.start()
                return // start() installs a fresh monitor
            }
        }
    }

    /// The engine's preflight: ensure Relay is up before a routed run.
    func ensureRunning() async -> Bool {
        if await ping() { return true }
        return await start()
    }

    /// Restart to pick up a changed config (new provider, compression change).
    func reloadConfig() async {
        RelayStore.writeConfig()
        // The server hot-reloads the config file on change; a touch is enough,
        // but if it isn't running yet this is a no-op.
        _ = await ping()
    }

    func stop() {
        supervise = false
        monitor?.cancel()
        monitor = nil
        server?.terminate()
        server = nil
        state = .stopped
    }
}
