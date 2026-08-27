import Foundation

/// The desktop orchestrator, Swift edition — a faithful port of the Electron
/// engine (`apps/desktop/src/main/engine/runner.ts`), driving the SAME
/// machinery: state transitions through `packages/core/dist/cli.js`, gates
/// through `packages/gates/dist/cli.js`, agent stages through the user's own
/// `claude` CLI login with `agents/<role>.md` appended as the system prompt.
///
/// The invariants carried over, because they are the product:
///   - a failing gate is never edited around; the producing agent retries with
///     the gate's exact rule violations, and the retry is a fix, not a redo
///   - retries are counted by the reducer and cap at 2; then the run blocks
///   - exactly one human approval, and the reducer refuses it before the spec
///     gate has passed — auto-approve can only skip the pause, not the gate
///   - skipped stages are recorded as skipped, never faked as passed
///   - stop kills the active dispatch, because stop means stop
@MainActor
final class RunEngine: ObservableObject {

    // MARK: Published run surface (what the UI renders)

    @Published var stages: [StageID: StageStatus] = [:]
    @Published var stageOrder: [StageID] = []
    @Published var lines: [StageID: [String]] = [:]
    @Published var gates: [StageID: GateResult] = [:]
    @Published var retries: [StageID: Int] = [:]
    @Published var usage: [Role: StageUsage] = [:]
    @Published var totalCostUsd: Double = 0
    @Published var specText: String?
    @Published var blocked: String?
    @Published var done: String?
    @Published var errorText: String?
    @Published var running = false

    private var approvalContinuation: CheckedContinuation<(ok: Bool, reason: String?), Never>?
    private var activeProcess: Process?
    private var stopped = false
    private var repoDir = ""
    private var goal = ""
    private var features = RunFeatures()
    private var powerRoot: URL!
    /// The history row / transcript this run belongs to. A continuation reuses
    /// the original session's id, which is what makes one title accumulate an
    /// entire conversation of runs.
    private(set) var sessionId = ""

    private func transcript(_ role: String, _ text: String) {
        guard !sessionId.isEmpty else { return }
        TranscriptStore.append(role, text, to: sessionId)
    }

    // MARK: Cost discipline (mirrors runner.ts)

    private static let roleModel: [Role: String] = [
        .researcher: "sonnet", .architect: "opus", .implementer: "opus",
        .reviewer: "opus", .tester: "opus", .verifier: "opus", .documenter: "sonnet",
    ]
    private static let roleMaxTurns: [Role: Int] = [
        .researcher: 30, .architect: 25, .implementer: 60,
        .reviewer: 25, .tester: 40, .verifier: 30, .documenter: 25,
    ]

    private func model(for role: Role) -> String {
        switch features.tier {
        case .eco: "sonnet"
        case .max: "opus"
        case .balanced: Self.roleModel[role] ?? "sonnet"
        }
    }

    private func maxTurns(for role: Role) -> Int {
        let base = Double(Self.roleMaxTurns[role] ?? 30)
        let mult: Double = switch features.tier {
        case .eco: 0.7
        case .balanced: 1
        case .max: 1.3
        }
        return Int((base * mult).rounded())
    }

    // MARK: Controls

    func approve() {
        approvalContinuation?.resume(returning: (ok: true, reason: nil))
        approvalContinuation = nil
    }

    func reject(reason: String) {
        approvalContinuation?.resume(returning: (ok: false, reason: reason))
        approvalContinuation = nil
    }

    /// Stop means stop: flag the loop AND kill whatever is burning right now.
    func stop() {
        stopped = true
        activeProcess?.terminate()
    }

    // MARK: The pipeline

    func start(
        goal: String,
        repoDir: String,
        features: RunFeatures,
        continuingSession: String? = nil
    ) {
        guard !running else { return }
        guard let root = PowerPaths.resolveRoot() else {
            errorText = "Power root not found. Set POWER_ROOT or ~/.power-desktop.json, or keep the repo at ~/Library/power."
            return
        }
        self.powerRoot = root
        self.goal = goal
        self.repoDir = repoDir
        self.features = features

        // A continuation archives the finished run's state file — the reducer
        // rightly refuses to init over a live run — and keeps the artifacts in
        // place so the next run builds on what exists.
        if continuingSession != nil {
            let fm = FileManager.default
            let statePath = "\(repoDir)/.power/run.json"
            if fm.fileExists(atPath: statePath) {
                let archive = "\(repoDir)/.power/runs-archive"
                try? fm.createDirectory(atPath: archive, withIntermediateDirectories: true)
                let stamp = ISO8601DateFormatter().string(from: .now)
                    .replacingOccurrences(of: ":", with: "-")
                try? fm.moveItem(atPath: statePath, toPath: "\(archive)/\(stamp).json")
            }
        }
        stages = [:]; stageOrder = []; lines = [:]; gates = [:]; retries = [:]
        usage = [:]; totalCostUsd = 0
        specText = nil; blocked = nil; done = nil; errorText = nil
        stopped = false
        running = true

        let rowId: String
        if let existing = continuingSession {
            rowId = existing
        } else {
            rowId = ISO8601DateFormatter().string(from: .now)
            HistoryStore.record(HistoryRow(
                goal: goal, repoDir: repoDir, at: rowId,
                outcome: nil, costUsd: nil,
                title: TitleMaker.quick(goal)
            ))
        }
        sessionId = rowId
        transcript("user", goal)

        // A better title arrives when haiku answers; the heuristic stands if it
        // never does. Skipped in mock mode so tests and demos stay free.
        if continuingSession == nil,
           ProcessInfo.processInfo.environment["POWER_MOCK_AGENTS"] != "1" {
            Task.detached {
                if let title = await TitleMaker.generate(for: goal) {
                    await MainActor.run {
                        HistoryStore.setTitle(title, forRowAt: rowId)
                        NotificationCenter.default.post(name: .powerHistoryChanged, object: nil)
                    }
                }
            }
        }

        Task { await run() }
    }

    private func run() async {
        defer { running = false }
        do {
            let artifacts = "\(repoDir)/.power/artifacts"
            _ = try await state(["init", goal])

            // ---- research, or its honest skip ----
            if features.research {
                setStage(.research, .running)
                _ = try await state(["apply", #"{"type":"start_research"}"#])
                let ok = try await gatedStage(.research, role: .researcher, brief: [
                    "Goal: \(goal)",
                    "Read the brief at \(artifacts)/brief.json and resolve its unknowns[].",
                    "Write research.json and research.md to the artifacts directory.",
                    "Every claim carries a source_url fetched on this run, listed in sources[].",
                ])
                guard ok else { return setStage(.research, .fail) }
                setStage(.research, .pass)
                _ = try await state(["apply", #"{"type":"checkpoint_acknowledged"}"#])
            } else {
                _ = try await state(["apply", #"{"type":"research_skipped"}"#])
            }

            // ---- spec ----
            setStage(.spec, .running)
            let specBrief = features.research
                ? "Read brief.json, research.json, and research.md from the artifacts directory."
                : "No research ran on this run (skipped by run options). Read brief.json, decide from the goal and your own judgement, and record every assumption in Open Questions."
            let specced = try await gatedStage(.spec, role: .architect, brief: [
                "Goal: \(goal)",
                specBrief,
                "Write SPEC.md there: YAML frontmatter with requirement_ids, all twelve required",
                "sections, at least one EARS criterion per requirement inside its own heading",
                "block, and tasks that each cite a real R#.",
            ])
            guard specced else { return setStage(.spec, .fail) }
            setStage(.spec, .pass)

            // ---- the one human gate ----
            setStage(.approval, .running)
            let specPath = "\(artifacts)/SPEC.md"
            let verdict: (ok: Bool, reason: String?)
            if features.autoApprove {
                verdict = (ok: true, reason: nil)
            } else {
                specText = (try? String(contentsOfFile: specPath, encoding: .utf8)) ?? "(SPEC.md missing)"
                verdict = await withCheckedContinuation { approvalContinuation = $0 }
                specText = nil
            }
            if !verdict.ok {
                _ = try await state(["apply",
                    #"{"type":"spec_rejected","reason":\#(jsonString(verdict.reason ?? "rejected"))}"#])
                setStage(.spec, .running)
                let revised = try await gatedStage(.spec, role: .architect, brief: [
                    "Goal: \(goal)",
                    "The human rejected the previous spec. Their reason: \(verdict.reason ?? "none given").",
                    "Revise SPEC.md accordingly; the same gate rules apply.",
                ])
                guard revised else { return setStage(.spec, .fail) }
                setStage(.spec, .pass)
                specText = (try? String(contentsOfFile: specPath, encoding: .utf8)) ?? "(SPEC.md missing)"
                let second = await withCheckedContinuation { approvalContinuation = $0 }
                specText = nil
                guard second.ok else {
                    _ = try await state(["apply", #"{"type":"block","reason":"spec rejected twice"}"#])
                    blocked = "Spec rejected twice; run blocked."
                    return setStage(.approval, .fail)
                }
            }
            _ = try await state(["apply", #"{"type":"spec_approved"}"#])
            setStage(.approval, .pass)

            // ---- build ----
            setStage(.implement, .running)
            var implBrief = [
                "Goal: \(goal)",
                "Read \(specPath) and implement every P0 task, in the repository root.",
                "Run your own build and tests before reporting. Report actual output.",
            ]
            if features.packs,
               let catalogue = try? await node(["packages/knowledge/dist/cli.js", "selector"]) {
                implBrief.append("")
                implBrief.append("Capability packs available to you (read the matching ones before implementing):")
                implBrief.append(String(catalogue.prefix(30_000)))
            }
            try await dispatch(.implementer, stage: .implement, brief: implBrief)
            _ = try await state(["apply", #"{"type":"self_verify","green":true}"#])
            setStage(.implement, .pass)

            // ---- review + test (skippable, engine-side only) ----
            if features.reviewTest {
                setStage(.review, .running)
                try await dispatch(.reviewer, stage: .review, brief: [
                    "Review the implementation against SPEC.md. Write review.json to the artifacts directory.",
                ])
                setStage(.review, .pass)
                setStage(.test, .running)
                try await dispatch(.tester, stage: .test, brief: [
                    "Run the test suite and exercise the spec's criteria. Write test-report.json to the artifacts directory.",
                ])
                setStage(.test, .pass)
            }

            // ---- verify (never skippable) ----
            setStage(.verify, .running)
            _ = try await state(["apply", #"{"type":"start_verification"}"#])
            let verified = try await gatedStage(.verify, role: .verifier, brief: [
                "Fresh-context acceptance: exercise every P0 requirement by real interaction.",
                "Write verification.json to the artifacts directory.",
            ])
            guard verified else { return setStage(.verify, .fail) }
            setStage(.verify, .pass)

            // ---- document (skippable) ----
            if features.docs {
                setStage(.document, .running)
                try await dispatch(.documenter, stage: .document, brief: [
                    "Document the system as built: README at the repository root.",
                    "Verify every command you write down by running it. Flag spec divergences.",
                ])
                setStage(.document, .pass)
            }

            let final = try await state(["show"])
            done = final
            HistoryStore.stamp(id: sessionId, outcome: "done", costUsd: totalCostUsd)
            transcript("assistant", "Run complete — all gates passed.\n\(final.trimmingCharacters(in: .whitespacesAndNewlines))")
            NotificationCenter.default.post(name: .powerHistoryChanged, object: nil)
        } catch is CancellationError {
            // stopped
        } catch {
            if stopped { return }
            errorText = error.localizedDescription
        }
    }

    // MARK: Gated stage with the retry discipline

    private func gatedStage(_ stage: StageID, role: Role, brief: [String]) async throws -> Bool {
        var lastGateOutput = ""
        var attempt = 0
        let edge = switch stage {
        case .research: "research_refetch"
        case .spec: "spec_revision"
        default: "needs_fixes"
        }
        let gateName = stage == .verify ? "verification" : stage.rawValue

        while true {
            if stopped { return false }
            var fullBrief = brief
            if attempt > 0 {
                fullBrief += [
                    "",
                    "RETRY, not a redo. The artifact already exists — read it first. It FAILED",
                    "its gate on exactly these rules:",
                    lastGateOutput,
                    "Edit the existing artifact to fix ONLY these violations. Do not redo the",
                    "underlying work, do not refetch sources, do not restructure what passed.",
                ]
            }
            try await dispatch(role, stage: stage, brief: fullBrief)

            let gate = try await runGate(named: gateName)
            gates[stage] = gate
            if gate.pass {
                _ = try await state(["gate", gateName, "pass"])
                return true
            }
            lastGateOutput = gate.detail

            do {
                _ = try await state(["retry", edge, "gate \(gateName) failed (attempt \(attempt + 1))"])
                attempt += 1
                retries[stage] = attempt
            } catch {
                // The reducer refused: budget spent. Block with the specifics.
                _ = try? await state(["apply",
                    #"{"type":"block","reason":"\#(gateName) gate unsatisfiable after retries"}"#])
                blocked = "\(gateName) gate failed \(attempt + 1) times; retry budget spent.\n\(lastGateOutput)"
                HistoryStore.stamp(id: sessionId, outcome: "blocked", costUsd: totalCostUsd)
                transcript("assistant", "Run blocked: \(gateName) gate failed \(attempt + 1) times; retry budget spent.")
                NotificationCenter.default.post(name: .powerHistoryChanged, object: nil)
                return false
            }
        }
    }

    // MARK: Dispatch, exactly as jobs/build.md specifies one

    private func dispatch(_ role: Role, stage: StageID, brief: [String]) async throws {
        let promptURL = powerRoot.appendingPathComponent("agents/\(role.rawValue).md")
        let systemPrompt = try String(contentsOf: promptURL, encoding: .utf8)
        let dispatchText = ([
            "You are being dispatched as the \(role.rawValue) on a Power run.",
            "",
            "Repository (absolute path): \(repoDir)",
            "Artifacts directory: \(repoDir)/.power/artifacts",
            "",
        ] + brief + [
            "",
            "Use absolute paths throughout. Write only the artifacts your role owns.",
        ]).joined(separator: "\n")

        // Test parity with the Electron engine: POWER_MOCK_AGENTS swaps the
        // model for fixture-writing mocks, so the full pipeline — real state
        // machine, real gates — runs headlessly with no model and no network.
        if ProcessInfo.processInfo.environment["POWER_MOCK_AGENTS"] == "1" {
            _ = try await node([
                "apps/desktop/test/mock-agent.mjs", role.rawValue, repoDir,
                powerRoot.appendingPathComponent("packages/gates/test/fixtures").path,
            ])
            appendLine("\(role.rawValue): wrote mock artifacts", to: stage)
            return
        }

        let args = [
            "-p", dispatchText,
            "--append-system-prompt", systemPrompt,
            "--permission-mode", "acceptEdits",
            "--add-dir", repoDir,
            "--model", model(for: role),
            "--max-turns", String(maxTurns(for: role)),
            // stream-json is what makes cost visible: assistant frames carry
            // the card's text, the result frame carries cost and turns.
            "--output-format", "stream-json",
            "--verbose",
        ]

        _ = try await exec("claude", args) { [weak self] line in
            self?.consumeStreamLine(line, role: role, stage: stage)
        }
    }

    private func consumeStreamLine(_ line: String, role: Role, stage: StageID) {
        guard line.hasPrefix("{"),
              let data = line.data(using: .utf8),
              let frame = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
        else {
            appendLine(line, to: stage)
            return
        }
        switch frame["type"] as? String {
        case "assistant":
            if let message = frame["message"] as? [String: Any],
               let content = message["content"] as? [[String: Any]] {
                for block in content where block["type"] as? String == "text" {
                    for part in ((block["text"] as? String) ?? "").split(separator: "\n") {
                        let text = part.trimmingCharacters(in: .whitespaces)
                        if !text.isEmpty { appendLine(text, to: stage) }
                    }
                }
            }
        case "result":
            let cost = frame["total_cost_usd"] as? Double ?? 0
            let turns = frame["num_turns"] as? Int ?? 0
            usage[role] = StageUsage(costUsd: cost, turns: turns)
            totalCostUsd += cost
        default:
            break // tool-use noise never reaches the card
        }
    }

    // MARK: Process plumbing

    private func state(_ args: [String]) async throws -> String {
        try await node(["packages/core/dist/cli.js"] + args)
    }

    private func runGate(named gate: String) async throws -> GateResult {
        do {
            let out = try await node([
                "packages/gates/dist/cli.js", gate, "\(repoDir)/.power/artifacts",
            ])
            return GateResult(pass: true, detail: out.trimmingCharacters(in: .whitespacesAndNewlines))
        } catch let failure as ToolFailure where failure.code == 1 {
            return GateResult(pass: false, detail: failure.output)
        }
    }

    private func node(_ args: [String]) async throws -> String {
        let resolved = args.map {
            $0.hasSuffix(".js") || $0.hasSuffix(".mjs")
                ? powerRoot.appendingPathComponent($0).path
                : $0
        }
        return try await exec("node", resolved)
    }

    struct ToolFailure: Error, LocalizedError {
        let code: Int32
        let output: String
        var errorDescription: String? { output }
    }

    /// Line-splits a byte stream under a lock. The pipe's readability handler
    /// and the termination handler run on different queues; without the lock
    /// they race on the buffer — Swift 6 flags it, and it is a real race, not
    /// a pedantic one.
    private final class LineAccumulator: @unchecked Sendable {
        private let lock = NSLock()
        private var buffer = Data()
        private var output = ""

        func consume(_ chunk: Data, onLine: (String) -> Void) {
            lock.lock()
            defer { lock.unlock() }
            buffer.append(chunk)
            while let newline = buffer.firstIndex(of: UInt8(ascii: "\n")) {
                let lineData = buffer[..<newline]
                buffer.removeSubrange(...newline)
                if let line = String(data: lineData, encoding: .utf8),
                   !line.trimmingCharacters(in: .whitespaces).isEmpty {
                    output += line + "\n"
                    onLine(line)
                }
            }
        }

        func finish() -> String {
            lock.lock()
            defer { lock.unlock() }
            if let rest = String(data: buffer, encoding: .utf8),
               !rest.trimmingCharacters(in: .whitespaces).isEmpty {
                output += rest
            }
            buffer.removeAll()
            return output
        }
    }

    /// Spawn with a real PATH and stream stdout+stderr line-by-line. Never
    /// blocks the main actor: the process runs detached and lines hop back.
    private func exec(
        _ cmd: String,
        _ args: [String],
        onLine: (@MainActor (String) -> Void)? = nil
    ) async throws -> String {
        let process = Process()
        process.executableURL = URL(fileURLWithPath: "/usr/bin/env")
        process.arguments = [cmd] + args
        process.currentDirectoryURL = URL(fileURLWithPath: repoDir)
        var env = ProcessInfo.processInfo.environment
        env["PATH"] = PowerPaths.spawnPATH
        process.environment = env

        let pipe = Pipe()
        process.standardOutput = pipe
        process.standardError = pipe
        activeProcess = process

        let accumulator = LineAccumulator()
        return try await withCheckedThrowingContinuation { continuation in
            pipe.fileHandleForReading.readabilityHandler = { handle in
                let chunk = handle.availableData
                guard !chunk.isEmpty else { return }
                accumulator.consume(chunk) { line in
                    if let onLine {
                        Task { @MainActor in onLine(line) }
                    }
                }
            }

            process.terminationHandler = { proc in
                pipe.fileHandleForReading.readabilityHandler = nil
                let output = accumulator.finish()
                if proc.terminationStatus == 0 {
                    continuation.resume(returning: output)
                } else {
                    continuation.resume(throwing: ToolFailure(
                        code: proc.terminationStatus, output: output
                    ))
                }
            }

            do {
                try process.run()
            } catch {
                pipe.fileHandleForReading.readabilityHandler = nil
                continuation.resume(throwing: error)
            }
        }
    }

    // MARK: Small helpers

    private func setStage(_ stage: StageID, _ status: StageStatus) {
        if stages[stage] == nil { stageOrder.append(stage) }
        stages[stage] = status

        // The durable chat: each stage lands in the transcript as it resolves,
        // with its gate verdict, retries, and cost — this is what a restored
        // session replays.
        if status != .running {
            var parts = [status == .pass ? "✓ \(stage.title)" : "✕ \(stage.title)"]
            if let gate = gates[stage] { parts.append(gate.pass ? "gate PASS" : "gate FAIL") }
            if let count = retries[stage], count > 0 { parts.append("retry \(count)/2") }
            if let role = stage.role, let use = usage[role], use.costUsd > 0 {
                parts.append(String(format: "$%.2f · %dt", use.costUsd, use.turns))
            }
            transcript("assistant", parts.joined(separator: " — "))
        }
    }

    private func appendLine(_ line: String, to stage: StageID) {
        var current = lines[stage] ?? []
        current.append(line)
        if current.count > 500 { current.removeFirst(current.count - 500) }
        lines[stage] = current
    }

    private func jsonString(_ value: String) -> String {
        let data = (try? JSONSerialization.data(withJSONObject: [value])) ?? Data()
        let text = String(data: data, encoding: .utf8) ?? "[\"\"]"
        return String(text.dropFirst().dropLast())
    }
}

// MARK: - Claude connection (VSCode-extension pattern)

/// The app neither stores nor sees a credential: `claude auth status` reports
/// the CLI's own login, sign-in runs the CLI's OAuth flow in the browser.
enum ClaudeAuth {
    struct Status {
        let cliFound: Bool
        let loggedIn: Bool
        let email: String?
    }

    static func status() async -> Status {
        await withCheckedContinuation { continuation in
            let process = Process()
            process.executableURL = URL(fileURLWithPath: "/usr/bin/env")
            process.arguments = ["claude", "auth", "status"]
            var env = ProcessInfo.processInfo.environment
            env["PATH"] = PowerPaths.spawnPATH
            process.environment = env
            let pipe = Pipe()
            process.standardOutput = pipe
            process.standardError = Pipe()
            process.terminationHandler = { _ in
                let data = pipe.fileHandleForReading.readDataToEndOfFile()
                guard
                    let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
                else {
                    return continuation.resume(returning: Status(cliFound: true, loggedIn: false, email: nil))
                }
                continuation.resume(returning: Status(
                    cliFound: true,
                    loggedIn: json["loggedIn"] as? Bool ?? false,
                    email: json["email"] as? String
                ))
            }
            do { try process.run() } catch {
                continuation.resume(returning: Status(cliFound: false, loggedIn: false, email: nil))
            }
        }
    }

    static func login() async {
        await withCheckedContinuation { (continuation: CheckedContinuation<Void, Never>) in
            let process = Process()
            process.executableURL = URL(fileURLWithPath: "/usr/bin/env")
            process.arguments = ["claude", "auth", "login"]
            var env = ProcessInfo.processInfo.environment
            env["PATH"] = PowerPaths.spawnPATH
            process.environment = env
            process.terminationHandler = { _ in continuation.resume() }
            do { try process.run() } catch { continuation.resume() }
        }
    }
}
