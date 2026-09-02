// src/SmartFiling.jsx
// GEZT Smart Filing — complete rebuild
// Multi-transaction | Real OpenRouter AI | Explicit source tracking | No ABC Technologies fallback

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  BUSINESS, RETURN_PERIOD, PLACES_OF_SUPPLY,
  formatCurrency, formatDate, validateGstin,
} from './mockData.js';

// ─── Runtime constants ────────────────────────────────────────────────────────

const SELLER_STATE_CODE = '29'; // Karnataka

const MODEL = (typeof __OPENROUTER_MODEL__ !== 'undefined') ? __OPENROUTER_MODEL__ : 'google/gemini-2.5-flash';
const HAS_OPENROUTER_KEY = (typeof __HAS_OPENROUTER_KEY__ !== 'undefined') ? __HAS_OPENROUTER_KEY__ : false;
const HAS_GEMINI_KEY = (typeof __HAS_GEMINI_KEY__ !== 'undefined') ? __HAS_GEMINI_KEY__ : false;
const HAS_KEY = (typeof __HAS_API_KEY__ !== 'undefined') ? __HAS_API_KEY__ : false;

// ─── System Prompt ─────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are the transaction-understanding engine for GEZT Smart Filing — an Indian GST return preparation tool.

Your ONLY job is to convert taxpayer natural-language descriptions into structured GST transaction data.

The taxpayer may describe ZERO, ONE, or MANY business transactions in a single message.
You MUST identify and return each distinct business event separately.

CRITICAL RULES:
1. NEVER merge separate transactions into one.
2. NEVER duplicate a single transaction into multiple entries (e.g. do not create both a B2B and B2C entry for the same sale event). Each event corresponds to exactly ONE transaction.
3. NEVER invent missing facts (buyer name, GSTIN, invoice numbers, amounts).
4. NEVER copy information from one transaction to another unless the user explicitly says so.
5. NEVER output example entities (ABC Technologies, 29ABCDE1234F1Z5, INV-1042) unless they were provided by the user.
6. NEVER calculate tax amounts — the application does this deterministically.
7. NEVER assume GST registration without evidence (GSTIN or explicit "registered" statement).
8. If information is missing or ambiguous, set status to "needs_clarification" and ask the minimum necessary question.

TRANSACTION TYPES:
- B2B: buyer is GST-registered (must have GSTIN). GSTR-1 section 4A.
- B2C: buyer is NOT GST-registered (consumer/retail). GSTR-1 section 5.
- EXPORT: goods/services sent outside India. GSTR-1 section 6A.
- CDN: credit note or debit note. GSTR-1 section 9B.

CLASSIFICATION LOGIC:
- If buyer has a GSTIN → B2B
- If buyer is explicitly "retail", "consumer", "walk-in", "unregistered", or no GSTIN and sale is domestic → B2C
- If sale is outside India (export to Dubai, Singapore, USA, etc.) → EXPORT
- If credit note / debit note mentioned → CDN
- If uncertain → ask

ALWAYS respond with a valid JSON object matching EXACTLY this schema:
{
  "status": "complete" | "needs_clarification",
  "source": "openrouter",
  "message": "brief friendly summary of what was found",
  "question": "question for user (only when status is needs_clarification)",
  "questionType": "text" | "yesno" | "choice",
  "choices": [],
  "pendingTransactionIndex": null,
  "transactions": [
    {
      "tempId": "tx-1",
      "type": "B2B" | "B2C" | "EXPORT" | "CDN",
      "status": "complete" | "needs_clarification",
      "clarificationQuestion": "specific question for this transaction if incomplete",
      "clarificationQuestionType": "text" | "yesno",
      "recipient": { "name": "", "gstin": "" },
      "invoice": { "number": "", "date": "" },
      "taxableValue": 0,
      "gstRate": 18,
      "pos": "",
      "exportCountry": "",
      "shippingBillNo": "",
      "shippingBillDate": "",
      "portName": "",
      "currencyCode": "USD",
      "foreignCurrencyValue": 0,
      "exportType": "WOPT",
      "hsn": "",
      "reverseCharge": "N",
      "noteType": "Credit",
      "originalInvoiceNo": "",
      "originalInvoiceDate": "",
      "noteReason": "",
      "classification": {
        "section": "4A",
        "label": "B2B Invoices",
        "confidence": 0.9,
        "reasoning": "brief explanation"
      }
    }
  ]
}

IMPORTANT:
- "transactions" array MUST contain ALL identified transactions (one object per business event).
- Each transaction has its own "status" field.
- If ANY transaction is incomplete, set top-level status to "needs_clarification".
- If ALL transactions are complete, set top-level status to "complete".
- "pendingTransactionIndex" should be the index of the first incomplete transaction, or null if all complete.
- "source" must always be "openrouter".
- Do NOT set igst/cgst/sgst — the application computes these.
- pos = 2-digit state code of buyer's state (29=Karnataka, 27=Maharashtra, 07=Delhi, etc.)
- If invoice value includes GST, set taxableValue = invoiceTotal / (1 + gstRate/100).`;

const INVOICE_SYSTEM_PROMPT = `You are a GST invoice extraction engine.
Extract all GST-relevant information from invoice document text.
NEVER invent data. If a field is not present in the document, leave it as empty string or 0.
Return ONLY valid JSON. No prose, no markdown.

ALWAYS respond with:
{
  "status": "complete" | "needs_clarification",
  "source": "openrouter",
  "message": "brief summary",
  "question": "question if incomplete",
  "questionType": "text" | "yesno",
  "transactions": [
    {
      "tempId": "tx-1",
      "type": "B2B" | "B2C" | "EXPORT" | "CDN",
      "status": "complete" | "needs_clarification",
      "clarificationQuestion": "",
      "clarificationQuestionType": "text",
      "recipient": { "name": "", "gstin": "" },
      "invoice": { "number": "", "date": "" },
      "taxableValue": 0,
      "gstRate": 18,
      "pos": "",
      "exportCountry": "",
      "shippingBillNo": "",
      "shippingBillDate": "",
      "portName": "",
      "currencyCode": "USD",
      "foreignCurrencyValue": 0,
      "exportType": "WOPT",
      "hsn": "",
      "reverseCharge": "N",
      "noteType": "Credit",
      "originalInvoiceNo": "",
      "originalInvoiceDate": "",
      "noteReason": "",
      "classification": {
        "section": "4A",
        "label": "B2B Invoices",
        "confidence": 0.9,
        "reasoning": "brief explanation"
      }
    }
  ]
}`;

// ─── JSON utilities ───────────────────────────────────────────────────────────

function parseJSONSafe(raw) {
  if (!raw) throw new Error('Empty response');
  let text = String(raw).trim();

  // Extract from markdown code block if present
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (codeBlockMatch) {
    text = codeBlockMatch[1].trim();
  }

  // Find outermost { ... }
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    text = text.substring(firstBrace, lastBrace + 1);
  }

  return JSON.parse(text);
}

function validateAndNormalizeResponse(parsed) {
  if (!parsed || typeof parsed !== 'object') throw new Error('Response is not an object');

  parsed.status = (parsed.status === 'complete' || parsed.status === 'needs_clarification')
    ? parsed.status
    : 'complete';

  if (!Array.isArray(parsed.transactions) || parsed.transactions.length === 0) {
    if (parsed.transaction && typeof parsed.transaction === 'object') {
      parsed.transactions = [parsed.transaction];
    } else {
      throw new Error('Response missing transactions array');
    }
  }

  parsed.source = parsed.source || 'openrouter';

  parsed.transactions = parsed.transactions.map((tx, i) => {
    // Normalize type
    let type = String(tx.type || 'B2B').toUpperCase().trim();
    if (type.includes('EXPORT') || type.includes('6A')) type = 'EXPORT';
    else if (type.includes('CDN') || type.includes('CREDIT') || type.includes('DEBIT') || type.includes('9B')) type = 'CDN';
    else if (type.includes('B2C') || type.includes('CONSUMER') || type.includes('5')) type = 'B2C';
    else type = 'B2B';
    tx.type = type;

    // Normalize taxableValue from any potential LLM key or formatted string (e.g. "₹50,000", "50,000", tx.amount, tx.taxableAmount, tx.invoiceTotal, tx.total)
    let rawVal = tx.taxableValue ?? tx.taxableAmount ?? tx.amount ?? tx.value ?? tx.total ?? tx.invoiceTotal ?? 0;
    if (typeof rawVal === 'string') {
      rawVal = rawVal.replace(/[^\d\.]/g, '');
    }
    let v = Number(rawVal);
    if (isNaN(v) || v < 0) v = 0;
    tx.taxableValue = v;

    // Normalize gstRate
    let r = Number(tx.gstRate);
    if (isNaN(r) || r < 0) r = 18;
    tx.gstRate = [0, 5, 12, 18, 28].includes(r) ? r : 18;

    // Strip LLM-computed tax fields — app computes these
    delete tx.igst; delete tx.cgst; delete tx.sgst; delete tx.totalTax; delete tx.invoiceTotal;

    // Clean recipient
    if (!tx.recipient || typeof tx.recipient !== 'object') tx.recipient = { name: '', gstin: '' };
    tx.recipient.name = tx.recipient.name ? String(tx.recipient.name).trim() : '';
    if (tx.recipient.gstin) {
      const g = String(tx.recipient.gstin).trim().toUpperCase();
      if (/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(g)) {
        tx.recipient.gstin = g;
        if (!tx.pos) tx.pos = g.substring(0, 2);
      } else {
        tx.recipient.gstin = '';
      }
    } else {
      tx.recipient.gstin = '';
    }

    // Clean invoice
    if (!tx.invoice || typeof tx.invoice !== 'object') tx.invoice = { number: '', date: '' };
    tx.invoice.number = tx.invoice.number ? String(tx.invoice.number).trim() : '';
    tx.invoice.date = (tx.invoice.date && /^\d{4}-\d{2}-\d{2}$/.test(String(tx.invoice.date))) ? String(tx.invoice.date) : '';

    // Classification normalization
    if (!tx.classification || typeof tx.classification !== 'object') {
      const sectionMap = { B2B: '4A', B2C: '5', EXPORT: '6A', CDN: '9B' };
      const labelMap = { B2B: 'B2B Invoices', B2C: 'B2C Invoices', EXPORT: 'Export Invoices', CDN: 'Credit/Debit Notes' };
      tx.classification = {
        section: sectionMap[type],
        label: labelMap[type],
        confidence: 0.9,
        reasoning: 'Extracted from user input'
      };
    } else {
      if (tx.classification.section?.startsWith('4')) tx.classification.section = '4A';
      else if (tx.classification.section?.startsWith('5')) tx.classification.section = '5';
      else if (tx.classification.section?.startsWith('6')) tx.classification.section = '6A';
      else if (tx.classification.section?.startsWith('9')) tx.classification.section = '9B';
    }

    // Ensure status field
    tx.status = (tx.status === 'needs_clarification' || !tx.taxableValue) ? 'needs_clarification' : 'complete';
    tx.tempId = tx.tempId || `tx-${i + 1}`;

    return tx;
  });

  return parsed;
}

// ─── Real API call via Vite proxy → OpenRouter ───────────────────────────────

async function callOpenRouter(messages, systemPrompt) {
  const body = {
    model: MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages,
    ],
    temperature: 0.1,
    max_tokens: 2000,
    response_format: { type: 'json_object' },
  };

  console.log(`[Smart Filing] → OpenRouter request | model=${MODEL} | messages=${messages.length} | inputLen=${JSON.stringify(messages).length}`);

  const res = await fetch('/api/smart-filing', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    const errMsg = errText.substring(0, 300);
    // Detect auth errors specifically
    if (res.status === 401 || res.status === 403 || errText.includes('auth') || errText.includes('key')) {
      throw Object.assign(new Error(`Authentication failed (HTTP ${res.status})`), { type: 'auth' });
    }
    throw new Error(`HTTP ${res.status}: ${errMsg}`);
  }

  const data = await res.json();
  const provider = res.headers.get('X-AI-Provider') || data.provider || 'openrouter';
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('No content in LLM response');

  console.log(`[Smart Filing] ← ${provider} response received | contentLen=${content.length}`);

  const parsed = parseJSONSafe(content);
  const validated = validateAndNormalizeResponse(parsed);

  console.log(`[Smart Filing] ✓ Parsed ${validated.transactions.length} transaction(s) from ${provider}`);

  return { ...validated, source: provider };
}

// ─── Primary LLM call with explicit error/source tracking ────────────────────

async function callLLM(messages) {
  if (!HAS_KEY) {
    console.log('[Smart Filing] No API key available — using Demo Mode');
    return { ...getMockResponse(messages), source: 'mock', mockReason: 'no_key' };
  }

  try {
    const lastMsg = messages[messages.length - 1];
    const augmented = messages.map((m, i) =>
      i === messages.length - 1 && m.role === 'user'
        ? { ...m, content: m.content + '\n\nRespond ONLY with valid JSON matching the schema. No prose.' }
        : m
    );
    return await callOpenRouter(augmented, SYSTEM_PROMPT);
  } catch (err) {
    const errType = err.type === 'auth' ? 'auth_error' : 'api_error';
    console.error(`[Smart Filing] AI call failed (${errType}):`, err.message);
    // DO NOT silently fall back — return explicit error with source
    throw Object.assign(err, { smartFilingErrorType: errType });
  }
}

// ─── Invoice LLM call ─────────────────────────────────────────────────────────

async function callLLMForInvoice(invoiceInput) {
  if (!HAS_KEY) {
    console.log('[Smart Filing] No API key available — invoice using Demo Mode');
    return null;
  }
  let messageContent;
  if (typeof invoiceInput === 'object' && invoiceInput?.dataUrl) {
    messageContent = [
      { type: 'text', text: 'Extract all GST transaction data from this uploaded invoice document image/PDF into the strict JSON schema. Return ONLY valid JSON.' },
      { type: 'image_url', image_url: { url: invoiceInput.dataUrl } }
    ];
  } else {
    messageContent = `Extract GST transaction data from this invoice document:\n\n${String(invoiceInput || '').substring(0, 4000)}\n\nRespond ONLY with valid JSON.`;
  }
  const messages = [{
    role: 'user',
    content: messageContent,
  }];
  try {
    return await callOpenRouter(messages, INVOICE_SYSTEM_PROMPT);
  } catch (err) {
    console.error('[Smart Filing] Invoice LLM failed:', err.message);
    return null; // caller handles fallback
  }
}

// ─── Mock / Demo Engine (smart, input-aware) ──────────────────────────────────
// Mock responses MUST be input-aware — never return ABC Technologies for unrelated input

function extractAmountFromText(text) {
  if (!text) return 0;

  // 1. Explicit currency or price indicators
  const explicitPatterns = [
    /₹\s*([\d,]+)/g,
    /rs\.?\s*([\d,]+)/gi,
    /inr\s*([\d,]+)/gi,
    /([\d,]+)\s*(?:rupees|rs|inr)/gi,
    /(?:worth|for|of|value|amount|cost|valuing|total)\s*(?:₹|rs\.?)?\s*([\d,]+)/gi,
    /(?:sold|bought|exported|supplied|issued)\s+(?:items|goods|clothes|garments|laptops|shirts|services|products)?\s*(?:worth|for|of)?\s*(?:₹|rs\.?)?\s*([\d,]+)/gi,
  ];

  for (const p of explicitPatterns) {
    const matches = [...text.matchAll(p)];
    if (matches.length) {
      const val = parseInt(matches[matches.length - 1][1].replace(/,/g, ''));
      if (!isNaN(val) && val > 0) return val;
    }
  }

  // 2. Fallback: find candidate numbers (digits >= 100) not matching GSTINs, dates, or HSNs
  let cleanText = text.replace(/\b[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]\b/gi, '');
  cleanText = cleanText.replace(/\b\d{4}-\d{2}-\d{2}\b/g, ''); // dates

  const numberMatches = [...cleanText.matchAll(/\b([\d,]{3,10})\b/g)];
  if (numberMatches.length) {
    for (let i = numberMatches.length - 1; i >= 0; i--) {
      const numStr = numberMatches[i][1].replace(/,/g, '');
      const val = parseInt(numStr);
      if (!isNaN(val) && val >= 100 && val <= 100000000) {
        return val;
      }
    }
  }

  return 0;
}

function extractBuyerFromText(text) {
  const patterns = [
    /(?:sold to|billed to|buyer[:\s]+|to\s+)([A-Z][A-Za-z\s\.]+(?:Pvt\.?\s*Ltd\.?|Ltd\.?|Inc\.?|Corp\.?|Technologies|Systems|Solutions|Enterprises|Electronics|Traders|Fashion|Clothing)?)/i,
    /(?:sold\s+[\w\s]+?\s+to\s+)([A-Z][A-Za-z\s\.]+?)(?:\s+for|\s+GSTIN|\s+worth|\.|,|$)/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) {
      const name = m[1].trim().replace(/\s+for\s+.*$/, '').replace(/\s+GSTIN.*$/, '').trim();
      if (name.length > 1) return name;
    }
  }
  return '';
}

function extractGstinFromText(text) {
  const m = text.match(/\b([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z])\b/i);
  return m ? m[1].toUpperCase() : '';
}

function extractCountryFromText(text) {
  const lower = text.toLowerCase();
  if (lower.includes('dubai') || lower.includes('uae') || lower.includes('united arab')) return 'United Arab Emirates';
  if (lower.includes('singapore')) return 'Singapore';
  if (lower.includes(' usa') || lower.includes('united states') || lower.includes('america')) return 'United States of America';
  if (lower.includes(' uk') || lower.includes('united kingdom') || lower.includes('britain')) return 'United Kingdom';
  if (lower.includes('germany')) return 'Germany';
  if (lower.includes('france')) return 'France';
  if (lower.includes('australia')) return 'Australia';
  if (lower.includes('canada')) return 'Canada';
  if (lower.includes('china')) return 'China';
  return 'Unknown';
}

function extractDateFromText(text) {
  const m = text.match(/\b(\d{1,2}[\s\/\-](?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s\/\-]\d{4}|\d{4}-\d{2}-\d{2})\b/i);
  if (!m) return '';
  const raw = m[1];
  if (/\d{4}-\d{2}-\d{2}/.test(raw)) return raw;
  const months = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
  const dm = raw.match(/(\d{1,2})\s+(\w{3})\w*\s+(\d{4})/i);
  if (dm) {
    const mo = months[dm[2].toLowerCase().substring(0, 3)];
    return mo ? `${dm[3]}-${mo}-${dm[1].padStart(2, '0')}` : '';
  }
  return '';
}

function makeTempId(i) { return `tx-${i + 1}-${Date.now()}`; }

function classifyEvent(eventText) {
  const lower = eventText.toLowerCase();
  const amount = extractAmountFromText(lower);
  const gstin = extractGstinFromText(eventText);
  const buyer = extractBuyerFromText(eventText);
  const date = extractDateFromText(eventText);

  const isExport = lower.includes('export') || lower.includes('dubai') || lower.includes('singapore') ||
    lower.includes('outside india') || lower.includes('foreign') || lower.includes('uae') ||
    lower.includes('united states') || lower.includes('usa') || lower.includes('germany') ||
    lower.includes('australia') || lower.includes('canada') || lower.includes('uk ') ||
    lower.includes('abroad') || lower.includes('overseas');

  const isCDN = lower.includes('credit note') || lower.includes('debit note') ||
    lower.includes(' cdn') || lower.includes(' dbn');

  const isB2C = !gstin && (lower.includes('retail') || lower.includes('consumer') ||
    lower.includes('walk-in') || lower.includes('individual') ||
    lower.includes('unregistered') || lower.includes('not registered') ||
    lower.includes('no gstin') || lower.includes('priya') || lower.includes('rahul') ||
    lower.includes('ravi') || lower.includes('amit') || lower.includes('neha'));

  const hasGstin = !!gstin;

  if (isCDN) {
    return {
      tempId: makeTempId(0),
      type: 'CDN',
      status: 'complete',
      recipient: { name: buyer || 'Buyer', gstin: gstin || '' },
      invoice: { number: '', date: date || '' },
      taxableValue: amount || 0,
      gstRate: 18,
      pos: gstin ? gstin.substring(0, 2) : '29',
      noteType: lower.includes('debit') ? 'Debit' : 'Credit',
      originalInvoiceNo: '',
      originalInvoiceDate: '',
      noteReason: 'Price adjustment',
      hsn: '',
      reverseCharge: 'N',
      classification: { section: '9B', label: 'Credit/Debit Notes', confidence: 0.92, reasoning: 'Credit/debit note detected' },
    };
  }

  if (isExport) {
    const country = extractCountryFromText(lower);
    const needsSB = !lower.includes('shipping bill') && !lower.includes('sb-');
    return {
      tempId: makeTempId(0),
      type: 'EXPORT',
      status: needsSB ? 'needs_clarification' : 'complete',
      clarificationQuestion: needsSB ? 'Do you have a Shipping Bill number for this export?' : '',
      clarificationQuestionType: 'text',
      recipient: { name: buyer || '', gstin: '' },
      invoice: { number: '', date: date || '' },
      taxableValue: amount || 0,
      gstRate: 0,
      pos: '',
      exportCountry: country,
      shippingBillNo: '',
      shippingBillDate: '',
      portName: 'Chennai Sea Port',
      currencyCode: 'USD',
      foreignCurrencyValue: amount ? Math.round(amount / 83) : 0,
      exportType: 'WOPT',
      hsn: '',
      reverseCharge: 'N',
      classification: { section: '6A', label: 'Export Invoices', confidence: 0.93, reasoning: `Export supply to ${country}` },
    };
  }

  if (hasGstin) {
    const pos = gstin.substring(0, 2);
    const taxable = amount > 0 ? Math.round(amount / 1.18) : 0;
    return {
      tempId: makeTempId(0),
      type: 'B2B',
      status: 'complete',
      recipient: { name: buyer || 'Business Buyer', gstin },
      invoice: { number: '', date: date || '' },
      taxableValue: taxable || amount || 0,
      gstRate: 18,
      pos,
      hsn: '',
      reverseCharge: 'N',
      classification: { section: '4A', label: 'B2B Invoices', confidence: 0.95, reasoning: 'GSTIN provided — B2B supply' },
    };
  }

  if (isB2C) {
    const taxable = amount > 0 ? Math.round(amount / 1.18) : 0;
    return {
      tempId: makeTempId(0),
      type: 'B2C',
      status: 'complete',
      recipient: { name: buyer || 'Retail Customer', gstin: '' },
      invoice: { number: '', date: date || '' },
      taxableValue: taxable || amount || 0,
      gstRate: 18,
      pos: '29',
      hsn: '',
      reverseCharge: 'N',
      classification: { section: '5', label: 'B2C Invoices', confidence: 0.88, reasoning: 'Unregistered buyer — B2C supply' },
    };
  }

  // Unknown — needs clarification
  return {
    tempId: makeTempId(0),
    type: 'B2B',
    status: 'needs_clarification',
    clarificationQuestion: buyer
      ? `Is ${buyer} registered under GST? (Do they have a GSTIN?)`
      : 'Is the buyer registered under GST?',
    clarificationQuestionType: 'yesno',
    recipient: { name: buyer || '', gstin: '' },
    invoice: { number: '', date: date || '' },
    taxableValue: amount || 0,
    gstRate: 18,
    pos: '',
    hsn: '',
    reverseCharge: 'N',
    classification: { section: '4A', label: 'B2B Invoices', confidence: 0.5, reasoning: 'Cannot determine buyer GST registration without more info' },
  };
}

function splitIntoEvents(text) {
  // Split on conjunctions, numbered lists, "then", line breaks
  const separators = /\.\s+(?:then\s+)?(?:i\s+|also\s+|additionally\s+)?(?:sold|bought|exported|issued|gave|provided|supplied)|(?:\n|;)\s*(?:i\s+)?(?:sold|bought|exported|issued)|,\s+(?:then\s+)?(?:i\s+)?(?:sold|exported|issued)/gi;
  const parts = text.split(separators).map(s => s.trim()).filter(s => s.length > 5);
  if (parts.length <= 1) return [text.trim()];
  return parts;
}

function getMockResponse(messages) {
  const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')?.content || '';
  const lower = lastUserMsg.toLowerCase();

  console.log('[Smart Filing] Using Demo Mode (mock engine) | inputLen=', lastUserMsg.length);

  // Split into separate business events
  const events = splitIntoEvents(lastUserMsg);
  console.log(`[Smart Filing] Demo Mode split input into ${events.length} event(s)`);

  const transactions = events.map((evt, i) => {
    const tx = classifyEvent(evt);
    tx.tempId = makeTempId(i);
    return tx;
  });

  const allComplete = transactions.every(t => t.status === 'complete');
  const pendingIdx = transactions.findIndex(t => t.status === 'needs_clarification');
  const pendingTx = pendingIdx >= 0 ? transactions[pendingIdx] : null;

  return {
    status: allComplete ? 'complete' : 'needs_clarification',
    source: 'mock',
    message: allComplete
      ? `Found ${transactions.length} transaction${transactions.length > 1 ? 's' : ''}.`
      : `Found ${transactions.length} transaction${transactions.length > 1 ? 's' : ''} — ${transactions.filter(t => t.status === 'needs_clarification').length} need${transactions.filter(t => t.status === 'needs_clarification').length > 1 ? '' : 's'} clarification.`,
    question: pendingTx?.clarificationQuestion || '',
    questionType: pendingTx?.clarificationQuestionType || 'yesno',
    pendingTransactionIndex: pendingIdx >= 0 ? pendingIdx : null,
    transactions,
  };
}

// ─── Mock invoice response ────────────────────────────────────────────────────

function getMockInvoiceResponse(filename, content) {
  const lower = (content || filename).toLowerCase();

  // Export invoice
  if (lower.includes('export') || lower.includes('uae') || lower.includes('dubai') || lower.includes('wopt')) {
    const amtMatch = lower.match(/₹[\d,]+/) || lower.match(/inr.*?(\d[\d,]+)/);
    const amt = amtMatch ? parseInt(amtMatch[0].replace(/[₹,]/g, '')) : 80000;
    const invNoMatch = content.match(/Invoice Number[:\s]+([A-Z0-9-]+)/i);
    const dateMatch = content.match(/Invoice Date[:\s]+([\d\w ]+)/i);
    const buyerMatch = content.match(/Bill To[:\s\n]+([^\n]+)/i) || content.match(/Customer[:\s\n]+([^\n]+)/i);
    return {
      status: 'complete',
      source: 'mock',
      message: 'Export invoice detected.',
      transactions: [{
        tempId: 'tx-1',
        type: 'EXPORT',
        status: 'complete',
        recipient: { name: buyerMatch?.[1]?.trim() || 'Export Customer', gstin: '' },
        invoice: { number: invNoMatch?.[1]?.trim() || '', date: parseDateStr(dateMatch?.[1]) || '' },
        taxableValue: amt,
        gstRate: 0,
        pos: '',
        exportCountry: extractCountryFromText(lower) || 'United Arab Emirates',
        shippingBillNo: extractField(content, 'Shipping Bill No') || '',
        shippingBillDate: '',
        portName: extractField(content, 'Port of Export') || 'Chennai Sea Port',
        currencyCode: 'USD',
        foreignCurrencyValue: Math.round(amt / 83),
        exportType: 'WOPT',
        hsn: extractField(content, 'HSN') || '',
        reverseCharge: 'N',
        classification: { section: '6A', label: 'Export Invoices', confidence: 0.95, reasoning: 'Zero-rated export supply' },
      }],
    };
  }

  // B2C / walk-in
  if (lower.includes('walk-in') || lower.includes('unregistered') || lower.includes('not gst registered')) {
    const taxableMatch = content.match(/Taxable Value[:\s]+₹([\d,]+)/i);
    const taxable = taxableMatch ? parseInt(taxableMatch[1].replace(/,/g, '')) : 10000;
    const invNoMatch = content.match(/Invoice Number[:\s]+([A-Z0-9-]+)/i);
    const dateMatch = content.match(/Invoice Date[:\s]+([\d\w ]+)/i);
    return {
      status: 'complete',
      source: 'mock',
      message: 'Walk-in / B2C invoice detected.',
      transactions: [{
        tempId: 'tx-1',
        type: 'B2C',
        status: 'complete',
        recipient: { name: 'Walk-in Customer', gstin: '' },
        invoice: { number: invNoMatch?.[1]?.trim() || '', date: parseDateStr(dateMatch?.[1]) || '' },
        taxableValue: taxable,
        gstRate: 18,
        pos: '29',
        hsn: extractField(content, 'HSN') || '',
        reverseCharge: 'N',
        classification: { section: '5', label: 'B2C Invoices', confidence: 0.94, reasoning: 'Unregistered buyer — B2C' },
      }],
    };
  }

  // B2B (default — parse what we can from the document)
  const buyerGstinMatch = content.match(/(?:Buyer\s+GSTIN|GSTIN)[:\s]+([A-Z0-9]{15})/i);
  const buyerGstin = buyerGstinMatch?.[1]?.trim() || '';
  const invNoMatch = content.match(/Invoice Number[:\s]+([A-Z0-9-]+)/i);
  const dateMatch = content.match(/Invoice Date[:\s]+([\d\w ]+)/i);
  const taxableMatch = content.match(/Taxable Value[:\s]+₹([\d,]+)/i);
  const rateMatch = content.match(/(?:IGST|CGST|GST)\s*@\s*(\d+)%/i);
  const buyerMatch = content.match(/Bill To[:\s\n]+([^\n]+)/i) || content.match(/Customer[:\s\n]+([^\n]+)/i);
  const taxable = taxableMatch ? parseInt(taxableMatch[1].replace(/,/g, '')) : 0;
  const rate = rateMatch ? parseInt(rateMatch[1]) : 18;
  const pos = buyerGstin ? buyerGstin.substring(0, 2) : '27';
  const buyerName = buyerMatch?.[1]?.trim() || '';

  if (!buyerGstin) {
    return {
      status: 'needs_clarification',
      source: 'mock',
      message: 'Invoice found but buyer GSTIN could not be determined.',
      question: `We found buyer "${buyerName || 'unknown'}" but could not find a GSTIN. Is this buyer GST-registered?`,
      questionType: 'yesno',
      transactions: [{
        tempId: 'tx-1',
        type: 'B2B',
        status: 'needs_clarification',
        clarificationQuestion: `Is "${buyerName || 'the buyer'}" registered under GST?`,
        clarificationQuestionType: 'yesno',
        recipient: { name: buyerName, gstin: '' },
        invoice: { number: invNoMatch?.[1]?.trim() || '', date: parseDateStr(dateMatch?.[1]) || '' },
        taxableValue: taxable,
        gstRate: rate,
        pos: '',
        hsn: extractField(content, 'HSN') || '',
        reverseCharge: 'N',
        classification: { section: '4A', label: 'B2B Invoices', confidence: 0.6, reasoning: 'Missing buyer GSTIN — needs clarification' },
      }],
    };
  }

  return {
    status: 'complete',
    source: 'mock',
    message: 'B2B invoice extracted.',
    transactions: [{
      tempId: 'tx-1',
      type: 'B2B',
      status: 'complete',
      recipient: { name: buyerName || 'Registered Business', gstin: buyerGstin },
      invoice: { number: invNoMatch?.[1]?.trim() || '', date: parseDateStr(dateMatch?.[1]) || '' },
      taxableValue: taxable,
      gstRate: rate,
      pos,
      hsn: extractField(content, 'HSN') || '',
      reverseCharge: 'N',
      classification: { section: '4A', label: 'B2B Invoices', confidence: 0.9, reasoning: 'GST-registered buyer from invoice' },
    }],
  };
}

// ─── Text helpers ─────────────────────────────────────────────────────────────

function parseDateStr(raw) {
  if (!raw) return '';
  raw = raw.trim();
  if (/\d{4}-\d{2}-\d{2}/.test(raw)) return raw;
  const months = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
  const m = raw.match(/(\d{1,2})\s+(\w{3})\w*\s+(\d{4})/i);
  if (m) {
    const mo = months[m[2].toLowerCase().substring(0, 3)];
    return mo ? `${m[3]}-${mo}-${m[1].padStart(2, '0')}` : '';
  }
  return '';
}

function extractField(content, fieldName) {
  const re = new RegExp(`${fieldName}[:\\s]+([^\\n]+)`, 'i');
  const m = content.match(re);
  return m ? m[1].trim() : '';
}

// ─── Deterministic GST computation ────────────────────────────────────────────

function computeTransaction(tx, id) {
  if (!tx) return null;
  let rawTaxable = tx.taxableValue ?? tx.taxableAmount ?? tx.amount ?? tx.value ?? tx.total ?? tx.invoiceTotal ?? 0;
  if (typeof rawTaxable === 'string') {
    rawTaxable = rawTaxable.replace(/[^\d\.]/g, '');
  }
  const taxable = Number(rawTaxable) || 0;
  const rate = Number(tx.gstRate) || 0;
  const tax = Math.round(taxable * rate / 100);
  const isIntra = tx.pos === SELLER_STATE_CODE;
  const posName = PLACES_OF_SUPPLY.find(p => p.code === tx.pos)?.name || tx.pos || '';

  if (tx.type === 'B2B') {
    return {
      id: id || `sf-b2b-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      invoiceNo: tx.invoice?.number || '',
      invoiceDate: tx.invoice?.date || '',
      recipientGstin: tx.recipient?.gstin || '',
      recipientName: tx.recipient?.name || '',
      pos: tx.pos || '',
      posName,
      invoiceValue: taxable + tax,
      taxableValue: taxable,
      gstRate: rate,
      igst: isIntra ? 0 : tax,
      cgst: isIntra ? Math.round(tax / 2) : 0,
      sgst: isIntra ? Math.round(tax / 2) : 0,
      cess: 0,
      hsn: tx.hsn || '',
      reverseCharge: tx.reverseCharge || 'N',
      status: 'saved',
    };
  }

  if (tx.type === 'B2C') {
    const type = (tx.pos === SELLER_STATE_CODE) ? 'intrastate' : 'interstate';
    return {
      id: id || `sf-b2c-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      invoiceNo: tx.invoice?.number || '',
      invoiceDate: tx.invoice?.date || '',
      type,
      pos: tx.pos || '29',
      posName,
      taxableValue: taxable,
      gstRate: rate,
      igst: type === 'interstate' ? tax : 0,
      cgst: type === 'intrastate' ? Math.round(tax / 2) : 0,
      sgst: type === 'intrastate' ? Math.round(tax / 2) : 0,
      cess: 0,
      status: 'saved',
    };
  }

  if (tx.type === 'EXPORT') {
    return {
      id: id || `sf-exp-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      invoiceNo: tx.invoice?.number || '',
      invoiceDate: tx.invoice?.date || '',
      shippingBillNo: tx.shippingBillNo || '',
      shippingBillDate: tx.shippingBillDate || '',
      port: 'INMAA4',
      portName: tx.portName || 'Chennai Sea Port',
      country: tx.exportCountry || '',
      currencyCode: tx.currencyCode || 'USD',
      foreignCurrencyValue: Number(tx.foreignCurrencyValue) || 0,
      invoiceValue: taxable,
      taxableValue: taxable,
      gstRate: 0,
      igst: 0,
      exportType: tx.exportType || 'WOPT',
      status: 'saved',
    };
  }

  if (tx.type === 'CDN') {
    return {
      id: id || `sf-cdn-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      noteNo: tx.invoice?.number || '',
      noteDate: tx.invoice?.date || '',
      noteType: tx.noteType || 'Credit',
      recipientGstin: tx.recipient?.gstin || '',
      recipientName: tx.recipient?.name || '',
      originalInvoiceNo: tx.originalInvoiceNo || '',
      originalInvoiceDate: tx.originalInvoiceDate || '',
      noteValue: taxable + tax,
      taxableValue: taxable,
      gstRate: rate,
      igst: isIntra ? 0 : tax,
      cgst: isIntra ? Math.round(tax / 2) : 0,
      sgst: isIntra ? Math.round(tax / 2) : 0,
      reason: tx.noteReason || '',
      status: 'saved',
    };
  }

  return null;
}

// ─── Insert into filingState ──────────────────────────────────────────────────

function insertTransaction(txType, record, setFilingState) {
  if (txType === 'B2B') {
    setFilingState(s => ({ ...s, b2bInvoices: [...s.b2bInvoices, record], smartLastAddedId: record.id }));
  } else if (txType === 'B2C') {
    setFilingState(s => ({ ...s, b2cInvoices: [...s.b2cInvoices, record], smartLastAddedId: record.id }));
  } else if (txType === 'EXPORT') {
    setFilingState(s => ({ ...s, exports: [...s.exports, record], smartLastAddedId: record.id }));
  } else if (txType === 'CDN') {
    setFilingState(s => ({ ...s, creditNotes: [...s.creditNotes, record], smartLastAddedId: record.id }));
  }
}

function insertBatchTransactions(items, setFilingState) {
  if (!items || !items.length) return;
  const lastRecord = items[items.length - 1].record;
  setFilingState(s => {
    let nextB2b = [...s.b2bInvoices];
    let nextB2c = [...s.b2cInvoices];
    let nextExp = [...s.exports];
    let nextCdn = [...s.creditNotes];

    items.forEach(({ txType, record }) => {
      if (txType === 'B2B') nextB2b.push(record);
      else if (txType === 'B2C') nextB2c.push(record);
      else if (txType === 'EXPORT') nextExp.push(record);
      else if (txType === 'CDN') nextCdn.push(record);
    });

    return {
      ...s,
      b2bInvoices: nextB2b,
      b2cInvoices: nextB2c,
      exports: nextExp,
      creditNotes: nextCdn,
      // ONLY the last inserted transaction gets highlighted
      smartLastAddedId: lastRecord.id,
    };
  });
}

function getSectionNav(txType) {
  const map = {
    B2B: { dest: 'online-b2b', label: 'GSTR-1 → 4A — B2B Invoices' },
    B2C: { dest: 'online-b2c', label: 'GSTR-1 → 5 — B2C Invoices' },
    EXPORT: { dest: 'online-exports', label: 'GSTR-1 → 6A — Export Invoices' },
    CDN: { dest: 'online-cdn', label: 'GSTR-1 → 9B — Credit/Debit Notes' },
  };
  return map[txType] || map.B2B;
}

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.readAsText(file);
  });
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.readAsDataURL(file);
  });
}

// ─── AI Status Indicator ──────────────────────────────────────────────────────

function AIStatusIndicator({ source, errorType }) {
  if (!source) return null;

  if (source === 'openrouter') {
    return (
      <div className="sf-ai-status sf-ai-status--live" title={`Model: ${MODEL}`}>
        <span className="sf-ai-dot sf-ai-dot--live" />
        ● OpenRouter AI
      </div>
    );
  }

  if (source === 'gemini') {
    return (
      <div className="sf-ai-status sf-ai-status--live" title="Provider: Google Gemini Flash">
        <span className="sf-ai-dot sf-ai-dot--live" />
        ● Gemini AI · Backup
      </div>
    );
  }

  let label = '⚠ Demo Mode';
  let reason = 'Running on local demo engine.';

  if (errorType === 'no_key') {
    label = '⚠ Demo Mode';
    reason = 'No API key configured.';
  } else if (errorType === 'auth_error') {
    label = '⚠ AI Auth Failed';
    reason = 'OpenRouter API key could not be authenticated. Using Demo Mode.';
  } else if (errorType === 'api_error') {
    label = '⚠ AI Unavailable';
    reason = "Couldn't reach Smart Filing AI. Using Demo Mode.";
  }

  return (
    <div className="sf-ai-status sf-ai-status--demo" title={reason}>
      <span className="sf-ai-dot sf-ai-dot--demo" />
      {label}
    </div>
  );
}

// ─── Progress bar ─────────────────────────────────────────────────────────────

function SmartProgress({ steps, current }) {
  return (
    <div className="sf-progress">
      {steps.map((s, i) => (
        <div key={s} className={`sf-progress-step ${i < current ? 'done' : i === current ? 'active' : 'pending'}`}>
          <span className="sf-progress-num">{i < current ? '✓' : i + 1}</span>
          <span className="sf-progress-label">{s}</span>
          {i < steps.length - 1 && <span className="sf-progress-line" />}
        </div>
      ))}
    </div>
  );
}

// ─── Clarification UI ─────────────────────────────────────────────────────────

function ClarificationQuestion({ question, questionType, choices, onAnswer }) {
  const [textAnswer, setTextAnswer] = useState('');
  return (
    <div className="sf-question-card">
      <p className="sf-question-text">{question}</p>
      {questionType === 'yesno' && (
        <div className="sf-quick-answers">
          <button className="sf-ans-btn sf-ans-yes" onClick={() => onAnswer('Yes')}>Yes</button>
          <button className="sf-ans-btn sf-ans-no" onClick={() => onAnswer('No')}>No</button>
          <button className="sf-ans-btn sf-ans-unsure" onClick={() => onAnswer("I'm not sure")}>I'm not sure</button>
        </div>
      )}
      {questionType === 'choice' && choices && (
        <div className="sf-quick-answers">
          {choices.map(c => <button key={c} className="sf-ans-btn" onClick={() => onAnswer(c)}>{c}</button>)}
        </div>
      )}
      {(questionType === 'text' || !questionType) && (
        <div className="sf-text-answer">
          <input
            type="text"
            className="sf-answer-input"
            placeholder="Type your answer…"
            value={textAnswer}
            onChange={e => setTextAnswer(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && textAnswer.trim() && onAnswer(textAnswer.trim())}
            autoFocus
          />
          <button
            className="action-btn primary-action-btn"
            onClick={() => textAnswer.trim() && onAnswer(textAnswer.trim())}
          >
            Continue →
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Per-transaction review card ──────────────────────────────────────────────

// ─── Per-transaction review card ──────────────────────────────────────────────

function TransactionReviewCard({ tx, computed, index, onEdit, onRemove }) {
  const [showExplain, setShowExplain] = useState(true);
  const [showTech, setShowTech] = useState(false);
  const cls = tx.classification || {};
  const isExport = tx.type === 'EXPORT';
  const isIntra = computed?.pos === SELLER_STATE_CODE;
  const posName = PLACES_OF_SUPPLY.find(p => p.code === computed?.pos)?.name || computed?.pos || 'Unknown';

  const confidenceScore = Math.round((cls.confidence || 0.95) * 100);

  return (
    <div className="sf-review-card">
      <div className="sf-review-header">
        <div className="sf-review-txnum">#{index + 1}</div>
        <div className="sf-classification-tag">
          <span className="sf-cls-section">{cls.section || (tx.type === 'B2B' ? '4A' : tx.type === 'B2C' ? '5' : tx.type === 'EXPORT' ? '6A' : '9B')}</span>
          <span className="sf-cls-label">{cls.label || `${tx.type} Invoices`}</span>
        </div>
        {tx.status === 'needs_clarification' ? (
          <span className="sf-review-needs-badge">⚠ Needs info</span>
        ) : (
          <span className="sf-confidence-badge" title="AI Entity & Rule Confidence">
            ✓ {confidenceScore}% Confidence
          </span>
        )}
      </div>

      <div className="sf-review-body">
        {tx.type === 'EXPORT' ? (
          <div className="sf-review-row"><span>Export Country</span><strong>{tx.exportCountry || '—'}</strong></div>
        ) : (
          <div className="sf-review-row">
            <span>Buyer / Recipient</span>
            <strong>{tx.recipient?.name || '—'}</strong>
          </div>
        )}
        {tx.recipient?.gstin && (
          <div className="sf-review-row"><span>GSTIN</span><code>{tx.recipient.gstin}</code></div>
        )}
        {tx.type !== 'EXPORT' && computed?.pos && (
          <div className="sf-review-row">
            <span>Place of Supply</span>
            <span>{computed.pos} — {posName}</span>
          </div>
        )}
        <div className="sf-review-divider" />
        <div className="sf-review-row accent">
          <span>Taxable Value</span>
          <strong>{formatCurrency(computed?.taxableValue || 0)}</strong>
        </div>
        {!isExport && computed?.gstRate > 0 && (
          <>
            <div className="sf-review-row"><span>GST Rate</span><span>{computed.gstRate}%</span></div>
            {computed.igst > 0 && <div className="sf-review-row"><span>IGST</span><span>{formatCurrency(computed.igst)}</span></div>}
            {computed.cgst > 0 && <div className="sf-review-row"><span>CGST</span><span>{formatCurrency(computed.cgst)}</span></div>}
            {computed.sgst > 0 && <div className="sf-review-row"><span>SGST</span><span>{formatCurrency(computed.sgst)}</span></div>}
          </>
        )}
        {isExport && (
          <div className="sf-review-row"><span>Export Type</span><span>{tx.exportType === 'WOPT' ? 'Without Payment of Tax' : 'With Payment of Tax'}</span></div>
        )}
      </div>

      {/* ─── Trust & Explainability Provenance Drawer ─── */}
      <div className="sf-provenance-box">
        <div className="sf-provenance-header" onClick={() => setShowExplain(e => !e)}>
          <span className="sf-provenance-title">
            <span className="sf-prov-icon">🔍</span> Why GEZT Classified This (Audit Trail)
          </span>
          <button type="button" className="sf-prov-toggle">{showExplain ? 'Hide details ▴' : 'Show details ▾'}</button>
        </div>
        {showExplain && (
          <div className="sf-provenance-content">
            <div className="sf-prov-step">
              <span className="sf-prov-bullet">1</span>
              <div>
                <strong>Entity Detection:</strong>{' '}
                {tx.type === 'B2B' && tx.recipient?.gstin
                  ? `Valid 15-digit GSTIN (${tx.recipient.gstin}) detected. State code ${tx.pos || tx.recipient.gstin.substring(0, 2)} (${posName}).`
                  : tx.type === 'EXPORT'
                  ? `International destination (${tx.exportCountry || 'Overseas'}) detected -> classified as zero-rated export supply.`
                  : tx.type === 'CDN'
                  ? `Credit/debit adjustment detected referencing sales return or price modification.`
                  : `Unregistered retail buyer detected with domestic delivery -> classified as B2C supply.`}
              </div>
            </div>
            <div className="sf-prov-step">
              <span className="sf-prov-bullet">2</span>
              <div>
                <strong>Tax Treatment Rule:</strong>{' '}
                {isExport
                  ? 'Section 16 IGST Act: Zero-rated export supply under Letter of Undertaking (LUT / WOPT).'
                  : isIntra
                  ? `Intra-State Supply (Karnataka -> Karnataka) -> Equal split: ${computed?.gstRate ? computed.gstRate / 2 : 9}% CGST + ${computed?.gstRate ? computed.gstRate / 2 : 9}% SGST.`
                  : `Inter-State Supply (Karnataka -> ${posName}) -> 100% IGST (${computed?.gstRate || 18}%).`}
              </div>
            </div>
            <div className="sf-prov-step">
              <span className="sf-prov-bullet">3</span>
              <div>
                <strong>Deterministic Math:</strong>{' '}
                {isExport
                  ? `Taxable: ${formatCurrency(computed?.taxableValue || 0)} | GST Rate: 0% | Tax Payable: ₹0`
                  : `Taxable: ${formatCurrency(computed?.taxableValue || 0)} × Rate: ${computed?.gstRate || 18}% = Total Tax: ${formatCurrency((computed?.igst || 0) + (computed?.cgst || 0) + (computed?.sgst || 0))}`}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="sf-review-card-actions">
        <button className="action-btn" onClick={() => onEdit(index)}>✎ Edit Details</button>
        <button className="action-btn sf-reject-btn" onClick={() => onRemove(index)}>✕ Remove</button>
      </div>
    </div>
  );
}

// ─── Sequential Wizard Review UI ──────────────────────────────────────────────

function SequentialWizardReview({
  items,
  source,
  errorType,
  onClarify,
  onEdit,
  onRemove,
  onConfirmItem,
  onAddAll,
}) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const readyCount = items.filter(i => (i.status === 'ready' || i.status === 'complete') && i.computed).length;
  const needsCount = items.filter(i => i.status === 'needs_clarification').length;
  const totalTaxable = items.reduce((sum, item) => sum + (item.computed?.taxableValue || item.tx?.taxableValue || 0), 0);

  const isSummaryView = currentIndex >= items.length;
  const currentItem = !isSummaryView ? items[currentIndex] : null;

  const handleNext = () => {
    if (currentIndex < items.length) {
      if (onConfirmItem) {
        onConfirmItem(currentIndex);
      }
      if (currentIndex < items.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else {
        setCurrentIndex(items.length);
      }
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const handleAnswerAndNext = async (ans) => {
    await onClarify(currentIndex, ans);
    if (currentIndex < items.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setCurrentIndex(items.length);
    }
  };

  return (
    <div className="sf-wizard-container">
      {/* Header */}
      <div className="sf-multi-header">
        <div className="sf-wizard-title-group">
          <h3>Sequential Invoice Review</h3>
          <span className="sf-wizard-counter">
            {isSummaryView ? 'Final Batch Summary' : `Invoice ${currentIndex + 1} of ${items.length}`}
          </span>
        </div>
        <AIStatusIndicator source={source} errorType={errorType} />
      </div>

      {/* Pills Navigation Bar */}
      <div className="sf-wizard-pills-bar">
        <div className="sf-wizard-pills">
          {items.map((item, idx) => {
            const isDone = (item.status === 'ready' || item.status === 'complete') && item.computed;
            const isWarn = item.status === 'needs_clarification';
            const isErr = item.status === 'error';
            const isActive = idx === currentIndex && !isSummaryView;

            return (
              <button
                key={idx}
                className={`sf-wizard-pill ${isActive ? 'active' : ''} ${isDone ? 'done' : ''} ${isWarn ? 'warn' : ''} ${isErr ? 'err' : ''}`}
                onClick={() => setCurrentIndex(idx)}
                title={item.title}
              >
                <span className="sf-pill-num">#{idx + 1}</span>
                <span className="sf-pill-name">{item.title}</span>
                <span className="sf-pill-status">
                  {isDone ? '✓' : isWarn ? '⚠' : isErr ? '✕' : '○'}
                </span>
              </button>
            );
          })}
          <button
            className={`sf-wizard-pill sf-wizard-pill--summary ${isSummaryView ? 'active' : ''}`}
            onClick={() => setCurrentIndex(items.length)}
            id="pill-summary-view"
          >
            ★ Summary & File ({readyCount}/{items.length})
          </button>
        </div>
      </div>

      {/* 1-by-1 Step Card */}
      {!isSummaryView && currentItem && (
        <div className="sf-wizard-step-card">
          <div className="sf-wizard-step-meta">
            <span className="sf-wizard-step-num">Invoice {currentIndex + 1} of {items.length}</span>
            <span className="sf-wizard-step-filename">📄 {currentItem.title}</span>
          </div>

          {currentItem.status === 'needs_clarification' ? (
            <div className="sf-tx-clarify-block sf-wizard-focus-box">
              <div className="sf-review-header">
                <div className="sf-review-txnum">#{currentIndex + 1}</div>
                <div className="sf-classification-tag">
                  <span className="sf-cls-section">{currentItem.tx?.classification?.section || '?'}</span>
                  <span className="sf-cls-label">{currentItem.type}</span>
                </div>
                <span className="sf-review-needs-badge">⚠ Question for Invoice #{currentIndex + 1}</span>
              </div>

              {currentItem.tx?.recipient?.name && (
                <p className="sf-tx-buyer-hint">Buyer / Recipient: <strong>{currentItem.tx.recipient.name}</strong></p>
              )}
              {(currentItem.computed?.taxableValue > 0 || currentItem.tx?.taxableValue > 0) && (
                <p className="sf-tx-amount-hint">Taxable Amount: <strong>{formatCurrency(currentItem.computed?.taxableValue || currentItem.tx?.taxableValue || 0)}</strong></p>
              )}

              <ClarificationQuestion
                question={currentItem.question || `Item ${currentIndex + 1}: Please clarify details`}
                questionType={currentItem.questionType || 'text'}
                choices={currentItem.choices}
                onAnswer={handleAnswerAndNext}
              />

              <div style={{ marginTop: 12, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button
                  className="action-btn"
                  onClick={handleNext}
                >
                  Confirm with Standard Defaults →
                </button>
              </div>
            </div>
          ) : (currentItem.status === 'ready' || currentItem.status === 'complete') && currentItem.computed ? (
            <div className="sf-wizard-focus-box">
              <TransactionReviewCard
                tx={currentItem.tx}
                computed={currentItem.computed}
                index={currentIndex}
                onEdit={() => onEdit(currentIndex)}
                onRemove={() => {
                  onRemove(currentIndex);
                  if (currentIndex >= items.length - 1 && currentIndex > 0) {
                    setCurrentIndex(prev => prev - 1);
                  }
                }}
              />
            </div>
          ) : (
            <div className="sf-inv-error-note">
              <p>Could not process {currentItem.title}. {currentItem.error || ''}</p>
            </div>
          )}

          {/* Navigation Controls */}
          <div className="sf-wizard-nav-bar">
            <button
              className="action-btn"
              onClick={handlePrev}
              disabled={currentIndex === 0}
            >
              ← Previous Invoice
            </button>
            <div style={{ flex: 1 }} />
            {currentIndex < items.length - 1 ? (
              <button
                className="action-btn primary-action-btn"
                onClick={handleNext}
                id="btn-wizard-next"
              >
                Confirm & Next Invoice →
              </button>
            ) : (
              <button
                className="action-btn primary-action-btn"
                onClick={handleNext}
                id="btn-wizard-to-summary"
              >
                Confirm & Go to Final Summary →
              </button>
            )}
          </div>
        </div>
      )}

      {/* Summary Screen */}
      {isSummaryView && (
        <div className="sf-wizard-summary-card">
          <div className="sf-summary-header">
            <h2>✓ Batch Review Complete</h2>
            <p>All invoices have been reviewed. Confirm below to file all invoices into your GSTR-1 return.</p>
          </div>

          <div className="sf-summary-stats-grid">
            <div className="sf-summary-stat">
              <span>Ready for Filing</span>
              <strong>{readyCount} of {items.length}</strong>
            </div>
            <div className="sf-summary-stat">
              <span>Total Taxable Value</span>
              <strong>{formatCurrency(totalTaxable)}</strong>
            </div>
            {needsCount > 0 && (
              <div className="sf-summary-stat warn">
                <span>Needs Attention</span>
                <strong>{needsCount} items</strong>
              </div>
            )}
          </div>

          <div className="sf-summary-table-wrapper">
            <table className="sf-summary-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Invoice / Description</th>
                  <th>Type</th>
                  <th>Customer / Recipient</th>
                  <th>Taxable Value</th>
                  <th>GSTR-1 Table</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={i} className={item.status === 'needs_clarification' ? 'row-warn' : 'row-ok'}>
                    <td>{i + 1}</td>
                    <td><strong>{item.title}</strong></td>
                    <td><span className={`sf-type-chip sf-type-chip--${item.type.toLowerCase()}`}>{item.type}</span></td>
                    <td>{item.tx?.recipient?.name || '—'}</td>
                    <td>{formatCurrency(item.computed?.taxableValue || item.tx?.taxableValue || 0)}</td>
                    <td><code>GSTR-1 → {item.tx?.classification?.section || '4A'}</code></td>
                    <td>
                      {(item.status === 'ready' || item.status === 'complete') && item.computed ? (
                        <span className="badge-ok">✓ Ready</span>
                      ) : item.status === 'needs_clarification' ? (
                        <button className="badge-warn-btn" onClick={() => setCurrentIndex(i)}>⚠ Resolve</button>
                      ) : (
                        <span className="badge-err">✕ Error</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="sf-summary-actions">
            <button
              className="action-btn"
              onClick={() => setCurrentIndex(0)}
            >
              ← Back to Review Invoices
            </button>
            <button
              className="action-btn primary-action-btn sf-bulk-add-btn"
              onClick={onAddAll}
              disabled={readyCount === 0}
              id="btn-sf-add-all"
            >
              Add All {readyCount} Invoices to GSTR-1 →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Multi-transaction review UI ──────────────────────────────────────────────

function MultiTransactionReview({ transactions, computedList, source, mockReason, errorType, onAddAll, onRemove, onEdit, onClarify, onConfirmItem }) {
  const items = transactions.map((tx, i) => ({
    id: i,
    title: tx.recipient?.name || (tx.type === 'EXPORT' ? `Export to ${tx.exportCountry || 'Overseas'}` : `Transaction #${i + 1}`),
    type: tx.type,
    status: tx.status === 'complete' ? 'ready' : tx.status,
    tx,
    computed: computedList[i],
    question: tx.clarificationQuestion,
    questionType: tx.clarificationQuestionType,
    choices: tx.clarificationChoices,
    source,
  }));

  return (
    <SequentialWizardReview
      items={items}
      source={source}
      errorType={errorType}
      onClarify={onClarify}
      onEdit={onEdit}
      onRemove={onRemove}
      onConfirmItem={onConfirmItem}
      onAddAll={onAddAll}
    />
  );
}

// ─── Edit transaction modal ───────────────────────────────────────────────────

function EditTransactionModal({ tx, computed, onSave, onClose }) {
  const [edited, setEdited] = useState({
    taxableValue: computed?.taxableValue || 0,
    gstRate: computed?.gstRate || 18,
    invoiceNo: computed?.invoiceNo || computed?.noteNo || '',
    invoiceDate: computed?.invoiceDate || computed?.noteDate || '',
    pos: computed?.pos || '29',
    recipientName: computed?.recipientName || tx?.recipient?.name || '',
    recipientGstin: computed?.recipientGstin || tx?.recipient?.gstin || '',
  });
  const [errors, setErrors] = useState({});

  const handleSave = () => {
    const errs = {};
    if (!edited.taxableValue || isNaN(edited.taxableValue)) errs.taxableValue = 'Enter a valid amount';
    if (Object.keys(errs).length) { setErrors(errs); return; }
    const updatedTx = {
      ...tx,
      taxableValue: Number(edited.taxableValue),
      gstRate: Number(edited.gstRate),
      pos: edited.pos,
      invoice: { number: edited.invoiceNo, date: edited.invoiceDate },
      recipient: { name: edited.recipientName, gstin: edited.recipientGstin },
    };
    onSave(updatedTx, computeTransaction(updatedTx, computed?.id));
  };

  return (
    <div className="sf-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sf-modal">
        <div className="sf-modal-header">
          <h3>Edit Transaction</h3>
          <button className="sf-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="sf-edit-grid">
          {tx?.type !== 'EXPORT' && (
            <div className="field">
              <label>Recipient Name</label>
              <input type="text" value={edited.recipientName} onChange={e => setEdited(p => ({ ...p, recipientName: e.target.value }))} />
            </div>
          )}
          {tx?.type === 'B2B' && (
            <div className="field">
              <label>GSTIN</label>
              <input type="text" value={edited.recipientGstin} onChange={e => setEdited(p => ({ ...p, recipientGstin: e.target.value.toUpperCase() }))} maxLength={15} />
            </div>
          )}
          <div className="field">
            <label>Invoice / Note Number</label>
            <input type="text" value={edited.invoiceNo} onChange={e => setEdited(p => ({ ...p, invoiceNo: e.target.value }))} />
          </div>
          <div className="field">
            <label>Date</label>
            <input type="date" value={edited.invoiceDate} onChange={e => setEdited(p => ({ ...p, invoiceDate: e.target.value }))} />
          </div>
          {tx?.type !== 'EXPORT' && (
            <div className="field">
              <label>Place of Supply</label>
              <select value={edited.pos} onChange={e => setEdited(p => ({ ...p, pos: e.target.value }))}>
                {PLACES_OF_SUPPLY.map(p => <option key={p.code} value={p.code}>{p.code} — {p.name}</option>)}
              </select>
            </div>
          )}
          <div className="field">
            <label>Taxable Value (₹) *</label>
            <input type="number" value={edited.taxableValue} onChange={e => setEdited(p => ({ ...p, taxableValue: e.target.value }))} />
            {errors.taxableValue && <span className="field-error">{errors.taxableValue}</span>}
          </div>
          {tx?.type !== 'EXPORT' && (
            <div className="field">
              <label>GST Rate</label>
              <select value={edited.gstRate} onChange={e => setEdited(p => ({ ...p, gstRate: e.target.value }))}>
                <option value="5">5%</option>
                <option value="12">12%</option>
                <option value="18">18%</option>
                <option value="28">28%</option>
              </select>
            </div>
          )}
        </div>
        <div className="sf-modal-footer">
          <button className="action-btn primary-action-btn" onClick={handleSave}>Save Changes</button>
          <button className="action-btn" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ─── Success State ────────────────────────────────────────────────────────────

function AddedSuccess({ lastTxType, count, navigate, onAddAnother }) {
  const section = getSectionNav(lastTxType || 'B2B');
  return (
    <div className="sf-added-success">
      <div className="sf-success-icon">✓</div>
      <h2>{count > 1 ? `${count} transactions` : 'Transaction'} added to your GSTR-1</h2>
      <p className="sf-success-where">
        GEZT placed {count > 1 ? 'them' : 'it'} in:<br />
        <strong>{section.label}</strong>
      </p>
      <div className="sf-success-actions">
        <button className="action-btn primary-action-btn" onClick={() => navigate(section.dest)} id="btn-view-in-gstr1">
          View in GSTR-1 →
        </button>
        <button className="action-btn" onClick={() => navigate('online-summary')}>Go to Summary</button>
        <button className="action-btn" onClick={onAddAnother}>+ Add another transaction</button>
      </div>
    </div>
  );
}

// ─── CONVERSATIONAL MODE ──────────────────────────────────────────────────────

function ConversationalMode({ navigate, setFilingState, onBack }) {
  const STEPS = ['Describe', 'Review', 'Add to return'];
  const [step, setStep] = useState(0); // 0=describe, 1=review/clarify, 2=done
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [errorType, setErrorType] = useState(null);

  // Multi-transaction session state
  const [session, setSession] = useState({
    transactions: [],       // raw tx objects from AI
    computedList: [],       // computed records (parallel array)
    conversationHistory: [],
    source: null,
    mockReason: null,
    message: '',
  });
  const [editingIndex, setEditingIndex] = useState(null);
  const [addedResult, setAddedResult] = useState(null);

  const examples = [
    'I sold ₹50,000 of shirts to ABC Traders. GSTIN is 29ABCDE1234F1Z5.',
    'I sold ₹20,000 of clothes to a retail customer and exported ₹80,000 of garments to Dubai.',
    'Sold 10 laptops to TechCorp GSTIN 27TECHC1234F1Z5 for ₹59,000 including 18% GST',
    'Issued a credit note for ₹5,000 to XYZ Traders',
  ];

  const processInput = useCallback(async (userText, existingHistory) => {
    setLoading(true);
    setError('');
    setErrorType(null);

    const newHistory = [...existingHistory, { role: 'user', content: userText }];

    try {
      let result;
      try {
        result = await callLLM(newHistory);
      } catch (err) {
        const etype = err.smartFilingErrorType || 'api_error';
        setErrorType(etype);
        if (etype === 'auth_error') {
          setError("Your OpenRouter API key could not be authenticated. Smart Filing is running in Demo Mode.");
        } else {
          setError("Smart Filing AI is temporarily unavailable.");
        }
        // On API failure — use mock but BE EXPLICIT
        result = { ...getMockResponse(newHistory), mockReason: etype };
      }

      if (!result || !Array.isArray(result.transactions)) {
        throw new Error('Invalid response structure');
      }

      const computedList = result.transactions.map(tx =>
        tx.status === 'complete' ? computeTransaction(tx) : null
      );

      setSession(prev => ({
        transactions: result.transactions,
        computedList,
        conversationHistory: newHistory,
        source: result.source || 'mock',
        mockReason: result.mockReason || null,
        message: result.message || '',
      }));

      setStep(1); // always go to review
    } catch (e) {
      console.error('[Smart Filing] processInput error:', e);
      setError('Smart Filing could not process that. Please try rephrasing, or use Online Filing.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSubmit = () => {
    if (!inputText.trim()) return;
    processInput(inputText.trim(), []);
  };

  const handleConfirmItem = useCallback((txIndex) => {
    setSession(prev => {
      const tx = prev.transactions[txIndex];
      if (!tx) return prev;
      const completedTx = { ...tx, status: 'complete' };
      const computed = computeTransaction(completedTx);
      const newTxs = [...prev.transactions];
      const newComputed = [...prev.computedList];
      newTxs[txIndex] = completedTx;
      newComputed[txIndex] = computed;
      return {
        ...prev,
        transactions: newTxs,
        computedList: newComputed,
      };
    });
  }, []);

  const handleClarify = useCallback(async (txIndex, answer) => {
    const currentTx = session.transactions[txIndex];
    const ansLower = String(answer).toLowerCase().trim();

    // Fast local resolution for common questions
    let localUpdatedTx = null;
    if (ansLower === 'no' || ansLower === 'not registered' || ansLower.includes('unregistered')) {
      localUpdatedTx = {
        ...currentTx,
        type: currentTx?.type === 'EXPORT' ? 'EXPORT' : 'B2C',
        status: 'complete',
        recipient: { ...currentTx?.recipient, gstin: '' },
        pos: currentTx?.pos || '29',
        exportType: 'WOPT',
      };
    } else if (ansLower === 'yes' || ansLower.includes('registered')) {
      localUpdatedTx = {
        ...currentTx,
        type: 'B2B',
        status: 'needs_clarification',
        clarificationQuestion: `What is ${currentTx?.recipient?.name || 'the buyer'}'s 15-digit GSTIN?`,
        clarificationQuestionType: 'text',
      };
    } else if (/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/i.test(answer.trim())) {
      const gstin = answer.trim().toUpperCase();
      localUpdatedTx = {
        ...currentTx,
        type: 'B2B',
        status: 'complete',
        recipient: { ...currentTx?.recipient, gstin },
        pos: gstin.substring(0, 2),
      };
    }

    if (localUpdatedTx && (session.source === 'mock' || !HAS_KEY)) {
      const newTxs = [...session.transactions];
      const newComputed = [...session.computedList];
      newTxs[txIndex] = localUpdatedTx;
      newComputed[txIndex] = localUpdatedTx.status === 'complete' ? computeTransaction(localUpdatedTx) : null;
      setSession(prev => ({
        ...prev,
        transactions: newTxs,
        computedList: newComputed,
      }));
      return;
    }

    // AI API clarification call
    const clarifyMsg = `For transaction ${txIndex + 1} (${session.transactions[txIndex]?.recipient?.name || session.transactions[txIndex]?.type || 'the transaction'}): ${answer}`;
    const updatedHistory = [
      ...session.conversationHistory,
      { role: 'assistant', content: session.transactions[txIndex]?.clarificationQuestion || 'Clarification needed' },
      { role: 'user', content: clarifyMsg },
    ];

    setLoading(true);
    setError('');
    try {
      let result;
      try {
        result = await callLLM(updatedHistory);
      } catch (err) {
        result = { ...getMockResponse(updatedHistory), mockReason: err.smartFilingErrorType || 'api_error' };
      }

      if (!result || !Array.isArray(result.transactions)) {
        throw new Error('Invalid response');
      }

      const newTxs = [...session.transactions];
      const newComputed = [...session.computedList];

      result.transactions.forEach((newTx, ni) => {
        const matchIdx = session.transactions.findIndex(t => t.tempId === newTx.tempId);
        const targetIdx = matchIdx >= 0 ? matchIdx : (ni === 0 ? txIndex : ni);
        if (targetIdx < newTxs.length) {
          newTxs[targetIdx] = newTx;
          newComputed[targetIdx] = newTx.status === 'complete' ? computeTransaction(newTx) : null;
        }
      });

      setSession(prev => ({
        ...prev,
        transactions: newTxs,
        computedList: newComputed,
        conversationHistory: updatedHistory,
        source: result.source || 'mock',
        mockReason: result.mockReason || null,
        message: result.message || '',
      }));
    } catch (e) {
      console.error('[Smart Filing] Clarification error:', e);
      setError('Could not process the clarification. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [session]);

  const handleEdit = (index) => setEditingIndex(index);

  const handleEditSave = (updatedTx, updatedComputed) => {
    if (editingIndex === null) return;
    const newTxs = [...session.transactions];
    const newComputed = [...session.computedList];
    newTxs[editingIndex] = { ...updatedTx, status: 'complete' };
    newComputed[editingIndex] = updatedComputed;
    setSession(prev => ({ ...prev, transactions: newTxs, computedList: newComputed }));
    setEditingIndex(null);
  };

  const handleRemove = (index) => {
    const newTxs = session.transactions.filter((_, i) => i !== index);
    const newComputed = session.computedList.filter((_, i) => i !== index);
    setSession(prev => ({ ...prev, transactions: newTxs, computedList: newComputed }));
  };

  const handleAddAll = () => {
    // Ensure all transactions in session are computed/ready for filing
    const finalComputedList = session.transactions.map((tx, i) => {
      if (session.computedList[i]) return session.computedList[i];
      return computeTransaction({ ...tx, status: 'complete' });
    });

    const readyPairs = session.transactions
      .map((tx, i) => ({ txType: tx.type, record: finalComputedList[i] }))
      .filter(p => p.record);

    if (!readyPairs.length) return;

    insertBatchTransactions(readyPairs, setFilingState);

    const lastType = readyPairs[readyPairs.length - 1].txType;
    setAddedResult({ count: readyPairs.length, lastType });
    setStep(2);
  };

  const handleAddAnother = () => {
    setStep(0);
    setInputText('');
    setSession({ transactions: [], computedList: [], conversationHistory: [], source: null, mockReason: null, message: '' });
    setAddedResult(null);
    setError('');
    setErrorType(null);
  };

  const handleRetryAI = () => {
    setError('');
    setErrorType(null);
    if (inputText.trim()) processInput(inputText.trim(), []);
  };

  const progressStep = step === 0 ? 0 : step === 1 ? 1 : 2;
  const isUsingMock = session.source === 'mock';

  return (
    <div className="sf-mode-container">
      <button className="sf-back-btn" onClick={onBack}>← Back</button>
      <div className="sf-mode-header">
        <h2>Tell us what happened</h2>
        <p>Describe one or more business transactions in plain language. GEZT will identify and classify each one.</p>
      </div>
      <SmartProgress steps={STEPS} current={progressStep} />

      {step === 0 && (
        <div className="sf-describe-area">
          {HAS_KEY ? (
            <div className="sf-ai-status sf-ai-status--live">
              <span className="sf-ai-dot sf-ai-dot--live" />
              OpenRouter AI · {MODEL}
            </div>
          ) : (
            <div className="sf-ai-status sf-ai-status--demo">
              <span className="sf-ai-dot sf-ai-dot--demo" />
              Demo Mode — configure OPENROUTER_API_KEY for real AI
            </div>
          )}

          <textarea
            className="sf-main-textarea"
            rows={6}
            placeholder={
              "e.g. I sold ₹50,000 of shirts to ABC Traders (GSTIN: 29ABCDE1234F1Z5), " +
              "₹20,000 of clothes to Priya (retail), " +
              "and exported ₹80,000 of garments to a customer in Dubai."
            }
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) handleSubmit(); }}
            id="sf-description-input"
            autoFocus
          />
          <div className="sf-describe-footer">
            <div className="sf-examples">
              <span className="sf-examples-label">Try:</span>
              {examples.map(ex => (
                <button key={ex} className="sf-example-chip" onClick={() => setInputText(ex)}>{ex}</button>
              ))}
            </div>
            <button
              className="action-btn primary-action-btn sf-submit-btn"
              onClick={handleSubmit}
              disabled={!inputText.trim() || loading}
              id="btn-sf-describe-submit"
            >
              {loading ? 'Analysing…' : 'Analyse →'}
            </button>
          </div>
          {loading && (
            <div className="sf-loading-state">
              <span className="spinner" />
              <span>GEZT is analysing your transaction{inputText.includes('and') || inputText.includes(',') ? 's' : ''}…</span>
            </div>
          )}
          {error && (
            <div className="sf-error-card">
              <p>{error}</p>
              <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                {HAS_KEY && <button className="action-btn" onClick={handleRetryAI}>⟳ Retry AI</button>}
                <button className="action-btn" onClick={() => { setError(''); }}>Use Demo Mode</button>
                <button className="action-btn" onClick={() => navigate('online-b2b')}>Online Filing</button>
              </div>
            </div>
          )}
        </div>
      )}

      {step === 1 && session.transactions.length > 0 && (
        <div className="sf-review-area">
          {loading && (
            <div className="sf-loading-state">
              <span className="spinner" />
              <span>Working out the details…</span>
            </div>
          )}
          {!loading && (
            <>
              {session.message && <p className="sf-ai-message">{session.message}</p>}
              {isUsingMock && (
                <div className="sf-demo-banner">
                  <span>⚠ Demo Mode</span>
                  <span>
                    {session.mockReason === 'auth_error'
                      ? 'OpenRouter API key authentication failed. This response is from the local demo engine.'
                      : session.mockReason === 'api_error'
                      ? 'Smart Filing AI is temporarily unavailable. This response is from the local demo engine.'
                      : 'Running on local demo engine. Configure OPENROUTER_API_KEY for real AI.'}
                  </span>
                  {HAS_KEY && (
                    <button className="action-btn sf-retry-btn" onClick={handleRetryAI}>⟳ Retry AI</button>
                  )}
                </div>
              )}
              <MultiTransactionReview
                transactions={session.transactions}
                computedList={session.computedList}
                source={session.source}
                mockReason={session.mockReason}
                errorType={errorType}
                onAddAll={handleAddAll}
                onRemove={handleRemove}
                onEdit={handleEdit}
                onClarify={handleClarify}
                onConfirmItem={handleConfirmItem}
              />
            </>
          )}
          {error && (
            <div className="sf-error-card">
              <p>{error}</p>
              <button className="action-btn" onClick={() => setError('')}>Dismiss</button>
            </div>
          )}
        </div>
      )}

      {step === 2 && addedResult && (
        <AddedSuccess
          lastTxType={addedResult.lastType}
          count={addedResult.count}
          navigate={navigate}
          onAddAnother={handleAddAnother}
        />
      )}

      {editingIndex !== null && (
        <EditTransactionModal
          tx={session.transactions[editingIndex]}
          computed={session.computedList[editingIndex]}
          onSave={(updatedTx, updatedComputed) => {
            const newTxs = [...session.transactions];
            const newComputed = [...session.computedList];
            newTxs[editingIndex] = { ...updatedTx, status: 'complete' };
            newComputed[editingIndex] = updatedComputed;
            setSession(prev => ({ ...prev, transactions: newTxs, computedList: newComputed }));
            setEditingIndex(null);
          }}
          onClose={() => setEditingIndex(null)}
        />
      )}
    </div>
  );
}

// ─── UPLOAD MODE ──────────────────────────────────────────────────────────────

const UPLOAD_STEPS = ['Upload', 'Extract', 'Review', 'Add to return'];

function InvoiceStatusIcon({ status }) {
  if (status === 'ready') return <span className="sf-inv-icon sf-inv-ready">✓</span>;
  if (status === 'needs_clarification') return <span className="sf-inv-icon sf-inv-warn">⚠</span>;
  if (status === 'error') return <span className="sf-inv-icon sf-inv-error">✕</span>;
  if (status === 'processing') return <span className="sf-inv-icon"><span className="spinner" /></span>;
  return <span className="sf-inv-icon sf-inv-pending">○</span>;
}

function UploadMode({ navigate, setFilingState, onBack }) {
  const [uploadStep, setUploadStep] = useState(0);
  const [files, setFiles] = useState([]);
  const [results, setResults] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [addedCount, setAddedCount] = useState(0);
  const [lastTxType, setLastTxType] = useState('B2B');
  const fileInputRef = useRef(null);

  const SAMPLE_SCENARIOS = [
    {
      name: 'INV-901_TechCorp_B2B.txt',
      label: 'B2B Hardware Invoice (₹59,000)',
      type: 'B2B',
      content: 'TAX INVOICE\nInvoice No: INV-901\nInvoice Date: 2026-09-04\nSupplier: ShreeTech Electronics (29MOCK1234F1Z5)\nBill To: TechCorp Solutions Pvt Ltd\nBuyer GSTIN: 27TECHC1234F1Z5\nPlace of Supply: 27 - Maharashtra\nItem: Server Units (HSN 8471)\nTaxable Value: ₹50,000\nIGST @ 18%: ₹9,000\nTotal Invoice Value: ₹59,000',
    },
    {
      name: 'EXP-402_Dubai_Export.txt',
      label: 'Export to Dubai ($2,400)',
      type: 'EXPORT',
      content: 'EXPORT INVOICE (SUPPLY UNDER BOND/LUT - WOPT)\nInvoice No: EXP-402\nInvoice Date: 2026-09-12\nExporter: ShreeTech Electronics (29MOCK1234F1Z5)\nConsignee: Gulf Trading FZE, Dubai, UAE\nCountry of Destination: United Arab Emirates\nPort of Export: INMAA4 (Chennai Sea Port)\nShipping Bill No: SB-2026-99214\nShipping Bill Date: 2026-09-13\nCurrency: USD\nForeign Value: $2,400\nTaxable Value (INR): ₹1,99,200\nGST: Zero Rated (0%)',
    },
    {
      name: 'CSH-504_Retail_Walkin.txt',
      label: 'Retail Cash Memo (₹14,500)',
      type: 'B2C',
      content: 'RETAIL CASH MEMO\nBill No: CSH-504\nDate: 2026-09-15\nSeller: ShreeTech Electronics\nCustomer: Priya Sharma (Unregistered Consumer / Walk-in)\nPlace of Supply: 29 - Karnataka\nItem: Computer Accessories\nTaxable Value: ₹12,288\nCGST @ 9%: ₹1,106\nSGST @ 9%: ₹1,106\nTotal Invoice Amount: ₹14,500',
    },
    {
      name: 'CDN-108_SalesReturn.txt',
      label: 'Credit Note for Sales Return (₹5,900)',
      type: 'CDN',
      content: 'CREDIT NOTE\nNote No: CDN-108\nNote Date: 2026-09-18\nRecipient: ABC Technologies Pvt Ltd (27AAABM1234C1ZK)\nOriginal Invoice No: INV-1042\nOriginal Invoice Date: 2026-09-03\nReason for Note: Sales return / Defective unit replacement\nTaxable Value: ₹5,000\nIGST @ 18%: ₹900\nTotal Credit Note Value: ₹5,900',
    },
  ];

  const loadScenario = (scenario) => {
    const blob = new Blob([scenario.content], { type: 'text/plain' });
    const f = new File([blob], scenario.name, { type: 'text/plain' });
    setFiles([f]);
  };

  const loadAllScenarios = () => {
    const allFiles = SAMPLE_SCENARIOS.map(s => {
      const blob = new Blob([s.content], { type: 'text/plain' });
      return new File([blob], s.name, { type: 'text/plain' });
    });
    setFiles(allFiles);
  };

  const handleFiles = (newFiles) => {
    const accepted = Array.from(newFiles).filter(f => {
      const ext = f.name.toLowerCase().match(/\.[^.]+$/)?.[0];
      return ['.txt', '.pdf', '.csv', '.json', '.png', '.jpg', '.jpeg', '.webp'].includes(ext) || f.type.startsWith('image/') || f.type === 'application/pdf';
    });
    if (!accepted.length) return;
    setFiles(prev => [...prev, ...accepted]);
  };

  const processAllFiles = async () => {
    if (!files.length) return;
    setUploadStep(1);
    const initialResults = files.map(f => ({ file: f, name: f.name, status: 'processing', aiResult: null, computed: null, error: null, source: null }));
    setResults(initialResults);

    const updatedResults = [...initialResults];
    for (let i = 0; i < files.length; i++) {
      await new Promise(r => setTimeout(r, 300 + Math.random() * 200));
      try {
        const file = files[i];
        const isImageOrPdf = file.type.startsWith('image/') || file.type === 'application/pdf';
        
        let textContent = '';
        let aiInput = null;

        if (isImageOrPdf) {
          const dataUrl = await readFileAsDataUrl(file);
          aiInput = { dataUrl, name: file.name };
          textContent = file.name;
        } else {
          textContent = await readFileAsText(file);
          aiInput = textContent;
        }

        let aiResult = null;
        if (HAS_KEY) {
          console.log(`[Smart Filing] Processing invoice ${i + 1}/${files.length}: ${file.name}`);
          aiResult = await callLLMForInvoice(aiInput);
        }

        if (!aiResult) {
          console.log(`[Smart Filing] Invoice ${i + 1} using Demo Mode extraction`);
          aiResult = getMockInvoiceResponse(file.name, textContent);
        }

        if (!aiResult || !Array.isArray(aiResult.transactions) || !aiResult.transactions.length) {
          updatedResults[i] = { ...updatedResults[i], status: 'error', error: 'Could not extract information from this document' };
        } else {
          const txArr = aiResult.transactions;
          const firstTx = txArr[0];
          if (firstTx.status === 'complete') {
            const rec = computeTransaction(firstTx);
            updatedResults[i] = { ...updatedResults[i], status: 'ready', aiResult, computed: rec, source: aiResult.source };
          } else {
            updatedResults[i] = { ...updatedResults[i], status: 'needs_clarification', aiResult, computed: null, source: aiResult.source };
          }
        }
      } catch (e) {
        updatedResults[i] = { ...updatedResults[i], status: 'error', error: e.message || 'Unexpected error' };
      }
      setResults([...updatedResults]);
    }
    setUploadStep(2);
  };

  const answerClarification = async (index, answer) => {
    const item = results[index];
    const firstTx = item.aiResult?.transactions?.[0];

    const updatedResults = [...results];
    updatedResults[index] = { ...updatedResults[index], status: 'processing' };
    setResults(updatedResults);

    try {
      let newTx;
      if (answer === 'Yes') {
        newTx = {
          ...firstTx,
          type: 'B2B',
          status: 'needs_clarification',
          clarificationQuestion: `What is ${firstTx?.recipient?.name || 'the buyer'}'s GSTIN?`,
          clarificationQuestionType: 'text',
        };
        updatedResults[index] = {
          ...updatedResults[index],
          status: 'needs_clarification',
          aiResult: { ...item.aiResult, transactions: [newTx] },
        };
      } else if (answer === 'No') {
        newTx = { ...firstTx, type: 'B2C', pos: '29', status: 'complete' };
        const rec = computeTransaction(newTx);
        updatedResults[index] = {
          ...updatedResults[index],
          status: 'ready',
          aiResult: { ...item.aiResult, transactions: [newTx] },
          computed: rec,
        };
      } else {
        // Treat as GSTIN answer
        const gstin = answer.trim().toUpperCase();
        newTx = {
          ...firstTx,
          type: 'B2B',
          status: 'complete',
          recipient: { ...firstTx?.recipient, gstin },
          pos: gstin.length === 15 ? gstin.substring(0, 2) : firstTx?.pos || '27',
        };
        const rec = computeTransaction(newTx);
        updatedResults[index] = {
          ...updatedResults[index],
          status: 'ready',
          aiResult: { ...item.aiResult, transactions: [newTx] },
          computed: rec,
        };
      }
    } catch {
      updatedResults[index] = { ...updatedResults[index], status: 'error', error: 'Could not process answer' };
    }
    setResults([...updatedResults]);
  };

  const handleConfirmUploadItem = (index) => {
    setResults(prev => {
      const item = prev[index];
      if (!item || !item.aiResult?.transactions?.[0]) return prev;
      const tx = item.aiResult.transactions[0];
      const completedTx = { ...tx, status: 'complete' };
      const rec = computeTransaction(completedTx);
      const updated = [...prev];
      updated[index] = {
        ...item,
        status: 'ready',
        computed: rec,
      };
      return updated;
    });
  };

  const addAll = () => {
    const readyItems = results
      .map(r => {
        if (r.status === 'ready' && r.computed && r.aiResult?.transactions?.[0]) {
          return { txType: r.aiResult.transactions[0].type, record: r.computed };
        }
        if (r.aiResult?.transactions?.[0]) {
          const rec = computeTransaction({ ...r.aiResult.transactions[0], status: 'complete' });
          if (rec) return { txType: r.aiResult.transactions[0].type, record: rec };
        }
        return null;
      })
      .filter(Boolean);

    if (!readyItems.length) return;

    insertBatchTransactions(readyItems, setFilingState);

    const lastType = readyItems[readyItems.length - 1].txType;
    setAddedCount(readyItems.length);
    setLastTxType(lastType);
    setUploadStep(3);
  };

  const readyCount = results.filter(r => r.status === 'ready').length;
  const needsCount = results.filter(r => r.status === 'needs_clarification').length;
  const errorCount = results.filter(r => r.status === 'error').length;
  const processingCount = results.filter(r => r.status === 'processing').length;

  return (
    <div className="sf-mode-container">
      <button className="sf-back-btn" onClick={onBack}>← Back</button>
      <div className="sf-mode-header">
        <h2>Upload invoices</h2>
        <p>Upload one or more invoices and GEZT will extract the GST details for you.</p>
        {HAS_KEY ? (
          <div className="sf-ai-status sf-ai-status--live" style={{ marginTop: 8 }}>
            <span className="sf-ai-dot sf-ai-dot--live" />
            OpenRouter AI · {MODEL}
          </div>
        ) : (
          <div className="sf-ai-status sf-ai-status--demo" style={{ marginTop: 8 }}>
            <span className="sf-ai-dot sf-ai-dot--demo" />
            Demo Mode
          </div>
        )}
      </div>
      <SmartProgress steps={UPLOAD_STEPS} current={uploadStep} />

      {uploadStep === 0 && (
        <div className="sf-upload-area">
          <div
            className={`sf-dropzone${dragging ? ' dragging' : ''}`}
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
            onClick={() => fileInputRef.current?.click()}
            id="sf-dropzone"
          >
            <span className="sf-drop-icon">↑</span>
            <p className="sf-drop-title">Upload invoice documents or take photo</p>
            <p className="sf-drop-sub">PDF, PNG, JPG, CSV, or TXT supported</p>
            <input ref={fileInputRef} type="file" multiple accept=".pdf,.txt,.csv,.json,image/*,application/pdf" style={{ display: 'none' }} onChange={e => handleFiles(e.target.files)} id="sf-file-input" />
          </div>

          {files.length > 0 && (
            <div className="sf-selected-files">
              <p className="sf-selected-label">{files.length} file{files.length > 1 ? 's' : ''} selected:</p>
              {files.map((f, i) => (
                <div key={i} className="sf-file-item">
                  <span className="sf-file-icon">📄</span>
                  <span className="sf-file-name">{f.name}</span>
                  <button className="sf-file-remove" onClick={() => setFiles(prev => prev.filter((_, j) => j !== i))}>✕</button>
                </div>
              ))}
            </div>
          )}

          <div className="sf-upload-actions">
            {files.length > 0 ? (
              <button className="action-btn primary-action-btn" onClick={processAllFiles} id="btn-sf-process">
                Extract from {files.length} invoice{files.length > 1 ? 's' : ''} →
              </button>
            ) : (
              <div className="sf-demo-scenarios-panel">
                <span className="sf-demo-scenarios-title">★ Instant Test Scenarios (No file required):</span>
                <div className="sf-scenario-chips">
                  {SAMPLE_SCENARIOS.map(s => (
                    <button
                      key={s.name}
                      className="sf-scenario-chip"
                      onClick={() => loadScenario(s)}
                      title={`Load ${s.label}`}
                    >
                      <span>{s.type}</span> {s.label}
                    </button>
                  ))}
                  <button className="sf-scenario-chip sf-scenario-chip--all" onClick={loadAllScenarios}>
                    ★ Load All 4 Scenarios
                  </button>
                </div>
              </div>
            )}
          </div>
          <p className="sf-upload-note">You stay in control. GEZT prepares the details and shows you what it understood before anything is added to your return.</p>
        </div>
      )}

      {uploadStep === 1 && (
        <div className="sf-processing-area">
          <h3>Processing your invoices</h3>
          <div className="sf-invoice-list">
            {results.map((r, i) => (
              <div key={i} className={`sf-invoice-item sf-inv-${r.status}`}>
                <InvoiceStatusIcon status={r.status} />
                <span className="sf-inv-name">{r.name}</span>
                <span className="sf-inv-label">
                  {r.status === 'processing' ? 'Extracting…'
                    : r.status === 'ready' ? `${r.aiResult?.transactions?.[0]?.classification?.section} — ${r.aiResult?.transactions?.[0]?.type}`
                    : r.status === 'needs_clarification' ? 'Needs clarification'
                    : r.status === 'error' ? 'Error'
                    : ''}
                </span>
                {r.source && (
                  <span className={`sf-inv-source ${r.source === 'openrouter' ? 'sf-inv-source--live' : 'sf-inv-source--demo'}`}>
                    {r.source === 'openrouter' ? '● AI' : '● Demo'}
                  </span>
                )}
              </div>
            ))}
          </div>
          {processingCount === 0 && (
            <button className="action-btn primary-action-btn" style={{ marginTop: 20 }} onClick={() => setUploadStep(2)}>
              Review Results →
            </button>
          )}
        </div>
      )}

      {uploadStep === 2 && (
        <SequentialWizardReview
          items={results.map((r, i) => ({
            id: i,
            title: r.name,
            type: r.aiResult?.transactions?.[0]?.type || 'B2B',
            status: r.status,
            tx: r.aiResult?.transactions?.[0],
            computed: r.computed,
            question: r.aiResult?.transactions?.[0]?.clarificationQuestion || r.aiResult?.question,
            questionType: r.aiResult?.transactions?.[0]?.clarificationQuestionType || r.aiResult?.questionType,
            choices: r.aiResult?.transactions?.[0]?.clarificationChoices,
            error: r.error,
            source: r.source,
          }))}
          source={results[0]?.source || 'openrouter'}
          errorType={null}
          onClarify={(idx, ans) => answerClarification(idx, ans)}
          onEdit={(idx) => {
            // Edit triggered from wizard step
          }}
          onRemove={(idx) => {
            const updated = [...results];
            updated[idx] = { ...updated[idx], status: 'error', error: 'Removed by user' };
            setResults(updated);
          }}
          onConfirmItem={handleConfirmUploadItem}
          onAddAll={addAll}
        />
      )}

      {uploadStep === 3 && (
        <AddedSuccess
          lastTxType={lastTxType}
          count={addedCount}
          navigate={navigate}
          onAddAnother={() => { setUploadStep(0); setFiles([]); setResults([]); setAddedCount(0); }}
        />
      )}
    </div>
  );
}

// ─── Smart Filing Home ────────────────────────────────────────────────────────

export default function SmartFilingScreen({ navigate, filingState, setFilingState }) {
  const [mode, setMode] = useState('home');

  return (
    <main className="portal-page sf-portal">
      <div className="container">
        <div className="page-crumb">
          <button onClick={() => navigate('home')}>Home</button> <span>/</span>
          <button onClick={() => navigate('dashboard')}>Dashboard</button> <span>/</span>
          <span>Smart Filing</span>
        </div>

        {mode === 'home' && (
          <>
            <div className="sf-home-header">
              <div className="sf-new-badge">★ NEW</div>
              <h1 className="sf-home-title">Smart Filing</h1>
              <p className="sf-home-sub">
                Prepare your GST return without figuring out which section everything belongs to.
              </p>
              <p className="sf-home-meta">
                {BUSINESS.name} · {BUSINESS.gstin} · {RETURN_PERIOD.label}
              </p>

              {/* AI provider status */}
              <div className="sf-home-ai-status">
                {HAS_OPENROUTER_KEY ? (
                  <div className="sf-ai-status sf-ai-status--live">
                    <span className="sf-ai-dot sf-ai-dot--live" />
                    OpenRouter AI · {MODEL}
                  </div>
                ) : HAS_GEMINI_KEY ? (
                  <div className="sf-ai-status sf-ai-status--live">
                    <span className="sf-ai-dot sf-ai-dot--live" />
                    Gemini AI · Backup
                  </div>
                ) : (
                  <div className="sf-ai-status sf-ai-status--demo">
                    <span className="sf-ai-dot sf-ai-dot--demo" />
                    ⚠ Demo Mode
                  </div>
                )}
              </div>
            </div>

            <div className="sf-mode-cards">
              <div className="sf-mode-card" onClick={() => setMode('converse')} role="button" tabIndex={0} onKeyDown={e => e.key === 'Enter' && setMode('converse')} id="sf-mode-describe">
                <div className="sf-mode-card-icon">✎</div>
                <div className="sf-mode-card-body">
                  <h2>Tell us what happened</h2>
                  <p>Describe a sale, purchase, export, credit note, or multiple transactions in plain language. Describe many at once.</p>
                  <span className="sf-mode-cta">Start with a description →</span>
                </div>
              </div>

              <div className="sf-mode-card" onClick={() => setMode('upload')} role="button" tabIndex={0} onKeyDown={e => e.key === 'Enter' && setMode('upload')} id="sf-mode-upload">
                <div className="sf-mode-card-icon">↑</div>
                <div className="sf-mode-card-body">
                  <h2>Upload invoices</h2>
                  <p>Upload one or more invoice documents and GEZT will extract the relevant GST details for you.</p>
                  <span className="sf-mode-cta">Upload invoices →</span>
                </div>
              </div>
            </div>

            <div className="sf-control-note">
              <span>✓</span>
              <p>You stay in control. GEZT prepares the details and shows you what it understood before anything is added to your return.</p>
            </div>

            {!HAS_KEY && (
              <div className="sf-demo-notice">
                <strong>Demo mode active.</strong> Smart Filing is using the local demo engine. To use real AI analysis, configure <code>OPENROUTER_API_KEY</code> in <code>.env.local</code>.
              </div>
            )}
          </>
        )}

        {mode === 'converse' && (
          <ConversationalMode
            navigate={navigate}
            setFilingState={setFilingState}
            onBack={() => setMode('home')}
          />
        )}

        {mode === 'upload' && (
          <UploadMode
            navigate={navigate}
            setFilingState={setFilingState}
            onBack={() => setMode('home')}
          />
        )}
      </div>
    </main>
  );
}
