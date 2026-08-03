import SwiftUI
import Supabase
import UniformTypeIdentifiers

// Native port of warranty-form.tsx + warranty-tab.tsx's empty-state choice
// row: search for terms online, upload a document (AI-extracted), or enter
// manually — then a shared field set for all three paths. Presented as a
// sheet from ProductDetailView, matching ProductFormView/ClaimAssistView.
struct WarrantyEditView: View {
    let productId: String
    let productBrand: String?
    let purchaseDate: String?
    let existing: Warranty?
    var onSaved: () -> Void

    @EnvironmentObject private var session: SessionStore
    @Environment(\.dismiss) private var dismiss

    @State private var warrantyType: String
    @State private var hasStartDate: Bool
    @State private var startDate: Date
    @State private var hasEndDate: Bool
    @State private var endDate: Date
    @State private var coverage: String
    @State private var exclusions: String
    @State private var claimContact: String
    @State private var documentUrl: String?

    @State private var showManualFields: Bool
    @State private var sourceNote: String?
    @State private var aiFilledFields: Set<String> = []
    @State private var uncertainFields: Set<String> = []

    @State private var isSearching = false
    @State private var searchNotice: String?
    @State private var isUploading = false
    @State private var uploadNotice: String?
    @State private var isSaving = false
    @State private var saveError: String?
    @State private var showingFileImporter = false

    private static let warrantyTypes = ["Manufacturer", "Extended", "Retailer"]

    init(productId: String, productBrand: String?, purchaseDate: String?, existing: Warranty?, onSaved: @escaping () -> Void) {
        self.productId = productId
        self.productBrand = productBrand
        self.purchaseDate = purchaseDate
        self.existing = existing
        self.onSaved = onSaved

        _warrantyType = State(initialValue: existing?.warrantyType ?? "Manufacturer")
        let startDateValue = WarrantyStatus.parseDateOnly(existing?.startDate ?? "")
        _hasStartDate = State(initialValue: startDateValue != nil)
        _startDate = State(initialValue: startDateValue ?? Date())
        let endDateValue = WarrantyStatus.parseDateOnly(existing?.endDate ?? "")
        _hasEndDate = State(initialValue: endDateValue != nil)
        _endDate = State(initialValue: endDateValue ?? Date())
        _coverage = State(initialValue: existing?.coverageDescription ?? "")
        _exclusions = State(initialValue: existing?.exclusions ?? "")
        _claimContact = State(initialValue: existing?.claimContact ?? "")
        _documentUrl = State(initialValue: existing?.documentUrl)
        _showManualFields = State(initialValue: existing != nil)
    }

    var body: some View {
        NavigationStack {
            Form {
                if let saveError {
                    ErrorBanner(message: saveError)
                }

                if existing == nil && !showManualFields {
                    Section {
                        Button {
                            Task { await search() }
                        } label: {
                            HStack {
                                VStack(alignment: .leading, spacing: 2) {
                                    Label(isSearching ? "Buddy is searching…" : "Search for warranty terms", systemImage: "sparkles")
                                        .font(.brandBody(13, weight: .medium))
                                    Text("Buddy looks up this manufacturer's standard warranty online")
                                        .font(.brandBody(11)).foregroundStyle(.secondary)
                                }
                                Spacer()
                                if !isSearching {
                                    Image(systemName: "arrow.right").foregroundStyle(Color.brandTeal)
                                }
                            }
                        }
                        .disabled(isSearching)
                        .foregroundStyle(.primary)

                        if let searchNotice {
                            Text(searchNotice).font(.brandBody(11)).foregroundStyle(Color.brandAmber)
                        }

                        Button {
                            showingFileImporter = true
                        } label: {
                            HStack {
                                VStack(alignment: .leading, spacing: 2) {
                                    Label(isUploading ? "Buddy is reading your document…" : "Upload a document", systemImage: "arrow.up.doc")
                                        .font(.brandBody(13, weight: .medium))
                                    Text("PDF or photo — Buddy fills in what it can read")
                                        .font(.brandBody(11)).foregroundStyle(.secondary)
                                }
                                Spacer()
                                if !isUploading {
                                    Image(systemName: "arrow.right").foregroundStyle(Color.brandInk)
                                }
                            }
                        }
                        .disabled(isUploading)
                        .foregroundStyle(.primary)

                        if let uploadNotice {
                            Text(uploadNotice).font(.brandBody(11)).foregroundStyle(Color.brandAmber)
                        }

                        Button {
                            withAnimation { showManualFields = true }
                        } label: {
                            Label("Enter details manually", systemImage: "pencil")
                                .font(.brandBody(13, weight: .medium))
                        }
                        .foregroundStyle(.primary)
                    } header: {
                        Label("No warranty on file yet", systemImage: "shield")
                    }
                }

                if showManualFields {
                    if let sourceNote {
                        Section {
                            Label(sourceNote, systemImage: "sparkles")
                                .font(.brandBody(11))
                                .foregroundStyle(Color.brandTeal)
                        }
                    }

                    Section {
                        Picker("Warranty type", selection: $warrantyType) {
                            ForEach(Self.warrantyTypes, id: \.self) { Text($0) }
                        }

                        Toggle("Has a start date", isOn: Binding(
                            get: { hasStartDate },
                            set: { newValue in withAnimation { hasStartDate = newValue } }
                        ))
                        if hasStartDate {
                            DatePicker("Start date", selection: $startDate, displayedComponents: .date)
                        }
                        fieldBadges(for: "start_date")

                        Toggle("Has an end date", isOn: Binding(
                            get: { hasEndDate },
                            set: { newValue in withAnimation { hasEndDate = newValue } }
                        ))
                        if hasEndDate {
                            DatePicker("End date", selection: $endDate, displayedComponents: .date)
                        }
                        fieldBadges(for: "end_date")

                        HStack(spacing: Spacing.sm) {
                            Text("Quick set end date:").font(.brandBody(11)).foregroundStyle(.secondary)
                            ForEach([1, 2, 3], id: \.self) { years in
                                Button("\(years)y") { applyDuration(years: years) }
                                    .font(.brandBody(11, weight: .medium))
                                    .buttonStyle(.bordered)
                                    .controlSize(.small)
                            }
                        }
                    } header: {
                        Label("Warranty details", systemImage: "checkmark.shield")
                    }

                    Section {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("What's covered").font(.brandBody(11)).foregroundStyle(.secondary)
                            fieldBadges(for: "coverage_description")
                            TextField("Parts and labor for manufacturing defects…", text: $coverage, axis: .vertical)
                                .lineLimit(3...6)
                        }
                        VStack(alignment: .leading, spacing: 4) {
                            Text("What's not covered").font(.brandBody(11)).foregroundStyle(.secondary)
                            fieldBadges(for: "exclusions")
                            TextField("Cosmetic damage, improper installation…", text: $exclusions, axis: .vertical)
                                .lineLimit(3...6)
                        }
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Claim contact").font(.brandBody(11)).foregroundStyle(.secondary)
                            fieldBadges(for: "claim_contact")
                            TextField("Phone number, website, or email", text: $claimContact)
                        }
                    } header: {
                        Label("Coverage", systemImage: "doc.text")
                    }
                }
            }
            .tint(.brandTeal)
            .navigationTitle(existing == nil ? "Add warranty" : "Edit warranty")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    if isSaving {
                        ProgressView()
                    } else if showManualFields {
                        Button("Save") { Task { await save() } }
                            .fontWeight(.semibold)
                    }
                }
            }
            .fileImporter(isPresented: $showingFileImporter, allowedContentTypes: [.pdf, .image]) { result in
                Task { await handleFileImport(result) }
            }
        }
    }

    @ViewBuilder
    private func fieldBadges(for field: String) -> some View {
        if uncertainFields.contains(field) {
            Label("check this", systemImage: "exclamationmark.triangle")
                .font(.brandBody(9, weight: .medium))
                .foregroundStyle(Color.brandAmber)
        } else if aiFilledFields.contains(field) {
            Label("Buddy", systemImage: "sparkles")
                .font(.brandBody(9, weight: .medium))
                .foregroundStyle(Color.brandTeal)
        }
    }

    private func applyDuration(years: Int) {
        let base: Date
        if hasStartDate {
            base = startDate
        } else if let purchaseDate, let parsed = WarrantyStatus.parseDateOnly(purchaseDate) {
            base = parsed
            startDate = parsed
            hasStartDate = true
        } else {
            base = Date()
        }
        endDate = Calendar.current.date(byAdding: .year, value: years, to: base) ?? base
        hasEndDate = true
    }

    private func search() async {
        isSearching = true
        searchNotice = nil
        do {
            let result = try await APIClient.searchWarranty(productId: productId)
            guard result.found else {
                searchNotice = result.reason ?? "Buddy couldn't find reliable warranty terms for this product online."
                isSearching = false
                return
            }
            warrantyType = ["Manufacturer", "Extended", "Retailer"].contains(result.warrantyType ?? "") ? result.warrantyType! : "Manufacturer"
            if let purchaseDate, let parsed = WarrantyStatus.parseDateOnly(purchaseDate) {
                startDate = parsed
                hasStartDate = true
            }
            if let months = result.durationMonths, hasStartDate {
                endDate = Calendar.current.date(byAdding: .month, value: months, to: startDate) ?? startDate
                hasEndDate = true
            }
            coverage = result.coverageDescription ?? ""
            exclusions = result.exclusions ?? ""
            claimContact = result.claimContact ?? ""
            sourceNote = result.sourceNote
            aiFilledFields = Set(["start_date", "end_date", "coverage_description", "exclusions", "claim_contact"].filter { field in
                switch field {
                case "start_date": return hasStartDate
                case "end_date": return hasEndDate
                case "coverage_description": return !coverage.isEmpty
                case "exclusions": return !exclusions.isEmpty
                case "claim_contact": return !claimContact.isEmpty
                default: return false
                }
            })
            withAnimation { showManualFields = true }
            Haptics.success()
        } catch {
            searchNotice = error.localizedDescription
            Haptics.error()
        }
        isSearching = false
    }

    private func handleFileImport(_ result: Result<URL, Error>) async {
        guard let userId = session.userId else { return }
        guard case .success(let url) = result else { return }
        guard url.startAccessingSecurityScopedResource() else { return }
        defer { url.stopAccessingSecurityScopedResource() }
        guard let data = try? Data(contentsOf: url) else { return }

        isUploading = true
        uploadNotice = nil
        uncertainFields = []
        aiFilledFields = []

        let isPDF = url.pathExtension.lowercased() == "pdf"
        let mimeType = isPDF ? "application/pdf" : mimeType(forExtension: url.pathExtension)

        do {
            let path = "\(userId)/\(productId)/\(UUID().uuidString)-\(url.lastPathComponent)"
            _ = try await SupabaseService.client.storage.from("product-documents")
                .upload(path, data: data, options: FileOptions(contentType: mimeType))
            try await SupabaseService.client.from("documents").insert(DocumentInsertPayload(
                productId: productId,
                documentType: "Warranty",
                fileUrl: path,
                fileName: url.lastPathComponent,
                fileSizeKb: data.count / 1024
            )).execute()
            documentUrl = path
            withAnimation { showManualFields = true }
        } catch {
            isUploading = false
            uploadNotice = error.localizedDescription
            return
        }

        do {
            let extracted: ExtractedWarranty = try await APIClient.extract(kind: .warranty, imageData: data, mimeType: mimeType)
            var filled = Set<String>()
            if let startDateString = extracted.startDate, let parsed = WarrantyStatus.parseDateOnly(startDateString) {
                startDate = parsed; hasStartDate = true; filled.insert("start_date")
            }
            if let endDateString = extracted.endDate, let parsed = WarrantyStatus.parseDateOnly(endDateString) {
                endDate = parsed; hasEndDate = true; filled.insert("end_date")
            }
            if let value = extracted.coverageDescription, !value.isEmpty { coverage = value; filled.insert("coverage_description") }
            if let value = extracted.exclusions, !value.isEmpty { exclusions = value; filled.insert("exclusions") }
            if let value = extracted.claimContact, !value.isEmpty { claimContact = value; filled.insert("claim_contact") }
            aiFilledFields = filled
            uncertainFields = Set(extracted.uncertain)
            if filled.isEmpty {
                uploadNotice = "Document saved, but Buddy couldn't find warranty terms in it — fill in the fields below."
            }
            Haptics.success()
        } catch {
            uploadNotice = "Document saved, but Buddy couldn't read it automatically — fill in the fields below."
        }
        isUploading = false
    }

    private func mimeType(forExtension ext: String) -> String {
        switch ext.lowercased() {
        case "png": return "image/png"
        case "heic": return "image/heic"
        case "webp": return "image/webp"
        default: return "image/jpeg"
        }
    }

    private func save() async {
        isSaving = true
        saveError = nil
        do {
            let payload = WarrantyUpsertPayload(
                productId: productId,
                warrantyType: warrantyType,
                startDate: hasStartDate ? Self.dateOnlyString(startDate) : nil,
                endDate: hasEndDate ? Self.dateOnlyString(endDate) : nil,
                coverageDescription: coverage.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? nil : coverage,
                exclusions: exclusions.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? nil : exclusions,
                claimContact: claimContact.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? nil : claimContact,
                documentUrl: documentUrl,
                warrantySource: documentUrl != nil ? "Uploaded" : (sourceNote != nil ? "AI-Suggested" : "User-Entered")
            )
            if let existing {
                try await SupabaseService.client.from("warranties").update(payload).eq("id", value: existing.id).execute()
            } else {
                try await SupabaseService.client.from("warranties").insert(payload).execute()
            }
            Haptics.success()
            onSaved()
            dismiss()
        } catch {
            Haptics.error()
            saveError = error.localizedDescription
        }
        isSaving = false
    }

    private static func dateOnlyString(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.string(from: date)
    }
}
