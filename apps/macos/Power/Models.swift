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
enum Role: String, CaseIterable {
    case researcher, architect, implementer, reviewer, tester, verifier, documenter
}

enum StageID: String, CaseIterable, Identifiable {
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

    private static func write(_ rows: [HistoryRow]) {
        if let data = try? JSONEncoder().encode(rows) {
            try? data.write(to: url)
        }
    }
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
