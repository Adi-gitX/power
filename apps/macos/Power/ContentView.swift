import SwiftUI
import AppKit

// MARK: - Root

struct ContentView: View {
    @AppStorage("power.onboarded") private var hasOnboarded = false
    @StateObject private var engine = RunEngine()
    @StateObject private var devServer = DevServerManager()
    @StateObject private var omni = OmniRouteManager()
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
    /// The goal of the run on screen — survives the input bar being cleared.
    @State private var activeGoal = ""

    /// Right-pane workspace tab: the rendered page, or the file browser.
    @State private var previewTab: PreviewTab = .render
    @State private var webReloadToken = 0

    /// Provider routing: the extra providers configured, and the sheet to edit
    /// them. The built-in Claude default is implicit and never stored here.
    @State private var providers = ProviderStore.load()
    @State private var showRouting = false

    enum PreviewTab { case render, files }

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
        .sheet(isPresented: $showRouting) {
            RoutingSheet(providers: $providers, omni: omni)
        }
        .task {
            auth = await ClaudeAuth.status()
        }
        .onReceive(NotificationCenter.default.publisher(for: .powerHistoryChanged)) { _ in
            history = HistoryStore.read()
        }
        .onChange(of: repoDir) {
            // One server, one workspace: switching sessions stops a server
            // that belongs to the previous repo.
            devServer.syncTo(repoDir: repoDir)
        }
        .onChange(of: devServer.port) {
            if devServer.port != nil { webReloadToken += 1 }
        }
        .onChange(of: engine.running) {
            guard !engine.running else { return }
            history = HistoryStore.read()

            // Any finished run lands in its session workspace — chat on the
            // left, fresh preview on the right. A continuation returns to the
            // conversation it belongs to; a successful fresh run opens its
            // newly created session rather than dead-ending on a banner.
            let session = continuingSession
                ?? (engine.done != nil ? history.first : nil)
            guard let session else { return }

            chatMessages = TranscriptStore.read(session.id).map {
                ChatMessage(role: $0.role == "user" ? .user : .assistant, text: $0.text)
            }
            selectedSession = history.first { $0.id == session.id } ?? session
            continuingSession = nil
            repoDir = session.repoDir
            webReloadToken += 1
            refreshPreviewFiles()
            withAnimation(.spring(response: 0.35)) {
                currentView = .chat
                showPreview = true
                previewTab = .render
            }
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
                newSession()
            } label: {
                Label("New Session", systemImage: "plus")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(Color.ink)
            }
            .focusEffectDisabled()
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
                                    var restored = TranscriptStore.read(row.id).map {
                                        ChatMessage(
                                            role: $0.role == "user" ? .user : .assistant,
                                            text: $0.text
                                        )
                                    }
                                    if restored.isEmpty {
                                        // A run from before transcripts existed:
                                        // show what we do know, never a void.
                                        restored = [
                                            ChatMessage(role: .user, text: row.goal),
                                            ChatMessage(role: .assistant, text:
                                                "This run finished before transcripts were recorded. "
                                                + "Outcome: \(row.outcome ?? "done")"
                                                + (row.costUsd.map { String(format: " · $%.2f", $0) } ?? "")
                                                + ". Artifacts are in the chips above; continue below."),
                                        ]
                                    }
                                    chatMessages = restored
                                    currentView = .chat
                                    showPreview = true
                                    refreshPreviewFiles()
                                } else {
                                    // Incomplete — pre-fill and go home
                                    goal = row.goal
                                    currentView = .home
                                    showPreview = false
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
                    RunTimeline(engine: engine, goal: activeGoal, rejectReason: $rejectReason)
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

                Text(activeGoal).font(.system(size: 13, weight: .medium))
                    .foregroundStyle(Color.ink).lineLimit(1)
                    .layoutPriority(1)

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

                // When any stage ran off Claude, name the saving: how many turns
                // the gateways served, so a routed run reads honestly.
                if let routed = routedTurns, routed > 0 {
                    HStack(spacing: 3) {
                        Image(systemName: "arrow.triangle.branch").font(.system(size: 9, weight: .bold))
                        Text("\(routed)t routed off Claude")
                    }
                    .font(.system(size: 11, weight: .medium))
                    .foregroundStyle(Color.accentSoft)
                    .padding(.horizontal, 7).padding(.vertical, 3)
                    .background(Capsule().fill(Color.accentSoft.opacity(0.1)))
                    .help("Turns served by a configured provider instead of your Claude login")
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
                    newSession()
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

    private let starterPrompts: [(label: String, prompt: String)] = [
        ("Expense tracker", "a personal expense tracker with charts and categories"),
        ("Coffee landing page", "a landing page for a coffee subscription service"),
        ("EXIF photo renamer", "a CLI that renames photos by their EXIF date"),
    ]

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

                    // Three doors past the blank-page wall. No repo needed:
                    // starting creates the project.
                    HStack(spacing: 8) {
                        ForEach(starterPrompts, id: \.label) { starter in
                            Button {
                                goal = starter.prompt
                                inputFocused = true
                            } label: {
                                Text(starter.label)
                                    .font(.system(size: 12))
                                    .foregroundStyle(Color.bodyText)
                                    .lineLimit(1)
                                    .padding(.horizontal, 12).padding(.vertical, 7)
                                    .background(Capsule().fill(Color.panel))
                                    .overlay(Capsule().stroke(Color.hairline))
                            }
                            .buttonStyle(ScaleButtonStyle())
                            .help(starter.prompt)
                        }
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
                .layoutPriority(1)

            if let outcome = selectedSession?.outcome {
                Text(outcome)
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(outcome == "done" ? Color.pass : Color.accentSoft)
                    .padding(.horizontal, 8).padding(.vertical, 3)
                    .background(
                        Capsule().fill((outcome == "done" ? Color.pass : Color.accentSoft).opacity(0.1))
                    )
            }

            // Live cost while a continuation burns; the stamped total otherwise.
            if continuingSession != nil, engine.totalCostUsd > 0 {
                Text(String(format: "$%.2f", engine.totalCostUsd))
                    .font(.system(size: 12, design: .monospaced))
                    .foregroundStyle(Color.accentSoft)
                    .contentTransition(.numericText())
            } else if let cost = selectedSession?.costUsd, cost > 0 {
                Text(String(format: "$%.2f", cost))
                    .font(.system(size: 12, design: .monospaced))
                    .foregroundStyle(Color.mutedText)
            }

            Spacer()

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
                newSession()
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

    /// Everything "start fresh" must reset, in one place — half-reset states
    /// were leaving the preview panel open over the home screen, crushing it.
    private func newSession() {
        withAnimation(.spring(response: 0.35)) {
            currentView = .home
            goal = ""
            chatMessages = []
            selectedSession = nil
            showPreview = false
            buildMode = false
        }
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

                    // A Build continuation runs HERE, in the conversation:
                    // live stage cards, the approval card included, exactly as
                    // a fresh run renders them — one workspace, no mode switch.
                    if continuingSession != nil {
                        ForEach(engine.stageOrder) { stage in
                            StageCardView(engine: engine, stage: stage, rejectReason: $rejectReason)
                        }
                        if let blocked = engine.blocked {
                            Banner(icon: "exclamationmark.triangle", tint: .accentSoft,
                                   title: "Run blocked", body: blocked)
                        }
                        if let error = engine.errorText {
                            Banner(icon: "xmark.octagon", tint: .accentSoft,
                                   title: "Error", body: error)
                        }
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

    /// Every chip maps to something the engine honestly does. Two rows so the
    /// controls breathe: the two selectors on top, the stage toggles below.
    private var optionsRow: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 8) {
                // The money choice, first: Paid / Mixed / Free.
                costModeControl

                // Model tier selector with animated indicator.
                HStack(spacing: 0) {
                    ForEach(RunFeatures.Tier.allCases, id: \.self) { tier in
                        Button(tier.rawValue) {
                            withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                                features.tier = tier
                                features.save()
                            }
                        }
                        .buttonStyle(.plain)
                        .lineLimit(1).fixedSize()
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

                routingChip
                Spacer(minLength: 0)
            }

            HStack(spacing: 6) {
                toggleChip("Research", \.research)
                toggleChip("Review + Test", \.reviewTest)
                toggleChip("Docs", \.docs)
                toggleChip("Auto-approve", \.autoApprove)
                toggleChip("Packs", \.packs)
                Spacer(minLength: 0)
            }
        }
    }

    /// Turns served by a non-Claude provider this run — the honest saving.
    private var routedTurns: Int? {
        let sum = engine.costByProvider
            .filter { $0.key != Provider.claudeDefault.id }
            .reduce(0) { $0 + $1.value.turns }
        return sum > 0 ? sum : nil
    }

    /// The up-front money choice. Paid = your Claude login only. Free =
    /// everything through OmniRoute (falling back to Claude if it's down).
    /// Mixed = free for the safe roles, paid Claude for code and gates.
    enum CostMode: String, CaseIterable { case paid = "Paid", mixed = "Mixed", free = "Free" }

    private var costMode: CostMode {
        guard let omni = providers.first(where: { $0.id == omniRouteProviderID }),
              !omni.allowRoles.isEmpty else { return .paid }
        return omni.allowRoles.count >= Role.allCases.count ? .free : .mixed
    }

    /// Apply a money choice by (re)configuring the managed OmniRoute provider,
    /// preserving the token and compression the user already set. Choosing a
    /// routed mode while OmniRoute isn't up opens Routing so it can be set up.
    private func setCostMode(_ mode: CostMode) {
        let existing = providers.first { $0.id == omniRouteProviderID }
        let token = existing?.authToken
        let compress = existing?.compression ?? "stacked"
        providers.removeAll { $0.id == omniRouteProviderID }
        switch mode {
        case .paid: break
        case .mixed: providers.append(.omniRoute(maxFree: false, authToken: token, compression: compress))
        case .free: providers.append(.omniRoute(maxFree: true, authToken: token, compression: compress))
        }
        ProviderStore.save(providers)
        if mode != .paid {
            Task { if !(await omni.ping()) { showRouting = true } }
        }
    }

    /// The Paid / Mixed / Free selector — the headline money control, first in
    /// the options row.
    private var costModeControl: some View {
        HStack(spacing: 0) {
            ForEach(CostMode.allCases, id: \.self) { mode in
                let on = costMode == mode
                Button(mode.rawValue) {
                    withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) { setCostMode(mode) }
                }
                .buttonStyle(.plain)
                .lineLimit(1).fixedSize()
                .font(.system(size: 11.5, weight: on ? .semibold : .medium))
                .foregroundStyle(on ? (mode == .free ? Color.green : Color.ink) : Color.mutedText)
                .padding(.horizontal, 11).padding(.vertical, 5)
                .background(
                    RoundedRectangle(cornerRadius: 6)
                        .fill(on ? (mode == .free ? Color.green.opacity(0.15) : Color.raised) : .clear)
                )
                .animation(.spring(response: 0.3), value: costMode)
            }
        }
        .clipShape(RoundedRectangle(cornerRadius: 8))
        .overlay(RoundedRectangle(cornerRadius: 8).stroke(Color.hairline))
        .help("Paid: your Claude login. Mixed: free research + docs, paid Claude for code. Free: everything free via OmniRoute, falling back to Claude if it's down.")
    }

    /// The routing affordance: opens the provider sheet. Shows a count when the
    /// user has configured gateways, so a routed run never looks like a plain one.
    private var routingChip: some View {
        let routed = providers.contains { $0.kind == .gateway && !$0.allowRoles.isEmpty }
        return Button {
            showRouting = true
        } label: {
            HStack(spacing: 4) {
                Image(systemName: "arrow.triangle.branch").font(.system(size: 10, weight: .semibold))
                Text(routed ? "Routing · \(providers.count)" : "Routing")
            }
        }
        .buttonStyle(.plain)
        .lineLimit(1).fixedSize()
        .font(.system(size: 11.5, weight: routed ? .semibold : .medium))
        .foregroundStyle(routed ? Color.accentSoft : Color.mutedText)
        .padding(.horizontal, 10).padding(.vertical, 5)
        .background(Capsule().fill(routed ? Color.accentSoft.opacity(0.1) : .clear))
        .overlay(Capsule().stroke(routed ? Color.accentSoft.opacity(0.5) : Color.hairline))
        .help("Route stages to a cheaper provider or a local gateway (OmniRoute)")
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
        .lineLimit(1).fixedSize()
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
        // No repo chosen? The app makes the project: a named folder under
        // ~/PowerProjects with git initialised — checkpoints from run one.
        // "Choose repository" remains for working in an existing codebase.
        if repoDir == nil {
            repoDir = ProjectFactory.create(from: goal)
        }
        guard let dir = repoDir,
              goal.trimmingCharacters(in: .whitespaces).count >= 8 else { return }
        activeGoal = goal.trimmingCharacters(in: .whitespaces)
        goal = ""
        withAnimation(.spring(response: 0.4, dampingFraction: 0.85)) {
            currentView = .run
        }
        // If a run will route to OmniRoute, make sure it is up before the first
        // dispatch hits a dead endpoint — otherwise start immediately.
        let usesOmni = providers.contains { $0.id == omniRouteProviderID && !$0.allowRoles.isEmpty }
        if usesOmni {
            Task {
                let up = await omni.ensureRunning()
                if !up {
                    engine.errorText = "OmniRoute routing is on but it isn't running — open Routing to install or start it."
                    return
                }
                engine.start(goal: activeGoal, repoDir: dir, features: features)
                history = HistoryStore.read()
            }
        } else {
            engine.start(goal: activeGoal, repoDir: dir, features: features)
            history = HistoryStore.read()
        }
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
                                // The mode toggle sits beside the button it
                                // governs. One submit path — button and Enter
                                // cannot disagree.
                                HStack(spacing: 0) {
                                    ForEach([false, true], id: \.self) { mode in
                                        Button(mode ? "Build" : "Chat") { buildMode = mode }
                                            .buttonStyle(.plain)
                                            .font(.system(size: 11.5, weight: .medium))
                                            .foregroundStyle(buildMode == mode ? Color.ink : Color.mutedText)
                                            .padding(.horizontal, 10).padding(.vertical, 5)
                                            .background(buildMode == mode ? Color.raised : .clear)
                                    }
                                }
                                .clipShape(Capsule())
                                .overlay(Capsule().stroke(Color.hairline))
                                .help("Chat answers in one turn. Build runs the full gated pipeline on your instruction.")

                                Button { handleSubmit() } label: {
                                    Image(systemName: buildMode ? "hammer.fill" : "arrow.up")
                                        .font(.system(size: buildMode ? 12 : 14, weight: .bold))
                                        .foregroundStyle(.white)
                                        .frame(width: 34, height: 34)
                                        .background(Circle().fill(chatSendReady ? Color.accent : Color.raised))
                                }
                                .buttonStyle(ScaleButtonStyle())
                                .disabled(!chatSendReady)
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
                Text("Workspace")
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

            // Workspace tabs: the rendered page (the Emergent-dashboard view),
            // or the artifact/file browser.
            HStack(spacing: 0) {
                ForEach([PreviewTab.render, PreviewTab.files], id: \.self) { tab in
                    Button {
                        previewTab = tab
                        if tab == .files { refreshPreviewFiles() }
                    } label: {
                        HStack(spacing: 5) {
                            Image(systemName: tab == .render ? "play.display" : "doc.text")
                                .font(.system(size: 10.5))
                            Text(tab == .render ? "Preview" : "Files")
                                .font(.system(size: 12, weight: .medium))
                        }
                        .foregroundStyle(previewTab == tab ? Color.ink : Color.mutedText)
                        .padding(.horizontal, 12).padding(.vertical, 6)
                        .background(previewTab == tab ? Color.raised : .clear)
                    }
                    .buttonStyle(.plain)
                }
                Spacer()
                if previewTab == .render, let dir = repoDir {
                    if DevServerManager.detectScript(dir) != nil {
                        Button {
                            if devServer.isRunning { devServer.stop() } else { devServer.start(dir) }
                        } label: {
                            HStack(spacing: 4) {
                                Image(systemName: devServer.isRunning ? "stop.fill" : "play.fill")
                                    .font(.system(size: 9))
                                Text(devServer.isRunning
                                    ? (devServer.port.map { "dev :\($0)" } ?? "starting…")
                                    : "Run dev")
                                    .font(.system(size: 11, weight: .medium))
                            }
                            .foregroundStyle(devServer.isRunning ? Color.pass : Color.mutedText)
                            .padding(.horizontal, 8).padding(.vertical, 3)
                            .background(Capsule().fill(
                                devServer.isRunning ? Color.pass.opacity(0.1) : Color.raised.opacity(0.5)))
                        }
                        .buttonStyle(ScaleButtonStyle())
                        .help(devServer.isRunning
                            ? "Stop the dev server"
                            : "Start \(DevServerManager.packageManager(dir)) run \(DevServerManager.detectScript(dir) ?? "dev")")
                    }
                    Text(PreviewLauncher.resolve(dir, devPort: devServer.port).isFileURL
                        ? PreviewLauncher.resolve(dir).lastPathComponent
                        : "localhost:\(devServer.port ?? 3000)")
                        .font(.system(size: 11, design: .monospaced))
                        .foregroundStyle(Color.mutedText)
                    Button {
                        webReloadToken += 1
                    } label: {
                        Image(systemName: "arrow.clockwise")
                            .font(.system(size: 11))
                            .foregroundStyle(Color.mutedText)
                    }
                    .buttonStyle(ScaleButtonStyle())
                    .help("Reload the preview")
                    Button {
                        PreviewLauncher.openInChrome(dir)
                    } label: {
                        Image(systemName: "arrow.up.right.square")
                            .font(.system(size: 11))
                            .foregroundStyle(Color.mutedText)
                    }
                    .buttonStyle(ScaleButtonStyle())
                    .help("Open in Chrome")
                    .padding(.trailing, 4)
                }
            }
            .padding(.horizontal, 12)
            .frame(height: 34)
            .overlay(Rectangle().fill(Color.hairline).frame(height: 1), alignment: .bottom)

            if previewTab == .render {
                if let dir = repoDir {
                    WebPreview(repoDir: dir, reloadToken: webReloadToken, devPort: devServer.port)
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    VStack {
                        Spacer()
                        Text("No repository selected")
                            .font(.system(size: 13))
                            .foregroundStyle(Color.mutedText)
                        Spacer()
                    }
                    .frame(maxWidth: .infinity)
                }
            } else {

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
        }
        // A rendered page needs real estate; the file browser does not.
        .frame(width: previewTab == .render ? 520 : 350)
        .animation(.spring(response: 0.35, dampingFraction: 0.85), value: previewTab)
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

    /// Build needs a real instruction (the engine refuses short goals); Chat
    /// needs anything non-empty and no turn in flight.
    private var chatSendReady: Bool {
        let length = goal.trimmingCharacters(in: .whitespaces).count
        if engine.running { return false }
        return buildMode ? length >= 8 : (length > 0 && !isChatting)
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
        chatMessages.append(ChatMessage(role: .user, text: message))
        goal = ""
        continuingSession = session
        engine.start(
            goal: message,
            repoDir: session.repoDir,
            features: features,
            continuingSession: session.id
        )
        // No screen switch: the pipeline is a passage in this conversation.
        // Cards render inline in the chat column; the preview stays alongside.
        withAnimation(.spring(response: 0.35)) { showPreview = true }
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

    /// Chat sessions resume: the first turn establishes a claude session, and
    /// every later turn talks to it warm — no context preamble re-sent, no
    /// artifacts re-read, provider cache doing the heavy lifting. Session ids
    /// are remembered per Power session across app launches.
    private func chatClaudeSession(for id: String) -> String? {
        (UserDefaults.standard.dictionary(forKey: "power.chatSessions") as? [String: String])?[id]
    }

    private func rememberChatSession(_ claudeId: String, for id: String) {
        var map = (UserDefaults.standard.dictionary(forKey: "power.chatSessions") as? [String: String]) ?? [:]
        map[id] = claudeId
        UserDefaults.standard.set(map, forKey: "power.chatSessions")
    }

    private func runChatCommand(message: String, repoDir: String) async -> String {
        await withCheckedContinuation { continuation in
            let process = Process()
            process.executableURL = URL(fileURLWithPath: "/usr/bin/env")

            let resumeId = selectedSession.flatMap { chatClaudeSession(for: $0.id) }
            var arguments = ["claude"]
            if let resumeId {
                // Warm turn: the session already knows the repo and the
                // artifacts. The message IS the payload.
                arguments += ["-p", message, "--resume", resumeId]
            } else {
                let artDir = "\(repoDir)/.power/artifacts"
                var prompt = message
                if FileManager.default.fileExists(atPath: artDir) {
                    prompt = "Context: previous Power run artifacts are at \(artDir). Refer to them if relevant.\n\n\(message)"
                }
                arguments += ["-p", prompt]
            }
            arguments += [
                "--allowedTools", "Edit,Write,Read,Bash,Glob,Grep",
                "--permission-mode", "acceptEdits",
                "--add-dir", repoDir,
                "--model", "sonnet",
                "--max-turns", "5",
                // json (not text): the result frame carries the session_id the
                // next turn resumes.
                "--output-format", "json",
            ]
            process.arguments = arguments

            var env = ProcessInfo.processInfo.environment
            env["PATH"] = PowerPaths.spawnPATH
            process.environment = env
            process.currentDirectoryURL = URL(fileURLWithPath: repoDir)

            let pipe = Pipe()
            process.standardOutput = pipe
            process.standardError = pipe

            process.terminationHandler = { _ in
                let data = pipe.fileHandleForReading.readDataToEndOfFile()
                // --output-format json: one object with the reply and the
                // session to resume next turn. Fall back to raw text so a CLI
                // change can never blank the chat.
                if let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
                    if let sid = json["session_id"] as? String,
                       let powerId = self.selectedSession?.id {
                        Task { @MainActor in self.rememberChatSession(sid, for: powerId) }
                    }
                    let reply = (json["result"] as? String)?
                        .trimmingCharacters(in: .whitespacesAndNewlines)
                    return continuation.resume(returning: reply?.isEmpty == false ? reply! : "(no output)")
                }
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

// MARK: - Routing (provider) sheet

/// Where the user configures cost routing. The built-in Claude default is shown
/// but locked — it always exists and always serves every role. Gateways are the
/// only thing that can be added, each redirecting a chosen set of roles to an
/// Anthropic-compatible endpoint the user runs. Power ships no providers of its
/// own; nothing here routes anywhere until the user adds an endpoint they
/// control.
struct RoutingSheet: View {
    @Binding var providers: [Provider]
    @ObservedObject var omni: OmniRouteManager
    @Environment(\.dismiss) private var dismiss
    @State private var detecting = false
    @State private var detectResult: String?

    /// The roles offered as a quality floor, low-stakes first. Code-writing and
    /// gate-graded roles are last and off by default — the guardrail is visible.
    private let roleOrder: [Role] = [
        .researcher, .documenter, .architect, .reviewer, .tester, .verifier, .implementer,
    ]

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            header
            Divider().overlay(Color.hairline)
            ScrollView {
                VStack(alignment: .leading, spacing: 14) {
                    intro
                    omniRouteCard
                    claudeCard
                    ForEach($providers) { $p in
                        if p.kind == .gateway, p.id != omniRouteProviderID {
                            gatewayCard($p)
                        }
                    }
                    addRow
                }
                .padding(18)
            }
        }
        .frame(width: 560, height: 640)
        .background(Color.shell)
        .task { await omni.refresh() }
    }

    // MARK: OmniRoute — the managed gateway

    private var omniBinding: Binding<Provider>? {
        guard let i = providers.firstIndex(where: { $0.id == omniRouteProviderID }) else { return nil }
        return $providers[i]
    }
    private var omniEnabled: Bool {
        providers.contains { $0.id == omniRouteProviderID && !$0.allowRoles.isEmpty }
    }
    private var omniMaxFree: Bool {
        (providers.first { $0.id == omniRouteProviderID }?.allowRoles.count ?? 0) >= Role.allCases.count
    }
    private var omniCompression: String {
        providers.first { $0.id == omniRouteProviderID }?.compression ?? "stacked"
    }

    /// Show the install log while installing and after a failure.
    private var omniShowLog: Bool {
        guard !omni.installLog.isEmpty else { return false }
        if omni.state == .installing { return true }
        if case .error = omni.state { return true }
        return false
    }

    private var omniRouteCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 8) {
                Image(systemName: "bolt.horizontal.circle.fill").foregroundStyle(Color.accentSoft)
                Text("OmniRoute").font(.system(size: 14, weight: .semibold)).foregroundStyle(Color.ink)
                omniStatusPill
                Spacer()
                if omni.state == .running {
                    Button("Dashboard") { omni.openDashboard() }
                        .buttonStyle(.plain).font(.system(size: 11.5, weight: .medium))
                        .foregroundStyle(Color.accentSoft)
                }
            }

            Text("A local gateway to 350+ providers — 90+ with free tiers. Power installs and runs it for you; you bring your own accounts through its dashboard. Free routing works keyless out of the box via its `auto` model.")
                .font(.system(size: 11.5)).foregroundStyle(Color.mutedText)
                .fixedSize(horizontal: false, vertical: true)

            omniActions

            // Show the log while installing AND after a failure — "see the log"
            // has to actually show it.
            if omniShowLog {
                ScrollView {
                    VStack(alignment: .leading, spacing: 1) {
                        ForEach(Array(omni.installLog.suffix(8).enumerated()), id: \.offset) { _, l in
                            Text(l).font(.system(size: 10, design: .monospaced))
                                .foregroundStyle(Color.mutedText).lineLimit(1)
                        }
                    }.frame(maxWidth: .infinity, alignment: .leading)
                }
                .frame(height: 88)
                .padding(8)
                .background(RoundedRectangle(cornerRadius: 8).fill(Color.raised))
            }

            if case .error(let msg) = omni.state {
                Text(msg).font(.system(size: 11)).foregroundStyle(Color.orange)
                    .fixedSize(horizontal: false, vertical: true)
            }

            Divider().overlay(Color.hairline)

            // The routing switches — only meaningful once installed.
            Toggle(isOn: Binding(
                get: { omniEnabled },
                set: { on in setOmni(enabled: on, maxFree: omniMaxFree) }
            )) {
                Text("Route through OmniRoute").font(.system(size: 12.5, weight: .medium))
                    .foregroundStyle(Color.ink)
            }
            .toggleStyle(.switch).tint(Color.accent)

            if omniEnabled {
                Toggle(isOn: Binding(
                    get: { omniMaxFree },
                    set: { max in setOmni(enabled: true, maxFree: max) }
                )) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Maximum free — route every role").font(.system(size: 12.5, weight: .medium))
                            .foregroundStyle(Color.ink)
                        Text("Sends code, review, and verification to free models too. Cheapest possible, but weaker models fail more gates and trigger more retries — quality is the trade.")
                            .font(.system(size: 10.5)).foregroundStyle(Color.mutedText)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                }
                .toggleStyle(.switch).tint(Color.orange)

                Text(omniMaxFree
                     ? "Every role → OmniRoute. Your Claude login is used only if it's down."
                     : "Research + docs → OmniRoute. Code and gate-graded roles stay on your Claude login.")
                    .font(.system(size: 10.5)).foregroundStyle(Color.mutedText)

                Divider().overlay(Color.hairline)

                // Compression — OmniRoute trims the request before the upstream
                // model. Safe: it compresses noisy tool output, not code, and is
                // cache-aware so it never breaks warm-session reuse.
                VStack(alignment: .leading, spacing: 4) {
                    Text("Compression — fewer tokens per request")
                        .font(.system(size: 12.5, weight: .medium)).foregroundStyle(Color.ink)
                    HStack(spacing: 0) {
                        ForEach([("Off", "off"), ("Standard", "standard"), ("Max", "stacked")], id: \.1) { pair in
                            let on = omniCompression == pair.1
                            Button(pair.0) { setOmni(enabled: true, maxFree: omniMaxFree, compression: pair.1) }
                                .buttonStyle(.plain)
                                .font(.system(size: 11.5, weight: on ? .semibold : .medium))
                                .foregroundStyle(on ? Color.ink : Color.mutedText)
                                .padding(.horizontal, 12).padding(.vertical, 5)
                                .background(RoundedRectangle(cornerRadius: 6).fill(on ? Color.raised : .clear))
                        }
                    }
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                    .overlay(RoundedRectangle(cornerRadius: 8).stroke(Color.hairline))
                    Text(omniCompression == "stacked"
                         ? "Max: RTK→Caveman, up to ~89% off tool output. Best savings."
                         : omniCompression == "standard"
                         ? "Standard: filler removal, ~30% off. Conservative."
                         : "Off: requests sent whole.")
                        .font(.system(size: 10.5)).foregroundStyle(Color.mutedText)
                }
            }
        }
        .padding(14)
        .background(RoundedRectangle(cornerRadius: 12).fill(Color.panel))
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(omniEnabled ? Color.accentSoft.opacity(0.4) : Color.hairline))
    }

    private var omniStatusPill: some View {
        let (text, color): (String, Color) = switch omni.state {
        case .checking: ("checking…", Color.mutedText)
        case .notInstalled: ("not installed", Color.mutedText)
        case .stopped: ("stopped", Color.mutedText)
        case .installing: ("installing…", Color.accentSoft)
        case .starting: ("starting…", Color.accentSoft)
        case .running: ("running", Color.green)
        case .error: ("error", Color.orange)
        }
        return Text(text).font(.system(size: 10, weight: .medium))
            .foregroundStyle(color)
            .padding(.horizontal, 7).padding(.vertical, 2)
            .background(Capsule().fill(color.opacity(0.12)))
    }

    @ViewBuilder private var omniActions: some View {
        HStack(spacing: 10) {
            switch omni.state {
            case .notInstalled:
                actionButton("Install OmniRoute", "arrow.down.circle") { Task { await omni.install() } }
            case .stopped, .error:
                actionButton("Start", "play.fill") { Task { await omni.start() } }
                actionButton("Re-check", "arrow.clockwise", subtle: true) { Task { await omni.refresh() } }
            case .running:
                actionButton("Stop", "stop.fill", subtle: true) { omni.stop() }
            case .checking, .installing, .starting:
                ProgressView().controlSize(.small)
            }
            Spacer()
        }
    }

    private func actionButton(_ label: String, _ icon: String, subtle: Bool = false, _ action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack(spacing: 5) {
                Image(systemName: icon).font(.system(size: 10, weight: .semibold))
                Text(label)
            }.font(.system(size: 12, weight: .medium))
        }
        .buttonStyle(.plain)
        .foregroundStyle(subtle ? Color.mutedText : Color.accentSoft)
    }

    /// Add, widen, or remove the managed OmniRoute provider in one place.
    private func setOmni(enabled: Bool, maxFree: Bool, compression: String? = nil) {
        let existing = providers.first { $0.id == omniRouteProviderID }
        let token = existing?.authToken
        let compress = compression ?? existing?.compression ?? "stacked"
        providers.removeAll { $0.id == omniRouteProviderID }
        if enabled {
            providers.append(.omniRoute(maxFree: maxFree, authToken: token, compression: compress))
        }
        ProviderStore.save(providers)
    }

    private var header: some View {
        HStack {
            Text("Routing").font(.system(size: 15, weight: .semibold)).foregroundStyle(Color.ink)
            Spacer()
            Button("Done") { save(); dismiss() }
                .buttonStyle(.plain)
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(Color.accentSoft)
        }
        .padding(.horizontal, 18).padding(.vertical, 14)
    }

    private var intro: some View {
        Text("Send stages to a cheaper provider or your own local gateway (like OmniRoute on :20128). Power keeps every code-writing and gate-graded role on your trusted Claude login unless you widen the floor yourself — so cost drops where it is safe, and the gates it must pass stay honest.")
            .font(.system(size: 12)).foregroundStyle(Color.mutedText)
            .fixedSize(horizontal: false, vertical: true)
    }

    private var claudeCard: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 8) {
                Image(systemName: "checkmark.seal.fill").foregroundStyle(Color.accentSoft)
                Text(Provider.claudeDefault.label).font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(Color.ink)
                Spacer()
                Text("default · all roles").font(.system(size: 11)).foregroundStyle(Color.mutedText)
            }
            Text("Your normal login. Always present, always trusted with every role. Nothing to configure.")
                .font(.system(size: 11)).foregroundStyle(Color.mutedText)
        }
        .padding(14)
        .background(RoundedRectangle(cornerRadius: 12).fill(Color.panel))
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.hairline))
    }

    private func gatewayCard(_ p: Binding<Provider>) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 8) {
                Image(systemName: "arrow.triangle.branch").foregroundStyle(Color.accentSoft)
                TextField("Label", text: p.label)
                    .textFieldStyle(.plain).font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(Color.ink)
                Spacer()
                Button {
                    providers.removeAll { $0.id == p.wrappedValue.id }
                } label: {
                    Image(systemName: "trash").font(.system(size: 11))
                }
                .buttonStyle(.plain).foregroundStyle(Color.mutedText)
            }
            field("Base URL", text: Binding(
                get: { p.wrappedValue.baseUrl ?? "" },
                set: { p.wrappedValue.baseUrl = $0 }
            ), placeholder: omniRouteDefaultBase)
            field("Auth token (optional)", text: Binding(
                get: { p.wrappedValue.authToken ?? "" },
                set: { p.wrappedValue.authToken = $0.isEmpty ? nil : $0 }
            ), placeholder: "from the gateway dashboard", secure: true)

            Text("Trusted with these roles").font(.system(size: 11, weight: .medium))
                .foregroundStyle(Color.mutedText)
            FlowRoles(roleOrder: roleOrder, provider: p)
        }
        .padding(14)
        .background(RoundedRectangle(cornerRadius: 12).fill(Color.panel))
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.hairline))
    }

    private func field(_ label: String, text: Binding<String>, placeholder: String, secure: Bool = false) -> some View {
        VStack(alignment: .leading, spacing: 3) {
            Text(label).font(.system(size: 10.5)).foregroundStyle(Color.mutedText)
            Group {
                if secure { SecureField(placeholder, text: text) }
                else { TextField(placeholder, text: text) }
            }
            .textFieldStyle(.plain).font(.system(size: 12, design: .monospaced))
            .foregroundStyle(Color.ink)
            .padding(.horizontal, 9).padding(.vertical, 6)
            .background(RoundedRectangle(cornerRadius: 7).fill(Color.raised))
        }
    }

    private var addRow: some View {
        HStack(spacing: 10) {
            Button {
                Task { await detect() }
            } label: {
                HStack(spacing: 5) {
                    if detecting { ProgressView().controlSize(.small) }
                    else { Image(systemName: "dot.radiowaves.left.and.right") }
                    Text("Detect local gateway")
                }
                .font(.system(size: 12, weight: .medium))
            }
            .buttonStyle(.plain).foregroundStyle(Color.accentSoft)
            .disabled(detecting)

            Button {
                addCustom()
            } label: {
                HStack(spacing: 5) {
                    Image(systemName: "plus")
                    Text("Add gateway")
                }
                .font(.system(size: 12, weight: .medium))
            }
            .buttonStyle(.plain).foregroundStyle(Color.mutedText)

            Spacer()
            if let detectResult {
                Text(detectResult).font(.system(size: 11)).foregroundStyle(Color.mutedText)
            }
        }
    }

    private func detect() async {
        detecting = true; detectResult = nil
        let found = await ProviderStore.detect()
        detecting = false
        if found {
            if !providers.contains(where: { $0.baseUrl.map(ProviderRouter.normalizeBaseUrl) == ProviderRouter.normalizeBaseUrl(omniRouteDefaultBase) }) {
                providers.append(Provider(
                    id: "omniroute-\(UUID().uuidString.prefix(8))",
                    label: "OmniRoute (local)", kind: .gateway,
                    baseUrl: omniRouteDefaultBase, authToken: nil,
                    allowRoles: safeCheapRoles, costWeight: 0, models: nil
                ))
                detectResult = "Found — added, trusted with research + docs"
            } else {
                detectResult = "Already configured"
            }
            save()
        } else {
            detectResult = "Nothing on \(omniRouteDefaultBase)"
        }
    }

    private func addCustom() {
        providers.append(Provider(
            id: "gw-\(UUID().uuidString.prefix(8))",
            label: "New gateway", kind: .gateway,
            baseUrl: "", authToken: nil,
            allowRoles: safeCheapRoles, costWeight: 1, models: nil
        ))
    }

    private func save() {
        // Drop half-configured gateways (no base URL) so a router never points
        // at nothing.
        providers = providers.filter { $0.kind != .gateway || !($0.baseUrl ?? "").isEmpty }
        ProviderStore.save(providers)
    }
}

/// The role quality-floor toggles for one gateway.
private struct FlowRoles: View {
    let roleOrder: [Role]
    @Binding var provider: Provider

    var body: some View {
        LazyVGrid(columns: [GridItem(.adaptive(minimum: 96), spacing: 6)], alignment: .leading, spacing: 6) {
            ForEach(roleOrder, id: \.self) { role in
                let on = provider.allowRoles.contains(role)
                let safe = safeCheapRoles.contains(role)
                Button {
                    if on { provider.allowRoles.removeAll { $0 == role } }
                    else { provider.allowRoles.append(role) }
                } label: {
                    HStack(spacing: 4) {
                        Image(systemName: on ? "checkmark.circle.fill" : "circle")
                            .font(.system(size: 10))
                        Text(role.rawValue).font(.system(size: 11, weight: on ? .semibold : .regular))
                        if !safe { Image(systemName: "exclamationmark.triangle.fill").font(.system(size: 8)) }
                    }
                    .foregroundStyle(on ? (safe ? Color.accentSoft : Color.orange) : Color.mutedText)
                    .padding(.horizontal, 8).padding(.vertical, 4)
                    .background(Capsule().fill(on ? Color.accentSoft.opacity(0.1) : .clear))
                    .overlay(Capsule().stroke(on ? Color.accentSoft.opacity(0.4) : Color.hairline))
                }
                .buttonStyle(.plain)
                .help(safe ? "Low-stakes — safe to route" : "Code-writing or gate-graded — routing here risks gate failures and retries")
            }
        }
    }
}
