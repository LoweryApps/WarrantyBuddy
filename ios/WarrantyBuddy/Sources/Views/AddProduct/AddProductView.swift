import SwiftUI
import UIKit

struct AddProductView: View {
    @Environment(\.dismiss) private var dismiss
    var onSaved: () -> Void

    @State private var showingCamera: ExtractKind?
    @State private var isExtracting = false
    @State private var extractError: String?
    @State private var draft: ProductDraft?
    @State private var success: (name: String, knownIssue: KnownIssueRecord?)?

    var body: some View {
        NavigationStack {
            if let success {
                AddProductSuccessView(
                    name: success.name,
                    knownIssue: success.knownIssue,
                    onAddAnother: {
                        draft = nil
                        self.success = nil
                    },
                    onDone: { dismiss() }
                )
            } else if let draft {
                ProductFormView(mode: .create, initialDraft: draft) {
                    Task { await handleSaved(draft) }
                }
            } else {
                methodPicker
            }
        }
    }

    private func handleSaved(_ savedDraft: ProductDraft) async {
        onSaved()
        let knownIssue = await ProductIntelligenceService.lookup(brand: savedDraft.brand, modelNumber: savedDraft.modelNumber)
        withAnimation { success = (name: savedDraft.name, knownIssue: knownIssue) }
    }

    private var methodPicker: some View {
        List {
            if let extractError {
                ErrorBanner(message: extractError)
            }
            Section("How do you want to add it?") {
                methodRow(icon: "camera.viewfinder", title: "Scan label photo", subtitle: "Point at the product label — Buddy reads it") {
                    showingCamera = .label
                }
                methodRow(icon: "receipt", title: "Scan receipt photo", subtitle: "Photograph your paper or printed receipt") {
                    showingCamera = .receipt
                }
                methodRow(icon: "pencil", title: "Enter manually", subtitle: "Type in the details yourself") {
                    draft = ProductDraft()
                }
            }
            if isExtracting {
                HStack { Spacer(); ProgressView("Reading…"); Spacer() }
            }
        }
        .navigationTitle("Add product")
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                Button("Cancel") { dismiss() }
            }
        }
        .fullScreenCover(item: $showingCamera) { kind in
            PhotoCaptureView(
                sourceType: .camera,
                onCapture: { image in
                    showingCamera = nil
                    Task { await extract(kind: kind, image: image) }
                },
                onCancel: { showingCamera = nil }
            )
            .ignoresSafeArea()
        }
    }

    @ViewBuilder
    private func methodRow(icon: String, title: String, subtitle: String, action: @escaping () -> Void) -> some View {
        Button(action: { Haptics.light(); action() }) {
            HStack(spacing: 14) {
                Image(systemName: icon).font(.title2).foregroundStyle(Color.brandTeal).frame(width: 30)
                VStack(alignment: .leading, spacing: 2) {
                    Text(title).font(.brandBody(15, weight: .medium)).foregroundStyle(.primary)
                    Text(subtitle).font(.brandBody(12)).foregroundStyle(.secondary)
                }
            }
            .padding(.vertical, 2)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }

    private func extract(kind: ExtractKind, image: UIImage) async {
        guard let jpeg = image.jpegData(compressionQuality: 0.85) else { return }
        isExtracting = true
        extractError = nil
        do {
            var newDraft = ProductDraft()
            switch kind {
            case .label:
                let result: ExtractedLabel = try await APIClient.extract(kind: .label, imageData: jpeg, mimeType: "image/jpeg")
                newDraft.brand = result.brand ?? ""
                newDraft.modelNumber = result.modelNumber ?? ""
                newDraft.serialNumber = result.serialNumber ?? ""
                newDraft.name = result.brand.map { "\($0) product" } ?? ""
            case .receipt:
                let result: ExtractedReceipt = try await APIClient.extract(kind: .receipt, imageData: jpeg, mimeType: "image/jpeg")
                newDraft.name = result.productName ?? ""
                newDraft.brand = result.brand ?? ""
                newDraft.modelNumber = result.modelNumber ?? ""
                newDraft.retailer = result.retailer ?? ""
                newDraft.purchasePrice = result.price.map { String($0) } ?? ""
                if let dateString = result.purchaseDate {
                    newDraft.purchaseDate = ProductDraft.isoDateFormatter.date(from: dateString)
                }
            case .warranty:
                break
            }
            draft = newDraft
        } catch {
            extractError = error.localizedDescription
        }
        isExtracting = false
    }
}

extension ExtractKind: Identifiable {
    var id: String { rawValue }
}

// Trimmed-down port of success.tsx — checkmark + known-issue banner + Done.
// Skips the web's registration link, document-upload dialog, and
// recall-match banner, which don't have iOS equivalents (recall matching
// only happens via the existing cron job on iOS, not synchronously at save).
private struct AddProductSuccessView: View {
    let name: String
    let knownIssue: KnownIssueRecord?
    let onAddAnother: () -> Void
    let onDone: () -> Void

    var body: some View {
        VStack(spacing: Spacing.lg) {
            VStack(spacing: Spacing.sm) {
                ZStack {
                    Circle().fill(Color.brandTeal.opacity(0.1))
                    Image(systemName: "checkmark.circle.fill").font(.title).foregroundStyle(Color.brandTeal)
                }
                .frame(width: 56, height: 56)
                Text("\(name) saved").font(.brandDisplay(17))
                Text("Added to your vault").font(.brandBody(12)).foregroundStyle(.secondary)
            }
            .padding(.top, Spacing.xl)

            if let knownIssue {
                KnownIssueBanner(record: knownIssue)
                    .padding(.horizontal, Spacing.lg)
            }

            Spacer()

            VStack(spacing: Spacing.sm) {
                Button("Add another product", action: onAddAnother)
                    .buttonStyle(.bordered)
                    .frame(maxWidth: .infinity)
                Button {
                    onDone()
                } label: {
                    Text("Done").bold().frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .tint(.brandNavy)
                .controlSize(.large)
            }
            .padding(.horizontal, Spacing.lg)
            .padding(.bottom, Spacing.lg)
        }
        .navigationTitle("Add product")
        .navigationBarTitleDisplayMode(.inline)
        .navigationBarBackButtonHidden()
    }
}
