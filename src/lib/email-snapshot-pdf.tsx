import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

// Spec 2.4/3.5 — "the original email is attached as the receipt document on
// file" for every forwarded email, not just ones with a literal attachment.
// Most order confirmations are HTML-body-only with nothing attached, so
// this renders a snapshot of the email into a PDF to store instead — PDF
// rather than HTML because the storage bucket's allowed_mime_types only
// permits images and application/pdf (no text/html), and it's consistent
// with how every other document in the app is stored and viewed.
const MAX_BODY_CHARS = 8000;

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#1a2332" },
  subject: { fontSize: 14, fontFamily: "Helvetica-Bold", marginBottom: 14 },
  metaRow: { flexDirection: "row", marginBottom: 3 },
  metaLabel: { width: 64, color: "#5b6472" },
  metaValue: { flex: 1 },
  divider: { marginTop: 12, marginBottom: 14, borderBottom: "1pt solid #d8dce2" },
  body: { fontSize: 9.5, lineHeight: 1.5 },
});

export function EmailSnapshotDocument({
  subject,
  from,
  receivedAt,
  bodyText,
}: {
  subject: string;
  from: string;
  receivedAt: Date;
  bodyText: string;
}) {
  const truncated = bodyText.length > MAX_BODY_CHARS;
  const shownBody = bodyText.slice(0, MAX_BODY_CHARS) + (truncated ? "\n\n[…email truncated…]" : "");

  return (
    <Document title={subject || "Forwarded email"}>
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.subject}>{subject || "(no subject)"}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>From</Text>
          <Text style={styles.metaValue}>{from || "unknown sender"}</Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Received</Text>
          <Text style={styles.metaValue}>
            {receivedAt.toLocaleString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </Text>
        </View>
        <View style={styles.divider} />
        <Text style={styles.body}>{shownBody || "(empty email body)"}</Text>
      </Page>
    </Document>
  );
}
