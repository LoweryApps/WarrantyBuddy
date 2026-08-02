import SwiftUI
import UIKit
import Supabase

// Mirrors documents-tab.tsx + src/lib/supabase/storage.ts's bucket/path
// convention: private "product-documents" bucket, {userId}/{productId}/
// {uuid}-{filename} path (RLS scopes access by the first path segment).
struct DocumentsSection: View {
    let productId: String
    @EnvironmentObject private var session: SessionStore

    @State private var documents: [DocumentRecord] = []
    @State private var isLoading = true
    @State private var showingCamera = false
    @State private var isUploading = false
    @State private var errorMessage: String?
    @State private var viewingURL: URL?

    private static let bucket = "product-documents"

    var body: some View {
        Section {
            if isLoading {
                ProgressView()
            } else if documents.isEmpty {
                Text("No documents yet").font(.brandBody(13)).foregroundStyle(.secondary)
            } else {
                ForEach(documents) { doc in
                    Button {
                        Haptics.light()
                        Task { await view(doc) }
                    } label: {
                        HStack {
                            ZStack {
                                Circle().fill(Color.brandTeal.opacity(0.12))
                                Image(systemName: icon(for: doc.documentType)).foregroundStyle(Color.brandTeal).font(.footnote)
                            }
                            .frame(width: 30, height: 30)
                            VStack(alignment: .leading, spacing: 2) {
                                Text(doc.fileName).font(.brandBody(13, weight: .medium)).foregroundStyle(.primary)
                                Text(doc.documentType).font(.brandBody(11)).foregroundStyle(.secondary)
                            }
                            Spacer()
                        }
                    }
                }
                .onDelete { offsets in
                    Task { await delete(at: offsets) }
                }
            }

            if let errorMessage {
                Text(errorMessage).font(.brandBody(11)).foregroundStyle(Color.brandRed)
            }

            Button {
                showingCamera = true
            } label: {
                if isUploading {
                    ProgressView()
                } else {
                    Label("Add a document", systemImage: "plus.circle")
                }
            }
            .foregroundStyle(Color.brandTeal)
            .disabled(isUploading)
        } header: {
            Label("Documents", systemImage: "doc.on.doc")
        }
        .task { await load() }
        .fullScreenCover(isPresented: $showingCamera) {
            PhotoCaptureView(
                sourceType: .photoLibrary,
                onCapture: { image in
                    showingCamera = false
                    Task { await upload(image) }
                },
                onCancel: { showingCamera = false }
            )
            .ignoresSafeArea()
        }
        .sheet(item: $viewingURL) { url in
            SafariView(url: url)
        }
    }

    private func icon(for type: String) -> String {
        switch type {
        case "Warranty": return "doc.text"
        case "Receipt": return "receipt"
        case "Manual": return "book"
        case "Photo": return "photo"
        default: return "doc"
        }
    }

    private func load() async {
        isLoading = true
        do {
            let result: [DocumentRecord] = try await SupabaseService.client
                .from("documents")
                .select()
                .eq("product_id", value: productId)
                .order("uploaded_at", ascending: false)
                .execute()
                .value
            documents = result
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    private func upload(_ image: UIImage) async {
        guard let userId = session.userId, let jpeg = image.jpegData(compressionQuality: 0.85) else { return }
        isUploading = true
        errorMessage = nil
        do {
            let path = "\(userId)/\(productId)/\(UUID().uuidString)-photo.jpg"
            _ = try await SupabaseService.client.storage.from(Self.bucket)
                .upload(path, data: jpeg, options: FileOptions(contentType: "image/jpeg"))

            try await SupabaseService.client.from("documents").insert(DocumentInsertPayload(
                productId: productId,
                documentType: "Photo",
                fileUrl: path,
                fileName: "photo.jpg",
                fileSizeKb: jpeg.count / 1024
            )).execute()

            Haptics.success()
            await load()
        } catch {
            Haptics.error()
            errorMessage = error.localizedDescription
        }
        isUploading = false
    }

    private func view(_ doc: DocumentRecord) async {
        do {
            let signed = try await SupabaseService.client.storage.from(Self.bucket)
                .createSignedURL(path: doc.fileUrl, expiresIn: 3600)
            viewingURL = signed
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func delete(at offsets: IndexSet) async {
        let toDelete = offsets.map { documents[$0] }
        documents.remove(atOffsets: offsets)
        for doc in toDelete {
            try? await SupabaseService.client.storage.from(Self.bucket).remove(paths: [doc.fileUrl])
            try? await SupabaseService.client.from("documents").delete().eq("id", value: doc.id).execute()
        }
    }
}

extension URL: @retroactive Identifiable {
    public var id: String { absoluteString }
}
