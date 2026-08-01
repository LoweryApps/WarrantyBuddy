import Foundation

// Direct port of src/lib/csv.ts's toCsv()/escapeCsvField() + the column
// layout from data-export-section.tsx — keep these in sync.
enum CSVExport {
    private static func escapeField(_ value: String?) -> String {
        let str = value ?? ""
        if str.contains(where: { $0 == "\"" || $0 == "," || $0 == "\n" }) {
            return "\"\(str.replacingOccurrences(of: "\"", with: "\"\""))\""
        }
        return str
    }

    static func generate(from products: [ProductWithWarranties]) -> String {
        let headers = [
            "Product name", "Brand", "Model number", "Serial number", "Category",
            "Purchase date", "Purchase price", "Retailer",
            "Warranty type", "Warranty start", "Warranty end",
        ]
        var lines = [headers.map { escapeField($0) }.joined(separator: ",")]

        for p in products {
            let w = p.primaryWarranty
            let row = [
                p.name, p.brand, p.modelNumber, p.serialNumber, p.category,
                p.purchaseDate, p.purchasePrice.map { String($0) }, p.retailer,
                w?.warrantyType, w?.startDate, w?.endDate,
            ]
            lines.append(row.map { escapeField($0) }.joined(separator: ","))
        }

        return lines.joined(separator: "\r\n")
    }
}
