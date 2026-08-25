import SwiftUI

/// The Power palette — the same warm near-blacks and terracotta as the
/// Electron app and the website's code panel. Brand does not change with the
/// shell. Contrast pairs were computed once for the family (body 11.9:1,
/// muted 5.6:1) and these are those values.
extension Color {
    init(hex: UInt32) {
        self.init(
            .sRGB,
            red: Double((hex >> 16) & 0xFF) / 255,
            green: Double((hex >> 8) & 0xFF) / 255,
            blue: Double(hex & 0xFF) / 255
        )
    }

    static let shell = Color(hex: 0x0E0D0C)
    static let canvasDark = Color(hex: 0x141311)
    static let panel = Color(hex: 0x1B1A17)
    static let raised = Color(hex: 0x23211D)
    static let codeBg = Color(hex: 0x0B0A09)

    static let ink = Color(hex: 0xF4F2EE)
    static let bodyText = Color(hex: 0xD6D2CA)
    static let mutedText = Color(hex: 0x9A948A)
    static let hairline = Color.white.opacity(0.08)

    static let accent = Color(hex: 0xC96442)
    static let accentSoft = Color(hex: 0xE0784F)
    static let pass = Color(hex: 0x34D399)
}
