const crypto = require("crypto");

function normalizeText(rawText) {
  return String(rawText || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();
}

function normalizeAmount(rawValue) {
  if (!rawValue) return null;
  const cleaned = String(rawValue)
    .replace(/[^0-9,.-]/g, "")
    .trim();

  let normalized = cleaned;
  if (normalized.includes(",") && normalized.includes(".")) {
    if (normalized.lastIndexOf(",") < normalized.lastIndexOf(".")) {
      normalized = normalized.replace(/,/g, "");
    } else {
      normalized = normalized.replace(/\./g, "").replace(/,/g, ".");
    }
  } else if (normalized.includes(",")) {
    if (/,[0-9]{1,2}$/.test(normalized)) {
      normalized = normalized.replace(/,/g, ".");
    } else {
      normalized = normalized.replace(/,/g, "");
    }
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseLabeledFields(text) {
  const fields = {};
  for (const line of text.split("\n")) {
    const match = line.match(/^\s*([^:：]+?)\s*[:：]\s*(.*?)\s*$/);
    if (!match) continue;
    fields[match[1].trim().toLowerCase()] = match[2].trim();
  }
  return fields;
}

function getField(fields, names) {
  for (const name of names) {
    const value = fields[name.toLowerCase()];
    if (value) return value;
  }
  return "";
}

function monthNameToNumber(monthName) {
  const normalized = monthName.toLowerCase().replace(/\./g, "");
  const map = {
    jan: 1,
    january: 1,
    feb: 2,
    february: 2,
    mar: 3,
    march: 3,
    apr: 4,
    april: 4,
    may: 5,
    mei: 5,
    jun: 6,
    june: 6,
    jul: 7,
    july: 7,
    aug: 8,
    august: 8,
    sep: 9,
    sept: 9,
    september: 9,
    oct: 10,
    october: 10,
    nov: 11,
    november: 11,
    dec: 12,
    december: 12,
  };
  return map[normalized] || null;
}

function parseDateTime(rawValue) {
  const value = String(rawValue || "").trim();
  if (!value) return null;
  let match = value.match(
    /^(\d{1,2})\s+([A-Za-z\.]+)\s+(\d{4})(?:\s+(\d{1,2}:\d{2}(?::\d{2})?))?$/,
  );
  if (match) {
    const day = match[1].padStart(2, "0");
    const month = monthNameToNumber(match[2]);
    const year = match[3];
    const timePart = match[4] || "00:00:00";
    if (month) {
      const iso = `${year}-${String(month).padStart(2, "0")}-${day}T${timePart}`;
      const parsed = new Date(iso);
      if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
    }
  }

  match = value.match(
    /^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})(?:\s+(\d{1,2}:\d{2}(?::\d{2})?))?$/,
  );
  if (match) {
    const day = match[1].padStart(2, "0");
    const month = match[2].padStart(2, "0");
    const year = match[3].length === 2 ? `20${match[3]}` : match[3];
    const timePart = match[4] || "00:00:00";
    const parsed = new Date(`${year}-${month}-${day}T${timePart}`);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function parseType(fields, text) {
  const transferType = getField(fields, ["transfer type"]);
  const normalized = `${transferType} ${text}`.toLowerCase();
  if (
    normalized.includes("transfer masuk") ||
    normalized.includes("credit") ||
    normalized.includes("kredit") ||
    normalized.includes("masuk")
  )
    return "income";
  return "expense";
}

function parseAmountFromFields(fields) {
  const preferred = [
    fields["total payment"],
    fields["pay amount"],
    fields["amount"],
    fields["transfer amount"],
  ];
  for (const value of preferred) {
    const parsed = normalizeAmount(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function parseReferenceNumber(fields, text) {
  const referenceFromFields =
    fields["reference no."] || fields["reference no"] || "";
  if (referenceFromFields) return referenceFromFields;
  const match = text.match(/Reference No\.?\s*[:\-]\s*(.+)/i);
  return match?.[1]?.trim() || "";
}

function parseBcaEmail(rawText) {
  const text = normalizeText(rawText);
  if (!text) return null;
  // Try parsing structured labeled fields first
  const fields = parseLabeledFields(text);
  let amount = parseAmountFromFields(fields);

  // If labeled-field parsing failed, attempt a cleaned HTML/text fallback
  if (!amount) {
    const cleaned = text
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;|\u00A0/gi, " ")
      .replace(/&amp;/gi, "&");

    // Re-run labeled-field parsing against cleaned text
    const cleanedFields = parseLabeledFields(cleaned);
    amount = parseAmountFromFields(cleanedFields);

    // Heuristic regex fallback: look for currency patterns like "Rp 12.345" or big integers
    if (!amount) {
      const fallbackMatch = cleaned.match(
        /(?:Rp|IDR)?\s*([0-9]{1,3}(?:[.,\s][0-9]{3})+(?:[.,][0-9]{1,2})?|\d{4,})/i,
      );
      if (fallbackMatch) {
        amount = normalizeAmount(fallbackMatch[1]);
      }
    }

    // Last-resort simple numeric match
    if (!amount) {
      const simpleMatch = cleaned.match(
        /([0-9]{1,3}(?:[.,][0-9]{3})+(?:[.,][0-9]{1,2})?|\d{4,})/,
      );
      if (simpleMatch) {
        amount = normalizeAmount(simpleMatch[1]);
      }
    }

    if (amount) {
      try {
        console.warn("parseBcaEmail: fallback amount extracted", amount);
      } catch (err) {}
    }
  }

  // Try to match labeled fields where the numeric value is on the next line
  if (!amount) {
    try {
      const multiLinePatterns = [
        /transfer amount\s*[:：][\s\S]{0,60}?([0-9.,]+)/i,
        /total payment\s*[:：][\s\S]{0,60}?([0-9.,]+)/i,
        /amount\s*[:：][\s\S]{0,60}?([0-9.,]+)/i,
        /pay amount\s*[:：][\s\S]{0,60}?([0-9.,]+)/i,
      ];

      for (const rx of multiLinePatterns) {
        const m = text.match(rx);
        if (m && m[1]) {
          const parsed = normalizeAmount(m[1]);
          if (parsed) {
            amount = parsed;
            try {
              console.warn(
                "parseBcaEmail: extracted amount from multi-line label",
                amount,
              );
            } catch (err) {}
            break;
          }
        }
      }
    } catch (err) {}
  }

  if (!amount) return null;
  const transactionDate =
    parseDateTime(getField(fields, ["transaction date"])) ||
    new Date().toISOString();
  const referenceNo = parseReferenceNumber(fields, text);
  const externalId = referenceNo
    ? `bca:${referenceNo}`
    : crypto.createHash("sha256").update(text).digest("hex");
  const companyProductName = getField(fields, ["company/product name"]);
  const name = getField(fields, ["name"]);

  return {
    amount,
    merchant: companyProductName || name || "BCA transaction",
    type: parseType(fields, text),
    transaction_date: transactionDate,
    external_id: externalId,
    reference_no: referenceNo || null,
    admin_fee: normalizeAmount(getField(fields, ["admin fee"])) || null,
    total_payment: amount,
    company_product_name: companyProductName || null,
    source_of_fund: getField(fields, ["source of fund"]) || null,
    bca_virtual_account_no:
      getField(fields, ["bca virtual account no."]) || null,
  };
}

function parseBcaEmails(rawEmails) {
  return (Array.isArray(rawEmails) ? rawEmails : [])
    .map(parseBcaEmail)
    .filter(Boolean);
}

module.exports = { parseBcaEmail, parseBcaEmails };
