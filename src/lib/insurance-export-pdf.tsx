import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

export interface InsuranceExportItem {
  name: string;
  brand: string | null;
  modelNumber: string | null;
  serialNumber: string | null;
  category: string;
  roomLocation: string | null;
  quantity: number;
  purchaseDate: string | null;
  purchasePrice: number | null;
  retailer: string | null;
  hasReceipt: boolean;
  hasWarrantyDocument: boolean;
}

export interface InsuranceExportData {
  generatedAt: Date;
  scopeLabel: string;
  items: InsuranceExportItem[];
}

const DISCLAIMER =
  "This document is a supporting record of registered items and is not a substitute for a police report or fire report, which most insurers require separately.";

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 9, fontFamily: "Helvetica", color: "#1a2332" },
  coverTitle: { fontSize: 20, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  coverSubtitle: { fontSize: 11, color: "#5b6472", marginBottom: 24 },
  coverStatRow: { flexDirection: "row", marginBottom: 10 },
  coverStatLabel: { width: 160, color: "#5b6472" },
  coverStatValue: { fontFamily: "Helvetica-Bold" },
  disclaimerBox: {
    marginTop: 28,
    padding: 12,
    backgroundColor: "#f5f6f8",
    borderRadius: 4,
  },
  disclaimerText: { fontSize: 8.5, lineHeight: 1.5, color: "#5b6472" },
  priceNote: { marginTop: 10, fontSize: 8, color: "#5b6472", lineHeight: 1.4 },
  roomHeading: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    marginTop: 18,
    marginBottom: 8,
    paddingBottom: 4,
    borderBottom: "1pt solid #d8dce2",
  },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: "#1a2332",
    paddingVertical: 5,
    paddingHorizontal: 4,
  },
  tableHeaderCell: { color: "#ffffff", fontFamily: "Helvetica-Bold", fontSize: 8, paddingRight: 4 },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 5,
    paddingHorizontal: 4,
    borderBottom: "0.5pt solid #e4e6ea",
  },
  tableRowAlt: { backgroundColor: "#f9fafb" },
  cell: { fontSize: 8, paddingRight: 4 },
  colName: { width: "22%" },
  colBrandModel: { width: "20%" },
  colSerial: { width: "14%" },
  colQty: { width: "6%", textAlign: "center" },
  colDate: { width: "12%" },
  colPrice: { width: "10%", textAlign: "right" },
  colDocs: { width: "16%" },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 36,
    right: 36,
    fontSize: 7,
    color: "#9aa1ab",
    textAlign: "center",
  },
});

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function formatDateOnly(dateStr: string | null): string {
  if (!dateStr) return "—";
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

function groupByRoom(items: InsuranceExportItem[]): [string, InsuranceExportItem[]][] {
  const groups = new Map<string, InsuranceExportItem[]>();
  for (const item of items) {
    const key = item.roomLocation?.trim() || "Unassigned";
    const existing = groups.get(key);
    if (existing) existing.push(item);
    else groups.set(key, [item]);
  }
  return [...groups.entries()].sort(([a], [b]) => {
    if (a === "Unassigned") return 1;
    if (b === "Unassigned") return -1;
    return a.localeCompare(b);
  });
}

function ItemsTable({ items }: { items: InsuranceExportItem[] }) {
  return (
    <View>
      <View style={styles.tableHeaderRow}>
        <Text style={[styles.tableHeaderCell, styles.colName]}>Item</Text>
        <Text style={[styles.tableHeaderCell, styles.colBrandModel]}>Brand / Model</Text>
        <Text style={[styles.tableHeaderCell, styles.colSerial]}>Serial</Text>
        <Text style={[styles.tableHeaderCell, styles.colQty]}>Qty</Text>
        <Text style={[styles.tableHeaderCell, styles.colDate]}>Purchased</Text>
        <Text style={[styles.tableHeaderCell, styles.colPrice]}>Price</Text>
        <Text style={[styles.tableHeaderCell, styles.colDocs]}>On file</Text>
      </View>
      {items.map((item, i) => (
        <View
          key={`${item.name}-${i}`}
          style={i % 2 === 1 ? [styles.tableRow, styles.tableRowAlt] : styles.tableRow}
        >
          <Text style={[styles.cell, styles.colName]}>{item.name}</Text>
          <Text style={[styles.cell, styles.colBrandModel]}>
            {[item.brand, item.modelNumber].filter(Boolean).join(" / ") || "—"}
          </Text>
          <Text style={[styles.cell, styles.colSerial]}>{item.serialNumber || "—"}</Text>
          <Text style={[styles.cell, styles.colQty]}>{item.quantity}</Text>
          <Text style={[styles.cell, styles.colDate]}>{formatDateOnly(item.purchaseDate)}</Text>
          <Text style={[styles.cell, styles.colPrice]}>
            {item.purchasePrice !== null ? formatMoney(item.purchasePrice) : "—"}
          </Text>
          <Text style={[styles.cell, styles.colDocs]}>
            {[item.hasReceipt ? "Receipt" : null, item.hasWarrantyDocument ? "Warranty" : null]
              .filter(Boolean)
              .join(", ") || "None"}
          </Text>
        </View>
      ))}
    </View>
  );
}

export function InsuranceExportDocument({ data }: { data: InsuranceExportData }) {
  const totalValue = data.items.reduce(
    (sum, item) => sum + (item.purchasePrice ?? 0) * item.quantity,
    0,
  );
  const totalItems = data.items.reduce((sum, item) => sum + item.quantity, 0);
  const groups = groupByRoom(data.items);

  return (
    <Document title={`WarrantyBuddy Insurance Inventory — ${data.scopeLabel}`}>
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.coverTitle}>Insurance-Ready Inventory Export</Text>
        <Text style={styles.coverSubtitle}>WarrantyBuddy · {data.scopeLabel}</Text>

        <View style={styles.coverStatRow}>
          <Text style={styles.coverStatLabel}>Generated</Text>
          <Text style={styles.coverStatValue}>{formatDate(data.generatedAt)}</Text>
        </View>
        <View style={styles.coverStatRow}>
          <Text style={styles.coverStatLabel}>Items included</Text>
          <Text style={styles.coverStatValue}>
            {totalItems} ({data.items.length} product{data.items.length === 1 ? "" : "s"})
          </Text>
        </View>
        <View style={styles.coverStatRow}>
          <Text style={styles.coverStatLabel}>Total combined value</Text>
          <Text style={styles.coverStatValue}>{formatMoney(totalValue)}</Text>
        </View>

        <Text style={styles.priceNote}>
          Listed values are original purchase prices, not current replacement value. Keep prices
          updated for high-value items over time.
        </Text>

        <View style={styles.disclaimerBox}>
          <Text style={styles.disclaimerText}>{DISCLAIMER}</Text>
        </View>
      </Page>

      <Page size="LETTER" style={styles.page}>
        {groups.map(([room, items]) => (
          <View key={room} wrap={false}>
            <Text style={styles.roomHeading}>
              {room} ({items.length})
            </Text>
            <ItemsTable items={items} />
          </View>
        ))}
        <Text style={styles.footer} fixed>
          {DISCLAIMER}
        </Text>
      </Page>
    </Document>
  );
}
