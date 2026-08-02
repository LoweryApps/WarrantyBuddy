import SwiftUI

// Shared branded top bar for the 3 tab roots — mirrors the web's persistent
// dark-navy nav (mascot + wordmark, gear, avatar). The web's horizontal
// Vault/Recalls/Settings links in that same bar are intentionally NOT
// replicated here — the native bottom TabView already does that job, and a
// second tab row would just be redundant.
struct BrandHeader: View {
    @EnvironmentObject private var session: SessionStore
    @EnvironmentObject private var tabSelection: TabSelection

    var body: some View {
        HStack(spacing: Spacing.md) {
            HStack(spacing: 8) {
                Image("Mascot")
                    .resizable()
                    .scaledToFit()
                    .frame(width: 26, height: 26)
                Text("Warranty").foregroundStyle(.white)
                + Text("Buddy").foregroundStyle(Color.brandTeal)
            }
            .font(.brandDisplay(17))

            Spacer()

            Button {
                tabSelection.selected = .settings
            } label: {
                Image(systemName: "gearshape")
                    .foregroundStyle(.white.opacity(0.85))
            }

            ZStack {
                Circle().fill(Color.brandTeal)
                Text(initials)
                    .font(.brandBody(12, weight: .semibold))
                    .foregroundStyle(Color.brandNavy)
            }
            .frame(width: 30, height: 30)
        }
        .padding(.horizontal, Spacing.lg)
        .padding(.top, Spacing.sm)
        .padding(.bottom, Spacing.md)
        .frame(maxWidth: .infinity)
        .background(Color.brandNavy.ignoresSafeArea(edges: .top))
    }

    private var initials: String {
        if let fullName = session.session?.user.userMetadata["full_name"]?.stringValue,
           let first = fullName.trimmingCharacters(in: .whitespaces).first {
            return String(first).uppercased()
        }
        if let email = session.session?.user.email, let first = email.first {
            return String(first).uppercased()
        }
        return "?"
    }
}
