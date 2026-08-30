import Foundation
import AppKit

/// Managed OmniRoute lifecycle — Power installs, starts, health-checks, and
/// stops a local OmniRoute gateway so the whole thing lives inside the app.
///
/// OmniRoute is an MIT-licensed local server the user runs on their own machine
/// with their own provider accounts. Power orchestrates the process; it never
/// ships or holds anyone's credentials. The server is keyless on loopback (its
/// `auto` model answers with no key), so routing works the moment it is up.
///
/// The one invariant: a routed run must not dispatch until the server answers
/// its health ping, or the first stage fails against a dead endpoint. The engine
/// calls `ensureRunning()` before a run that routes to OmniRoute.
@MainActor
final class OmniRouteManager: ObservableObject {
    enum State: Equatable {
        case checking, notInstalled, stopped, installing, starting, running
        case error(String)
    }

    @Published var state: State = .checking
    @Published var installLog: [String] = []

    private static let healthPath = "/api/health/ping"
    private var server: Process?
    /// While true, a background monitor keeps the server alive — if it dies
    /// unexpectedly it is respawned. A user Stop clears it so Stop means stop.
    private var supervise = false
    private var monitor: Task<Void, Never>?

    // MARK: Status

    /// Resolve the current state: running (port answers) → stopped (CLI present)
    /// → not-installed. Called on the sheet appearing and after each action.
    func refresh() async {
        state = .checking
        if await ping() { state = .running; return }
        state = (await isInstalled()) ? .stopped : .notInstalled
    }

    func isInstalled() async -> Bool {
        await withCheckedContinuation { cont in
            let p = Process()
            p.executableURL = URL(fileURLWithPath: "/usr/bin/env")
            p.arguments = ["which", "omniroute"]
            var env = ProcessInfo.processInfo.environment
            env["PATH"] = PowerPaths.spawnPATH
            p.environment = env
            p.standardOutput = Pipe(); p.standardError = Pipe()
            p.terminationHandler = { proc in cont.resume(returning: proc.terminationStatus == 0) }
            do { try p.run() } catch { cont.resume(returning: false) }
        }
    }

    func ping(timeout: TimeInterval = 1.0) async -> Bool {
        guard let url = URL(string: omniRouteDefaultBase + Self.healthPath) else { return false }
        var req = URLRequest(url: url); req.timeoutInterval = timeout
        do {
            let (_, response) = try await URLSession.shared.data(for: req)
            return (response as? HTTPURLResponse)?.statusCode == 200
        } catch { return false }
    }

    // MARK: Actions

    /// `npm install -g omniroute`, streaming its output into the sheet.
    func install() async {
        state = .installing; installLog = []
        let ok = await runStreaming("npm", ["install", "-g", "omniroute"]) { [weak self] line in
            self?.installLog.append(line)
            if self?.installLog.count ?? 0 > 200 { self?.installLog.removeFirst() }
        }
        if ok { await refresh() } else { state = .error("Install failed — see the log.") }
    }

    /// Start the server (idempotent: adopts a running instance) and wait for the
    /// health ping. Returns true once it answers.
    @discardableResult
    func start(waitFor seconds: Int = 30) async -> Bool {
        if await ping() { state = .running; return true }
        state = .starting
        let p = Process()
        p.executableURL = URL(fileURLWithPath: "/usr/bin/env")
        p.arguments = ["omniroute"]
        var env = ProcessInfo.processInfo.environment
        env["PATH"] = PowerPaths.spawnPATH
        p.environment = env
        p.standardOutput = Pipe(); p.standardError = Pipe()
        do { try p.run() } catch { state = .error("Could not launch omniroute."); return false }
        server = p
        for _ in 0..<(seconds * 2) {
            if await ping() { state = .running; startMonitor(); return true }
            try? await Task.sleep(nanoseconds: 500_000_000)
        }
        state = .error("Did not answer health check in time.")
        return false
    }

    /// Keep the server alive while supervised: poll health, respawn on an
    /// unexpected death. Cheap (a ping every 15s) and self-cancelling on Stop.
    private func startMonitor() {
        supervise = true
        monitor?.cancel()
        monitor = Task { [weak self] in
            while !Task.isCancelled {
                try? await Task.sleep(nanoseconds: 15_000_000_000)
                guard let self, self.supervise else { return }
                if await self.ping() { continue }
                if !self.supervise { return }
                // Died while we still wanted it up — bring it back.
                _ = await self.start()
                return // start() installs a fresh monitor
            }
        }
    }

    /// The engine's preflight: ensure the server is up before a routed run.
    func ensureRunning() async -> Bool {
        if await ping() { return true }
        guard await isInstalled() else { return false }
        return await start()
    }

    func stop() {
        supervise = false
        monitor?.cancel()
        monitor = nil
        server?.terminate()
        server = nil
        state = .stopped
    }

    func openDashboard() {
        if let url = URL(string: omniRouteDefaultBase) { NSWorkspace.shared.open(url) }
    }

    // MARK: Plumbing

    private func runStreaming(
        _ cmd: String, _ args: [String], onLine: @escaping @MainActor (String) -> Void
    ) async -> Bool {
        await withCheckedContinuation { cont in
            let p = Process()
            p.executableURL = URL(fileURLWithPath: "/usr/bin/env")
            p.arguments = [cmd] + args
            var env = ProcessInfo.processInfo.environment
            env["PATH"] = PowerPaths.spawnPATH
            p.environment = env
            let pipe = Pipe()
            p.standardOutput = pipe; p.standardError = pipe
            pipe.fileHandleForReading.readabilityHandler = { handle in
                let chunk = handle.availableData
                guard !chunk.isEmpty, let text = String(data: chunk, encoding: .utf8) else { return }
                for line in text.split(separator: "\n", omittingEmptySubsequences: true) {
                    let l = String(line)
                    Task { @MainActor in onLine(l) }
                }
            }
            p.terminationHandler = { proc in
                pipe.fileHandleForReading.readabilityHandler = nil
                cont.resume(returning: proc.terminationStatus == 0)
            }
            do { try p.run() } catch { cont.resume(returning: false) }
        }
    }
}
