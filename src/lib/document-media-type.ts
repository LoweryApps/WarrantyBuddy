export type DocumentMediaType = "application/pdf" | "image/jpeg" | "image/png" | "image/webp";

export function guessMediaType(fileName: string): DocumentMediaType | null {
  const ext = fileName.toLowerCase().split(".").pop();
  switch (ext) {
    case "pdf":
      return "application/pdf";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    default:
      return null;
  }
}
