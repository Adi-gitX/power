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

enum StageStatus {
    case running, pass, fail
}

struct GateResult: Equatable {
    let pass: Bool
    let detail: String
}

struct StageUsage: Equatable {
    var costUsd: Double
    var turns: Int
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

extension Notification.Name {
    /// Posted whenever the history file changes outside the UI's own actions
    /// (e.g. a generated title landing), so sidebars can re-read.
    static let powerHistoryChanged = Notification.Name("powerHistoryChanged")
}
