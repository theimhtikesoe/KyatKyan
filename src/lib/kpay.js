const MYANMAR_DIGITS = {
  "၀": "0",
  "၁": "1",
  "၂": "2",
  "၃": "3",
  "၄": "4",
  "၅": "5",
  "၆": "6",
  "၇": "7",
  "၈": "8",
  "၉": "9",
};

export function normalizeDigits(value = "") {
  return String(value).replace(/[၀-၉]/g, (digit) => MYANMAR_DIGITS[digit] ?? digit);
}

export function extractKpayAmount(text = "") {
  const normalized = normalizeDigits(text);
  const candidates = normalized.match(/\d[\d,]*(?:\.\d+)?/g) || [];

  if (!candidates.length) {
    return 0;
  }

  const amounts = candidates
    .map((candidate) => Number(candidate.replace(/,/g, "")))
    .filter((amount) => Number.isFinite(amount) && amount > 0);

  return amounts.length ? Math.round(amounts[0]) : 0;
}

export function buildKpayRawText(title = "", text = "") {
  return [title, text].filter(Boolean).join("\n").trim();
}
