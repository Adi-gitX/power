import SwiftUI
import AppKit

// MARK: - Root

struct ContentView: View {
    @StateObject private var engine = RunEngine()
    @State private var auth: ClaudeAuth.Status?
    @State private var signingIn = false
    @State private var view: MainView = .home
    @State private var goal = ""
    @State private var repoDir: String?
    @State private var features = RunFeatures.load()
    @State private var history = HistoryStore.read()
    @State private var filter = ""
    @State private var rejectReason = ""

    enum MainView { case home, run }

    var body: some View {
        HStack(spacing: 0) {
            sidebar
            Divider().overlay(Color.hairline)
            main
        }
        .background(Color.shell)
        .preferredColorScheme(.dark)
        .task {
            auth = await ClaudeAuth.status()
        }
        .onChange(of: engine.running) {
            history = HistoryStore.read()
        }
    }

    // MARK: Sidebar — sessions only, Perplexity-style

    private var sidebar: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(spacing: 8) {
                Mark().frame(width: 20, height: 20)
                Text("power").font(.system(size: 14, weight: .semibold, design: .monospaced))
                    .foregroundStyle(Color.ink)
                + Text("/").font(.system(size: 14, weight: .semibold, design: .monospaced))
                    .foregroundStyle(Color.accentSoft)
            }
            .padding(.leading, 76) // clears the traffic lights
            .frame(height: 48)

            Button {
                view = .home
                goal = ""
            } label: {
                Label("New Session", systemImage: "plus")
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
            .buttonStyle(SidebarButtonStyle())
            .padding(.horizontal, 10)

            HStack(spacing: 8) {
                Image(systemName: "magnifyingglass")
                    .font(.system(size: 11))
                    .foregroundStyle(Color.mutedText)
                TextField("Search sessions…", text: $filter)
                    .textFieldStyle(.plain)
                    .font(.system(size: 13))
                    .foregroundStyle(Color.ink)
            }
            .padding(.horizontal, 10)
            .padding(.vertical, 7)
            .background(RoundedRectangle(cornerRadius: 8).fill(Color.canvasDark.opacity(0.6)))
            .overlay(RoundedRectangle(cornerRadius: 8).stroke(Color.hairline))
            .padding(.horizontal, 12)
            .padding(.top, 4)

            Text("Recent")
                .font(.system(size: 11, weight: .semibold))
                .foregroundStyle(Color.mutedText)
                .padding(.horizontal, 20)
                .padding(.top, 18)
                .padding(.bottom, 4)

            ScrollView {
                LazyVStack(alignment: .leading, spacing: 2) {
                    ForEach(visibleHistory) { row in
                        Button {
                            goal = row.goal
                            repoDir = row.repoDir
                            view = .home
                        } label: {
                            VStack(alignment: .leading, spacing: 1) {
                                Text(row.goal).lineLimit(1)
                                    .font(.system(size: 13))
                                    .foregroundStyle(Color.bodyText)
                                if row.outcome != nil || row.costUsd != nil {
                                    Text(historyMeta(row))
                                        .font(.system(size: 10.5))
                                        .foregroundStyle(Color.mutedText)
                                }
                            }
                            .frame(maxWidth: .infinity, alignment: .leading)
                        }
                        .buttonStyle(SidebarButtonStyle())
                    }
                }
                .padding(.horizontal, 10)
            }

            Divider().overlay(Color.hairline)
            HStack(spacing: 10) {
                Circle().stroke(Color.hairline)
                    .frame(width: 26, height: 26)
                    .overlay(Text("/").font(.system(size: 11, design: .monospaced)).foregroundStyle(Color.ink))
                VStack(alignment: .leading, spacing: 0) {
                    Text(repoDir.map { URL(fileURLWithPath: $0).lastPathComponent } ?? "No repository")
                        .font(.system(size: 13)).foregroundStyle(Color.bodyText).lineLimit(1)
                    if let email = auth?.email {
                        Text(email).font(.system(size: 11)).foregroundStyle(Color.mutedText).lineLimit(1)
                    }
                }
                Spacer()
                Button { pickRepo() } label: {
                    Image(systemName: "folder").foregroundStyle(Color.mutedText)
                }
                .buttonStyle(.plain)
            }
            .padding(12)
        }
        .frame(width: 250)
        .background(Color.panel.opacity(0.6))
    }

    private var visibleHistory: [HistoryRow] {
        filter.isEmpty ? history : history.filter { $0.goal.localizedCaseInsensitiveContains(filter) }
    }

    private func historyMeta(_ row: HistoryRow) -> String {
        var parts: [String] = []
        if let outcome = row.outcome { parts.append(outcome) }
        if let cost = row.costUsd, cost > 0 { parts.append(String(format: "$%.2f", cost)) }
        return parts.joined(separator: " · ")
    }

    // MARK: Main pane

    @ViewBuilder private var main: some View {
        VStack(spacing: 0) {
            header
            if let auth, !auth.loggedIn {
                ConnectView(auth: auth, signingIn: $signingIn) {
                    Task {
                        signingIn = true
                        await ClaudeAuth.login()
                        self.auth = await ClaudeAuth.status()
                        signingIn = false
                    }
                }
            } else if view == .home {
                homeView
            } else {
                RunTimeline(engine: engine, goal: goal, rejectReason: $rejectReason)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color.shell)
    }

    private var header: some View {
        HStack(spacing: 10) {
            if view == .run {
                Circle()
                    .fill(engine.blocked != nil || engine.errorText != nil
                        ? Color.accentSoft
                        : engine.done != nil ? Color.pass : Color.accentSoft)
                    .frame(width: 8, height: 8)
                    .opacity(engine.running ? 0.9 : 1)
                Text(goal).font(.system(size: 13, weight: .medium))
                    .foregroundStyle(Color.ink).lineLimit(1)
                if !features.offSummary.isEmpty {
                    Chip(text: features.offSummary)
                }
                if engine.totalCostUsd > 0 {
                    Text(String(format: "$%.2f", engine.totalCostUsd))
                        .font(.system(size: 12, design: .monospaced))
                        .foregroundStyle(Color.mutedText)
                }
                Text(statusWord).font(.system(size: 12)).foregroundStyle(Color.mutedText)
                if engine.running {
                    Button("Stop") { engine.stop() }
                        .buttonStyle(.plain)
                        .font(.system(size: 12, weight: .medium))
                        .foregroundStyle(Color.accentSoft)
                        .padding(.horizontal, 10).padding(.vertical, 4)
                        .background(RoundedRectangle(cornerRadius: 6).fill(Color.accentSoft.opacity(0.1)))
                        .overlay(RoundedRectangle(cornerRadius: 6).stroke(Color.accentSoft.opacity(0.5)))
                }
                Spacer()
                Button("New Session ⌘N") {
                    view = .home
                    goal = ""
                }
                .buttonStyle(.plain)
                .font(.system(size: 12, weight: .medium))
                .foregroundStyle(Color.bodyText)
                .padding(.horizontal, 10).padding(.vertical, 5)
                .background(RoundedRectangle(cornerRadius: 6).fill(Color.panel))
                .overlay(RoundedRectangle(cornerRadius: 6).stroke(Color.hairline))
                .keyboardShortcut("n", modifiers: .command)
            } else {
                Spacer()
                Text("⌘N new session").font(.system(size: 11)).foregroundStyle(Color.mutedText.opacity(0.7))
            }
        }
        .padding(.horizontal, 16)
        .frame(height: 48)
        .overlay(Rectangle().fill(Color.hairline).frame(height: 1), alignment: .bottom)
    }

    private var statusWord: String {
        if engine.errorText != nil { return "error" }
        if engine.blocked != nil { return "blocked" }
        if engine.done != nil { return "complete" }
        return "running"
    }

    // MARK: Home — wordmark + ask box + options

    private var homeView: some View {
        VStack(spacing: 36) {
            Spacer()
            (Text("power").font(.custom("New York", size: 56))
                + Text("/").font(.custom("New York", size: 56)).foregroundStyle(Color.accentSoft))
                .foregroundStyle(Color.ink)

            VStack(spacing: 0) {
                TextField("Describe what to build…", text: $goal, axis: .vertical)
                    .textFieldStyle(.plain)
                    .lineLimit(2...5)
                    .font(.system(size: 15))
                    .foregroundStyle(Color.ink)
                    .padding(.horizontal, 8).padding(.top, 6)
                    .onSubmit { startRun() }

                optionsRow
                    .padding(.horizontal, 4).padding(.top, 10)

                HStack {
                    Button { pickRepo() } label: {
                        Label(
                            repoDir.map { URL(fileURLWithPath: $0).lastPathComponent } ?? "Choose repository",
                            systemImage: "folder"
                        )
                        .font(.system(size: 12))
                        .foregroundStyle(Color.mutedText)
                    }
                    .buttonStyle(.plain)
                    Spacer()
                    Button { startRun() } label: {
                        Image(systemName: "arrow.up")
                            .font(.system(size: 14, weight: .bold))
                            .foregroundStyle(.white)
                            .frame(width: 34, height: 34)
                            .background(Circle().fill(Color.accent))
                    }
                    .buttonStyle(.plain)
                    .disabled(goal.trimmingCharacters(in: .whitespaces).count < 8)
                    .opacity(goal.trimmingCharacters(in: .whitespaces).count < 8 ? 0.3 : 1)
                }
                .padding(.horizontal, 4).padding(.top, 8)
            }
            .padding(12)
            .frame(maxWidth: 620)
            .background(RoundedRectangle(cornerRadius: 16).fill(Color.panel))
            .overlay(RoundedRectangle(cornerRadius: 16).stroke(Color.hairline))
            .shadow(color: .black.opacity(0.35), radius: 25, y: 16)

            Text("Eight specialists, gates that run as code, one approval.\nRuns use your own Claude Code login — there is no API key.")
                .font(.system(size: 13))
                .foregroundStyle(Color.mutedText)
                .multilineTextAlignment(.center)
            Spacer()
            Spacer()
        }
        .padding(.horizontal, 40)
    }

    /// Every chip maps to something the engine honestly does — a skipped stage
    /// is recorded as skipped, never faked. Verify and gates are not offered.
    private var optionsRow: some View {
        HStack(spacing: 6) {
            HStack(spacing: 0) {
                ForEach(RunFeatures.Tier.allCases, id: \.self) { tier in
                    Button(tier.rawValue) {
                        features.tier = tier
                        features.save()
                    }
                    .buttonStyle(.plain)
                    .font(.system(size: 11.5, weight: .medium))
                    .foregroundStyle(features.tier == tier ? Color.ink : Color.mutedText)
                    .padding(.horizontal, 10).padding(.vertical, 5)
                    .background(features.tier == tier ? Color.raised : .clear)
                }
            }
            .clipShape(RoundedRectangle(cornerRadius: 8))
            .overlay(RoundedRectangle(cornerRadius: 8).stroke(Color.hairline))

            toggleChip("Research", \.research)
            toggleChip("Review + Test", \.reviewTest)
            toggleChip("Docs", \.docs)
            toggleChip("Auto-approve", \.autoApprove)
            toggleChip("Packs", \.packs)
            Spacer(minLength: 0)
        }
    }

    private func toggleChip(_ label: String, _ path: WritableKeyPath<RunFeatures, Bool>) -> some View {
        let on = features[keyPath: path]
        return Button(label) {
            features[keyPath: path].toggle()
            features.save()
        }
        .buttonStyle(.plain)
        .font(.system(size: 11.5, weight: .medium))
        .foregroundStyle(on ? Color.accentSoft : Color.mutedText)
        .padding(.horizontal, 10).padding(.vertical, 5)
        .background(Capsule().fill(on ? Color.accentSoft.opacity(0.1) : .clear))
        .overlay(Capsule().stroke(on ? Color.accentSoft.opacity(0.5) : Color.hairline))
    }

    // MARK: Actions

    private func pickRepo() {
        let panel = NSOpenPanel()
        panel.canChooseDirectories = true
        panel.canChooseFiles = false
        panel.canCreateDirectories = true
        panel.message = "Choose the repository Power will work in"
        if panel.runModal() == .OK, let url = panel.url {
            repoDir = url.path
        }
    }

    private func startRun() {
        if repoDir == nil { pickRepo() }
        guard let dir = repoDir,
              goal.trimmingCharacters(in: .whitespaces).count >= 8 else { return }
        engine.start(goal: goal.trimmingCharacters(in: .whitespaces), repoDir: dir, features: features)
        view = .run
        history = HistoryStore.read()
    }
}

// MARK: - Connect (VSCode-extension pattern)

struct ConnectView: View {
    let auth: ClaudeAuth.Status
    @Binding var signingIn: Bool
    let onSignIn: () -> Void

    var body: some View {
        VStack(spacing: 22) {
            Spacer()
            Mark().frame(width: 56, height: 56)
            Text("Connect Claude").font(.custom("New York", size: 34)).foregroundStyle(Color.ink)
            Text("Power runs on your own Claude account — the same sign-in the\nClaude Code extension uses. Your credentials stay in Claude's\nkeychain; this app never sees them.")
                .font(.system(size: 13))
                .foregroundStyle(Color.mutedText)
                .multilineTextAlignment(.center)
            if auth.cliFound {
                Button {
                    onSignIn()
                } label: {
                    Text(signingIn ? "Waiting for the browser…" : "Sign in with Claude")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(.white)
                        .padding(.horizontal, 22).padding(.vertical, 10)
                        .background(Capsule().fill(Color.accent))
                }
                .buttonStyle(.plain)
                .disabled(signingIn)
            } else {
                Text("The claude CLI was not found. Install Claude Code first —\nnpm i -g @anthropic-ai/claude-code — then relaunch Power.")
                    .font(.system(size: 13))
                    .foregroundStyle(Color.bodyText)
                    .multilineTextAlignment(.center)
                    .padding(14)
                    .background(RoundedRectangle(cornerRadius: 12).fill(Color.panel))
                    .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.hairline))
            }
            Spacer()
            Spacer()
        }
        .frame(maxWidth: .infinity)
    }
}

// MARK: - Run timeline (the chat-space pattern)

struct RunTimeline: View {
    @ObservedObject var engine: RunEngine
    let goal: String
    @Binding var rejectReason: String

    var body: some View {
        ScrollViewReader { proxy in
            ScrollView {
                VStack(spacing: 12) {
                    HStack {
                        Spacer()
                        Text(goal)
                            .font(.system(size: 14))
                            .foregroundStyle(Color.ink)
                            .padding(.horizontal, 16).padding(.vertical, 10)
                            .background(
                                UnevenRoundedRectangle(
                                    topLeadingRadius: 16, bottomLeadingRadius: 16,
                                    bottomTrailingRadius: 6, topTrailingRadius: 16
                                ).fill(Color.raised)
                            )
                    }

                    ForEach(engine.stageOrder) { stage in
                        StageCardView(engine: engine, stage: stage, rejectReason: $rejectReason)
                    }

                    if let blocked = engine.blocked {
                        Banner(
                            icon: "exclamationmark.triangle", tint: .accentSoft,
                            title: "Run blocked", body: blocked
                        )
                    }
                    if let error = engine.errorText {
                        Banner(icon: "xmark.octagon", tint: .accentSoft, title: "Error", body: error)
                    }
                    if let done = engine.done {
                        Banner(
                            icon: "checkmark.circle", tint: .pass,
                            title: engine.totalCostUsd > 0
                                ? String(format: "Run complete — all gates passed.  $%.2f total", engine.totalCostUsd)
                                : "Run complete — all gates passed.",
                            body: done.trimmingCharacters(in: .whitespacesAndNewlines)
                        )
                    }
                    Color.clear.frame(height: 1).id("bottom")
                }
                .padding(24)
                .frame(maxWidth: 720)
                .frame(maxWidth: .infinity)
            }
            .onChange(of: engine.stageOrder.count) {
                withAnimation { proxy.scrollTo("bottom") }
            }
        }
    }
}

struct StageCardView: View {
    @ObservedObject var engine: RunEngine
    let stage: StageID
    @Binding var rejectReason: String
    @State private var expanded = false

    private var status: StageStatus { engine.stages[stage] ?? .running }
    private var lines: [String] { engine.lines[stage] ?? [] }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Button {
                expanded.toggle()
            } label: {
                HStack(spacing: 10) {
                    statusIcon
                    Text(status == .running ? stage.doing : stage.title)
                        .font(.system(size: 14, weight: .medium))
                        .foregroundStyle(Color.ink)
                    if let gate = engine.gates[stage] {
                        Chip(
                            text: gate.pass ? "gate PASS" : "gate FAIL",
                            tint: gate.pass ? .pass : .accentSoft
                        )
                    }
                    if let retries = engine.retries[stage], retries > 0 {
                        Chip(text: "retry \(retries)/2")
                    }
                    if let role = stage.role, let usage = engine.usage[role], usage.costUsd > 0 {
                        Chip(text: String(format: "$%.2f · %dt", usage.costUsd, usage.turns))
                    }
                    Spacer()
                    if lines.count > 3 {
                        Text(expanded ? "collapse" : "\(lines.count) lines")
                            .font(.system(size: 11)).foregroundStyle(Color.mutedText)
                    }
                }
            }
            .buttonStyle(.plain)

            let tail = expanded ? lines : Array(lines.suffix(3))
            if !tail.isEmpty {
                VStack(alignment: .leading, spacing: 2) {
                    ForEach(Array(tail.enumerated()), id: \.offset) { _, line in
                        Text(line)
                            .font(.system(size: 12, design: .monospaced))
                            .foregroundStyle(Color.mutedText)
                            .textSelection(.enabled)
                    }
                }
                .padding(.leading, 12)
                .overlay(Rectangle().fill(Color.hairline).frame(width: 1), alignment: .leading)
            }

            if stage == .approval, let spec = engine.specText {
                approvalBody(spec)
            }
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(RoundedRectangle(cornerRadius: 16).fill(Color.panel.opacity(0.8)))
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(Color.hairline))
    }

    @ViewBuilder private var statusIcon: some View {
        switch status {
        case .running: ProgressView().controlSize(.small).tint(Color.accentSoft)
        case .pass: Image(systemName: "checkmark").font(.system(size: 12, weight: .bold)).foregroundStyle(Color.pass)
        case .fail: Image(systemName: "xmark.octagon").font(.system(size: 13)).foregroundStyle(Color.accentSoft)
        }
    }

    private func approvalBody(_ spec: String) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            ScrollView {
                Text(spec)
                    .font(.system(size: 12, design: .monospaced))
                    .foregroundStyle(Color.bodyText)
                    .textSelection(.enabled)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(12)
            }
            .frame(maxHeight: 280)
            .background(RoundedRectangle(cornerRadius: 12).fill(Color.canvasDark))
            .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.hairline))

            HStack(spacing: 8) {
                Button("Approve") { engine.approve() }
                    .buttonStyle(.plain)
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 16).padding(.vertical, 7)
                    .background(RoundedRectangle(cornerRadius: 7).fill(Color.accent))
                Button("Reject") {
                    engine.reject(reason: rejectReason.isEmpty ? "rejected from the app" : rejectReason)
                    rejectReason = ""
                }
                .buttonStyle(.plain)
                .font(.system(size: 13, weight: .medium))
                .foregroundStyle(Color.bodyText)
                .padding(.horizontal, 12).padding(.vertical, 7)
                .background(RoundedRectangle(cornerRadius: 7).fill(Color.panel))
                .overlay(RoundedRectangle(cornerRadius: 7).stroke(Color.hairline))
                TextField("Reason, if rejecting", text: $rejectReason)
                    .textFieldStyle(.plain)
                    .font(.system(size: 13))
                    .foregroundStyle(Color.ink)
                    .padding(.horizontal, 10).padding(.vertical, 6)
                    .background(RoundedRectangle(cornerRadius: 7).fill(Color.canvasDark))
                    .overlay(RoundedRectangle(cornerRadius: 7).stroke(Color.hairline))
            }
        }
    }
}

// MARK: - Small pieces

struct Chip: View {
    let text: String
    var tint: Color = .mutedText

    var body: some View {
        Text(text)
            .font(.system(size: 10.5, design: .monospaced))
            .foregroundStyle(tint)
            .padding(.horizontal, 6).padding(.vertical, 2)
            .background(RoundedRectangle(cornerRadius: 5).fill(tint.opacity(0.1)))
            .overlay(RoundedRectangle(cornerRadius: 5).stroke(tint.opacity(0.35)))
    }
}

struct Banner: View {
    let icon: String
    let tint: Color
    let title: String
    let body_: String

    init(icon: String, tint: Color, title: String, body: String) {
        self.icon = icon
        self.tint = tint
        self.title = title
        self.body_ = body
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Label(title, systemImage: icon)
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(Color.ink)
            Text(body_)
                .font(.system(size: 12, design: .monospaced))
                .foregroundStyle(Color.bodyText)
                .textSelection(.enabled)
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(RoundedRectangle(cornerRadius: 16).fill(tint.opacity(0.1)))
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(tint.opacity(0.3)))
    }
}

/// The mark: one thick diagonal and the accent dot — the same shape as the
/// favicon, the tray icon, and the app icon.
struct Mark: View {
    var body: some View {
        GeometryReader { geo in
            let s = geo.size.width / 64
            Path { p in
                p.move(to: CGPoint(x: 40.5 * s, y: 14 * s))
                p.addLine(to: CGPoint(x: 29 * s, y: 50 * s))
            }
            .stroke(Color.ink, style: StrokeStyle(lineWidth: 7.5 * s, lineCap: .round))
            Circle()
                .fill(Color.accentSoft)
                .frame(width: 11 * s, height: 11 * s)
                .position(x: 20 * s, y: 46 * s)
        }
    }
}

struct SidebarButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 13, weight: .medium))
            .foregroundStyle(Color.bodyText)
            .padding(.horizontal, 10).padding(.vertical, 7)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(
                RoundedRectangle(cornerRadius: 8)
                    .fill(configuration.isPressed ? Color.raised : .clear)
            )
            .contentShape(Rectangle())
    }
}
