// src/mockData.js
// Synthetic data for GEZT prototype — ShreeTech Electronics
// GSTIN: 29MOCK1234F1Z5

export const BUSINESS = {
  name: "ShreeTech Electronics",
  gstin: "29MOCK1234F1Z5",
  state: "Karnataka",
  stateCode: "29",
  tradeName: "ShreeTech Electronics Pvt. Ltd.",
  address: "42, Brigade Road, Bengaluru – 560001, Karnataka",
  pan: "MOCK1234F",
  email: "accounts@shreetech-demo.example",
  phone: "+91 80 2222 3333",
  constitution: "Private Limited Company",
  registrationDate: "12 July 2019",
};

export const RETURN_PERIOD = {
  month: "September",
  year: 2026,
  fy: "2026–27",
  label: "September 2026",
  code: "092026",
  dueDate: "11 October 2026",
};

export const FY_PERIODS_DATA = {
  "2026–27": [
    { id: "jul-2026", shortMonth: "Jul", month: "July", year: 2026, status: "filed", label: "July 2026", gstr1Status: "filed", gstr1Date: "10 Aug 2026", gstr1Arn: "AA2907260012341", gstr3bStatus: "filed", gstr3bDate: "18 Aug 2026", gstr3bArn: "AB2907260098762" },
    { id: "aug-2026", shortMonth: "Aug", month: "August", year: 2026, status: "filed", label: "August 2026", gstr1Status: "filed", gstr1Date: "11 Sep 2026", gstr1Arn: "AA2908260056783", gstr3bStatus: "filed", gstr3bDate: "20 Sep 2026", gstr3bArn: "AB2908260043214" },
    { id: "sep-2026", shortMonth: "Sep", month: "September", year: 2026, status: "current", label: "September 2026", isCurrent: true, gstr1Status: "in-progress", gstr1DueDate: "11 October 2026", gstr3bStatus: "coming-soon", gstr3bDueDate: "20 October 2026", gstr1aStatus: "coming-soon" },
    { id: "oct-2026", shortMonth: "Oct", month: "October", year: 2026, status: "upcoming", label: "October 2026", gstr1Status: "upcoming", gstr1DueDate: "11 November 2026", gstr3bStatus: "upcoming", gstr3bDueDate: "20 November 2026" },
    { id: "nov-2026", shortMonth: "Nov", month: "November", year: 2026, status: "upcoming", label: "November 2026", gstr1Status: "upcoming", gstr1DueDate: "11 December 2026", gstr3bStatus: "upcoming", gstr3bDueDate: "20 December 2026" },
    { id: "dec-2026", shortMonth: "Dec", month: "December", year: 2026, status: "upcoming", label: "December 2026", gstr1Status: "upcoming", gstr1DueDate: "11 January 2027", gstr3bStatus: "upcoming", gstr3bDueDate: "20 January 2027" },
    { id: "jan-2027", shortMonth: "Jan", month: "January", year: 2027, status: "upcoming", label: "January 2027", gstr1Status: "upcoming", gstr1DueDate: "11 February 2027", gstr3bStatus: "upcoming", gstr3bDueDate: "20 February 2027" },
    { id: "feb-2027", shortMonth: "Feb", month: "February", year: 2027, status: "upcoming", label: "February 2027", gstr1Status: "upcoming", gstr1DueDate: "11 March 2027", gstr3bStatus: "upcoming", gstr3bDueDate: "20 March 2027" },
    { id: "mar-2027", shortMonth: "Mar", month: "March", year: 2027, status: "upcoming", label: "March 2027", gstr1Status: "upcoming", gstr1DueDate: "11 April 2027", gstr3bStatus: "upcoming", gstr3bDueDate: "20 April 2027" },
  ],
  "2025–26": [
    { id: "mar-2026", shortMonth: "Mar", month: "March", year: 2026, status: "filed", label: "March 2026", gstr1Status: "filed", gstr1Date: "10 Apr 2026", gstr1Arn: "AA2903260011111", gstr3bStatus: "filed", gstr3bDate: "19 Apr 2026", gstr3bArn: "AB2903260022222" },
    { id: "feb-2026", shortMonth: "Feb", month: "February", year: 2026, status: "filed", label: "February 2026", gstr1Status: "filed", gstr1Date: "11 Mar 2026", gstr1Arn: "AA2902260033333", gstr3bStatus: "filed", gstr3bDate: "20 Mar 2026", gstr3bArn: "AB2902260044444" },
    { id: "jan-2026", shortMonth: "Jan", month: "January", year: 2026, status: "filed", label: "January 2026", gstr1Status: "filed", gstr1Date: "10 Feb 2026", gstr1Arn: "AA2901260055555", gstr3bStatus: "filed", gstr3bDate: "18 Feb 2026", gstr3bArn: "AB2901260066666" },
    { id: "dec-2025", shortMonth: "Dec", month: "December", year: 2025, status: "filed", label: "December 2025", gstr1Status: "filed", gstr1Date: "11 Jan 2026", gstr1Arn: "AA2912250077777", gstr3bStatus: "filed", gstr3bDate: "20 Jan 2026", gstr3bArn: "AB2912250088888" },
    { id: "nov-2025", shortMonth: "Nov", month: "November", year: 2025, status: "filed", label: "November 2025", gstr1Status: "filed", gstr1Date: "10 Dec 2025", gstr1Arn: "AA2911250099999", gstr3bStatus: "filed", gstr3bDate: "19 Dec 2025", gstr3bArn: "AB2911250000000" },
    { id: "oct-2025", shortMonth: "Oct", month: "October", year: 2025, status: "filed", label: "October 2025", gstr1Status: "filed", gstr1Date: "11 Nov 2025", gstr1Arn: "AA2910250012121", gstr3bStatus: "filed", gstr3bDate: "20 Nov 2025", gstr3bArn: "AB2910250023232" },
    { id: "sep-2025", shortMonth: "Sep", month: "September", year: 2025, status: "filed", label: "September 2025", gstr1Status: "filed", gstr1Date: "10 Oct 2025", gstr1Arn: "AA2909250034343", gstr3bStatus: "filed", gstr3bDate: "19 Oct 2025", gstr3bArn: "AB2909250045454" },
    { id: "aug-2025", shortMonth: "Aug", month: "August", year: 2025, status: "filed", label: "August 2025", gstr1Status: "filed", gstr1Date: "11 Sep 2025", gstr1Arn: "AA2908250056565", gstr3bStatus: "filed", gstr3bDate: "20 Sep 2025", gstr3bArn: "AB2908250067676" },
    { id: "jul-2025", shortMonth: "Jul", month: "July", year: 2025, status: "filed", label: "July 2025", gstr1Status: "filed", gstr1Date: "10 Aug 2025", gstr1Arn: "AA2907250078787", gstr3bStatus: "filed", gstr3bDate: "19 Aug 2025", gstr3bArn: "AB2907250089898" },
    { id: "jun-2025", shortMonth: "Jun", month: "June", year: 2025, status: "filed", label: "June 2025", gstr1Status: "filed", gstr1Date: "11 Jul 2025", gstr1Arn: "AA2906250090909", gstr3bStatus: "filed", gstr3bDate: "20 Jul 2025", gstr3bArn: "AB2906250001010" },
    { id: "may-2025", shortMonth: "May", month: "May", year: 2025, status: "filed", label: "May 2025", gstr1Status: "filed", gstr1Date: "10 Jun 2025", gstr1Arn: "AA2905250011223", gstr3bStatus: "filed", gstr3bDate: "19 Jun 2025", gstr3bArn: "AB2905250033445" },
    { id: "apr-2025", shortMonth: "Apr", month: "April", year: 2025, status: "filed", label: "April 2025", gstr1Status: "filed", gstr1Date: "11 May 2025", gstr1Arn: "AA2904250055667", gstr3bStatus: "filed", gstr3bDate: "20 May 2025", gstr3bArn: "AB2904250077889" },
  ],
};

export const PLACES_OF_SUPPLY = [
  { code: "01", name: "Jammu and Kashmir" },
  { code: "02", name: "Himachal Pradesh" },
  { code: "03", name: "Punjab" },
  { code: "04", name: "Chandigarh" },
  { code: "05", name: "Uttarakhand" },
  { code: "06", name: "Haryana" },
  { code: "07", name: "Delhi" },
  { code: "08", name: "Rajasthan" },
  { code: "09", name: "Uttar Pradesh" },
  { code: "10", name: "Bihar" },
  { code: "19", name: "West Bengal" },
  { code: "21", name: "Odisha" },
  { code: "23", name: "Madhya Pradesh" },
  { code: "24", name: "Gujarat" },
  { code: "27", name: "Maharashtra" },
  { code: "29", name: "Karnataka" },
  { code: "30", name: "Goa" },
  { code: "32", name: "Kerala" },
  { code: "33", name: "Tamil Nadu" },
  { code: "36", name: "Telangana" },
  { code: "37", name: "Andhra Pradesh" },
];

export const INITIAL_B2B_INVOICES = [
  { id: "b2b-1",  invoiceNo: "INV-1042", invoiceDate: "2026-09-03", recipientGstin: "27AAABM1234C1ZK", recipientName: "ABC Technologies Pvt. Ltd.",       pos: "27", posName: "Maharashtra", invoiceValue: 59000,  taxableValue: 50000,  gstRate: 18, igst: 9000,  cgst: 0,    sgst: 0,    cess: 0, hsn: "8471", status: "processed", reverseCharge: "N" },
  { id: "b2b-2",  invoiceNo: "INV-1043", invoiceDate: "2026-09-05", recipientGstin: "07QABCD1234E1ZP", recipientName: "Quantum Devices Pvt. Ltd.",         pos: "07", posName: "Delhi",       invoiceValue: 88500,  taxableValue: 75000,  gstRate: 18, igst: 13500, cgst: 0,    sgst: 0,    cess: 0, hsn: "8517", status: "processed", reverseCharge: "N" },
  { id: "b2b-3",  invoiceNo: "INV-1044", invoiceDate: "2026-09-07", recipientGstin: "29TECHS1234F1ZK", recipientName: "TechStore Karnataka Pvt. Ltd.",     pos: "29", posName: "Karnataka",  invoiceValue: 35400,  taxableValue: 30000,  gstRate: 18, igst: 0,     cgst: 2700, sgst: 2700, cess: 0, hsn: "8471", status: "processed", reverseCharge: "N" },
  { id: "b2b-4",  invoiceNo: "INV-1045", invoiceDate: "2026-09-09", recipientGstin: "33MERID1234G1ZL", recipientName: "Meridian Corp (India) Ltd.",        pos: "33", posName: "Tamil Nadu", invoiceValue: 141600, taxableValue: 120000, gstRate: 18, igst: 21600, cgst: 0,    sgst: 0,    cess: 0, hsn: "8542", status: "processed", reverseCharge: "N" },
  { id: "b2b-5",  invoiceNo: "INV-1046", invoiceDate: "2026-09-10", recipientGstin: "36NEXUS1234H1ZM", recipientName: "Nexus Solutions Ltd.",               pos: "36", posName: "Telangana",  invoiceValue: 50400,  taxableValue: 45000,  gstRate: 12, igst: 5400,  cgst: 0,    sgst: 0,    cess: 0, hsn: "8517", status: "processed", reverseCharge: "N" },
  { id: "b2b-6",  invoiceNo: "INV-1047", invoiceDate: "2026-09-12", recipientGstin: "29BRIGH1234I1ZN", recipientName: "BrightPath Technologies Ltd.",      pos: "29", posName: "Karnataka",  invoiceValue: 70800,  taxableValue: 60000,  gstRate: 18, igst: 0,     cgst: 5400, sgst: 5400, cess: 0, hsn: "8471", status: "processed", reverseCharge: "N" },
  { id: "b2b-7",  invoiceNo: "INV-1048", invoiceDate: "2026-09-13", recipientGstin: "27SKYLN1234J1ZO", recipientName: "Skylark Enterprises Pvt. Ltd.",     pos: "27", posName: "Maharashtra", invoiceValue: 26250,  taxableValue: 25000,  gstRate: 5,  igst: 1250,  cgst: 0,    sgst: 0,    cess: 0, hsn: "8473", status: "processed", reverseCharge: "N" },
  { id: "b2b-8",  invoiceNo: "INV-1049", invoiceDate: "2026-09-15", recipientGstin: "07DATAS1234K1ZP", recipientName: "DataSync Systems Pvt. Ltd.",        pos: "07", posName: "Delhi",       invoiceValue: 100300, taxableValue: 85000,  gstRate: 18, igst: 15300, cgst: 0,    sgst: 0,    cess: 0, hsn: "8542", status: "processed", reverseCharge: "N" },
  { id: "b2b-9",  invoiceNo: "INV-1050", invoiceDate: "2026-09-16", recipientGstin: "29CORTS1234L1ZQ", recipientName: "CoreTech Solutions Pvt. Ltd.",      pos: "29", posName: "Karnataka",  invoiceValue: 47200,  taxableValue: 40000,  gstRate: 18, igst: 0,     cgst: 3600, sgst: 3600, cess: 0, hsn: "8471", status: "processed", reverseCharge: "N" },
  { id: "b2b-10", invoiceNo: "INV-1051", invoiceDate: "2026-09-18", recipientGstin: "33INFOM1234M1ZR", recipientName: "InfoMatrix Systems Ltd.",            pos: "33", posName: "Tamil Nadu", invoiceValue: 61600,  taxableValue: 55000,  gstRate: 12, igst: 6600,  cgst: 0,    sgst: 0,    cess: 0, hsn: "8517", status: "processed", reverseCharge: "N" },
  { id: "b2b-11", invoiceNo: "INV-1052", invoiceDate: "2026-09-20", recipientGstin: "27VELOC1234N1ZS", recipientName: "Velocity Ventures Pvt. Ltd.",       pos: "27", posName: "Maharashtra", invoiceValue: 82600,  taxableValue: 70000,  gstRate: 18, igst: 12600, cgst: 0,    sgst: 0,    cess: 0, hsn: "8471", status: "processed", reverseCharge: "N" },
  { id: "b2b-12", invoiceNo: "INV-1053", invoiceDate: "2026-09-22", recipientGstin: "36PRECI1234O1ZT", recipientName: "Precision Labs Pvt. Ltd.",           pos: "36", posName: "Telangana",  invoiceValue: 44800,  taxableValue: 35000,  gstRate: 28, igst: 9800,  cgst: 0,    sgst: 0,    cess: 0, hsn: "8542", status: "processed", reverseCharge: "N" },
];

export const INITIAL_B2C_INVOICES = [
  { id: "b2c-1",  invoiceNo: "B2C-501", invoiceDate: "2026-09-02", pos: "29", posName: "Karnataka",  taxableValue: 5000,  gstRate: 18, igst: 0,    cgst: 450, sgst: 450, cess: 0, type: "intrastate", status: "processed" },
  { id: "b2c-2",  invoiceNo: "B2C-502", invoiceDate: "2026-09-04", pos: "29", posName: "Karnataka",  taxableValue: 8500,  gstRate: 18, igst: 0,    cgst: 765, sgst: 765, cess: 0, type: "intrastate", status: "processed" },
  { id: "b2c-3",  invoiceNo: "B2C-503", invoiceDate: "2026-09-06", pos: "27", posName: "Maharashtra",taxableValue: 12000, gstRate: 18, igst: 2160, cgst: 0,   sgst: 0,   cess: 0, type: "interstate",  status: "processed" },
  { id: "b2c-4",  invoiceNo: "B2C-504", invoiceDate: "2026-09-08", pos: "29", posName: "Karnataka",  taxableValue: 3500,  gstRate: 12, igst: 0,    cgst: 210, sgst: 210, cess: 0, type: "intrastate", status: "processed" },
  { id: "b2c-5",  invoiceNo: "B2C-505", invoiceDate: "2026-09-11", pos: "29", posName: "Karnataka",  taxableValue: 7200,  gstRate: 18, igst: 0,    cgst: 648, sgst: 648, cess: 0, type: "intrastate", status: "processed" },
  { id: "b2c-6",  invoiceNo: "B2C-506", invoiceDate: "2026-09-13", pos: "33", posName: "Tamil Nadu", taxableValue: 15000, gstRate: 18, igst: 2700, cgst: 0,   sgst: 0,   cess: 0, type: "interstate",  status: "processed" },
  { id: "b2c-7",  invoiceNo: "B2C-507", invoiceDate: "2026-09-16", pos: "29", posName: "Karnataka",  taxableValue: 9800,  gstRate: 18, igst: 0,    cgst: 882, sgst: 882, cess: 0, type: "intrastate", status: "processed" },
  { id: "b2c-8",  invoiceNo: "B2C-508", invoiceDate: "2026-09-17", pos: "29", posName: "Karnataka",  taxableValue: 4000,  gstRate: 5,  igst: 0,    cgst: 100, sgst: 100, cess: 0, type: "intrastate", status: "processed" },
  { id: "b2c-9",  invoiceNo: "B2C-509", invoiceDate: "2026-09-19", pos: "07", posName: "Delhi",      taxableValue: 11000, gstRate: 18, igst: 1980, cgst: 0,   sgst: 0,   cess: 0, type: "interstate",  status: "processed" },
  { id: "b2c-10", invoiceNo: "B2C-510", invoiceDate: "2026-09-21", pos: "29", posName: "Karnataka",  taxableValue: 6200,  gstRate: 28, igst: 0,    cgst: 868, sgst: 868, cess: 0, type: "intrastate", status: "processed" },
];

export const INITIAL_EXPORTS = [
  { id: "exp-1", invoiceNo: "EXP-1001", invoiceDate: "2026-09-08", shippingBillNo: "SB-2026-08145", shippingBillDate: "2026-09-09", port: "INMAA4", portName: "Chennai Sea Port",  country: "United Arab Emirates", currencyCode: "USD", foreignCurrencyValue: 2000, invoiceValue: 166000, taxableValue: 166000, gstRate: 0, igst: 0, exportType: "WOPT", status: "processed" },
  { id: "exp-2", invoiceNo: "EXP-1002", invoiceDate: "2026-09-18", shippingBillNo: "SB-2026-08367", shippingBillDate: "2026-09-19", port: "INBOM4", portName: "Mumbai Sea Port",    country: "Singapore",           currencyCode: "USD", foreignCurrencyValue: 800,  invoiceValue: 66400,  taxableValue: 66400,  gstRate: 0, igst: 0, exportType: "WOPT", status: "processed" },
];

export const INITIAL_CREDIT_NOTES = [
  { id: "cdn-1", noteNo: "CDN-101", noteDate: "2026-09-10", noteType: "Credit", recipientGstin: "27AAABM1234C1ZK", recipientName: "ABC Technologies Pvt. Ltd.",  originalInvoiceNo: "INV-1042", originalInvoiceDate: "2026-09-03", noteValue: 5900, taxableValue: 5000, gstRate: 18, igst: 900, cgst: 0,   sgst: 0,   reason: "Sales return",         status: "processed" },
  { id: "cdn-2", noteNo: "DBN-201", noteDate: "2026-09-14", noteType: "Debit",  recipientGstin: "29BRIGH1234I1ZN", recipientName: "BrightPath Technologies Ltd.", originalInvoiceNo: "INV-1047", originalInvoiceDate: "2026-09-12", noteValue: 3540, taxableValue: 3000, gstRate: 18, igst: 0,   cgst: 270, sgst: 270, reason: "Price revision",        status: "processed" },
  { id: "cdn-3", noteNo: "CDN-102", noteDate: "2026-09-20", noteType: "Credit", recipientGstin: "29TECHS1234F1ZK", recipientName: "TechStore Karnataka Pvt. Ltd.",originalInvoiceNo: "INV-1044", originalInvoiceDate: "2026-09-07", noteValue: 2360, taxableValue: 2000, gstRate: 18, igst: 0,   cgst: 180, sgst: 180, reason: "Discount adjustment",   status: "processed" },
];

export const INITIAL_ADVANCES = [
  { id: "adv-1", advanceNo: "ADV-2026-001", receiptDate: "2026-09-05", recipientGstin: "07QABCD1234E1ZP", recipientName: "Quantum Devices Pvt. Ltd.",    pos: "07", posName: "Delhi",       advanceValue: 29500, taxableValue: 25000, gstRate: 18, igst: 4500, cgst: 0, sgst: 0, status: "processed" },
  { id: "adv-2", advanceNo: "ADV-2026-002", receiptDate: "2026-09-11", recipientGstin: "27SKYLN1234J1ZO", recipientName: "Skylark Enterprises Pvt. Ltd.", pos: "27", posName: "Maharashtra", advanceValue: 10500, taxableValue: 10000, gstRate: 5,  igst: 500,  cgst: 0, sgst: 0, status: "processed" },
];

export const INITIAL_AMENDMENTS = [
  { id: "amnd-1", originalInvoiceNo: "INV-1038", originalInvoiceDate: "2026-08-15", amendedInvoiceNo: "INV-1038-A", amendDate: "2026-09-05", recipientGstin: "27ALPHP1234A1ZX", recipientName: "Alpha Products Pvt. Ltd.", pos: "27", posName: "Maharashtra", taxableValue: 40000, gstRate: 18, igst: 7200, cgst: 0,    sgst: 0,    reason: "Incorrect invoice value corrected", status: "processed" },
  { id: "amnd-2", originalInvoiceNo: "INV-1039", originalInvoiceDate: "2026-08-18", amendedInvoiceNo: "INV-1039-A", amendDate: "2026-09-08", recipientGstin: "29BETAC1234B1ZY", recipientName: "Beta Components Ltd.",     pos: "29", posName: "Karnataka",  taxableValue: 20000, gstRate: 12, igst: 0,    cgst: 1200, sgst: 1200, reason: "Recipient GSTIN corrected",        status: "processed" },
];

export const INITIAL_HSN_SUMMARY = [
  { id: "hsn-1", hsn: "8471", description: "Personal computers, laptops and computer units",          uqc: "NOS", quantity: 45,  rate: 18, taxableValue: 250000, igst: 31500, cgst: 9000, sgst: 9000 },
  { id: "hsn-2", hsn: "8517", description: "Telephone handsets and mobile communication devices",     uqc: "NOS", quantity: 28,  rate: 12, taxableValue: 196000, igst: 17640, cgst: 1980, sgst: 1980 },
  { id: "hsn-3", hsn: "8542", description: "Electronic integrated circuits and microassemblies",      uqc: "NOS", quantity: 150, rate: 18, taxableValue: 220000, igst: 36900, cgst: 2160, sgst: 2160 },
  { id: "hsn-4", hsn: "8473", description: "Parts and accessories for computers and peripherals",     uqc: "NOS", quantity: 60,  rate: 5,  taxableValue: 59200,  igst: 1750,  cgst: 1210, sgst: 1210 },
  { id: "hsn-5", hsn: "8504", description: "Power supply units and UPS systems",                      uqc: "NOS", quantity: 22,  rate: 18, taxableValue: 47000,  igst: 7560,  cgst: 630,  sgst: 630  },
];

export const INITIAL_DOCUMENT_SERIES = [
  { id: "ds-1", nature: "Tax Invoices", fromNo: "INV-1001", toNo: "INV-1060", totalIssued: 60,  totalCancelled: 2 },
  { id: "ds-2", nature: "Credit Notes", fromNo: "CDN-001",  toNo: "CDN-110",  totalIssued: 110, totalCancelled: 0 },
  { id: "ds-3", nature: "Debit Notes",  fromNo: "DBN-001",  toNo: "DBN-025",  totalIssued: 25,  totalCancelled: 1 },
];

export function formatCurrency(amount) {
  if (amount === undefined || amount === null || isNaN(amount)) return "—";
  const abs = Math.abs(Number(amount));
  const formatted = abs.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  return (Number(amount) < 0 ? "−" : "") + "₹" + formatted;
}

export function formatDate(dateStr) {
  if (!dateStr) return "—";
  try {
    const parts = dateStr.split("-");
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return parts[2] + " " + months[parseInt(parts[1], 10) - 1] + " " + parts[0];
  } catch (e) { return dateStr; }
}

export function validateGstin(gstin) {
  if (!gstin || !gstin.trim()) return "GSTIN is required.";
  const g = gstin.trim().toUpperCase();
  if (g.length !== 15) return "GSTIN must be exactly 15 characters.";
  if (!/^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(g)) return "Invalid GSTIN format (e.g. 27XXXXX0000X1ZX).";
  return null;
}

export function computeSummary(state) {
  const s = (arr, k) => arr.reduce((t, r) => t + (Number(r[k]) || 0), 0);
  const b2bT = s(state.b2bInvoices,"taxableValue"), b2bI = s(state.b2bInvoices,"igst"), b2bC = s(state.b2bInvoices,"cgst"), b2bS = s(state.b2bInvoices,"sgst");
  const b2cT = s(state.b2cInvoices,"taxableValue"), b2cI = s(state.b2cInvoices,"igst"), b2cC = s(state.b2cInvoices,"cgst"), b2cS = s(state.b2cInvoices,"sgst");
  const expT = s(state.exports,"taxableValue");
  const cdnT = s(state.creditNotes,"taxableValue"), cdnI = s(state.creditNotes,"igst"), cdnC = s(state.creditNotes,"cgst"), cdnS = s(state.creditNotes,"sgst");
  const totalTaxable = b2bT + b2cT + expT;
  const totalIgst = b2bI + b2cI + cdnI, totalCgst = b2bC + b2cC + cdnC, totalSgst = b2bS + b2cS + cdnS;
  return {
    sections: [
      { label: "B2B Invoices",         count: state.b2bInvoices.length,  taxable: b2bT, igst: b2bI, cgst: b2bC, sgst: b2bS },
      { label: "B2C Invoices",         count: state.b2cInvoices.length,  taxable: b2cT, igst: b2cI, cgst: b2cC, sgst: b2cS },
      { label: "Exports (Zero-rated)", count: state.exports.length,       taxable: expT, igst: 0,    cgst: 0,    sgst: 0    },
      { label: "Credit / Debit Notes", count: state.creditNotes.length,   taxable: cdnT, igst: cdnI, cgst: cdnC, sgst: cdnS },
    ],
    totalTaxable,
    totalIgst,
    totalCgst,
    totalSgst,
    totalTax: totalIgst + totalCgst + totalSgst,
  };
}
