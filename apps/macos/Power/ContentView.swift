import SwiftUI
import AppKit

// MARK: - Root

struct ContentView: View {
    @AppStorage("power.onboarded") private var hasOnboarded = false
    @StateObject private var engine = RunEngine()
    @State private var auth: ClaudeAuth.Status?
    @State private var signingIn = false
    @State private var currentView: MainView = .home
    @State private var goal = ""
    @State private var repoDir: String?
    @State private var features = RunFeatures.load()
    @State private var history = HistoryStore.read()
    @State private var filter = ""
    @State private var rejectReason = ""
    @FocusState private var inputFocused: Bool
    @State private var breathing = false
    @State private var showPreview = false
    @State private var previewFiles: [String] = []
    @State private var selectedPreviewFile: String?
    @State private var previewContent = ""
    @State private var selectedSession: HistoryRow?
    @State private var chatMessages: [ChatMessage] = []
    @State private var isChatting = false
    /// Input-bar mode inside a session: Chat = one lightweight follow-up turn;
    /// Build = the full gated pipeline continuing in this repo and transcript.
    @State private var buildMode = false
    @State private var continuingSession: HistoryRow?

    enum MainView: Equatable { case home, run, chat }

    var body: some View {
        ZStack {
            if hasOnboarded {
                mainApp
                    .transition(.opacity.combined(with: .scale(scale: 0.98)))
            } else {
                OnboardingView(hasOnboarded: $hasOnboarded, features: $features)
                    .transition(.opacity)
            }
        }
        .animation(.easeInOut(duration: 0.7), value: hasOnboarded)
        .preferredColorScheme(.dark)
    }

    // MARK: Main app (post-onboarding)

    private var mainApp: some View {
        HStack(spacing: 0) {
            sidebar
            Divider().overlay(Color.hairline)
            main
            if showPreview {
                Divider().overlay(Color.hairline)
                previewPanel
                    .transition(.move(edge: .trailing).combined(with: .opacity))
            }
        }
        .background(Color.shell)
        .animation(.spring(response: 0.35, dampingFraction: 0.85), value: showPreview)
        .task {
            auth = await ClaudeAuth.status()
        }
        .onReceive(NotificationCenter.default.publisher(for: .powerHistoryChanged)) { _ in
            history = HistoryStore.read()
        }
        .onChange(of: engine.running) {
            // A continuation returns home to its chat, transcript refreshed —
            // the pipeline was a passage in the conversation, not a new place.
            if !engine.running, let session = continuingSession {
                chatMessages = TranscriptStore.read(session.id).map {
                    ChatMessage(role: $0.role == "user" ? .user : .assistant, text: $0.text)
                }
                selectedSession = HistoryStore.read().first { $0.id == session.id } ?? session
                continuingSession = nil
                withAnimation(.spring(response: 0.35)) { currentView = .chat }
            }
        }
        .onChange(of: engine.running) {
            history = HistoryStore.read()
            if showPreview { refreshPreviewFiles() }
        }
        .onChange(of: engine.stageOrder.count) {
            if showPreview { refreshPreviewFiles() }
        }
    }

    // MARK: Sidebar

    private var sidebar: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Logo
            HStack(spacing: 8) {
                Mark().frame(width: 20, height: 20)
                Text("power").font(.system(size: 14, weight: .semibold, design: .monospaced))
                    .foregroundStyle(Color.ink)
                + Text("/").font(.system(size: 14, weight: .semibold, design: .monospaced))
                    .foregroundStyle(Color.accentSoft)
            }
            .padding(.leading, 76)
            .frame(height: 48)

            // New Session
            HoverButton {
                withAnimation(.spring(response: 0.35, dampingFraction: 0.8)) {
                    currentView = .home
                    goal = ""
                }
            } label: {
                Label("New Session", systemImage: "plus")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(Color.ink)
            }
            .padding(.horizontal, 10)

            // Search
            HStack(spacing: 8) {
                Image(systemName: "magnifyingglass")
                    .font(.system(size: 11))
                    .foregroundStyle(Color.mutedText)
                TextField("Search sessions\u{2026}", text: $filter)
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

            // Session list
            ScrollView {
                LazyVStack(alignment: .leading, spacing: 2) {
                    ForEach(visibleHistory) { row in
                        HoverButton {
                            withAnimation(.spring(response: 0.35)) {
                                repoDir = row.repoDir
                                if row.outcome != nil {
                                    // Completed session — restore the full agent
                                    // conversation from the durable transcript.
                                    goal = ""
                                    selectedSession = row
                                    chatMessages = TranscriptStore.read(row.id).map {
                                        ChatMessage(
                                            role: $0.role == "user" ? .user : .assistant,
                                            text: $0.text
                                        )
                                    }
                                    currentView = .chat
                                    showPreview = true
                                    refreshPreviewFiles()
                                } else {
                                    // Incomplete — pre-fill and go home
                                    goal = row.goal
                                    currentView = .home
                                }
                            }
                        } label: {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(row.displayTitle).lineLimit(1)
                                    .font(.system(size: 13))
                                    .foregroundStyle(Color.bodyText)
                                if row.outcome != nil || row.costUsd != nil {
                                    HStack(spacing: 4) {
                                        if let outcome = row.outcome {
                                            Circle()
                                                .fill(outcome == "done" ? Color.pass : Color.accentSoft)
                                                .frame(width: 5, height: 5)
                                        }
                                        Text(historyMeta(row))
                                            .font(.system(size: 10.5))
                                            .foregroundStyle(Color.mutedText)
                                    }
                                }
                            }
                        }
                    }
                }
                .padding(.horizontal, 10)
            }

            Divider().overlay(Color.hairline)

            // Bottom bar
            HoverButton { pickRepo() } label: {
                HStack(spacing: 10) {
                    Circle().stroke(Color.hairline)
                        .frame(width: 26, height: 26)
                        .overlay(
                            Image(systemName: "folder")
                                .font(.system(size: 10))
                                .foregroundStyle(Color.mutedText)
                        )
                    VStack(alignment: .leading, spacing: 0) {
                        Text(repoDir.map { URL(fileURLWithPath: $0).lastPathComponent } ?? "No repository")
                            .font(.system(size: 13)).foregroundStyle(Color.bodyText).lineLimit(1)
                        if let email = auth?.email {
                            Text(email).font(.system(size: 11)).foregroundStyle(Color.mutedText).lineLimit(1)
                        }
                    }
                    Spacer()
                }
            }
            .padding(.horizontal, 2)
            .padding(.vertical, 4)
        }
        .frame(width: 250)
        .background(Color.panel.opacity(0.6))
    }

    private var visibleHistory: [HistoryRow] {
        filter.isEmpty
            ? history
            : history.filter {
                $0.displayTitle.localizedCaseInsensitiveContains(filter)
                    || $0.goal.localizedCaseInsensitiveContains(filter)
            }
    }

    private func historyMeta(_ row: HistoryRow) -> String {
        var parts: [String] = []
        if let outcome = row.outcome { parts.append(outcome) }
        if let cost = row.costUsd, cost > 0 { parts.append(String(format: "$%.2f", cost)) }
        return parts.joined(separator: " \u{00B7} ")
    }

    // MARK: Main pane

    @ViewBuilder private var main: some View {
        VStack(spacing: 0) {
            if currentView == .run {
                header
                PipelineProgressBar(
                    stageOrder: engine.stageOrder,
                    stages: engine.stages,
                    running: engine.running
                )
            } else if currentView == .chat {
                chatHeader
            }

            ZStack {
                if let auth, !auth.loggedIn {
                    ConnectView(auth: auth, signingIn: $signingIn) {
                        Task {
                            signingIn = true
                            await ClaudeAuth.login()
                            self.auth = await ClaudeAuth.status()
                            signingIn = false
                        }
                    }
                    .transition(.opacity)
                } else if currentView == .home {
                    homeView
                        .transition(.asymmetric(
                            insertion: .opacity.combined(with: .offset(y: 10)),
                            removal: .opacity
                        ))
                } else if currentView == .chat {
                    chatView
                        .transition(.asymmetric(
                            insertion: .opacity.combined(with: .offset(y: 10)),
                            removal: .opacity
                        ))
                } else {
                    RunTimeline(engine: engine, goal: goal, rejectReason: $rejectReason)
                        .transition(.asymmetric(
                            insertion: .opacity.combined(with: .offset(y: 10)),
                            removal: .opacity
                        ))
                }
            }
            .animation(.spring(response: 0.4, dampingFraction: 0.85), value: currentView)
            .frame(maxWidth: .infinity, maxHeight: .infinity)

            // Always-visible input bar (hidden only when sign-in is needed)
            if auth?.loggedIn != false {
                inputBar
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color.shell)
    }

    // MARK: Header

    @State private var headerPulsing = false

    private var header: some View {
        HStack(spacing: 10) {
            if currentView == .run {
                // Animated status dot
                Circle()
                    .fill(statusDotColor)
                    .frame(width: 8, height: 8)
                    .opacity(engine.running ? (headerPulsing ? 0.4 : 1.0) : 1.0)
                    .shadow(color: statusDotColor.opacity(0.5), radius: engine.running ? 4 : 0)
                    .animation(
                        engine.running
                            ? .easeInOut(duration: 1).repeatForever(autoreverses: true)
                            : .default,
                        value: headerPulsing
                    )
                    .onAppear { headerPulsing = true }

                Text(goal).font(.system(size: 13, weight: .medium))
                    .foregroundStyle(Color.ink).lineLimit(1)

                if !features.offSummary.isEmpty {
                    Chip(text: features.offSummary)
                }

                if engine.totalCostUsd > 0 {
                    Text(String(format: "$%.2f", engine.totalCostUsd))
                        .font(.system(size: 12, design: .monospaced))
                        .foregroundStyle(Color.mutedText)
                        .contentTransition(.numericText())
                        .animation(.spring(response: 0.3), value: engine.totalCostUsd)
                }

                Text(statusWord)
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(statusWordColor)
                    .padding(.horizontal, 8).padding(.vertical, 3)
                    .background(
                        Capsule().fill(statusWordColor.opacity(0.1))
                    )
                    .contentTransition(.interpolate)

                if engine.running {
                    Button("Stop") { engine.stop() }
                        .buttonStyle(GhostButtonStyle(tint: .accentSoft))
                }

                Spacer()

                Button {
                    withAnimation(.spring(response: 0.35)) {
                        currentView = .home
                        goal = ""
                    }
                } label: {
                    HStack(spacing: 5) {
                        Image(systemName: "plus")
                            .font(.system(size: 10, weight: .bold))
                        Text("New")
                            .font(.system(size: 12, weight: .medium))
                    }
                    .foregroundStyle(Color.bodyText)
                    .padding(.horizontal, 10).padding(.vertical, 5)
                    .background(RoundedRectangle(cornerRadius: 6).fill(Color.panel))
                    .overlay(RoundedRectangle(cornerRadius: 6).stroke(Color.hairline))
                }
                .buttonStyle(ScaleButtonStyle())
                .keyboardShortcut("n", modifiers: .command)
            } else {
                Spacer()
                Text("\u{2318}N new session")
                    .font(.system(size: 11))
                    .foregroundStyle(Color.mutedText.opacity(0.5))
            }
        }
        .padding(.horizontal, 16)
        .frame(height: 48)
        .overlay(Rectangle().fill(Color.hairline).frame(height: 1), alignment: .bottom)
    }

    private var statusDotColor: Color {
        if engine.errorText != nil || engine.blocked != nil { return .accentSoft }
        if engine.done != nil { return .pass }
        return .accent
    }

    private var statusWord: String {
        if engine.errorText != nil { return "error" }
        if engine.blocked != nil { return "blocked" }
        if engine.done != nil { return "complete" }
        return "running"
    }

    private var statusWordColor: Color {
        if engine.errorText != nil || engine.blocked != nil { return .accentSoft }
        if engine.done != nil { return .pass }
        return .accent
    }

    private var greeting: String {
        let hour = Calendar.current.component(.hour, from: Date())
        if hour < 12 { return "Good morning." }
        if hour < 17 { return "Good afternoon." }
        return "Good evening."
    }

    // MARK: Home view

    private var homeView: some View {
        ZStack {
            // Subtle ambient glow
            RadialGradient(
                colors: [Color.accent.opacity(0.03), Color.clear],
                center: .center,
                startRadius: 80,
                endRadius: 450
            )
            .ignoresSafeArea()

            VStack(spacing: 0) {
                Spacer()

                VStack(spacing: 32) {
                    // Breathing mark with glow
                    ZStack {
                        Mark()
                            .frame(width: 48, height: 48)
                            .blur(radius: 12)
                            .opacity(0.4)
                            .scaleEffect(breathing ? 1.15 : 1.0)

                        Mark()
                            .frame(width: 48, height: 48)
                            .scaleEffect(breathing ? 1.02 : 1.0)
                    }
                    .onAppear {
                        withAnimation(.easeInOut(duration: 3.5).repeatForever(autoreverses: true)) {
                            breathing = true
                        }
                    }

                    VStack(spacing: 8) {
                        TypewriterText(text: greeting)
                            .font(.system(size: 16, weight: .medium))
                            .foregroundStyle(Color.mutedText)
                        Text("What should we build?")
                            .font(.system(size: 28, weight: .bold))
                            .foregroundStyle(Color.ink)
                    }

                }

                Spacer()

            }
            .padding(.horizontal, 40)
        }
    }

    // MARK: Chat header

    private var chatHeader: some View {
        HStack(spacing: 10) {
            Circle()
                .fill(selectedSession?.outcome == "done" ? Color.pass : Color.accentSoft)
                .frame(width: 8, height: 8)

            Text(selectedSession?.displayTitle ?? "")
                .font(.system(size: 13, weight: .medium))
                .foregroundStyle(Color.ink)
                .lineLimit(1)

            if let outcome = selectedSession?.outcome {
                Text(outcome)
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(outcome == "done" ? Color.pass : Color.accentSoft)
                    .padding(.horizontal, 8).padding(.vertical, 3)
                    .background(
                        Capsule().fill((outcome == "done" ? Color.pass : Color.accentSoft).opacity(0.1))
                    )
            }

            if let cost = selectedSession?.costUsd, cost > 0 {
                Text(String(format: "$%.2f", cost))
                    .font(.system(size: 12, design: .monospaced))
                    .foregroundStyle(Color.mutedText)
            }

            Spacer()

            // Chat = one follow-up turn · Build = the full gated pipeline.
            HStack(spacing: 0) {
                ForEach([false, true], id: \.self) { mode in
                    Button(mode ? "Build" : "Chat") { buildMode = mode }
                        .buttonStyle(.plain)
                        .font(.system(size: 11.5, weight: .medium))
                        .foregroundStyle(buildMode == mode ? Color.ink : Color.mutedText)
                        .padding(.horizontal, 10).padding(.vertical, 4)
                        .background(buildMode == mode ? Color.raised : .clear)
                }
            }
            .clipShape(RoundedRectangle(cornerRadius: 6))
            .overlay(RoundedRectangle(cornerRadius: 6).stroke(Color.hairline))
            .help("Chat answers a question in one turn. Build runs the full gated pipeline on your next instruction.")

            Button {
                if let dir = repoDir { EditorLauncher.openVSCode(dir) }
            } label: {
                HStack(spacing: 5) {
                    Image(systemName: "curlybraces")
                        .font(.system(size: 11))
                    Text("VS Code")
                        .font(.system(size: 12))
                }
                .foregroundStyle(Color.mutedText)
                .padding(.horizontal, 8).padding(.vertical, 4)
                .background(RoundedRectangle(cornerRadius: 6).fill(Color.raised.opacity(0.5)))
            }
            .buttonStyle(ScaleButtonStyle())
            .help("Open this session's repository in VS Code")

            Button {
                if let dir = repoDir { PreviewLauncher.openInChrome(dir) }
            } label: {
                HStack(spacing: 5) {
                    Image(systemName: "safari")
                        .font(.system(size: 11))
                    Text("Preview")
                        .font(.system(size: 12))
                }
                .foregroundStyle(Color.mutedText)
                .padding(.horizontal, 8).padding(.vertical, 4)
                .background(RoundedRectangle(cornerRadius: 6).fill(Color.raised.opacity(0.5)))
            }
            .buttonStyle(ScaleButtonStyle())
            .help(repoDir.map { "Opens \(PreviewLauncher.resolve($0).lastPathComponent) in Chrome" } ?? "Opens the preview in Chrome")

            editorMenu

            Button {
                withAnimation(.spring(response: 0.35)) {
                    currentView = .home
                    goal = ""
                    chatMessages = []
                    selectedSession = nil
                }
            } label: {
                HStack(spacing: 5) {
                    Image(systemName: "plus")
                        .font(.system(size: 10, weight: .bold))
                    Text("New")
                        .font(.system(size: 12, weight: .medium))
                }
                .foregroundStyle(Color.bodyText)
                .padding(.horizontal, 10).padding(.vertical, 5)
                .background(RoundedRectangle(cornerRadius: 6).fill(Color.panel))
                .overlay(RoundedRectangle(cornerRadius: 6).stroke(Color.hairline))
            }
            .buttonStyle(ScaleButtonStyle())
            .keyboardShortcut("n", modifiers: .command)
        }
        .padding(.horizontal, 16)
        .frame(height: 48)
        .overlay(Rectangle().fill(Color.hairline).frame(height: 1), alignment: .bottom)
    }

    // MARK: Chat view

    private var chatView: some View {
        ScrollViewReader { proxy in
            ScrollView {
                VStack(spacing: 14) {
                    // Session info card
                    if let session = selectedSession {
                        HStack(spacing: 12) {
                            VStack(alignment: .leading, spacing: 6) {
                                Text(session.displayTitle)
                                    .font(.system(size: 14, weight: .medium))
                                    .foregroundStyle(Color.ink)
                                HStack(spacing: 8) {
                                    if let outcome = session.outcome {
                                        HStack(spacing: 4) {
                                            Circle()
                                                .fill(outcome == "done" ? Color.pass : Color.accentSoft)
                                                .frame(width: 6, height: 6)
                                            Text(outcome)
                                                .font(.system(size: 12))
                                                .foregroundStyle(Color.mutedText)
                                        }
                                    }
                                    if let cost = session.costUsd, cost > 0 {
                                        Text(String(format: "$%.2f", cost))
                                            .font(.system(size: 12, design: .monospaced))
                                            .foregroundStyle(Color.mutedText)
                                    }
                                    Text(session.repoDir.components(separatedBy: "/").last ?? "")
                                        .font(.system(size: 12))
                                        .foregroundStyle(Color.mutedText)
                                }
                            }
                            Spacer()
                        }
                        .padding(16)
                        .background(RoundedRectangle(cornerRadius: 16).fill(Color.panel.opacity(0.7)))
                        .overlay(RoundedRectangle(cornerRadius: 16).stroke(Color.hairline))
                    }

                    // Artifact chips (quick access)
                    if !previewFiles.isEmpty {
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 8) {
                                ForEach(previewFiles, id: \.self) { file in
                                    Button {
                                        showPreview = true
                                        loadPreviewFile(file)
                                    } label: {
                                        HStack(spacing: 5) {
                                            Image(systemName: "doc.text")
                                                .font(.system(size: 10))
                                            Text(file)
                                                .font(.system(size: 12, weight: .medium))
                                        }
                                        .foregroundStyle(selectedPreviewFile == file ? Color.accent : Color.bodyText)
                                        .padding(.horizontal, 12).padding(.vertical, 8)
                                        .background(
                                            RoundedRectangle(cornerRadius: 10)
                                                .fill(selectedPreviewFile == file ? Color.accent.opacity(0.08) : Color.panel)
                                        )
                                        .overlay(
                                            RoundedRectangle(cornerRadius: 10)
                                                .stroke(selectedPreviewFile == file ? Color.accent.opacity(0.3) : Color.hairline)
                                        )
                                    }
                                    .buttonStyle(ScaleButtonStyle())
                                }
                            }
                        }
                    }

                    // Chat messages
                    ForEach(chatMessages) { msg in
                        chatBubble(msg)
                    }

                    if isChatting {
                        HStack(spacing: 8) {
                            ProgressView().controlSize(.small).tint(Color.accent)
                            Text("Thinking\u{2026}")
                                .font(.system(size: 13))
                                .foregroundStyle(Color.mutedText)
                        }
                        .padding(12)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .transition(.opacity)
                    }

                    Color.clear.frame(height: 1).id("chatBottom")
                }
                .padding(24)
                .frame(maxWidth: 720)
                .frame(maxWidth: .infinity)
            }
            .onChange(of: chatMessages.count) {
                withAnimation(.spring(response: 0.5)) {
                    proxy.scrollTo("chatBottom")
                }
            }
        }
    }

    private func chatBubble(_ msg: ChatMessage) -> some View {
        HStack {
            if msg.role == .user { Spacer(minLength: 60) }
            Text(msg.text)
                .font(.system(size: 14))
                .foregroundStyle(msg.role == .user ? Color.ink : Color.bodyText)
                .textSelection(.enabled)
                .padding(.horizontal, 16).padding(.vertical, 10)
                .background(
                    UnevenRoundedRectangle(
                        topLeadingRadius: msg.role == .user ? 16 : 6,
                        bottomLeadingRadius: 16,
                        bottomTrailingRadius: msg.role == .user ? 6 : 16,
                        topTrailingRadius: 16
                    ).fill(msg.role == .user ? Color.raised : Color.panel)
                )
            if msg.role == .assistant { Spacer(minLength: 60) }
        }
    }

    /// Every chip maps to something the engine honestly does.
    private var optionsRow: some View {
        HStack(spacing: 6) {
            // Tier selector with animated indicator
            HStack(spacing: 0) {
                ForEach(RunFeatures.Tier.allCases, id: \.self) { tier in
                    Button(tier.rawValue) {
                        withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                            features.tier = tier
                            features.save()
                        }
                    }
                    .buttonStyle(.plain)
                    .font(.system(size: 11.5, weight: features.tier == tier ? .semibold : .medium))
                    .foregroundStyle(features.tier == tier ? Color.ink : Color.mutedText)
                    .padding(.horizontal, 10).padding(.vertical, 5)
                    .background(
                        RoundedRectangle(cornerRadius: 6)
                            .fill(features.tier == tier ? Color.raised : .clear)
                    )
                    .animation(.spring(response: 0.3), value: features.tier)
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
            withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                features[keyPath: path].toggle()
                features.save()
            }
        }
        .buttonStyle(.plain)
        .font(.system(size: 11.5, weight: on ? .semibold : .medium))
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
        withAnimation(.spring(response: 0.4, dampingFraction: 0.85)) {
            currentView = .run
        }
        history = HistoryStore.read()
    }

    // MARK: Input bar (always visible)

    private var inputBar: some View {
        VStack(spacing: 0) {
            Divider().overlay(Color.hairline)

            VStack(spacing: 8) {
                // Options row (hidden in chat mode — no pipeline to configure)
                if currentView != .chat {
                    optionsRow
                        .opacity(engine.running ? 0.5 : 1.0)
                        .allowsHitTesting(!engine.running)
                }

                VStack(spacing: 0) {
                    TextField(
                        currentView == .chat
                            ? "Continue working\u{2026}"
                            : "Describe what to build\u{2026}",
                        text: $goal,
                        axis: .vertical
                    )
                    .textFieldStyle(.plain)
                    .lineLimit(2...5)
                    .font(.system(size: 15))
                    .foregroundStyle(Color.ink)
                    .focused($inputFocused)
                    .padding(.horizontal, 12).padding(.top, 10)
                    .onSubmit { handleSubmit() }

                    HStack {
                        // Repo picker (hidden in chat — repo is set)
                        if currentView != .chat {
                            Button { pickRepo() } label: {
                                HStack(spacing: 5) {
                                    Image(systemName: "folder")
                                        .font(.system(size: 11))
                                    Text(repoDir.map { URL(fileURLWithPath: $0).lastPathComponent } ?? "Choose repo")
                                        .font(.system(size: 12))
                                }
                                .foregroundStyle(Color.mutedText)
                                .padding(.horizontal, 8).padding(.vertical, 4)
                                .background(RoundedRectangle(cornerRadius: 6).fill(Color.raised.opacity(0.5)))
                            }
                            .buttonStyle(ScaleButtonStyle())
                        }

                        // Editor button (when repo is set)
                        if repoDir != nil {
                            editorMenu
                        }

                        Spacer()

                        // Preview toggle
                        Button {
                            withAnimation(.spring(response: 0.3, dampingFraction: 0.8)) {
                                showPreview.toggle()
                                if showPreview { refreshPreviewFiles() }
                            }
                        } label: {
                            Image(systemName: "sidebar.right")
                                .font(.system(size: 13))
                                .foregroundStyle(showPreview ? Color.accent : Color.mutedText)
                                .frame(width: 30, height: 30)
                                .background(
                                    RoundedRectangle(cornerRadius: 6)
                                        .fill(showPreview ? Color.accent.opacity(0.1) : .clear)
                                )
                        }
                        .buttonStyle(ScaleButtonStyle())
                        .help("Toggle preview panel")

                        // Send / Stop / Chat
                        Group {
                            if currentView == .chat {
                                Button { sendChat() } label: {
                                    Image(systemName: "arrow.up")
                                        .font(.system(size: 14, weight: .bold))
                                        .foregroundStyle(.white)
                                        .frame(width: 34, height: 34)
                                        .background(
                                            Circle().fill(
                                                !goal.trimmingCharacters(in: .whitespaces).isEmpty && !isChatting
                                                    ? Color.accent : Color.raised
                                            )
                                        )
                                }
                                .buttonStyle(ScaleButtonStyle())
                                .disabled(goal.trimmingCharacters(in: .whitespaces).isEmpty || isChatting)
                            } else if engine.running {
                                Button { engine.stop() } label: {
                                    Image(systemName: "stop.fill")
                                        .font(.system(size: 12))
                                        .foregroundStyle(.white)
                                        .frame(width: 34, height: 34)
                                        .background(Circle().fill(Color.accentSoft))
                                }
                                .buttonStyle(ScaleButtonStyle())
                            } else {
                                Button { startRun() } label: {
                                    Image(systemName: "arrow.up")
                                        .font(.system(size: 14, weight: .bold))
                                        .foregroundStyle(.white)
                                        .frame(width: 34, height: 34)
                                        .background(
                                            Circle().fill(
                                                goal.trimmingCharacters(in: .whitespaces).count >= 8
                                                    ? Color.accent
                                                    : Color.raised
                                            )
                                        )
                                }
                                .buttonStyle(ScaleButtonStyle())
                                .disabled(goal.trimmingCharacters(in: .whitespaces).count < 8)
                                .animation(.easeInOut(duration: 0.25), value: goal.trimmingCharacters(in: .whitespaces).count >= 8)
                            }
                        }
                        .animation(.spring(response: 0.3), value: engine.running)
                        .animation(.spring(response: 0.3), value: currentView)
                    }
                    .padding(.horizontal, 8).padding(.top, 10).padding(.bottom, 4)
                }
                .padding(10)
                .background(
                    RoundedRectangle(cornerRadius: 18)
                        .fill(Color.panel)
                )
                .overlay(
                    RoundedRectangle(cornerRadius: 18)
                        .stroke(inputFocused ? Color.accent.opacity(0.3) : Color.hairline,
                                lineWidth: inputFocused ? 1.5 : 1)
                )
                .shadow(
                    color: inputFocused ? Color.accent.opacity(0.08) : .black.opacity(0.15),
                    radius: inputFocused ? 20 : 10,
                    y: -4
                )
                .animation(.easeInOut(duration: 0.3), value: inputFocused)
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 12)
            .frame(maxWidth: 720)
            .frame(maxWidth: .infinity)
        }
    }

    // MARK: Preview panel

    private var previewPanel: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Header
            HStack {
                Text("Preview")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(Color.ink)

                Spacer()

                Button {
                    refreshPreviewFiles()
                    if let file = selectedPreviewFile { loadPreviewFile(file) }
                } label: {
                    Image(systemName: "arrow.clockwise")
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundStyle(Color.mutedText)
                }
                .buttonStyle(ScaleButtonStyle())
                .help("Refresh files")

                Button {
                    withAnimation(.spring(response: 0.3)) {
                        showPreview = false
                    }
                } label: {
                    Image(systemName: "xmark")
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundStyle(Color.mutedText)
                        .frame(width: 24, height: 24)
                        .background(Circle().fill(Color.raised))
                }
                .buttonStyle(ScaleButtonStyle())
            }
            .padding(.horizontal, 16)
            .frame(height: 48)
            .overlay(Rectangle().fill(Color.hairline).frame(height: 1), alignment: .bottom)

            // File tabs
            if !previewFiles.isEmpty {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 6) {
                        ForEach(previewFiles, id: \.self) { file in
                            Button {
                                loadPreviewFile(file)
                            } label: {
                                Text(file)
                                    .font(.system(size: 11, weight: selectedPreviewFile == file ? .semibold : .medium))
                                    .foregroundStyle(selectedPreviewFile == file ? Color.accent : Color.mutedText)
                                    .padding(.horizontal, 10).padding(.vertical, 5)
                                    .background(
                                        RoundedRectangle(cornerRadius: 6)
                                            .fill(selectedPreviewFile == file ? Color.accent.opacity(0.1) : .clear)
                                    )
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 6)
                                            .stroke(selectedPreviewFile == file ? Color.accent.opacity(0.3) : Color.hairline)
                                    )
                            }
                            .buttonStyle(ScaleButtonStyle())
                        }
                    }
                    .padding(.horizontal, 16)
                    .padding(.vertical, 8)
                }
                Divider().overlay(Color.hairline)
            }

            // Content
            if selectedPreviewFile != nil, !previewContent.isEmpty {
                ScrollView {
                    Text(previewContent)
                        .font(.system(size: 12, design: .monospaced))
                        .foregroundStyle(Color.bodyText)
                        .textSelection(.enabled)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(16)
                }
            } else {
                VStack(spacing: 12) {
                    Spacer()
                    Image(systemName: "doc.text.magnifyingglass")
                        .font(.system(size: 28))
                        .foregroundStyle(Color.mutedText.opacity(0.4))
                    Text(previewFiles.isEmpty ? "No artifacts yet" : "Select a file to preview")
                        .font(.system(size: 13))
                        .foregroundStyle(Color.mutedText)
                    if previewFiles.isEmpty {
                        Text("Artifacts appear here as the pipeline runs.")
                            .font(.system(size: 12))
                            .foregroundStyle(Color.mutedText.opacity(0.6))
                    }
                    Spacer()
                }
                .frame(maxWidth: .infinity)
            }
        }
        .frame(width: 350)
        .background(Color.panel.opacity(0.6))
    }

    private func refreshPreviewFiles() {
        guard let dir = repoDir else { previewFiles = []; return }
        let artifactsPath = "\(dir)/.power/artifacts"
        guard let items = try? FileManager.default.contentsOfDirectory(atPath: artifactsPath) else {
            previewFiles = []
            return
        }
        previewFiles = items.filter { !$0.hasPrefix(".") }.sorted()
        if selectedPreviewFile == nil || !(previewFiles.contains(selectedPreviewFile ?? "")) {
            if let first = previewFiles.first { loadPreviewFile(first) }
        }
    }

    private func loadPreviewFile(_ name: String) {
        guard let dir = repoDir else { return }
        selectedPreviewFile = name
        previewContent = (try? String(contentsOfFile: "\(dir)/.power/artifacts/\(name)", encoding: .utf8)) ?? "(unable to read file)"
    }

    // MARK: Submit dispatch

    private func handleSubmit() {
        if currentView == .chat {
            if buildMode { continueBuild() } else { sendChat() }
        } else if !engine.running {
            startRun()
        }
    }

    /// The full gated pipeline, continuing this session: same repo, same
    /// transcript, same title — the previous run's state archived, its
    /// artifacts kept so the next implementation builds on what exists.
    private func continueBuild() {
        let message = goal.trimmingCharacters(in: .whitespaces)
        guard message.count >= 8, let session = selectedSession, !engine.running else { return }
        goal = message
        continuingSession = session
        engine.start(
            goal: message,
            repoDir: session.repoDir,
            features: features,
            continuingSession: session.id
        )
        withAnimation(.spring(response: 0.35)) { currentView = .run }
    }

    // MARK: Chat (lightweight Claude CLI follow-up)

    private func sendChat() {
        let message = goal.trimmingCharacters(in: .whitespaces)
        guard !message.isEmpty, let dir = repoDir, !isChatting else { return }

        chatMessages.append(ChatMessage(role: .user, text: message))
        if let id = selectedSession?.id { TranscriptStore.append("user", message, to: id) }
        goal = ""
        isChatting = true

        Task {
            let response = await runChatCommand(message: message, repoDir: dir)
            chatMessages.append(ChatMessage(role: .assistant, text: response))
            if let id = selectedSession?.id { TranscriptStore.append("assistant", response, to: id) }
            isChatting = false
            if showPreview { refreshPreviewFiles() }
        }
    }

    private func runChatCommand(message: String, repoDir: String) async -> String {
        await withCheckedContinuation { continuation in
            let process = Process()
            process.executableURL = URL(fileURLWithPath: "/usr/bin/env")

            let artDir = "\(repoDir)/.power/artifacts"
            var prompt = message
            if FileManager.default.fileExists(atPath: artDir) {
                prompt = "Context: previous Power run artifacts are at \(artDir). Refer to them if relevant.\n\n\(message)"
            }

            process.arguments = [
                "claude", "-p", prompt,
                "--allowedTools", "Edit,Write,Read,Bash,Glob,Grep",
                "--permission-mode", "acceptEdits",
                "--add-dir", repoDir,
                "--model", "sonnet",
                "--max-turns", "5",
                "--output-format", "text",
                "--verbose",
            ]

            var env = ProcessInfo.processInfo.environment
            env["PATH"] = PowerPaths.spawnPATH
            process.environment = env
            process.currentDirectoryURL = URL(fileURLWithPath: repoDir)

            let pipe = Pipe()
            process.standardOutput = pipe
            process.standardError = pipe

            process.terminationHandler = { _ in
                let data = pipe.fileHandleForReading.readDataToEndOfFile()
                let output = String(data: data, encoding: .utf8)?
                    .trimmingCharacters(in: .whitespacesAndNewlines) ?? "(no output)"
                continuation.resume(returning: output)
            }

            do {
                try process.run()
            } catch {
                continuation.resume(returning: "Error: \(error.localizedDescription)")
            }
        }
    }

    // MARK: Open in editor

    private var editorMenu: some View {
        Menu {
            let editors = detectedEditors()
            if editors.isEmpty {
                Text("No editors found")
            } else {
                ForEach(editors) { editor in
                    Button {
                        openInEditor(editor)
                    } label: {
                        Label(editor.name, systemImage: editor.icon)
                    }
                }
            }
            Divider()
            Button {
                if let dir = repoDir {
                    NSWorkspace.shared.selectFile(nil, inFileViewerRootedAtPath: dir)
                }
            } label: {
                Label("Reveal in Finder", systemImage: "folder")
            }
        } label: {
            HStack(spacing: 5) {
                Image(systemName: "chevron.left.forwardslash.chevron.right")
                    .font(.system(size: 11))
                Text("Open in\u{2026}")
                    .font(.system(size: 12))
            }
            .foregroundStyle(Color.mutedText)
            .padding(.horizontal, 8).padding(.vertical, 4)
            .background(RoundedRectangle(cornerRadius: 6).fill(Color.raised.opacity(0.5)))
        }
        .menuStyle(.borderlessButton)
    }

    private func detectedEditors() -> [CodeEditor] {
        CodeEditor.known.filter { editor in
            NSWorkspace.shared.urlForApplication(withBundleIdentifier: editor.id) != nil
        }
    }

    private func openInEditor(_ editor: CodeEditor) {
        guard let dir = repoDir else { return }
        let url = URL(fileURLWithPath: dir)

        if let appURL = NSWorkspace.shared.urlForApplication(withBundleIdentifier: editor.id) {
            let config = NSWorkspace.OpenConfiguration()
            NSWorkspace.shared.open([url], withApplicationAt: appURL, configuration: config)
        }
    }
}

// MARK: - Pipeline Progress Bar

struct PipelineProgressBar: View {
    let stageOrder: [StageID]
    let stages: [StageID: StageStatus]
    let running: Bool
    @State private var pulsing = false

    var body: some View {
        HStack(spacing: 3) {
            ForEach(StageID.allCases, id: \.self) { stage in
                RoundedRectangle(cornerRadius: 2)
                    .fill(fillColor(for: stage))
                    .frame(height: 3)
                    .opacity(stages[stage] == .running ? (pulsing ? 0.45 : 1.0) : 1.0)
            }
        }
        .padding(.horizontal, 16).padding(.vertical, 4)
        .animation(.easeInOut(duration: 0.5), value: stages)
        .onAppear {
            withAnimation(.easeInOut(duration: 0.9).repeatForever(autoreverses: true)) {
                pulsing = true
            }
        }
    }

    private func fillColor(for stage: StageID) -> Color {
        switch stages[stage] {
        case .pass: .pass
        case .fail: .accentSoft
        case .running: .accent
        case nil: stageOrder.contains(stage) ? Color.mutedText.opacity(0.2) : Color.hairline.opacity(0.5)
        }
    }
}

// MARK: - Floating Orbs Background

struct FloatingOrbsBackground: View {
    @State private var phase1 = false
    @State private var phase2 = false
    @State private var phase3 = false

    var body: some View {
        GeometryReader { geo in
            let w = geo.size.width
            let h = geo.size.height

            ZStack {
                Circle()
                    .fill(Color.orbBlue.opacity(0.65))
                    .frame(width: 340, height: 340)
                    .blur(radius: 90)
                    .offset(
                        x: phase1 ? -w * 0.15 : w * 0.25,
                        y: phase1 ? h * 0.05 : -h * 0.2
                    )

                Circle()
                    .fill(Color.orbBlue.opacity(0.45))
                    .frame(width: 260, height: 260)
                    .blur(radius: 80)
                    .offset(
                        x: phase2 ? w * 0.1 : -w * 0.25,
                        y: phase2 ? -h * 0.15 : h * 0.25
                    )

                Circle()
                    .fill(Color.orbGreen.opacity(0.5))
                    .frame(width: 300, height: 300)
                    .blur(radius: 85)
                    .offset(
                        x: phase1 ? -w * 0.05 : w * 0.3,
                        y: phase1 ? h * 0.15 : -h * 0.1
                    )

                Circle()
                    .fill(Color.orbOrange.opacity(0.55))
                    .frame(width: 220, height: 220)
                    .blur(radius: 70)
                    .offset(
                        x: phase3 ? -w * 0.1 : -w * 0.3,
                        y: phase3 ? h * 0.1 : h * 0.3
                    )

                Circle()
                    .fill(Color.orbPink.opacity(0.35))
                    .frame(width: 180, height: 180)
                    .blur(radius: 65)
                    .offset(
                        x: phase2 ? w * 0.2 : -w * 0.15,
                        y: phase2 ? h * 0.25 : h * 0.05
                    )

                Circle()
                    .fill(Color.orbGreen.opacity(0.3))
                    .frame(width: 160, height: 160)
                    .blur(radius: 60)
                    .offset(
                        x: phase3 ? w * 0.25 : w * 0.05,
                        y: phase3 ? -h * 0.25 : h * 0.2
                    )
            }
        }
        .onAppear {
            withAnimation(.easeInOut(duration: 9).repeatForever(autoreverses: true)) {
                phase1 = true
            }
            withAnimation(.easeInOut(duration: 12).repeatForever(autoreverses: true)) {
                phase2 = true
            }
            withAnimation(.easeInOut(duration: 15).repeatForever(autoreverses: true)) {
                phase3 = true
            }
        }
    }
}

// MARK: - Onboarding Flow

struct OnboardingView: View {
    @Binding var hasOnboarded: Bool
    @Binding var features: RunFeatures
    @State private var step = 0
    @State private var selectedStyle: WorkStyle?
    @State private var appeared = false

    enum WorkStyle: String, CaseIterable {
        case fast = "Move Fast"
        case quality = "Ship Quality"
        case rigorous = "Maximum Rigor"

        var description: String {
            switch self {
            case .fast: "Eco models, skip research & docs \u{2014} for quick fixes and prototypes"
            case .quality: "Full pipeline, balanced models \u{2014} the default for shipping features"
            case .rigorous: "All stages, max models, packs enabled \u{2014} for critical systems"
            }
        }

        var icon: String {
            switch self {
            case .fast: "hare"
            case .quality: "checkmark.seal"
            case .rigorous: "shield.checkered"
            }
        }
    }

    var body: some View {
        ZStack {
            Color.shell.ignoresSafeArea()
            FloatingOrbsBackground()
                .ignoresSafeArea()
                .opacity(appeared ? 1 : 0)

            VStack(spacing: 0) {
                Mark()
                    .frame(width: 32, height: 32)
                    .padding(.top, 24)
                    .opacity(appeared ? 1 : 0)

                Spacer()

                ZStack {
                    if step == 0 {
                        welcomeStep
                            .transition(.asymmetric(
                                insertion: .move(edge: .trailing).combined(with: .opacity),
                                removal: .move(edge: .leading).combined(with: .opacity)
                            ))
                    }
                    if step == 1 {
                        workStyleStep
                            .transition(.asymmetric(
                                insertion: .move(edge: .trailing).combined(with: .opacity),
                                removal: .move(edge: .leading).combined(with: .opacity)
                            ))
                    }
                }
                .animation(.spring(response: 0.55, dampingFraction: 0.85), value: step)

                Spacer()

                HStack(spacing: 8) {
                    ForEach(0..<2, id: \.self) { i in
                        Capsule()
                            .fill(i == step ? Color.ink : Color.mutedText.opacity(0.3))
                            .frame(width: i == step ? 24 : 8, height: 4)
                            .animation(.spring(response: 0.3), value: step)
                    }
                }
                .padding(.bottom, 36)
            }
        }
        .onAppear {
            withAnimation(.easeOut(duration: 1.2)) {
                appeared = true
            }
        }
    }

    private var welcomeStep: some View {
        VStack(spacing: 28) {
            Text("Hey!")
                .font(.system(size: 44, weight: .bold))
                .foregroundStyle(Color.ink)

            VStack(spacing: 14) {
                Text("Welcome to Power.")
                    .font(.system(size: 18, weight: .medium))
                    .foregroundStyle(Color.ink)

                Text("Eight specialist agents, deterministic gates, one approval.\nI'll run your entire dev pipeline \u{2014} research to docs \u{2014}\nin a single shot.")
                    .font(.system(size: 15))
                    .foregroundStyle(Color.bodyText)
                    .multilineTextAlignment(.center)
                    .lineSpacing(4)
            }
            .frame(maxWidth: 460)

            Button {
                withAnimation { step = 1 }
            } label: {
                Text("Continue")
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(Color.shell)
                    .frame(maxWidth: 300)
                    .padding(.vertical, 13)
                    .background(Capsule().fill(Color.ink))
            }
            .buttonStyle(ScaleButtonStyle())
            .padding(.top, 8)
        }
    }

    private var workStyleStep: some View {
        VStack(spacing: 28) {
            VStack(spacing: 10) {
                Text("How do you like to ship?")
                    .font(.system(size: 32, weight: .bold))
                    .foregroundStyle(Color.ink)

                Text("Pick a default \u{2014} you can change it per run.")
                    .font(.system(size: 15))
                    .foregroundStyle(Color.bodyText)
            }

            VStack(spacing: 10) {
                ForEach(WorkStyle.allCases, id: \.rawValue) { style in
                    Button {
                        withAnimation(.spring(response: 0.3)) {
                            selectedStyle = style
                        }
                    } label: {
                        HStack(spacing: 14) {
                            Image(systemName: style.icon)
                                .font(.system(size: 20))
                                .foregroundStyle(selectedStyle == style ? Color.accent : Color.mutedText)
                                .frame(width: 36, height: 36)
                                .background(
                                    RoundedRectangle(cornerRadius: 8)
                                        .fill(selectedStyle == style ? Color.accent.opacity(0.12) : Color.raised)
                                )

                            VStack(alignment: .leading, spacing: 4) {
                                Text(style.rawValue)
                                    .font(.system(size: 15, weight: .semibold))
                                    .foregroundStyle(Color.ink)
                                Text(style.description)
                                    .font(.system(size: 13))
                                    .foregroundStyle(Color.mutedText)
                                    .lineLimit(2)
                            }

                            Spacer()

                            if selectedStyle == style {
                                Image(systemName: "checkmark.circle.fill")
                                    .font(.system(size: 20))
                                    .foregroundStyle(Color.accent)
                                    .transition(.scale.combined(with: .opacity))
                            }
                        }
                        .padding(16)
                        .frame(maxWidth: 480)
                        .background(
                            RoundedRectangle(cornerRadius: 14)
                                .fill(selectedStyle == style
                                    ? Color.accent.opacity(0.06)
                                    : Color.panel.opacity(0.75))
                        )
                        .overlay(
                            RoundedRectangle(cornerRadius: 14)
                                .stroke(selectedStyle == style
                                    ? Color.accent.opacity(0.4)
                                    : Color.hairline,
                                lineWidth: selectedStyle == style ? 1.5 : 1)
                        )
                    }
                    .buttonStyle(ScaleButtonStyle())
                }
            }

            Button {
                applyStyle()
                withAnimation(.easeInOut(duration: 0.6)) {
                    hasOnboarded = true
                }
            } label: {
                Text("Get started")
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(selectedStyle != nil ? Color.shell : Color.mutedText)
                    .frame(maxWidth: 300)
                    .padding(.vertical, 13)
                    .background(
                        Capsule().fill(selectedStyle != nil ? Color.ink : Color.raised)
                    )
            }
            .buttonStyle(ScaleButtonStyle())
            .disabled(selectedStyle == nil)
            .animation(.easeInOut(duration: 0.3), value: selectedStyle != nil)
            .padding(.top, 4)
        }
    }

    private func applyStyle() {
        guard let style = selectedStyle else { return }
        switch style {
        case .fast:
            features.tier = .eco
            features.research = false
            features.reviewTest = false
            features.docs = false
            features.packs = false
        case .quality:
            features.tier = .balanced
            features.research = true
            features.reviewTest = true
            features.docs = true
            features.packs = false
        case .rigorous:
            features.tier = .max
            features.research = true
            features.reviewTest = true
            features.docs = true
            features.packs = true
        }
        features.save()
    }
}

// MARK: - Connect (with ambient orbs)

struct ConnectView: View {
    let auth: ClaudeAuth.Status
    @Binding var signingIn: Bool
    let onSignIn: () -> Void
    @State private var appeared = false

    var body: some View {
        ZStack {
            FloatingOrbsBackground()
                .opacity(0.35)

            VStack(spacing: 24) {
                Spacer()

                Mark()
                    .frame(width: 56, height: 56)
                    .scaleEffect(appeared ? 1 : 0.8)
                    .opacity(appeared ? 1 : 0)

                Text("Connect Claude")
                    .font(.system(size: 34, weight: .bold))
                    .foregroundStyle(Color.ink)
                    .opacity(appeared ? 1 : 0)
                    .offset(y: appeared ? 0 : 10)

                Text("Power runs on your own Claude account \u{2014} the same sign-in the\nClaude Code extension uses. Your credentials stay in Claude's\nkeychain; this app never sees them.")
                    .font(.system(size: 13))
                    .foregroundStyle(Color.mutedText)
                    .multilineTextAlignment(.center)
                    .opacity(appeared ? 1 : 0)

                if auth.cliFound {
                    Button {
                        onSignIn()
                    } label: {
                        Text(signingIn ? "Waiting for the browser\u{2026}" : "Sign in with Claude")
                            .font(.system(size: 15, weight: .semibold))
                            .foregroundStyle(.white)
                            .padding(.horizontal, 28).padding(.vertical, 12)
                            .background(Capsule().fill(Color.accent))
                    }
                    .buttonStyle(ScaleButtonStyle())
                    .disabled(signingIn)
                    .opacity(appeared ? 1 : 0)

                    Button {} label: {
                        Text("Sign in another way")
                            .font(.system(size: 14, weight: .medium))
                            .foregroundStyle(Color.bodyText)
                            .padding(.horizontal, 28).padding(.vertical, 12)
                            .background(
                                Capsule().stroke(Color.hairline)
                            )
                    }
                    .buttonStyle(ScaleButtonStyle())
                    .opacity(appeared ? 1 : 0)
                } else {
                    Text("The claude CLI was not found. Install Claude Code first \u{2014}\nnpm i -g @anthropic-ai/claude-code \u{2014} then relaunch Power.")
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
        .onAppear {
            withAnimation(.easeOut(duration: 0.8)) {
                appeared = true
            }
        }
    }
}

// MARK: - Run timeline

struct RunTimeline: View {
    @ObservedObject var engine: RunEngine
    let goal: String
    @Binding var rejectReason: String

    var body: some View {
        ScrollViewReader { proxy in
            ScrollView {
                VStack(spacing: 14) {
                    // Goal bubble
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

                    // Stage cards with entrance animation
                    ForEach(Array(engine.stageOrder.enumerated()), id: \.element) { index, stage in
                        StageCardView(
                            engine: engine,
                            stage: stage,
                            rejectReason: $rejectReason,
                            entranceDelay: Double(index) * 0.08
                        )
                    }

                    // Banners
                    if let blocked = engine.blocked {
                        Banner(icon: "exclamationmark.triangle", tint: .accentSoft,
                               title: "Run blocked", body: blocked)
                            .transition(.move(edge: .bottom).combined(with: .opacity))
                    }
                    if let error = engine.errorText {
                        Banner(icon: "xmark.octagon", tint: .accentSoft,
                               title: "Error", body: error)
                            .transition(.move(edge: .bottom).combined(with: .opacity))
                    }
                    if let done = engine.done {
                        ZStack {
                            Banner(
                                icon: "checkmark.circle", tint: .pass,
                                title: engine.totalCostUsd > 0
                                    ? String(format: "Run complete \u{2014} all gates passed.  $%.2f total", engine.totalCostUsd)
                                    : "Run complete \u{2014} all gates passed.",
                                body: done.trimmingCharacters(in: .whitespacesAndNewlines)
                            )
                            ConfettiBurst()
                                .allowsHitTesting(false)
                        }
                        .transition(.move(edge: .bottom).combined(with: .opacity))
                    }

                    Color.clear.frame(height: 1).id("bottom")
                }
                .padding(24)
                .frame(maxWidth: 720)
                .frame(maxWidth: .infinity)
                .animation(.spring(response: 0.4, dampingFraction: 0.85), value: engine.stageOrder.count)
            }
            .onChange(of: engine.stageOrder.count) {
                withAnimation(.spring(response: 0.5)) {
                    proxy.scrollTo("bottom")
                }
            }
        }
    }
}

struct StageCardView: View {
    @ObservedObject var engine: RunEngine
    let stage: StageID
    @Binding var rejectReason: String
    var entranceDelay: Double = 0
    @State private var expanded = false
    @State private var appeared = false
    @State private var runPulse = false

    private var status: StageStatus { engine.stages[stage] ?? .running }
    private var lines: [String] { engine.lines[stage] ?? [] }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            // Header row
            Button {
                withAnimation(.spring(response: 0.35, dampingFraction: 0.8)) {
                    expanded.toggle()
                }
            } label: {
                HStack(spacing: 10) {
                    statusIcon

                    Text(status == .running ? stage.doing : stage.title)
                        .font(.system(size: 14, weight: .medium))
                        .foregroundStyle(Color.ink)
                        .contentTransition(.interpolate)

                    if let gate = engine.gates[stage] {
                        Chip(
                            text: gate.pass ? "gate PASS" : "gate FAIL",
                            tint: gate.pass ? .pass : .accentSoft
                        )
                        .transition(.scale.combined(with: .opacity))
                    }
                    if let retries = engine.retries[stage], retries > 0 {
                        Chip(text: "retry \(retries)/2", tint: .accentSoft)
                            .transition(.scale.combined(with: .opacity))
                    }
                    if let role = stage.role, let usage = engine.usage[role], usage.costUsd > 0 {
                        Chip(text: String(format: "$%.2f \u{00B7} %dt", usage.costUsd, usage.turns))
                    }

                    Spacer()

                    if lines.count > 3 {
                        HStack(spacing: 4) {
                            Text(expanded ? "collapse" : "\(lines.count) lines")
                                .font(.system(size: 11))
                            Image(systemName: expanded ? "chevron.up" : "chevron.down")
                                .font(.system(size: 9, weight: .semibold))
                        }
                        .foregroundStyle(Color.mutedText)
                    }
                }
            }
            .buttonStyle(.plain)

            // Log lines
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
                .padding(.leading, 14)
                .overlay(
                    RoundedRectangle(cornerRadius: 1)
                        .fill(status == .running ? Color.accent.opacity(0.4) : Color.hairline)
                        .frame(width: 2),
                    alignment: .leading
                )
                .transition(.opacity)
            }

            // Approval
            if stage == .approval, let spec = engine.specText {
                approvalBody(spec)
                    .transition(.opacity.combined(with: .offset(y: 8)))
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(status == .running ? Color.panel.opacity(0.9) : Color.panel.opacity(0.7))
        )
        .overlay(
            Group {
                if status == .running {
                    AnimatedGradientBorder(cornerRadius: 16)
                } else {
                    RoundedRectangle(cornerRadius: 16)
                        .stroke(status == .pass ? Color.pass.opacity(0.15) : Color.hairline)
                }
            }
        )
        .shadow(
            color: status == .running ? Color.accent.opacity(0.05) : .clear,
            radius: 12, y: 4
        )
        .opacity(appeared ? 1 : 0)
        .offset(y: appeared ? 0 : 16)
        .onAppear {
            withAnimation(.spring(response: 0.5, dampingFraction: 0.8).delay(entranceDelay)) {
                appeared = true
            }
        }
    }

    @ViewBuilder private var statusIcon: some View {
        switch status {
        case .running:
            ZStack {
                Circle()
                    .fill(Color.accent.opacity(0.15))
                    .frame(width: 22, height: 22)
                ProgressView()
                    .controlSize(.small)
                    .tint(Color.accent)
            }
        case .pass:
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 16))
                .foregroundStyle(Color.pass)
                .transition(.scale.combined(with: .opacity))
        case .fail:
            Image(systemName: "xmark.circle.fill")
                .font(.system(size: 16))
                .foregroundStyle(Color.accentSoft)
                .transition(.scale.combined(with: .opacity))
        }
    }

    private func approvalBody(_ spec: String) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            ScrollView {
                Text(spec)
                    .font(.system(size: 12, design: .monospaced))
                    .foregroundStyle(Color.bodyText)
                    .textSelection(.enabled)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(14)
            }
            .frame(maxHeight: 300)
            .background(RoundedRectangle(cornerRadius: 12).fill(Color.canvasDark))
            .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.hairline))

            HStack(spacing: 10) {
                Button {
                    engine.approve()
                } label: {
                    HStack(spacing: 5) {
                        Image(systemName: "checkmark")
                            .font(.system(size: 11, weight: .bold))
                        Text("Approve")
                            .font(.system(size: 13, weight: .semibold))
                    }
                    .foregroundStyle(.white)
                    .padding(.horizontal, 18).padding(.vertical, 8)
                    .background(RoundedRectangle(cornerRadius: 8).fill(Color.pass.opacity(0.85)))
                }
                .buttonStyle(ScaleButtonStyle())

                Button {
                    engine.reject(reason: rejectReason.isEmpty ? "rejected from the app" : rejectReason)
                    rejectReason = ""
                } label: {
                    HStack(spacing: 5) {
                        Image(systemName: "xmark")
                            .font(.system(size: 11, weight: .bold))
                        Text("Reject")
                            .font(.system(size: 13, weight: .medium))
                    }
                    .foregroundStyle(Color.accentSoft)
                    .padding(.horizontal, 14).padding(.vertical, 8)
                    .background(RoundedRectangle(cornerRadius: 8).fill(Color.accentSoft.opacity(0.1)))
                    .overlay(RoundedRectangle(cornerRadius: 8).stroke(Color.accentSoft.opacity(0.3)))
                }
                .buttonStyle(ScaleButtonStyle())

                TextField("Reason, if rejecting", text: $rejectReason)
                    .textFieldStyle(.plain)
                    .font(.system(size: 13))
                    .foregroundStyle(Color.ink)
                    .padding(.horizontal, 10).padding(.vertical, 7)
                    .background(RoundedRectangle(cornerRadius: 8).fill(Color.canvasDark))
                    .overlay(RoundedRectangle(cornerRadius: 8).stroke(Color.hairline))
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
            .font(.system(size: 10.5, weight: .medium, design: .monospaced))
            .foregroundStyle(tint)
            .padding(.horizontal, 7).padding(.vertical, 3)
            .background(RoundedRectangle(cornerRadius: 5).fill(tint.opacity(0.1)))
            .overlay(RoundedRectangle(cornerRadius: 5).stroke(tint.opacity(0.25)))
    }
}

struct Banner: View {
    let icon: String
    let tint: Color
    let title: String
    let body_: String
    @State private var appeared = false

    init(icon: String, tint: Color, title: String, body: String) {
        self.icon = icon
        self.tint = tint
        self.title = title
        self.body_ = body
    }

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: icon)
                .font(.system(size: 16))
                .foregroundStyle(tint)
                .frame(width: 24, height: 24)

            VStack(alignment: .leading, spacing: 6) {
                Text(title)
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(Color.ink)
                Text(body_)
                    .font(.system(size: 12, design: .monospaced))
                    .foregroundStyle(Color.bodyText)
                    .textSelection(.enabled)
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(tint.opacity(0.06))
        )
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(tint.opacity(0.2))
        )
        .opacity(appeared ? 1 : 0)
        .offset(y: appeared ? 0 : 12)
        .onAppear {
            withAnimation(.spring(response: 0.5, dampingFraction: 0.8)) {
                appeared = true
            }
        }
    }
}

/// The mark: one thick diagonal and the accent dot.
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

// MARK: - Creative Components

/// Types text out character by character with a blinking cursor.
struct TypewriterText: View {
    let text: String
    @State private var visibleCount = 0
    @State private var cursorVisible = true
    @State private var done = false

    var body: some View {
        HStack(spacing: 0) {
            Text(String(text.prefix(visibleCount)))
            if !done {
                Text("|")
                    .opacity(cursorVisible ? 1 : 0)
            }
        }
        .task {
            visibleCount = 0
            // Blink cursor while waiting
            Task {
                while !done {
                    try? await Task.sleep(for: .milliseconds(500))
                    cursorVisible.toggle()
                }
            }
            // Pause, then type
            try? await Task.sleep(for: .milliseconds(500))
            for i in 1...text.count {
                try? await Task.sleep(for: .milliseconds(50))
                visibleCount = i
            }
            try? await Task.sleep(for: .milliseconds(300))
            withAnimation(.easeOut(duration: 0.3)) { done = true }
        }
    }
}

/// Spinning rainbow gradient border for running stage cards.
struct AnimatedGradientBorder: View {
    let cornerRadius: CGFloat
    @State private var rotation: Double = 0

    var body: some View {
        RoundedRectangle(cornerRadius: cornerRadius)
            .stroke(
                AngularGradient(
                    colors: [
                        Color.accent.opacity(0.7),
                        Color.orbBlue.opacity(0.5),
                        Color.pass.opacity(0.5),
                        Color.orbGreen.opacity(0.4),
                        Color.accent.opacity(0.7),
                    ],
                    center: .center,
                    angle: .degrees(rotation)
                ),
                lineWidth: 1.5
            )
            .onAppear {
                withAnimation(.linear(duration: 3).repeatForever(autoreverses: false)) {
                    rotation = 360
                }
            }
    }
}

/// Celebration confetti burst with sound on run completion.
struct ConfettiBurst: View {
    @State private var particles: [ConfettiParticle] = {
        let colors: [Color] = [.pass, .accent, .accentSoft, .orbBlue, .orbGreen, .orbOrange, .ink]
        return (0..<50).map { i in
            ConfettiParticle(
                id: i,
                targetX: .random(in: -300...300),
                targetY: .random(in: -350...80),
                color: colors[i % colors.count],
                spin: .random(in: 180...720),
                size: .random(in: 4...8)
            )
        }
    }()
    @State private var fired = false

    var body: some View {
        ZStack {
            ForEach(particles) { p in
                RoundedRectangle(cornerRadius: 1.5)
                    .fill(p.color)
                    .frame(width: p.size, height: p.size * 1.8)
                    .rotationEffect(.degrees(fired ? p.spin : 0))
                    .offset(x: fired ? p.targetX : 0, y: fired ? p.targetY : 0)
                    .opacity(fired ? 0 : 1)
                    .scaleEffect(fired ? 0.2 : 1)
            }
        }
        .onAppear {
            NSSound(named: "Glass")?.play()
            withAnimation(.easeOut(duration: 2.5)) {
                fired = true
            }
        }
    }
}

struct ConfettiParticle: Identifiable {
    let id: Int
    let targetX: CGFloat
    let targetY: CGFloat
    let color: Color
    let spin: Double
    let size: CGFloat
}

// MARK: - Button Styles

/// Hover-aware sidebar button with animated background.
struct HoverButton<Label: View>: View {
    let action: () -> Void
    @ViewBuilder let label: () -> Label
    @State private var isHovered = false

    var body: some View {
        Button(action: action) {
            label()
                .padding(.horizontal, 10).padding(.vertical, 7)
                .frame(maxWidth: .infinity, alignment: .leading)
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .background(
            RoundedRectangle(cornerRadius: 8)
                .fill(isHovered ? Color.raised.opacity(0.7) : .clear)
        )
        .onHover { hovering in
            withAnimation(.easeOut(duration: 0.15)) {
                isHovered = hovering
            }
        }
    }
}

/// Press-scale button style for interactive elements.
struct ScaleButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.97 : 1.0)
            .animation(.spring(response: 0.2, dampingFraction: 0.7), value: configuration.isPressed)
    }
}

/// Ghost button with tinted outline.
struct GhostButtonStyle: ButtonStyle {
    var tint: Color = .accentSoft

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 12, weight: .medium))
            .foregroundStyle(tint)
            .padding(.horizontal, 10).padding(.vertical, 4)
            .background(
                RoundedRectangle(cornerRadius: 6)
                    .fill(tint.opacity(configuration.isPressed ? 0.15 : 0.08))
            )
            .overlay(
                RoundedRectangle(cornerRadius: 6)
                    .stroke(tint.opacity(0.4))
            )
            .scaleEffect(configuration.isPressed ? 0.97 : 1.0)
            .animation(.spring(response: 0.2, dampingFraction: 0.7), value: configuration.isPressed)
    }
}

/// Legacy compat for any remaining uses.
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
            .scaleEffect(configuration.isPressed ? 0.98 : 1.0)
            .animation(.spring(response: 0.2), value: configuration.isPressed)
    }
}
