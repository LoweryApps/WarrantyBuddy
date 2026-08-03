import SwiftUI

// Native port of src/components/claims/claim-assist-wizard.tsx — a 5-step
// guided flow (proof of purchase → warranty window → claim contact →
// credit-card coverage tip → AI-drafted email). Steps 1-4 are informational
// review screens; only step 5 calls the AI. Presented as a sheet (its own
// NavigationStack) from ProductDetailView and RecallsListView, rather than a
// pushed navigationDestination, since those two screens live in separate
// NavigationStacks.
struct ClaimAssistView: View {
    let productId: String
    let productName: String

    @Environment(\.dismiss) private var dismiss
    @State private var step = 1
    @State private var product: ClaimProduct?
    @State private var warranty: ClaimWarranty?
    @State private var receipt: ClaimReceipt?
    @State private var recall: ClaimRecall?
    @State private var isLoading = true
    @State private var loadError: String?

    private static let stepLabels = [
        "Proof of purchase",
        "Warranty window check",
        "Claim path",
        "Credit card coverage check",
        "Buddy's claim email draft",
    ]

    var body: some View {
        NavigationStack {
            Group {
                if isLoading {
                    ProgressView()
                } else if let loadError {
                    ContentUnavailableView("Couldn't load this product", systemImage: "exclamationmark.triangle", description: Text(loadError))
                } else if let product {
                    ScrollView {
                        VStack(alignment: .leading, spacing: 0) {
                            ClaimProgressBar(step: step, labels: Self.stepLabels)

                            switch step {
                            case 1:
                                ClaimStep1Proof(product: product, receipt: receipt) { withAnimation { step = 2 } }
                            case 2:
                                ClaimStep2Warranty(product: product, warranty: warranty, recall: recall) { withAnimation { step = 3 } }
                            case 3:
                                ClaimStep3Contact(product: product, warranty: warranty, recall: recall) { withAnimation { step = 4 } }
                            case 4:
                                ClaimStep4CreditCard { withAnimation { step = 5 } }
                            default:
                                ClaimStep5Email(productId: productId) { dismiss() }
                            }
                        }
                        .padding(Spacing.lg)
                    }
                }
            }
            .navigationTitle("Claim Assist")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") { dismiss() }
                }
            }
        }
        .task { await load() }
    }

    private func load() async {
        isLoading = true
        loadError = nil
        do {
            product = try await SupabaseService.client
                .from("products")
                .select("id, name, brand, model_number, serial_number, category, vin, purchase_date, purchase_price, retailer")
                .eq("id", value: productId)
                .single()
                .execute()
                .value

            warranty = try? await SupabaseService.client
                .from("warranties")
                .select("warranty_type, start_date, end_date, claim_contact")
                .eq("product_id", value: productId)
                .order("created_at", ascending: false)
                .limit(1)
                .single()
                .execute()
                .value

            let receipts: [ClaimReceipt] = (try? await SupabaseService.client
                .from("documents")
                .select("file_name")
                .eq("product_id", value: productId)
                .eq("document_type", value: "Receipt")
                .limit(1)
                .execute()
                .value) ?? []
            receipt = receipts.first

            let alerts: [RecallAlertWrapper] = (try? await SupabaseService.client
                .from("user_recall_alerts")
                .select("recalls(source, external_recall_id, description, remedy)")
                .eq("product_id", value: productId)
                .eq("acknowledged", value: false)
                .limit(1)
                .execute()
                .value) ?? []
            recall = alerts.first?.recalls
        } catch {
            loadError = error.localizedDescription
        }
        isLoading = false
    }
}

private struct RecallAlertWrapper: Decodable {
    let recalls: ClaimRecall?
}

// Mirrors progress-bar.tsx.
private struct ClaimProgressBar: View {
    let step: Int
    let labels: [String]

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 4) {
                ForEach(0..<labels.count, id: \.self) { i in
                    RoundedRectangle(cornerRadius: 2)
                        .fill(i + 1 < step ? Color.brandTeal : (i + 1 == step ? Color.brandNavy : Color(.separator)))
                        .frame(height: 3)
                }
            }
            Text("Step \(step) of \(labels.count) — \(labels[step - 1])")
                .font(.brandBody(10))
                .foregroundStyle(.secondary)
        }
        .padding(.bottom, Spacing.lg)
    }
}

// Mirrors step-header.tsx.
private struct ClaimStepHeader: View {
    let title: String
    let subtitle: String

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title).font(.brandDisplay(18))
            Text(subtitle).font(.brandBody(12)).foregroundStyle(.secondary)
        }
        .padding(.bottom, Spacing.lg)
    }
}

private struct ClaimCTAButton: View {
    let title: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(title).bold().frame(maxWidth: .infinity)
        }
        .buttonStyle(.borderedProminent)
        .tint(.brandNavy)
        .controlSize(.large)
    }
}

// MARK: - Step 1: Proof of purchase

private struct ClaimStep1Proof: View {
    let product: ClaimProduct
    let receipt: ClaimReceipt?
    let onContinue: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            ClaimStepHeader(
                title: receipt != nil ? "Let's check your proof of purchase" : "You'll need proof of purchase",
                subtitle: receipt != nil
                    ? "Manufacturers require a dated itemized receipt — not just a card statement. Buddy found your receipt on file."
                    : "Manufacturers require a dated itemized receipt — not just a card statement. Buddy didn't find one on file for this product."
            )

            VStack(alignment: .leading, spacing: Spacing.sm) {
                Label(receipt != nil ? "Receipt on file" : "No receipt on file", systemImage: "doc.text")
                    .font(.brandBody(12, weight: .medium))

                if let receipt {
                    checkRow(
                        title: product.purchaseDate.map { "\(receipt.fileName) — \(WarrantyStatus.longDateLabel($0))" } ?? receipt.fileName,
                        subtitle: "Itemized receipt on file. Most manufacturers require this exact format."
                    )
                    if let price = product.purchasePrice {
                        checkRow(
                            title: "Purchase price confirmed — \(price.formatted(.currency(code: "USD")))",
                            subtitle: "Matches your product record."
                        )
                    }
                } else {
                    Text("Check your email for an order confirmation, or look up the purchase on your credit or debit card statement. You can also upload a receipt from the product's Documents tab before starting a claim — most manufacturers won't proceed without one.")
                        .font(.brandBody(11))
                        .foregroundStyle(.secondary)
                }
            }
            .cardStyle(padding: Spacing.md)

            HStack(alignment: .top, spacing: Spacing.sm) {
                Image(systemName: "info.circle").font(.caption)
                Text("Tip: credit card statements alone usually aren't accepted — most manufacturers want an itemized, dated receipt showing the product.")
                    .font(.brandBody(11))
            }
            .foregroundStyle(.secondary)
            .padding(Spacing.sm)
            .background(Color.brandCloud, in: RoundedRectangle(cornerRadius: Radius.sm))

            ClaimCTAButton(title: receipt != nil ? "Proof confirmed — continue →" : "I have it another way — continue →", action: onContinue)
        }
    }

    @ViewBuilder
    private func checkRow(title: String, subtitle: String) -> some View {
        HStack(alignment: .top, spacing: Spacing.sm) {
            ZStack {
                Circle().fill(Color.brandTeal.opacity(0.15))
                Image(systemName: "checkmark").font(.system(size: 9, weight: .bold)).foregroundStyle(Color.brandTeal)
            }
            .frame(width: 20, height: 20)
            VStack(alignment: .leading, spacing: 1) {
                Text(title).font(.brandBody(12, weight: .medium))
                Text(subtitle).font(.brandBody(10)).foregroundStyle(.secondary)
            }
        }
        .padding(.vertical, 4)
    }
}

// MARK: - Step 2: Warranty window check

private struct ClaimStep2Warranty: View {
    let product: ClaimProduct
    let warranty: ClaimWarranty?
    let recall: ClaimRecall?
    let onContinue: () -> Void

    private var endDate: String? {
        warranty?.endDate ?? product.purchaseDate.flatMap { WarrantyStatus.estimateStandardWarrantyEndDate(from: $0) }
    }
    private var isEstimate: Bool { warranty?.endDate == nil && endDate != nil }
    private var status: WarrantyStatus? { endDate.map { WarrantyStatus.compute(endDate: $0) } }
    private var days: Int? { endDate.flatMap { WarrantyStatus.daysUntil($0) } }
    private var covered: Bool { status == .active || status == .expiring }

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            ClaimStepHeader(
                title: endDate == nil ? "Can't confirm your warranty window" : (covered ? "You're covered" : "Your standard warranty has likely expired"),
                subtitle: endDate == nil
                    ? "No purchase date or warranty document is on file for this product, so Buddy can't estimate the window. You can still continue — check any paperwork you have."
                    : (isEstimate
                        ? "No warranty document is on file, so this is an estimate based on a standard 1-year manufacturer term and your purchase date."
                        : "Buddy calculated this from the warranty document on file.")
            )

            if let endDate {
                VStack(alignment: .leading, spacing: Spacing.sm) {
                    HStack(spacing: 4) {
                        Image(systemName: covered ? "checkmark.shield" : "exclamationmark.shield")
                            .foregroundStyle(covered ? Color.brandTeal : Color.brandRed)
                        Text("Warranty status").font(.brandBody(12, weight: .medium))
                        if isEstimate {
                            Text("Estimated")
                                .font(.brandBody(9, weight: .semibold))
                                .padding(.horizontal, Spacing.sm).padding(.vertical, 2)
                                .background(Color.brandAmber.opacity(0.15), in: Capsule())
                                .foregroundStyle(Color.brandAmber)
                        }
                    }
                    Divider()
                    infoRow("Warranty type", warranty?.warrantyType ?? "Manufacturer (standard, estimated)")
                    if let purchaseDate = product.purchaseDate {
                        Divider()
                        infoRow("Purchase date", WarrantyStatus.longDateLabel(purchaseDate))
                    }
                    Divider()
                    infoRow(isEstimate ? "Estimated expiration" : "Warranty expires", WarrantyStatus.longDateLabel(endDate))
                    Divider()
                    HStack {
                        Text("Days remaining").font(.brandBody(12)).foregroundStyle(.secondary)
                        Spacer()
                        if let days, days >= 0 {
                            Text("\(days) days left")
                                .font(.brandBody(11, weight: .semibold))
                                .padding(.horizontal, Spacing.sm).padding(.vertical, 2)
                                .background((status?.color ?? .brandInk).opacity(0.15), in: Capsule())
                                .foregroundStyle(status?.color ?? .brandInk)
                        } else {
                            Text("Expired")
                                .font(.brandBody(11, weight: .semibold))
                                .padding(.horizontal, Spacing.sm).padding(.vertical, 2)
                                .background(Color.brandRed.opacity(0.15), in: Capsule())
                                .foregroundStyle(Color.brandRed)
                        }
                    }
                }
                .cardStyle(padding: Spacing.md)
            }

            if let recall {
                VStack(alignment: .leading, spacing: 4) {
                    Text("This issue may also be covered under an active recall")
                        .font(.brandBody(12, weight: .medium))
                        .foregroundStyle(Color.brandTeal)
                    Text("\(recall.source) recall #\(recall.externalRecallId)\(recall.remedy.map { " entitles you to: \($0)" } ?? "") — this applies regardless of warranty status. You can claim under the warranty, the recall, or both.")
                        .font(.brandBody(11))
                        .foregroundStyle(Color.brandTeal.opacity(0.9))
                }
                .padding(Spacing.md)
                .background(Color.brandTeal.opacity(0.1), in: RoundedRectangle(cornerRadius: Radius.md))
                .overlay(RoundedRectangle(cornerRadius: Radius.md).stroke(Color.brandTeal.opacity(0.4)))
            }

            ClaimCTAButton(title: "Confirmed — continue →", action: onContinue)
        }
    }

    @ViewBuilder
    private func infoRow(_ label: String, _ value: String) -> some View {
        HStack {
            Text(label).font(.brandBody(12)).foregroundStyle(.secondary)
            Spacer()
            Text(value).font(.brandBody(12, weight: .medium))
        }
    }
}

// MARK: - Step 3: Claim path

private struct ClaimStep3Contact: View {
    let product: ClaimProduct
    let warranty: ClaimWarranty?
    let recall: ClaimRecall?
    let onContinue: () -> Void

    @State private var searchURL: URL?

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            ClaimStepHeader(
                title: product.brand.map { "Here's how to reach \($0)" } ?? "Here's what you'll need",
                subtitle: "Have your model number and serial number ready. Buddy added copy buttons for both."
            )

            if let contact = warranty?.claimContact, !contact.isEmpty {
                VStack(alignment: .leading, spacing: Spacing.sm) {
                    Text("\(product.brand ?? "Manufacturer") support contact")
                        .font(.brandBody(11, weight: .medium))
                        .foregroundStyle(Color.brandNavy)
                    HStack {
                        Label(contact, systemImage: "phone").font(.brandBody(12))
                        Spacer()
                        CopyButton(value: contact, label: "Copy claim contact")
                    }
                }
                .foregroundStyle(Color.brandNavy)
                .padding(Spacing.md)
                .background(Color.brandNavy.opacity(0.05), in: RoundedRectangle(cornerRadius: Radius.md))
                .overlay(RoundedRectangle(cornerRadius: Radius.md).stroke(Color.brandNavy.opacity(0.15)))
            } else if let brand = product.brand {
                Button {
                    searchURL = URL(string: "https://www.google.com/search?q=" + "\(brand) customer support warranty claim".addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed)!)
                } label: {
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            Text("Find \(brand) support").font(.brandBody(12))
                            Text("No claim contact on file yet — search for it").font(.brandBody(10)).foregroundStyle(.secondary)
                        }
                        Spacer()
                        Image(systemName: "arrow.up.right.square").foregroundStyle(Color.brandInk)
                    }
                }
                .buttonStyle(.plain)
                .cardStyle(padding: Spacing.md)
            }

            VStack(alignment: .leading, spacing: Spacing.sm) {
                Text("Have these ready when you call").font(.brandBody(11, weight: .medium))
                if let modelNumber = product.modelNumber {
                    readyRow("Model number", modelNumber) { CopyButton(value: modelNumber, label: "Copy model number") }
                }
                if let serialNumber = product.serialNumber {
                    readyRow("Serial number", serialNumber) { CopyButton(value: serialNumber, label: "Copy serial number") }
                }
                if product.category == "Vehicle", let vin = product.vin {
                    readyRow("VIN", vin) { CopyButton(value: vin, label: "Copy VIN") }
                }
                if let purchaseDate = product.purchaseDate {
                    HStack(spacing: Spacing.sm) {
                        Image(systemName: "checkmark").font(.caption2).foregroundStyle(Color.brandTeal)
                        Text("Purchase date — \(WarrantyStatus.longDateLabel(purchaseDate))").font(.brandBody(11)).foregroundStyle(.secondary)
                    }
                }
                if let recall {
                    HStack(spacing: Spacing.sm) {
                        Image(systemName: "checkmark").font(.caption2).foregroundStyle(Color.brandTeal)
                        Text("\(recall.source) recall number — \(recall.externalRecallId)").font(.brandBody(11)).foregroundStyle(.secondary)
                    }
                }
            }
            .cardStyle(padding: Spacing.md)

            ClaimCTAButton(title: "Got it — continue to credit card check →", action: onContinue)
        }
        .sheet(item: $searchURL) { url in SafariView(url: url) }
    }

    @ViewBuilder
    private func readyRow<Trailing: View>(_ label: String, _ value: String, @ViewBuilder trailing: () -> Trailing) -> some View {
        HStack(spacing: Spacing.sm) {
            Image(systemName: "checkmark").font(.caption2).foregroundStyle(Color.brandTeal)
            Text(label).font(.brandBody(11)).foregroundStyle(.secondary)
            trailing()
            Spacer()
            Text(value).font(.system(.caption, design: .monospaced))
        }
    }
}

// MARK: - Step 4: Credit card coverage check

private struct ClaimStep4CreditCard: View {
    let onContinue: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            ClaimStepHeader(
                title: "One more protection you may have",
                subtitle: "Many credit cards automatically extend manufacturer warranties. Worth checking even if you're already covered."
            )

            VStack(alignment: .leading, spacing: Spacing.md) {
                Label("Credit card extended warranty", systemImage: "creditcard").font(.brandBody(12, weight: .medium))

                infoRow(icon: "info.circle", title: "Cards that commonly offer this", body: "Visa Signature, Mastercard World, Chase Sapphire, Amex Platinum, Citi Double Cash, and many others typically add a year to manufacturer warranties.")
                Divider()
                infoRow(icon: "doc.text.magnifyingglass", title: "How to check", body: "Call the number on the back of the card you used for this purchase, or search your card's benefits guide for \"extended warranty\" or \"purchase protection.\"")
            }
            .cardStyle(padding: Spacing.md)

            ClaimCTAButton(title: "Got it — draft my claim email →", action: onContinue)
            Button("Skip — go to email draft", action: onContinue)
                .font(.brandBody(13))
                .foregroundStyle(.secondary)
                .frame(maxWidth: .infinity)
        }
    }

    @ViewBuilder
    private func infoRow(icon: String, title: String, body: String) -> some View {
        HStack(alignment: .top, spacing: Spacing.sm) {
            ZStack {
                Circle().fill(Color.brandNavy.opacity(0.1))
                Image(systemName: icon).font(.caption2).foregroundStyle(Color.brandNavy)
            }
            .frame(width: 22, height: 22)
            VStack(alignment: .leading, spacing: 1) {
                Text(title).font(.brandBody(12, weight: .medium))
                Text(body).font(.brandBody(10)).foregroundStyle(.secondary)
            }
        }
    }
}

// MARK: - Step 5: Email draft

private struct ClaimStep5Email: View {
    let productId: String
    let onDone: () -> Void

    @State private var issue = ""
    @State private var email: String?
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var copied = false

    // The draft comes back as "Subject: ...\n\n<body>" — split so the
    // subject can be copied separately from the body, since most email
    // apps (Mail, Gmail) already have their own Subject field and pasting
    // "Subject: ..." into the body reads as a mistake.
    private static func splitSubject(_ email: String) -> (subject: String?, body: String) {
        guard email.lowercased().hasPrefix("subject:"),
              let newlineRange = email.range(of: "\n") else {
            return (nil, email)
        }
        let subjectLine = String(email[email.index(email.startIndex, offsetBy: "subject:".count)..<newlineRange.lowerBound])
            .trimmingCharacters(in: .whitespaces)
        let rest = email[newlineRange.upperBound...].trimmingCharacters(in: .whitespacesAndNewlines)
        return (subjectLine.isEmpty ? nil : subjectLine, rest)
    }

    var body: some View {
        if let email {
            let parsed = Self.splitSubject(email)
            VStack(alignment: .leading, spacing: Spacing.md) {
                ClaimStepHeader(title: "Here's your claim email", subtitle: "Review it, then copy and paste it into your email app.")

                Label("Buddy drafted this", systemImage: "sparkles")
                    .font(.brandBody(10, weight: .medium))
                    .padding(.horizontal, Spacing.sm).padding(.vertical, 4)
                    .background(Color.brandTeal.opacity(0.1), in: Capsule())
                    .foregroundStyle(Color.brandTeal)

                if let subject = parsed.subject {
                    HStack {
                        VStack(alignment: .leading, spacing: 1) {
                            Text("Subject").font(.brandBody(10)).foregroundStyle(.secondary)
                            Text(subject).font(.brandBody(12, weight: .medium))
                        }
                        Spacer()
                        CopyButton(value: subject, label: "Copy subject")
                    }
                    .padding(Spacing.sm)
                    .background(Color.brandCloud, in: RoundedRectangle(cornerRadius: Radius.sm))
                }

                Text(parsed.body)
                    .font(.brandBody(11))
                    .padding(Spacing.md)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color.brandCloud, in: RoundedRectangle(cornerRadius: Radius.sm))

                HStack(spacing: Spacing.sm) {
                    Button {
                        UIPasteboard.general.string = parsed.body
                        Haptics.light()
                        withAnimation { copied = true }
                        DispatchQueue.main.asyncAfter(deadline: .now() + 1.6) { withAnimation { copied = false } }
                    } label: {
                        Label(copied ? "Copied" : "Copy email", systemImage: copied ? "checkmark" : "doc.on.doc")
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(.brandTeal)

                    Button("Edit issue") { withAnimation { self.email = nil } }
                        .buttonStyle(.bordered)
                        .frame(maxWidth: .infinity)
                }

                Button("Done — back to product", action: onDone)
                    .buttonStyle(.bordered)
                    .frame(maxWidth: .infinity)
            }
        } else {
            VStack(alignment: .leading, spacing: Spacing.md) {
                ClaimStepHeader(title: "Briefly describe the issue", subtitle: "Buddy will write the full claim email. Just tell it what's wrong in a few words.")

                if let errorMessage {
                    ErrorBanner(message: errorMessage)
                }

                TextEditor(text: $issue)
                    .frame(height: 100)
                    .overlay(alignment: .topLeading) {
                        if issue.isEmpty {
                            Text("e.g. Ice maker has stopped producing ice and is leaking water onto the freezer floor")
                                .font(.brandBody(13))
                                .foregroundStyle(.secondary.opacity(0.6))
                                .padding(.top, 8).padding(.leading, 5)
                                .allowsHitTesting(false)
                        }
                    }
                    .padding(4)
                    .background(RoundedRectangle(cornerRadius: Radius.sm).stroke(Color(.separator)))

                Button {
                    Task { await generate() }
                } label: {
                    if isLoading {
                        Text("Drafting…").frame(maxWidth: .infinity)
                    } else {
                        Label("Generate claim email", systemImage: "sparkles").frame(maxWidth: .infinity)
                    }
                }
                .buttonStyle(.borderedProminent)
                .tint(.brandTeal)
                .controlSize(.large)
                .disabled(issue.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || isLoading)
            }
        }
    }

    private func generate() async {
        isLoading = true
        errorMessage = nil
        do {
            let result = try await APIClient.draftClaimEmail(productId: productId, issue: issue)
            email = result.email
            Haptics.success()
        } catch {
            Haptics.error()
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }
}
