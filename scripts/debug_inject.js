const fs = require("fs");
const text = fs.readFileSync(
  "scripts/skipped_emails/859d03fb-8869-4b50-888b-ad9eea5b5b3b-1779978612166.txt",
  "utf8",
);
const knownLabels = [
  "Status",
  "Transaction Date",
  "Transfer Type",
  "Source of Fund",
  "Source Currency",
  "Beneficiary Account",
  "Transfer Currency",
  "Beneficiary Name",
  "Transfer Amount",
  "Remarks",
  "Reference No.",
  "Reference No",
  "Reference Number",
  "Total Payment",
  "Pay Amount",
  "Amount",
  "Company/Product Name",
  "Name",
  "Admin Fee",
  "BCA Virtual Account No",
];
const labelsPattern = knownLabels
  .map((l) => l.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
  .join("|");
const separated = text.replace(
  new RegExp(`\\s*(?:${labelsPattern})\\s*[:：]`, "gi"),
  (m) => "\n" + m.trim(),
);
console.log("---SEPARATED TEXT---");
console.log(separated.slice(0, 1000));
console.log("---LINES---");
separated
  .split("\n")
  .slice(0, 40)
  .forEach((l, i) => console.log(i, JSON.stringify(l)));
console.log("---MATCHES---");
const re = /^\s*([^:：]+?)\s*[:：]\s*(.*?)\s*$/;
separated.split("\n").forEach((l) => {
  const m = l.match(re);
  if (m) console.log(m[1].trim().toLowerCase(), "=>", m[2].trim());
});
