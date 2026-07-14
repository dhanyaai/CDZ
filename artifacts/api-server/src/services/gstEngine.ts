export interface GstSplit {
  cgst: string;
  sgst: string;
  igst: string;
  taxTotal: string;
}

export function computeGst(
  companyStateCode: string | null | undefined,
  clientStateCode: string | null | undefined,
  taxableAmount: number,
  gstRate: number,
): GstSplit {
  const totalTax = (taxableAmount * gstRate) / 100;
  const intraState =
    companyStateCode &&
    clientStateCode &&
    companyStateCode.toLowerCase() === clientStateCode.toLowerCase();

  if (intraState) {
    const half = totalTax / 2;
    return {
      cgst: half.toFixed(2),
      sgst: half.toFixed(2),
      igst: "0.00",
      taxTotal: totalTax.toFixed(2),
    };
  }

  return {
    cgst: "0.00",
    sgst: "0.00",
    igst: totalTax.toFixed(2),
    taxTotal: totalTax.toFixed(2),
  };
}

const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function words(n: number): string {
  if (n === 0) return "";
  if (n < 20) return ones[n]!;
  if (n < 100) return tens[Math.floor(n / 10)]! + (n % 10 ? " " + ones[n % 10]! : "");
  if (n < 1000) return ones[Math.floor(n / 100)]! + " Hundred" + (n % 100 ? " " + words(n % 100) : "");
  if (n < 100000) return words(Math.floor(n / 1000)) + " Thousand" + (n % 1000 ? " " + words(n % 1000) : "");
  if (n < 10000000) return words(Math.floor(n / 100000)) + " Lakh" + (n % 100000 ? " " + words(n % 100000) : "");
  return words(Math.floor(n / 10000000)) + " Crore" + (n % 10000000 ? " " + words(n % 10000000) : "");
}

export function amountInWords(amount: number): string {
  const rounded = Math.round(amount);
  const rupees = Math.floor(rounded);
  const paise = Math.round((amount - rupees) * 100);
  let result = words(rupees) || "Zero";
  result += " Rupees";
  if (paise > 0) result += " and " + words(paise) + " Paise";
  result += " Only";
  return result;
}
