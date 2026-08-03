import SwiftUI

enum AskBuddyMode {
    case vault(productCount: Int)
    case product(id: String, name: String, status: WarrantyStatus)
}

// Native port of ask-buddy-panel.tsx — a real multi-turn chat with DB-backed
// history (`chat_messages`), in two modes (vault-wide / product-scoped).
// Presented as a full sheet rather than the web's floating 340x520 panel,
// matching ClaimAssistView/WarrantyEditView's precedent in this app.
struct AskBuddyView: View {
    let mode: AskBuddyMode

    @EnvironmentObject private var session: SessionStore
    @Environment(\.dismiss) private var dismiss

    @State private var messages: [ChatMessage] = []
    @State private var isLoadingHistory = true
    @State private var hasDocument: Bool?
    @State private var standardTermsChosen = false
    @State private var input = ""
    @State private var isSending = false
    @State private var sendError: String?
    @State private var showingWarrantyUpload = false
    @State private var linkedProduct: ProductWithWarranties?

    private static let vaultSuggestions = [
        "Which warranties expire soon?",
        "Do I have any active recalls?",
        "Which products are missing warranty documents?",
    ]
    private static let productSuggestions = [
        "Does this cover accidental damage?",
        "How do I make a claim?",
        "Is this a known problem?",
    ]

    private var productId: String? {
        if case .product(let id, _, _) = mode { return id }
        return nil
    }

    private var showNoDocGate: Bool {
        guard case .product(_, let name, _) = mode else { return false }
        _ = name
        return hasDocument == false && messages.isEmpty && !standardTermsChosen && !isLoadingHistory
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                header

                Group {
                    if isLoadingHistory {
                        ProgressView().frame(maxWidth: .infinity, maxHeight: .infinity)
                    } else if showNoDocGate {
                        noDocGate
                    } else {
                        chatBody
                    }
                }
                .frame(maxHeight: .infinity)
            }
            .toolbar(.hidden, for: .navigationBar)
        }
        .task { await loadHistory() }
        .sheet(isPresented: $showingWarrantyUpload) {
            if case .product(let id, _, _) = mode {
                WarrantyEditView(productId: id, productBrand: nil, purchaseDate: nil, existing: nil) {}
            }
        }
        .sheet(item: $linkedProduct) { product in
            NavigationStack {
                ProductDetailView(item: product)
            }
        }
    }

    private var header: some View {
        HStack(spacing: Spacing.md) {
            Image("Mascot").resizable().scaledToFit().frame(width: 26, height: 26)
            VStack(alignment: .leading, spacing: 1) {
                Text("Ask Buddy").font(.brandDisplay(15)).foregroundStyle(.white)
                Text(subtitle).font(.brandBody(11)).foregroundStyle(.white.opacity(0.6)).lineLimit(1)
            }
            Spacer()
            Button {
                dismiss()
            } label: {
                Image(systemName: "xmark").foregroundStyle(.white.opacity(0.7))
            }
        }
        .padding(.horizontal, Spacing.lg)
        .padding(.top, Spacing.sm)
        .padding(.bottom, Spacing.md)
        .background(Color.brandNavy.ignoresSafeArea(edges: .top))
    }

    private var subtitle: String {
        switch mode {
        case .vault(let count):
            return "\(count) product\(count == 1 ? "" : "s") · vault-wide"
        case .product(_, let name, let status):
            return "\(name) · \(statusLabel(status))"
        }
    }

    private func statusLabel(_ status: WarrantyStatus) -> String {
        switch status {
        case .active: return "Warranty active"
        case .expiring: return "Warranty expiring soon"
        case .expired: return "Warranty expired"
        case .noWarranty: return "No warranty on file"
        }
    }

    private var noDocGate: some View {
        VStack(spacing: Spacing.lg) {
            Spacer()
            HStack(alignment: .top, spacing: Spacing.sm) {
                Image("Mascot").resizable().scaledToFit().frame(width: 20, height: 20)
                VStack(alignment: .leading, spacing: Spacing.xs) {
                    if case .product(_, let name, _) = mode {
                        Text("No warranty document has been uploaded for \(name) yet, so I can't give you answers specific to your coverage.")
                            .font(.brandBody(13))
                    }
                    Divider()
                    Text("Answers will use standard brand terms if you proceed")
                        .font(.brandBody(10)).foregroundStyle(.secondary)
                }
            }
            .padding(Spacing.md)
            .background(Color.brandCloud, in: RoundedRectangle(cornerRadius: Radius.md))
            .padding(.horizontal, Spacing.lg)

            Spacer()

            VStack(spacing: Spacing.sm) {
                Button {
                    showingWarrantyUpload = true
                } label: {
                    Text("Upload warranty doc").frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .tint(.brandNavy)

                Button("Answer using standard terms →") {
                    standardTermsChosen = true
                }
                .font(.brandBody(12))
                .foregroundStyle(Color.brandTeal)
            }
            .padding(.horizontal, Spacing.xl)
            .padding(.bottom, Spacing.lg)
        }
    }

    private var chatBody: some View {
        VStack(spacing: 0) {
            ScrollViewReader { proxy in
                ScrollView {
                    LazyVStack(alignment: .leading, spacing: Spacing.md) {
                        ForEach(messages) { message in
                            ChatBubble(message: message, onOpenProduct: { id in Task { await openProduct(id) } })
                                .id(message.id)
                        }
                        if isSending {
                            ThinkingBubble().id("thinking")
                        }
                    }
                    .padding(Spacing.lg)
                }
                .onChange(of: messages.count) { _, _ in
                    withAnimation { proxy.scrollTo(isSending ? "thinking" : messages.last?.id, anchor: .bottom) }
                }
                .onChange(of: isSending) { _, _ in
                    withAnimation { proxy.scrollTo(isSending ? "thinking" : messages.last?.id, anchor: .bottom) }
                }
            }

            if messages.isEmpty && !isSending {
                VStack(alignment: .leading, spacing: Spacing.sm) {
                    Text("SUGGESTED QUESTIONS").font(.brandBody(9, weight: .semibold)).foregroundStyle(.secondary)
                    ForEach(suggestions, id: \.self) { suggestion in
                        Button {
                            Task { await send(suggestion) }
                        } label: {
                            Text(suggestion)
                                .font(.brandBody(12))
                                .frame(maxWidth: .infinity, alignment: .leading)
                        }
                        .padding(Spacing.sm)
                        .background(Color.brandCloud, in: RoundedRectangle(cornerRadius: Radius.sm))
                        .foregroundStyle(.secondary)
                    }
                }
                .padding(.horizontal, Spacing.lg)
                .padding(.bottom, Spacing.sm)
            }

            if let sendError {
                ErrorBanner(message: sendError)
                    .padding(.horizontal, Spacing.lg)
            }

            HStack(spacing: Spacing.sm) {
                TextField(inputPlaceholder, text: $input)
                    .textFieldStyle(.roundedBorder)
                    .disabled(isSending)
                    .onSubmit { Task { await send(input) } }
                Button {
                    Task { await send(input) }
                } label: {
                    Image(systemName: "arrow.up.circle.fill").font(.title)
                }
                .tint(.brandTeal)
                .disabled(isSending || input.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
            }
            .padding(Spacing.md)
        }
    }

    private var suggestions: [String] {
        if case .vault = mode { return Self.vaultSuggestions }
        return Self.productSuggestions
    }

    private var inputPlaceholder: String {
        if case .vault = mode { return "Ask about your vault…" }
        return "Ask about your warranty…"
    }

    private func loadHistory() async {
        guard let userId = session.userId else { return }
        isLoadingHistory = true
        do {
            if let productId {
                messages = try await SupabaseService.client
                    .from("chat_messages")
                    .select("id, role, content, source, created_at")
                    .eq("user_id", value: userId)
                    .eq("product_id", value: productId)
                    .order("created_at", ascending: true)
                    .execute()
                    .value
            } else {
                messages = try await SupabaseService.client
                    .from("chat_messages")
                    .select("id, role, content, source, created_at")
                    .eq("user_id", value: userId)
                    .is("product_id", value: nil)
                    .order("created_at", ascending: true)
                    .execute()
                    .value
            }
        } catch {
            messages = []
        }

        if let productId {
            let warranty: WarrantyDocCheck? = try? await SupabaseService.client
                .from("warranties")
                .select("document_url")
                .eq("product_id", value: productId)
                .order("created_at", ascending: false)
                .limit(1)
                .single()
                .execute()
                .value
            let documents: [DocumentTypeOnly] = (try? await SupabaseService.client
                .from("documents")
                .select("document_type")
                .eq("product_id", value: productId)
                .execute()
                .value) ?? []
            hasDocument = (warranty?.documentUrl != nil) || documents.contains { $0.documentType == "Warranty" }
        }

        isLoadingHistory = false
    }

    private func send(_ text: String) async {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty, !isSending else { return }

        let tempId = "pending-\(UUID().uuidString)"
        messages.append(ChatMessage(id: tempId, role: "user", content: trimmed, source: nil, createdAt: ""))
        input = ""
        isSending = true
        sendError = nil

        do {
            let result = try await APIClient.sendChatMessage(productId: productId, message: trimmed)
            if let idx = messages.firstIndex(where: { $0.id == tempId }) {
                messages[idx] = result.userMessage
            }
            messages.append(result.reply)
            Haptics.light()
        } catch {
            sendError = error.localizedDescription
            Haptics.error()
        }
        isSending = false
    }

    private func openProduct(_ id: String) async {
        linkedProduct = try? await SupabaseService.client
            .from("products")
            .select("*, warranties(*)")
            .eq("id", value: id)
            .single()
            .execute()
            .value
    }
}

private struct WarrantyDocCheck: Decodable {
    let documentUrl: String?
    enum CodingKeys: String, CodingKey { case documentUrl = "document_url" }
}

private struct DocumentTypeOnly: Decodable {
    let documentType: String
    enum CodingKeys: String, CodingKey { case documentType = "document_type" }
}

private struct ChatBubble: View {
    let message: ChatMessage
    let onOpenProduct: (String) -> Void

    var body: some View {
        if message.isUser {
            HStack {
                Spacer(minLength: 40)
                Text(message.content)
                    .font(.brandBody(13))
                    .foregroundStyle(.white)
                    .padding(Spacing.md)
                    .background(Color.brandNavy, in: RoundedRectangle(cornerRadius: Radius.md))
            }
        } else {
            HStack(alignment: .top, spacing: Spacing.sm) {
                Image("Mascot").resizable().scaledToFit().frame(width: 20, height: 20)
                VStack(alignment: .leading, spacing: 4) {
                    Text(attributedContent(message.content))
                        .font(.brandBody(13))
                        .environment(\.openURL, OpenURLAction { url in
                            if url.scheme == "warrantybuddy", url.host == "product", let id = url.pathComponents.last {
                                onOpenProduct(id)
                                return .handled
                            }
                            return .systemAction
                        })
                    if let source = message.source {
                        Divider()
                        Label(source, systemImage: "doc.text").font(.brandBody(9)).foregroundStyle(.secondary)
                    }
                }
                .padding(Spacing.md)
                .background(Color.brandCloud, in: RoundedRectangle(cornerRadius: Radius.md))
                Spacer(minLength: 40)
            }
        }
    }

    // Buddy is instructed to emit markdown links — [label](/products/{id})
    // or with a ?tab=warranty/documents suffix — instead of describing where
    // to find something in prose. Mirrors the web's ALLOWED_HREF allowlist:
    // anything not matching renders as plain text, never as a live link.
    private func attributedContent(_ content: String) -> AttributedString {
        var result = AttributedString()
        guard let linkRegex = try? NSRegularExpression(pattern: #"\[([^\]]+)\]\(([^)]+)\)"#),
              let hrefRegex = try? NSRegularExpression(pattern: #"^/products/([^/?]+)(?:\?tab=(?:warranty|documents))?$"#) else {
            return AttributedString(content)
        }
        let nsContent = content as NSString
        var lastEnd = 0
        let matches = linkRegex.matches(in: content, range: NSRange(location: 0, length: nsContent.length))

        for match in matches {
            if match.range.location > lastEnd {
                result += AttributedString(nsContent.substring(with: NSRange(location: lastEnd, length: match.range.location - lastEnd)))
            }
            let label = nsContent.substring(with: match.range(at: 1))
            let href = nsContent.substring(with: match.range(at: 2))
            let hrefMatch = hrefRegex.firstMatch(in: href, range: NSRange(location: 0, length: (href as NSString).length))

            if let hrefMatch, hrefMatch.range(at: 1).location != NSNotFound {
                let productId = (href as NSString).substring(with: hrefMatch.range(at: 1))
                var linkPart = AttributedString(label)
                linkPart.link = URL(string: "warrantybuddy://product/\(productId)")
                linkPart.foregroundColor = Color.brandTeal
                linkPart.underlineStyle = .single
                result += linkPart
            } else {
                result += AttributedString(nsContent.substring(with: match.range))
            }
            lastEnd = match.range.location + match.range.length
        }
        if lastEnd < nsContent.length {
            result += AttributedString(nsContent.substring(from: lastEnd))
        }
        return result
    }
}

private struct ThinkingBubble: View {
    @State private var animate = false

    var body: some View {
        HStack(alignment: .top, spacing: Spacing.sm) {
            Image("Mascot").resizable().scaledToFit().frame(width: 20, height: 20)
            HStack(spacing: 4) {
                ForEach(0..<3, id: \.self) { i in
                    Circle().fill(Color.brandInk.opacity(0.5)).frame(width: 6, height: 6)
                        .offset(y: animate ? -3 : 0)
                        .animation(.easeInOut(duration: 0.5).repeatForever().delay(Double(i) * 0.15), value: animate)
                }
            }
            .padding(Spacing.md)
            .background(Color.brandCloud, in: RoundedRectangle(cornerRadius: Radius.md))
            Spacer(minLength: 40)
        }
        .onAppear { animate = true }
    }
}
