import Foundation

// MARK: - Run options

/// Per-run controls. Every flag is honest: a skipped stage is recorded as
/// skipped in the state file, never faked as passed. Verify and the gates are
/// deliberately not represented here — they cannot be turned off.
struct RunFeatures: Codable, Equatable {
    enum Tier: String, Codable, CaseIterable {
        case eco, balanced, max
    }

    var tier: Tier = .balanced
    var research = true
    var reviewTest = true
    var docs = true
    var autoApprove = false
    var packs = false

    /// What a run is NOT doing — a cheap run must look cheap in the header.
    var offSummary: String {
        var parts: [String] = []
        if !research { parts.append("no research") }
        if !reviewTest { parts.append("no review/test") }
        if !docs { parts.append("no docs") }
        if autoApprove { parts.append("auto-approve") }
        if tier != .balanced { parts.append(tier.rawValue) }
        return parts.joined(separator: " · ")
    }

    private static let defaultsKey = "power.options"

    static func load() -> RunFeatures {
        guard
            let data = UserDefaults.standard.data(forKey: defaultsKey),
            let decoded = try? JSONDecoder().decode(RunFeatures.self, from: data)
        else { return RunFeatures() }
        return decoded
    }

    func save() {
        if let data = try? JSONEncoder().encode(self) {
            UserDefaults.standard.set(data, forKey: Self.defaultsKey)
        }
    }
}

// MARK: - Pipeline vocabulary

/// The eight specialists, by plugin short name — the same names as
/// `agents/<role>.md`, whose file is the dispatched system prompt.
enum Role: String, Codable, CaseIterable {
    case researcher, architect, implementer, reviewer, tester, verifier, documenter
}

enum StageID: String, Codable, CaseIterable, Identifiable {
    case research, spec, approval, implement, review, test, verify, document

    var id: String { rawValue }

    /// Card copy, ChatGPT-search style: each step names itself in plain
    /// language while it works.
    var title: String {
        switch self {
        case .research: "Research"
        case .spec: "Spec"
        case .approval: "Approval"
        case .implement: "Implement"
        case .review: "Review"
        case .test: "Test"
        case .verify: "Verify"
        case .document: "Document"
        }
    }

    var doing: String {
        switch self {
        case .research: "Researching the problem…"
        case .spec: "Writing the spec…"
        case .approval: "Waiting for your review…"
        case .implement: "Implementing…"
        case .review: "Reviewing the code…"
        case .test: "Running tests…"
        case .verify: "Verifying acceptance…"
        case .document: "Writing documentation…"
        }
    }

    var role: Role? {
        switch self {
        case .research: .researcher
        case .spec: .architect
        case .implement: .implementer
        case .review: .reviewer
        case .test: .tester
        case .verify: .verifier
        case .document: .documenter
        case .approval: nil
        }
    }
}

enum StageStatus: String, Codable {
    case running, pass, fail
}

struct GateResult: Equatable, Codable {
    let pass: Bool
    let detail: String
}

struct StageUsage: Equatable, Codable {
    var costUsd: Double
    var turns: Int
}

// MARK: - Run snapshots (persist full timeline for session restore)

struct RunSnapshot: Codable {
    let stageOrder: [StageID]
    let stages: [StageID: StageStatus]
    let lines: [StageID: [String]]
    let gates: [StageID: GateResult]
    let retries: [StageID: Int]
    let usage: [Role: StageUsage]
    let totalCostUsd: Double
    let blocked: String?
    let done: String?
}

enum SnapshotStore {
    private static var dir: URL {
        let base = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("Power/snapshots", isDirectory: true)
        try? FileManager.default.createDirectory(at: base, withIntermediateDirectories: true)
        return base
    }

    static func save(_ snapshot: RunSnapshot, id: String) {
        let safe = id.replacingOccurrences(of: ":", with: "-")
        let url = dir.appendingPathComponent("\(safe).json")
        if let data = try? JSONEncoder().encode(snapshot) {
            try? data.write(to: url)
        }
    }

    static func load(id: String) -> RunSnapshot? {
        let safe = id.replacingOccurrences(of: ":", with: "-")
        let url = dir.appendingPathComponent("\(safe).json")
        guard let data = try? Data(contentsOf: url) else { return nil }
        return try? JSONDecoder().decode(RunSnapshot.self, from: data)
    }
}

// MARK: - History

struct HistoryRow: Codable, Identifiable {
    var id: String { at }
    let goal: String
    let repoDir: String
    let at: String
    var outcome: String?
    var costUsd: Double?
    /// Session title, ChatGPT-style. Optional so rows written before titles
    /// existed decode fine — `displayTitle` gives every row a title regardless.
    var title: String?

    /// What the sidebar shows: the stored title, or a heuristic one derived
    /// from the goal on the spot. Old history needs no migration.
    var displayTitle: String { title ?? TitleMaker.quick(goal) }
}

/// Session titles. Two tiers, by design:
///   - `quick` is a zero-cost heuristic, applied instantly and used as the
///     permanent fallback — every row always has a title.
///   - `generate` asks haiku for a better one (~$0.001), fire-and-forget when
///     a run starts; on any failure the heuristic simply stands. Never called
///     in mock mode, so tests and demos stay free.
enum TitleMaker {
    private static let filler: Set<String> = [
        "build", "create", "make", "write", "implement", "develop", "generate",
        "add", "i", "want", "need", "to", "please", "me", "my", "a", "an", "the",
        "app", "that", "can", "help", "us", "for",
    ]
    private static let smallWords: Set<String> = [
        "a", "an", "the", "for", "of", "to", "in", "on", "with", "and", "or",
    ]

    static func quick(_ goal: String) -> String {
        var words = goal
            .replacingOccurrences(of: "[\"\n]", with: " ", options: .regularExpression)
            .split(separator: " ").map(String.init)
        // Peel leading filler ("build me a", "i want to create a") until a
        // content word surfaces, but never peel the whole goal away.
        while words.count > 2, filler.contains(words[0].lowercased()) {
            words.removeFirst()
        }
        var out: [String] = []
        var length = 0
        for (i, word) in words.enumerated() {
            if length + word.count + 1 > 45 { break }
            let lower = word.lowercased()
            out.append(
                i > 0 && smallWords.contains(lower)
                    ? lower
                    : word.prefix(1).uppercased() + word.dropFirst()
            )
            length += word.count + 1
        }
        let result = out.joined(separator: " ")
        return result.isEmpty ? String(goal.prefix(45)) : result
    }

    /// One tiny haiku call. Any failure (CLI missing, model alias unknown,
    /// junk output) returns nil and the heuristic remains — titles must never
    /// cost a retry or block anything.
    static func generate(for goal: String) async -> String? {
        await withCheckedContinuation { continuation in
            let process = Process()
            process.executableURL = URL(fileURLWithPath: "/usr/bin/env")
            process.arguments = [
                "claude", "-p",
                "Reply with ONLY a 3-6 word title (no quotes, no punctuation at the end) for this software build request: \(goal)",
                "--model", "haiku",
            ]
            var env = ProcessInfo.processInfo.environment
            env["PATH"] = PowerPaths.spawnPATH
            process.environment = env
            let pipe = Pipe()
            process.standardOutput = pipe
            process.standardError = Pipe()
            process.terminationHandler = { proc in
                guard proc.terminationStatus == 0,
                      let raw = String(
                        data: pipe.fileHandleForReading.readDataToEndOfFile(),
                        encoding: .utf8
                      )
                else { return continuation.resume(returning: nil) }
                let title = raw
                    .trimmingCharacters(in: .whitespacesAndNewlines)
                    .trimmingCharacters(in: CharacterSet(charactersIn: "\"'.“”"))
                let valid = !title.isEmpty && title.count <= 60 && !title.contains("\n")
                continuation.resume(returning: valid ? title : nil)
            }
            do { try process.run() } catch { continuation.resume(returning: nil) }
        }
    }
}

/// Recent runs, one JSON file in Application Support — the same shape the
/// Electron app keeps, so the two shells tell the same story.
enum HistoryStore {
    private static var url: URL {
        let base = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("Power", isDirectory: true)
        try? FileManager.default.createDirectory(at: base, withIntermediateDirectories: true)
        return base.appendingPathComponent("runs.json")
    }

    static func read() -> [HistoryRow] {
        guard let data = try? Data(contentsOf: url),
              let rows = try? JSONDecoder().decode([HistoryRow].self, from: data)
        else { return [] }
        return rows
    }

    static func record(_ row: HistoryRow) {
        var rows = read()
        rows.insert(row, at: 0)
        write(Array(rows.prefix(50)))
    }

    static func stampLatest(outcome: String, costUsd: Double) {
        var rows = read()
        guard !rows.isEmpty else { return }
        rows[0].outcome = outcome
        rows[0].costUsd = costUsd
        write(rows)
    }

    /// Stamp a specific session — position 0 is wrong the moment an older
    /// session is continued while newer rows exist above it.
    static func stamp(id: String, outcome: String, costUsd: Double) {
        var rows = read()
        guard let index = rows.firstIndex(where: { $0.id == id }) else { return }
        rows[index].outcome = outcome
        rows[index].costUsd = (rows[index].costUsd ?? 0) + costUsd
        write(rows)
    }

    /// Attach a generated title to the row it belongs to — matched by id, not
    /// position, because the upgrade arrives asynchronously and another run
    /// may have started since.
    static func setTitle(_ title: String, forRowAt id: String) {
        var rows = read()
        guard let index = rows.firstIndex(where: { $0.id == id }) else { return }
        rows[index].title = title
        write(rows)
    }

    /// Posted whenever the history file changes outside the UI's own actions
    /// (e.g. a generated title landing), so sidebars can re-read.
    static let powerHistoryChanged = Notification.Name("powerHistoryChanged")

    private static func write(_ rows: [HistoryRow]) {
        if let data = try? JSONEncoder().encode(rows) {
            try? data.write(to: url)
        }
    }
}

// MARK: - Chat

struct ChatMessage: Identifiable {
    let id = UUID()
    let role: ChatRole
    let text: String

    enum ChatRole { case user, assistant }
}

struct CodeEditor: Identifiable {
    let id: String   // bundle identifier
    let name: String
    let icon: String // SF Symbol name

    static let known: [CodeEditor] = [
        CodeEditor(id: "com.microsoft.VSCode", name: "VS Code", icon: "curlybraces"),
        CodeEditor(id: "com.microsoft.VSCodeInsiders", name: "VS Code Insiders", icon: "curlybraces"),
        CodeEditor(id: "com.todesktop.230313mzl4w4u92", name: "Cursor", icon: "cursorarrow.rays"),
        CodeEditor(id: "dev.zed.Zed", name: "Zed", icon: "bolt"),
        CodeEditor(id: "com.apple.dt.Xcode", name: "Xcode", icon: "hammer"),
    ]
}

// MARK: - Paths

/// Where the Power repo lives: scripts/, agents/, packages/*/dist. The Swift
/// app is a peer of the Electron shell — both are clients of the same compiled
/// CLIs, which is what keeps the three delivery forms one product.
enum PowerPaths {
    static func resolveRoot() -> URL? {
        let fm = FileManager.default
        var candidates: [URL] = []

        if let env = ProcessInfo.processInfo.environment["POWER_ROOT"] {
            candidates.append(URL(fileURLWithPath: env))
        }
        let home = fm.homeDirectoryForCurrentUser
        if let data = try? Data(contentsOf: home.appendingPathComponent(".power-desktop.json")),
           let cfg = try? JSONSerialization.jsonObject(with: data) as? [String: String],
           let root = cfg["powerRoot"] {
            candidates.append(URL(fileURLWithPath: root))
        }
        candidates.append(home.appendingPathComponent("Library/power"))
        // The bundled runtime: dependency-free CLI bundles + agents/ + schemas,
        // copied into Resources as a folder reference. This is what makes the
        // exported project self-contained — it needs no Power repo on disk.
        if let bundled = Bundle.main.resourceURL?.appendingPathComponent("runtime") {
            candidates.insert(bundled, at: 0)
        }

        return candidates.first {
            fm.fileExists(atPath: $0.appendingPathComponent("packages/core/dist/cli.js").path)
        }
    }

    /// A GUI app inherits PATH=/usr/bin:/bin; node and claude live in
    /// homebrew's prefix. Same fix as the Electron main process.
    static var spawnPATH: String {
        let inherited = ProcessInfo.processInfo.environment["PATH"] ?? "/usr/bin:/bin"
        let home = FileManager.default.homeDirectoryForCurrentUser.path
        return "\(inherited):/opt/homebrew/bin:/usr/local/bin:\(home)/.local/bin"
    }
}

// MARK: - Session transcripts

/// One line of the durable session chat — what "click a title and see the
/// entire agent conversation" reads from. Stored per session in Application
/// Support, so transcripts survive the repo being moved or deleted.
struct TranscriptEntry: Codable {
    let role: String   // "user" | "assistant"
    let text: String
    let at: String
}

enum TranscriptStore {
    private static func url(_ id: String) -> URL {
        let base = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("Power/sessions", isDirectory: true)
        try? FileManager.default.createDirectory(at: base, withIntermediateDirectories: true)
        // Session ids are ISO timestamps; strip the characters HFS dislikes.
        let safe = id.replacingOccurrences(of: ":", with: "-")
        return base.appendingPathComponent("\(safe).json")
    }

    static func read(_ id: String) -> [TranscriptEntry] {
        guard let data = try? Data(contentsOf: url(id)),
              let rows = try? JSONDecoder().decode([TranscriptEntry].self, from: data)
        else { return [] }
        return rows
    }

    static func append(_ role: String, _ text: String, to id: String) {
        var rows = read(id)
        rows.append(TranscriptEntry(
            role: role, text: text,
            at: ISO8601DateFormatter().string(from: .now)
        ))
        if let data = try? JSONEncoder().encode(rows) {
            try? data.write(to: url(id))
        }
    }
}

// MARK: - Projects

/// "Build me an app" should not begin with a folder picker. When no repo is
/// chosen, the app creates the project itself: a named folder under
/// ~/PowerProjects (slugged from the goal, numbered on collision) with git
/// initialised — which is also what makes auto-checkpoints possible from the
/// very first run.
enum ProjectFactory {
    static var projectsRoot: URL {
        FileManager.default.homeDirectoryForCurrentUser
            .appendingPathComponent("PowerProjects", isDirectory: true)
    }

    static func create(from goal: String) -> String? {
        let fm = FileManager.default
        let slug = TitleMaker.quick(goal)
            .lowercased()
            .replacingOccurrences(of: "[^a-z0-9]+", with: "-", options: .regularExpression)
            .trimmingCharacters(in: CharacterSet(charactersIn: "-"))
        let base = slug.isEmpty ? "project" : String(slug.prefix(40))

        var dir = projectsRoot.appendingPathComponent(base)
        var counter = 2
        while fm.fileExists(atPath: dir.path) {
            dir = projectsRoot.appendingPathComponent("\(base)-\(counter)")
            counter += 1
        }
        do {
            try fm.createDirectory(at: dir, withIntermediateDirectories: true)
        } catch { return nil }

        // git init — best effort; a project without git still works, it just
        // loses checkpoints.
        let git = Process()
        git.executableURL = URL(fileURLWithPath: "/usr/bin/env")
        git.arguments = ["git", "init", "-q"]
        git.currentDirectoryURL = dir
        var env = ProcessInfo.processInfo.environment
        env["PATH"] = PowerPaths.spawnPATH
        git.environment = env
        try? git.run()
        git.waitUntilExit()

        return dir.path
    }
}

/// Preflight: the two binaries every run needs, checked before a token is
/// spent, with errors a person can act on.
enum Toolchain {
    static func missing() -> String? {
        if !found("node") {
            return "node was not found. Install it (brew install node) and relaunch Power."
        }
        if !found("claude") {
            return "The claude CLI was not found. Install Claude Code (npm i -g @anthropic-ai/claude-code), sign in, and relaunch Power."
        }
        return nil
    }

    static func found(_ binary: String) -> Bool {
        PowerPaths.spawnPATH.split(separator: ":").contains {
            FileManager.default.isExecutableFile(atPath: "\($0)/\(binary)")
        }
    }
}

// MARK: - Launchers

/// Open the session's repo in VS Code, falling back through the known editors.
enum EditorLauncher {
    @discardableResult
    static func openVSCode(_ repoDir: String) -> Bool {
        openWith(bundleId: "com.microsoft.VSCode", path: repoDir)
            || openWith(bundleId: "com.microsoft.VSCodeInsiders", path: repoDir)
            || openWith(bundleId: "com.todesktop.230313mzl4w4u92", path: repoDir) // Cursor
    }

    static func openWith(bundleId: String, path: String) -> Bool {
        let process = Process()
        process.executableURL = URL(fileURLWithPath: "/usr/bin/open")
        process.arguments = ["-b", bundleId, path]
        do {
            try process.run()
            process.waitUntilExit()
            return process.terminationStatus == 0
        } catch { return false }
    }
}

/// Open a preview of what the run built, in Chrome.
///
/// Resolution is honest about what it can know: a static entry point in the
/// repo wins (the common case for what Power builds); otherwise the local dev
/// port. Chrome by request; the system default browser is the fallback so the
/// button never dead-ends on a machine without Chrome.
enum PreviewLauncher {
    static let entryCandidates = [
        "index.html", "out/index.html", "dist/index.html",
        "build/index.html", "public/index.html",
    ]

    /// What the button will open, for tooltips and tests. A live dev server's
    /// port beats every static fallback — running code is the truth.
    static func resolve(_ repoDir: String, devPort: Int? = nil) -> URL {
        if let devPort {
            return URL(string: "http://localhost:\(devPort)")!
        }
        for candidate in entryCandidates {
            let path = "\(repoDir)/\(candidate)"
            if FileManager.default.fileExists(atPath: path) {
                return URL(fileURLWithPath: path)
            }
        }
        return URL(string: "http://localhost:3000")!
    }

    @discardableResult
    static func openInChrome(_ repoDir: String) -> Bool {
        let target = resolve(repoDir)
        let arg = target.isFileURL ? target.path : target.absoluteString
        let process = Process()
        process.executableURL = URL(fileURLWithPath: "/usr/bin/open")
        process.arguments = ["-b", "com.google.Chrome", arg]
        do {
            try process.run()
            process.waitUntilExit()
            if process.terminationStatus == 0 { return true }
        } catch {}
        // No Chrome — the default browser beats a dead button.
        NSWorkspaceOpen(arg)
        return false
    }

    private static func NSWorkspaceOpen(_ arg: String) {
        let process = Process()
        process.executableURL = URL(fileURLWithPath: "/usr/bin/open")
        process.arguments = [arg]
        try? process.run()
    }
}

extension Notification.Name {
    /// Posted whenever the history file changes outside the UI's own actions
    /// (e.g. a generated title landing), so sidebars can re-read.
    static let powerHistoryChanged = Notification.Name("powerHistoryChanged")
}
