import React, { useState, useEffect, useRef } from 'react';
import {
  BUSINESS, RETURN_PERIOD, FY_PERIODS_DATA, PLACES_OF_SUPPLY,
  INITIAL_B2B_INVOICES, INITIAL_B2C_INVOICES, INITIAL_EXPORTS,
  INITIAL_CREDIT_NOTES, INITIAL_ADVANCES, INITIAL_AMENDMENTS,
  INITIAL_HSN_SUMMARY, INITIAL_DOCUMENT_SERIES,
  formatCurrency, formatDate, validateGstin
} from './mockData.js';

const STORAGE_KEY = 'gezt_offline_filing_store_v1';

export default function OfflineFilingStudio({ navigate, rootFilingState, setRootFilingState }) {
  // ─── Header & Configuration State ─────────────────────────────────────────
  const [returnForm, setReturnForm] = useState('GSTR-1');
  const [financialYear, setFinancialYear] = useState('2026–27');
  const [returnPeriod, setReturnPeriod] = useState('092026'); // Sep 2026
  const [offlineMode, setOfflineMode] = useState(true);

  // ─── Return Sections Data ────────────────────────────────────────────────
  const [returnState, setReturnState] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.b2bInvoices) return parsed;
      }
    } catch (e) {
      console.warn('Failed to load offline storage:', e);
    }
    return {
      b2bInvoices: rootFilingState?.b2bInvoices || [...INITIAL_B2B_INVOICES],
      b2cInvoices: rootFilingState?.b2cInvoices || [...INITIAL_B2C_INVOICES],
      exports: rootFilingState?.exports || [...INITIAL_EXPORTS],
      creditNotes: rootFilingState?.creditNotes || [...INITIAL_CREDIT_NOTES],
      advances: rootFilingState?.advances || [...INITIAL_ADVANCES],
      amendments: rootFilingState?.amendments || [...INITIAL_AMENDMENTS],
      hsnSummary: rootFilingState?.hsnSummary || [...INITIAL_HSN_SUMMARY],
      documentSeries: rootFilingState?.documentSeries || [...INITIAL_DOCUMENT_SERIES],
    };
  });

  // ─── Workspace State ─────────────────────────────────────────────────────
  const [activeSection, setActiveSection] = useState('b2b');
  const [lastSaved, setLastSaved] = useState(new Date().toLocaleTimeString());
  const [validationStatus, setValidationStatus] = useState('draft'); // 'draft', 'validating', 'valid', 'errors', 'ready'
  const [errorsList, setErrorsList] = useState([]);
  const [showErrorDrawer, setShowErrorDrawer] = useState(false);
  const [recentlyUpdatedId, setRecentlyUpdatedId] = useState(null);

  // ─── Table Filter, Search, Selection State ───────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'valid', 'error', 'warning'
  const [selectedIds, setSelectedIds] = useState([]);
  const [sortField, setSortField] = useState('invoiceDate');
  const [sortOrder, setSortOrder] = useState('desc');

  // ─── Modal State for Add / Edit ──────────────────────────────────────────
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [modalForm, setModalForm] = useState({});

  // ─── Import / Export State ───────────────────────────────────────────────
  const [importDiagnostic, setImportDiagnostic] = useState(null);
  const [isValidating, setIsValidating] = useState(false);
  const fileInputRef = useRef(null);
  const tableRef = useRef(null);

  // ─── Auto-save to LocalStorage ───────────────────────────────────────────
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(returnState));
      setLastSaved(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (e) {
      console.error('LocalStorage save failed', e);
    }
  }, [returnState]);

  // Highlight reset timer
  useEffect(() => {
    if (recentlyUpdatedId) {
      const timer = setTimeout(() => setRecentlyUpdatedId(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [recentlyUpdatedId]);

  // ─── Validation Engine ───────────────────────────────────────────────────
  const runValidation = (dataState = returnState) => {
    setIsValidating(true);
    setValidationStatus('validating');

    setTimeout(() => {
      const errs = [];

      // 1. Validate B2B Invoices
      const invNumbers = new Set();
      dataState.b2bInvoices.forEach((inv, idx) => {
        const rowNum = idx + 1;
        const invNo = inv.invoiceNo || `Row ${rowNum}`;

        // GSTIN Validation
        const gstinErr = validateGstin(inv.recipientGstin);
        if (gstinErr) {
          errs.push({
            section: 'b2b',
            sectionName: 'B2B Invoices',
            id: inv.id,
            label: `B2B Invoice #${invNo}`,
            field: 'Recipient GSTIN',
            message: `${gstinErr} (Provided: "${inv.recipientGstin || 'Empty'}")`,
            severity: 'error'
          });
        }

        // Invoice Number Dup check
        if (inv.invoiceNo) {
          if (invNumbers.has(inv.invoiceNo)) {
            errs.push({
              section: 'b2b',
              sectionName: 'B2B Invoices',
              id: inv.id,
              label: `B2B Invoice #${invNo}`,
              field: 'Invoice No',
              message: `Duplicate invoice number "${inv.invoiceNo}" found in B2B supplies.`,
              severity: 'error'
            });
          } else {
            invNumbers.add(inv.invoiceNo);
          }
        } else {
          errs.push({
            section: 'b2b',
            sectionName: 'B2B Invoices',
            id: inv.id,
            label: `B2B Invoice Row #${rowNum}`,
            field: 'Invoice No',
            message: 'Invoice Number is required.',
            severity: 'error'
          });
        }

        // Taxable value check
        if (!inv.taxableValue || Number(inv.taxableValue) <= 0) {
          errs.push({
            section: 'b2b',
            sectionName: 'B2B Invoices',
            id: inv.id,
            label: `B2B Invoice #${invNo}`,
            field: 'Taxable Value',
            message: 'Taxable value must be greater than ₹0.',
            severity: 'error'
          });
        }

        // POS & Tax Consistency Check
        const isInterstate = inv.pos && inv.pos !== BUSINESS.stateCode;
        if (isInterstate && (inv.cgst > 0 || inv.sgst > 0)) {
          errs.push({
            section: 'b2b',
            sectionName: 'B2B Invoices',
            id: inv.id,
            label: `B2B Invoice #${invNo}`,
            field: 'Tax Calculation',
            message: `Place of Supply (${inv.posName || inv.pos}) is Inter-State, but CGST/SGST is entered instead of IGST.`,
            severity: 'warning'
          });
        } else if (!isInterstate && inv.igst > 0) {
          errs.push({
            section: 'b2b',
            sectionName: 'B2B Invoices',
            id: inv.id,
            label: `B2B Invoice #${invNo}`,
            field: 'Tax Calculation',
            message: `Place of Supply (${inv.posName || inv.pos}) is Intra-State, but IGST is entered instead of CGST/SGST.`,
            severity: 'warning'
          });
        }
      });

      // 2. Validate HSN Summary
      dataState.hsnSummary.forEach((hsn, idx) => {
        const code = hsn.hsn || `Row ${idx + 1}`;
        if (!hsn.hsn || !/^\d{4,8}$/.test(hsn.hsn.trim())) {
          errs.push({
            section: 'hsn',
            sectionName: 'HSN Summary',
            id: hsn.id,
            label: `HSN Record ${code}`,
            field: 'HSN / SAC Code',
            message: 'HSN code must be a 4, 6, or 8 digit numeric value.',
            severity: 'error'
          });
        }
        if (!hsn.taxableValue || Number(hsn.taxableValue) <= 0) {
          errs.push({
            section: 'hsn',
            sectionName: 'HSN Summary',
            id: hsn.id,
            label: `HSN Record ${code}`,
            field: 'Taxable Value',
            message: 'HSN Taxable value must be greater than ₹0.',
            severity: 'error'
          });
        }
      });

      // 3. Validate Credit / Debit Notes
      dataState.creditNotes.forEach((note, idx) => {
        const noteNo = note.noteNo || `Row ${idx + 1}`;
        if (!note.originalInvoiceNo) {
          errs.push({
            section: 'cdn',
            sectionName: 'Credit / Debit Notes',
            id: note.id,
            label: `Credit Note #${noteNo}`,
            field: 'Original Invoice No',
            message: 'Original Invoice Number reference is mandatory for credit/debit notes.',
            severity: 'error'
          });
        }
        const gstinErr = validateGstin(note.recipientGstin);
        if (gstinErr) {
          errs.push({
            section: 'cdn',
            sectionName: 'Credit / Debit Notes',
            id: note.id,
            label: `Credit Note #${noteNo}`,
            field: 'Recipient GSTIN',
            message: gstinErr,
            severity: 'error'
          });
        }
      });

      // 4. Validate Exports
      dataState.exports.forEach((exp, idx) => {
        const invNo = exp.invoiceNo || `Row ${idx + 1}`;
        if (!exp.shippingBillNo) {
          errs.push({
            section: 'exports',
            sectionName: 'Exports',
            id: exp.id,
            label: `Export Invoice #${invNo}`,
            field: 'Shipping Bill No',
            message: 'Shipping Bill number is recommended for zero-rated export processing.',
            severity: 'warning'
          });
        }
      });

      setErrorsList(errs);
      setIsValidating(false);

      const hasCriticalErrors = errs.some(e => e.severity === 'error');
      if (hasCriticalErrors) {
        setValidationStatus('errors');
        setShowErrorDrawer(true);
      } else {
        setValidationStatus('valid');
      }
    }, 600);
  };

  // ─── JSON Import & Export Functions ──────────────────────────────────────
  const handleExportJson = () => {
    // Generate standard GSTN offline JSON structure
    const payload = {
      gstin: BUSINESS.gstin,
      fp: returnPeriod,
      gt: 4500000.00,
      cur_gt: 4500000.00,
      version: 'GST3.2.0',
      hash: 'offline-checksum-' + Date.now(),
      b2b: returnState.b2bInvoices.map(inv => ({
        ctin: inv.recipientGstin,
        cname: inv.recipientName,
        inv: [{
          inum: inv.invoiceNo,
          idt: inv.invoiceDate,
          val: Number(inv.invoiceValue),
          pos: inv.pos,
          rchrg: inv.reverseCharge || 'N',
          inv_typ: 'R',
          itms: [{
            num: 1,
            itm_det: {
              rt: Number(inv.gstRate),
              txval: Number(inv.taxableValue),
              iamt: Number(inv.igst || 0),
              camt: Number(inv.cgst || 0),
              samt: Number(inv.sgst || 0),
              csamt: Number(inv.cess || 0)
            }
          }]
        }]
      })),
      b2cs: returnState.b2cInvoices.map(b2c => ({
        sply_ty: b2c.type === 'interstate' ? 'INTER' : 'INTRA',
        pos: b2c.pos,
        rt: Number(b2c.gstRate),
        txval: Number(b2c.taxableValue),
        iamt: Number(b2c.igst || 0),
        camt: Number(b2c.cgst || 0),
        samt: Number(b2c.sgst || 0)
      })),
      exp: returnState.exports.map(exp => ({
        exp_typ: exp.exportType || 'WOPT',
        inv: [{
          inum: exp.invoiceNo,
          idt: exp.invoiceDate,
          val: Number(exp.invoiceValue),
          sbnum: exp.shippingBillNo,
          sbdt: exp.shippingBillDate,
          port_code: exp.port,
          itms: [{
            txval: Number(exp.taxableValue),
            rt: Number(exp.gstRate || 0),
            iamt: Number(exp.igst || 0)
          }]
        }]
      })),
      cdnr: returnState.creditNotes.map(cdn => ({
        ctin: cdn.recipientGstin,
        nt: [{
          ntty: cdn.noteType === 'Credit' ? 'C' : 'D',
          nt_num: cdn.noteNo,
          nt_dt: cdn.noteDate,
          inum: cdn.originalInvoiceNo,
          idt: cdn.originalInvoiceDate,
          val: Number(cdn.noteValue),
          itms: [{
            rt: Number(cdn.gstRate),
            txval: Number(cdn.taxableValue),
            iamt: Number(cdn.igst || 0),
            camt: Number(cdn.cgst || 0),
            samt: Number(cdn.sgst || 0)
          }]
        }]
      })),
      hsn: {
        data: returnState.hsnSummary.map(h => ({
          num: h.id,
          hsn_sc: h.hsn,
          desc: h.description,
          uqc: h.uqc,
          qty: Number(h.quantity),
          txval: Number(h.taxableValue),
          iamt: Number(h.igst || 0),
          camt: Number(h.cgst || 0),
          samt: Number(h.sgst || 0)
        }))
      },
      doc_issue: {
        doc_det: returnState.documentSeries.map(d => ({
          doc_num: d.id,
          doc_typ: d.nature,
          from: d.fromNo,
          to: d.toNo,
          totnum: Number(d.totalIssued),
          cancel: Number(d.totalCancelled)
        }))
      }
    };

    const jsonStr = JSON.stringify(payload, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${returnForm}_${BUSINESS.gstin}_${returnPeriod}_offline.json`;
    a.click();
    URL.revokeObjectURL(url);

    setValidationStatus('ready');
  };

  const handleDownloadTemplate = (format = 'json') => {
    if (format === 'csv') {
      const csvHeader = 'Section,InvoiceNo,InvoiceDate,RecipientGSTIN,RecipientName,POS,TaxableValue,GSTRate,IGST,CGST,SGST,HSN\n';
      const sampleRows = returnState.b2bInvoices.map(i =>
        `B2B,${i.invoiceNo},${i.invoiceDate},${i.recipientGstin},"${i.recipientName}",${i.pos},${i.taxableValue},${i.gstRate},${i.igst},${i.cgst},${i.sgst},${i.hsn}`
      ).join('\n');

      const blob = new Blob([csvHeader + sampleRows], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `GEZT_${returnForm}_Offline_Template_${returnPeriod}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const emptySchema = {
        gstin: BUSINESS.gstin,
        fp: returnPeriod,
        version: 'GST3.2.0_Template',
        instructions: 'Fill in your invoice and return data offline in this GSTN structure.',
        b2b: [
          {
            ctin: '27AAABM1234C1ZK',
            cname: 'Sample Recipient Pvt Ltd',
            inv: [{ inum: 'INV-001', idt: '2026-09-01', val: 11800, pos: '27', rchrg: 'N', itms: [{ rt: 18, txval: 10000, iamt: 1800, camt: 0, samt: 0 }] }]
          }
        ],
        b2cs: [{ pos: '29', rt: 18, txval: 5000, iamt: 0, camt: 450, samt: 450 }],
        exp: [],
        cdnr: [],
        hsn: { data: [{ hsn_sc: '8471', desc: 'Computer Hardware', uqc: 'NOS', qty: 10, txval: 50000, iamt: 9000, camt: 0, samt: 0 }] }
      };

      const blob = new Blob([JSON.stringify(emptySchema, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `GEZT_${returnForm}_Offline_Template_${returnPeriod}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleImportFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        const parsed = JSON.parse(text);

        // Check if it's GST portal JSON or app JSON
        let importedB2B = [];
        let importedB2C = [];
        let importedExp = [];
        let importedCdn = [];
        let importedHsn = [];

        if (parsed.b2b && Array.isArray(parsed.b2b)) {
          // Parse official GSTN B2B structure
          parsed.b2b.forEach((item, bIdx) => {
            const ctin = item.ctin || '';
            const cname = item.cname || 'Imported Taxpayer';
            (item.inv || []).forEach((inv, iIdx) => {
              const itm = inv.itms?.[0]?.itm_det || {};
              const posObj = PLACES_OF_SUPPLY.find(p => p.code === inv.pos) || { name: 'State ' + inv.pos };
              importedB2B.push({
                id: `imp-b2b-${bIdx}-${iIdx}-${Date.now()}`,
                invoiceNo: inv.inum || `IMP-${bIdx + 1}`,
                invoiceDate: inv.idt || new Date().toISOString().split('T')[0],
                recipientGstin: ctin,
                recipientName: cname,
                pos: inv.pos || '27',
                posName: posObj.name,
                invoiceValue: inv.val || (itm.txval || 0) + (itm.iamt || 0) + (itm.camt || 0) + (itm.samt || 0),
                taxableValue: itm.txval || inv.val || 0,
                gstRate: itm.rt || 18,
                igst: itm.iamt || 0,
                cgst: itm.camt || 0,
                sgst: itm.samt || 0,
                cess: itm.csamt || 0,
                hsn: '8471',
                status: 'processed',
                reverseCharge: inv.rchrg || 'N'
              });
            });
          });
        } else if (parsed.b2bInvoices && Array.isArray(parsed.b2bInvoices)) {
          importedB2B = parsed.b2bInvoices;
        }

        if (parsed.b2cs && Array.isArray(parsed.b2cs)) {
          parsed.b2cs.forEach((b, idx) => {
            const posObj = PLACES_OF_SUPPLY.find(p => p.code === b.pos) || { name: 'State ' + b.pos };
            importedB2C.push({
              id: `imp-b2c-${idx}-${Date.now()}`,
              invoiceNo: `B2C-IMP-${idx + 101}`,
              invoiceDate: new Date().toISOString().split('T')[0],
              pos: b.pos || '29',
              posName: posObj.name,
              taxableValue: b.txval || 0,
              gstRate: b.rt || 18,
              igst: b.iamt || 0,
              cgst: b.camt || 0,
              sgst: b.samt || 0,
              type: b.sply_ty === 'INTER' ? 'interstate' : 'intrastate',
              status: 'processed'
            });
          });
        } else if (parsed.b2cInvoices && Array.isArray(parsed.b2cInvoices)) {
          importedB2C = parsed.b2cInvoices;
        }

        if (parsed.cdnr && Array.isArray(parsed.cdnr)) {
          parsed.cdnr.forEach((c, idx) => {
            (c.nt || []).forEach((n, nIdx) => {
              const itm = n.itms?.[0] || {};
              importedCdn.push({
                id: `imp-cdn-${idx}-${nIdx}`,
                noteNo: n.nt_num || `CDN-${idx}`,
                noteDate: n.nt_dt || '',
                noteType: n.ntty === 'C' ? 'Credit' : 'Debit',
                recipientGstin: c.ctin || '',
                recipientName: 'Imported Customer',
                originalInvoiceNo: n.inum || '',
                originalInvoiceDate: n.idt || '',
                noteValue: n.val || 0,
                taxableValue: itm.txval || 0,
                gstRate: itm.rt || 18,
                igst: itm.iamt || 0,
                cgst: itm.camt || 0,
                sgst: itm.samt || 0,
                reason: 'Imported from JSON',
                status: 'processed'
              });
            });
          });
        }

        const newState = {
          ...returnState,
          b2bInvoices: importedB2B.length > 0 ? importedB2B : returnState.b2bInvoices,
          b2cInvoices: importedB2C.length > 0 ? importedB2C : returnState.b2cInvoices,
          exports: parsed.exports || importedExp.length > 0 ? importedExp : returnState.exports,
          creditNotes: importedCdn.length > 0 ? importedCdn : returnState.creditNotes,
          hsnSummary: parsed.hsn?.data ? parsed.hsn.data.map((h, i) => ({
            id: `hsn-imp-${i}`,
            hsn: h.hsn_sc || '8471',
            description: h.desc || 'General Goods',
            uqc: h.uqc || 'NOS',
            quantity: h.qty || 1,
            rate: h.rt || 18,
            taxableValue: h.txval || 0,
            igst: h.iamt || 0,
            cgst: h.camt || 0,
            sgst: h.samt || 0
          })) : returnState.hsnSummary
        };

        setReturnState(newState);
        setImportDiagnostic({
          success: true,
          fileName: file.name,
          recordsCount: importedB2B.length + importedB2C.length + importedCdn.length,
          timestamp: new Date().toLocaleTimeString(),
          message: `Successfully imported JSON file (${file.name}). Parsed ${importedB2B.length} B2B invoices and ${importedB2C.length} B2C entries.`
        });

        runValidation(newState);
      } catch (err) {
        setImportDiagnostic({
          success: false,
          fileName: file.name,
          message: `JSON Syntax / Parsing Error: ${err.message}. Please check that the uploaded file is valid JSON.`
        });
      }
    };
    reader.readAsText(file);
    e.target.value = null; // reset input
  };

  const handleUploadToMainPortal = () => {
    if (setRootFilingState) {
      setRootFilingState(returnState);
    }
    navigate('online-summary');
  };

  // ─── CRUD Operations for Active Table ─────────────────────────────────────
  const getActiveArray = () => {
    switch (activeSection) {
      case 'b2b': return returnState.b2bInvoices;
      case 'b2c': return returnState.b2cInvoices;
      case 'exports': return returnState.exports;
      case 'cdn': return returnState.creditNotes;
      case 'advances': return returnState.advances;
      case 'amendments': return returnState.amendments;
      case 'hsn': return returnState.hsnSummary;
      case 'docs': return returnState.documentSeries;
      default: return returnState.b2bInvoices;
    }
  };

  const setActiveArray = (newArr) => {
    setReturnState(prev => {
      const keyMap = {
        b2b: 'b2bInvoices', b2c: 'b2cInvoices', exports: 'exports',
        cdn: 'creditNotes', advances: 'advances', amendments: 'amendments',
        hsn: 'hsnSummary', docs: 'documentSeries'
      };
      return { ...prev, [keyMap[activeSection]]: newArr };
    });
  };

  const handleOpenAddModal = () => {
    setEditingRecord(null);
    if (activeSection === 'b2b') {
      setModalForm({
        invoiceNo: `INV-${1000 + Math.floor(Math.random() * 9000)}`,
        invoiceDate: new Date().toISOString().split('T')[0],
        recipientGstin: '27AAABM1234C1ZK',
        recipientName: 'New Enterprise Client',
        pos: '27',
        posName: 'Maharashtra',
        taxableValue: 50000,
        gstRate: 18,
        igst: 9000,
        cgst: 0,
        sgst: 0,
        reverseCharge: 'N',
        hsn: '8471'
      });
    } else if (activeSection === 'hsn') {
      setModalForm({
        hsn: '8471',
        description: 'Computer & Peripherals',
        uqc: 'NOS',
        quantity: 10,
        rate: 18,
        taxableValue: 50000,
        igst: 9000,
        cgst: 0,
        sgst: 0
      });
    } else if (activeSection === 'cdn') {
      setModalForm({
        noteNo: `CDN-${Math.floor(Math.random() * 900)}`,
        noteDate: new Date().toISOString().split('T')[0],
        noteType: 'Credit',
        recipientGstin: '27AAABM1234C1ZK',
        recipientName: 'New Enterprise Client',
        originalInvoiceNo: 'INV-1042',
        originalInvoiceDate: '2026-09-03',
        noteValue: 5900,
        taxableValue: 5000,
        gstRate: 18,
        igst: 900,
        cgst: 0,
        sgst: 0,
        reason: 'Sales return'
      });
    } else {
      setModalForm({
        invoiceNo: `EXP-${Math.floor(Math.random() * 900)}`,
        invoiceDate: new Date().toISOString().split('T')[0],
        taxableValue: 100000,
        gstRate: 18,
        igst: 18000,
        cgst: 0,
        sgst: 0
      });
    }
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (rec) => {
    setEditingRecord(rec);
    setModalForm({ ...rec });
    setIsModalOpen(true);
  };

  const handleSaveModalRecord = (e) => {
    e.preventDefault();
    const arr = getActiveArray();
    let updatedId;

    if (editingRecord) {
      updatedId = editingRecord.id;
      const updated = arr.map(item => item.id === editingRecord.id ? { ...modalForm, id: editingRecord.id } : item);
      setActiveArray(updated);
    } else {
      updatedId = `${activeSection}-${Date.now()}`;
      const newRecord = {
        ...modalForm,
        id: updatedId,
        status: 'processed',
        invoiceValue: Number(modalForm.taxableValue || 0) + Number(modalForm.igst || 0) + Number(modalForm.cgst || 0) + Number(modalForm.sgst || 0)
      };
      setActiveArray([newRecord, ...arr]);
    }

    setIsModalOpen(false);
    setRecentlyUpdatedId(updatedId);
    runValidation();
  };

  const handleDeleteRecord = (id) => {
    if (confirm('Are you sure you want to delete this record from offline storage?')) {
      const arr = getActiveArray();
      setActiveArray(arr.filter(item => item.id !== id));
      setSelectedIds(prev => prev.filter(sId => sId !== id));
      runValidation();
    }
  };

  const handleDuplicateRecord = (rec) => {
    const arr = getActiveArray();
    const newId = `${activeSection}-dup-${Date.now()}`;
    const newNo = rec.invoiceNo ? `${rec.invoiceNo}-COPY` : rec.noteNo ? `${rec.noteNo}-COPY` : `COPY-${Date.now().toString().slice(-4)}`;
    const copy = {
      ...rec,
      id: newId,
      invoiceNo: newNo,
      noteNo: rec.noteNo ? newNo : rec.noteNo
    };
    setActiveArray([copy, ...arr]);
    setRecentlyUpdatedId(newId);
    runValidation();
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    if (confirm(`Are you sure you want to delete ${selectedIds.length} selected record(s)?`)) {
      const arr = getActiveArray();
      setActiveArray(arr.filter(item => !selectedIds.includes(item.id)));
      setSelectedIds([]);
      runValidation();
    }
  };

  // ─── Filtered Data calculation ───────────────────────────────────────────
  const records = getActiveArray();
  const filteredRecords = records.filter(item => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery || Object.values(item).some(val => String(val).toLowerCase().includes(searchLower));

    if (!matchesSearch) return false;

    if (statusFilter === 'error') {
      return errorsList.some(e => e.id === item.id && e.severity === 'error');
    }
    if (statusFilter === 'warning') {
      return errorsList.some(e => e.id === item.id && e.severity === 'warning');
    }
    if (statusFilter === 'valid') {
      return !errorsList.some(e => e.id === item.id);
    }
    return true;
  });

  // Calculate Section Stats
  const totalRecordsCount = returnState.b2bInvoices.length + returnState.b2cInvoices.length + returnState.exports.length + returnState.creditNotes.length + returnState.hsnSummary.length;
  const criticalErrorsCount = errorsList.filter(e => e.severity === 'error').length;
  const warningsCount = errorsList.filter(e => e.severity === 'warning').length;

  const sectionErrorCounts = {
    b2b: errorsList.filter(e => e.section === 'b2b' && e.severity === 'error').length,
    b2c: errorsList.filter(e => e.section === 'b2c' && e.severity === 'error').length,
    exports: errorsList.filter(e => e.section === 'exports' && e.severity === 'error').length,
    cdn: errorsList.filter(e => e.section === 'cdn' && e.severity === 'error').length,
    hsn: errorsList.filter(e => e.section === 'hsn' && e.severity === 'error').length,
  };

  return (
    <main className="portal-page offline-studio-page">
      <div className="container">
        {/* Breadcrumbs */}
        <div className="page-crumb">
          <button onClick={() => navigate('home')}>Home</button> <span>/</span>
          <button onClick={() => navigate('dashboard')}>Dashboard</button> <span>/</span>
          <span>GST Offline Filing Studio</span>
        </div>

        {/* Studio Top Control Bar */}
        <div className="offline-top-bar">
          <div className="offline-title-area">
            <h1>GST Offline Filing Workspace</h1>
            <p>Prepare, edit, validate, and build GSTN JSON offline without internet dependency</p>
          </div>

          <div className="offline-controls-group">
            {/* Form Selector */}
            <div className="select-field-inline">
              <label htmlFor="select-gst-form">GST Return Form:</label>
              <select id="select-gst-form" value={returnForm} onChange={e => setReturnForm(e.target.value)}>
                <option value="GSTR-1">GSTR-1 (Outward Supplies)</option>
                <option value="GSTR-2A">GSTR-2A (Auto-drafted ITC)</option>
                <option value="GSTR-2B">GSTR-2B (Static ITC Statement)</option>
                <option value="GSTR-3B">GSTR-3B (Summary Return)</option>
                <option value="GSTR-4">GSTR-4 (Composition Taxpayer)</option>
                <option value="GSTR-9">GSTR-9 (Annual Return)</option>
              </select>
            </div>

            {/* FY Selector */}
            <div className="select-field-inline">
              <label htmlFor="select-fy">Financial Year:</label>
              <select id="select-fy" value={financialYear} onChange={e => setFinancialYear(e.target.value)}>
                <option value="2026–27">2026–27</option>
                <option value="2025–26">2025–26</option>
              </select>
            </div>

            {/* Return Period Selector */}
            <div className="select-field-inline">
              <label htmlFor="select-period">Return Period:</label>
              <select id="select-period" value={returnPeriod} onChange={e => setReturnPeriod(e.target.value)}>
                <option value="092026">September 2026</option>
                <option value="082026">August 2026</option>
                <option value="072026">July 2026</option>
                <option value="062026">June 2026</option>
              </select>
            </div>

            {/* Offline/Online Mode Toggle */}
            <button
              className={`mode-toggle-btn ${offlineMode ? 'offline-active' : 'online-active'}`}
              onClick={() => setOfflineMode(!offlineMode)}
              title="Toggle network state for testing offline resilience"
            >
              <span className="mode-dot" />
              {offlineMode ? 'Offline Mode (Local Storage)' : 'Live Online Mode'}
            </button>
          </div>
        </div>

        {/* Compact Workspace Status Dashboard */}
        <div className="offline-summary-banner">
          <div className="summary-stat-chip">
            <span className="chip-label">Return Period</span>
            <span className="chip-value">{returnPeriod === '092026' ? 'Sep 2026' : returnPeriod}</span>
            <small>{financialYear}</small>
          </div>

          <div className="summary-stat-chip">
            <span className="chip-label">Total Records</span>
            <span className="chip-value">{totalRecordsCount}</span>
            <small>8 Return Sections</small>
          </div>

          <div className="summary-stat-chip">
            <span className="chip-label">Validation Status</span>
            <span className={`chip-badge badge-status-${validationStatus}`}>
              {validationStatus === 'draft' && '● Draft Mode'}
              {validationStatus === 'validating' && '⏳ Validating…'}
              {validationStatus === 'valid' && '✓ Validated Clean'}
              {validationStatus === 'errors' && `❌ ${criticalErrorsCount} Error(s)`}
              {validationStatus === 'ready' && '🚀 Ready for Upload'}
            </span>
            <small>Last saved: {lastSaved}</small>
          </div>

          <div className="summary-stat-chip">
            <span className="chip-label">Errors / Warnings</span>
            <div className="stat-error-row">
              <span className="badge-err-count">{criticalErrorsCount} Errors</span>
              <span className="badge-warn-count">{warningsCount} Warnings</span>
            </div>
            {errorsList.length > 0 && (
              <button className="text-link-btn" onClick={() => setShowErrorDrawer(true)}>
                View {errorsList.length} Validation Findings →
              </button>
            )}
          </div>

          <div className="summary-actions-cluster">
            <button className="btn-secondary-action" onClick={() => fileInputRef.current?.click()} id="btn-import-json">
              ↑ Import JSON
            </button>
            <input ref={fileInputRef} type="file" accept=".json,.csv" style={{ display: 'none' }} onChange={handleImportFile} />

            <button className="btn-secondary-action" onClick={() => handleDownloadTemplate('json')} id="btn-download-tpl">
              ↓ Template (.json)
            </button>

            <button className="btn-primary-action" onClick={() => runValidation()} disabled={isValidating} id="btn-validate-studio">
              {isValidating ? 'Validating…' : '✓ Validate Data'}
            </button>

            <button
              className="btn-primary-action btn-export-highlight"
              onClick={handleExportJson}
              disabled={criticalErrorsCount > 0}
              title={criticalErrorsCount > 0 ? 'Fix critical validation errors before exporting JSON' : 'Generate uploadable JSON'}
              id="btn-export-json-studio"
            >
              ⚙ Export JSON
            </button>
          </div>
        </div>

        {/* Offline Banner Indicator */}
        {offlineMode && (
          <div className="offline-persistent-banner">
            <span className="banner-icon">💾</span>
            <div>
              <strong>Offline Mode Active:</strong> All changes are auto-saved to local browser storage. You can continue editing, closing, or refreshing without losing return data.
            </div>
            <button className="banner-close" onClick={handleUploadToMainPortal}>
              Upload / Merge to Portal →
            </button>
          </div>
        )}

        {/* Import Diagnostic Notification */}
        {importDiagnostic && (
          <div className={`alert ${importDiagnostic.success ? 'alert-success' : 'alert-error'}`} style={{ marginBottom: 16 }}>
            <div>
              <strong>{importDiagnostic.success ? '✓ JSON Import Success' : '❌ JSON Import Failed'}</strong>
              <p style={{ margin: '4px 0 0' }}>{importDiagnostic.message}</p>
            </div>
            <button className="alert-dismiss" onClick={() => setImportDiagnostic(null)}>✕</button>
          </div>
        )}

        {/* Main Studio Navigation Tabs */}
        <div className="studio-tabs-bar">
          <button className={`studio-tab ${activeSection === 'b2b' ? 'active' : ''}`} onClick={() => setActiveSection('b2b')}>
            B2B Invoices (4A, 4B, 6B)
            <span className="tab-count-badge">{returnState.b2bInvoices.length}</span>
            {sectionErrorCounts.b2b > 0 && <span className="tab-err-dot">{sectionErrorCounts.b2b}</span>}
          </button>

          <button className={`studio-tab ${activeSection === 'b2c' ? 'active' : ''}`} onClick={() => setActiveSection('b2c')}>
            B2C Supplies (5, 7)
            <span className="tab-count-badge">{returnState.b2cInvoices.length}</span>
            {sectionErrorCounts.b2c > 0 && <span className="tab-err-dot">{sectionErrorCounts.b2c}</span>}
          </button>

          <button className={`studio-tab ${activeSection === 'cdn' ? 'active' : ''}`} onClick={() => setActiveSection('cdn')}>
            Credit / Debit Notes (9B)
            <span className="tab-count-badge">{returnState.creditNotes.length}</span>
            {sectionErrorCounts.cdn > 0 && <span className="tab-err-dot">{sectionErrorCounts.cdn}</span>}
          </button>

          <button className={`studio-tab ${activeSection === 'exports' ? 'active' : ''}`} onClick={() => setActiveSection('exports')}>
            Exports (6A)
            <span className="tab-count-badge">{returnState.exports.length}</span>
            {sectionErrorCounts.exports > 0 && <span className="tab-err-dot">{sectionErrorCounts.exports}</span>}
          </button>

          <button className={`studio-tab ${activeSection === 'advances' ? 'active' : ''}`} onClick={() => setActiveSection('advances')}>
            Advances (11A, 11B)
            <span className="tab-count-badge">{returnState.advances.length}</span>
          </button>

          <button className={`studio-tab ${activeSection === 'amendments' ? 'active' : ''}`} onClick={() => setActiveSection('amendments')}>
            Amendments (9A, 9C)
            <span className="tab-count-badge">{returnState.amendments.length}</span>
          </button>

          <button className={`studio-tab ${activeSection === 'hsn' ? 'active' : ''}`} onClick={() => setActiveSection('hsn')}>
            HSN Summary (12)
            <span className="tab-count-badge">{returnState.hsnSummary.length}</span>
            {sectionErrorCounts.hsn > 0 && <span className="tab-err-dot">{sectionErrorCounts.hsn}</span>}
          </button>

          <button className={`studio-tab ${activeSection === 'docs' ? 'active' : ''}`} onClick={() => setActiveSection('docs')}>
            Docs Series (13)
            <span className="tab-count-badge">{returnState.documentSeries.length}</span>
          </button>
        </div>

        {/* Section Table & Action Controls */}
        <div className="studio-table-container">
          <div className="table-controls-bar">
            {/* Search */}
            <div className="search-box">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                placeholder="Search by invoice #, GSTIN, recipient name, or amount…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              {searchQuery && <button className="clear-search" onClick={() => setSearchQuery('')}>✕</button>}
            </div>

            {/* Filter */}
            <div className="filter-dropdown">
              <label>Filter:</label>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                <option value="all">All Records ({records.length})</option>
                <option value="valid">Valid Records</option>
                <option value="error">Has Errors</option>
                <option value="warning">Has Warnings</option>
              </select>
            </div>

            {/* Bulk Actions */}
            {selectedIds.length > 0 && (
              <div className="bulk-actions-pill">
                <span>{selectedIds.length} selected</span>
                <button className="bulk-delete-btn" onClick={handleBulkDelete}>Delete Selected</button>
              </div>
            )}

            {/* Action buttons */}
            <div className="table-action-btns">
              <button className="btn-add-record" onClick={handleOpenAddModal} id="btn-add-invoice">
                + Add New Record
              </button>
            </div>
          </div>

          {/* Render Active Section Table */}
          <div className="table-wrap" ref={tableRef}>
            <table className="data-table studio-data-table">
              <thead>
                <tr>
                  <th style={{ width: 36 }}>
                    <input
                      type="checkbox"
                      checked={selectedIds.length > 0 && selectedIds.length === filteredRecords.length}
                      onChange={e => {
                        if (e.target.checked) setSelectedIds(filteredRecords.map(r => r.id));
                        else setSelectedIds([]);
                      }}
                    />
                  </th>

                  {activeSection === 'b2b' && (
                    <>
                      <th>Invoice No</th>
                      <th>Invoice Date</th>
                      <th>Recipient GSTIN</th>
                      <th>Recipient Name</th>
                      <th>POS</th>
                      <th className="num-col">Taxable Value</th>
                      <th className="num-col">GST Rate</th>
                      <th className="num-col">IGST</th>
                      <th className="num-col">CGST / SGST</th>
                      <th>Status</th>
                      <th className="action-col">Actions</th>
                    </>
                  )}

                  {activeSection === 'b2c' && (
                    <>
                      <th>Invoice / Ref #</th>
                      <th>Date</th>
                      <th>Supply Type</th>
                      <th>Place of Supply</th>
                      <th className="num-col">Taxable Value</th>
                      <th className="num-col">GST Rate</th>
                      <th className="num-col">IGST</th>
                      <th className="num-col">CGST / SGST</th>
                      <th className="action-col">Actions</th>
                    </>
                  )}

                  {activeSection === 'cdn' && (
                    <>
                      <th>Note No</th>
                      <th>Note Date</th>
                      <th>Type</th>
                      <th>Recipient GSTIN</th>
                      <th>Original Inv No</th>
                      <th className="num-col">Taxable Value</th>
                      <th className="num-col">Tax Amount</th>
                      <th className="action-col">Actions</th>
                    </>
                  )}

                  {activeSection === 'exports' && (
                    <>
                      <th>Invoice No</th>
                      <th>Invoice Date</th>
                      <th>Shipping Bill #</th>
                      <th>Port Code</th>
                      <th>Country</th>
                      <th className="num-col">Taxable Value</th>
                      <th className="action-col">Actions</th>
                    </>
                  )}

                  {activeSection === 'hsn' && (
                    <>
                      <th>HSN / SAC</th>
                      <th>Description</th>
                      <th>UQC</th>
                      <th className="num-col">Quantity</th>
                      <th className="num-col">Rate</th>
                      <th className="num-col">Taxable Value</th>
                      <th className="num-col">Total Tax</th>
                      <th className="action-col">Actions</th>
                    </>
                  )}

                  {['advances', 'amendments', 'docs'].includes(activeSection) && (
                    <>
                      <th>Ref Number</th>
                      <th>Description / Type</th>
                      <th className="num-col">Value</th>
                      <th className="action-col">Actions</th>
                    </>
                  )}
                </tr>
              </thead>

              <tbody>
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="empty-table-cell">
                      <div className="empty-state">
                        <span className="empty-icon">📁</span>
                        <p>No records found matching current filters.</p>
                        <button className="action-btn" onClick={handleOpenAddModal}>+ Add Record</button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((row) => {
                    const isSelected = selectedIds.includes(row.id);
                    const isRecentlyUpdated = recentlyUpdatedId === row.id;
                    const rowErrors = errorsList.filter(e => e.id === row.id);
                    const hasError = rowErrors.some(e => e.severity === 'error');
                    const hasWarning = rowErrors.some(e => e.severity === 'warning');

                    return (
                      <tr
                        key={row.id}
                        className={`studio-row ${isSelected ? 'row-selected' : ''} ${isRecentlyUpdated ? 'row-just-updated' : ''} ${hasError ? 'row-error-highlight' : hasWarning ? 'row-warning-highlight' : ''}`}
                      >
                        <td>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={e => {
                              if (e.target.checked) setSelectedIds([...selectedIds, row.id]);
                              else setSelectedIds(selectedIds.filter(id => id !== row.id));
                            }}
                          />
                        </td>

                        {activeSection === 'b2b' && (
                          <>
                            <td><strong>{row.invoiceNo}</strong></td>
                            <td>{row.invoiceDate}</td>
                            <td className={rowErrors.some(e => e.field.includes('GSTIN')) ? 'field-error-cell' : ''}>
                              <code>{row.recipientGstin}</code>
                            </td>
                            <td>{row.recipientName}</td>
                            <td>{row.posName} ({row.pos})</td>
                            <td className="num-col font-mono">{formatCurrency(row.taxableValue)}</td>
                            <td className="num-col">{row.gstRate}%</td>
                            <td className="num-col font-mono">{formatCurrency(row.igst)}</td>
                            <td className="num-col font-mono">{formatCurrency(row.cgst + row.sgst)}</td>
                            <td>
                              {hasError ? (
                                <span className="status-pill status-error" title={rowErrors.map(e => e.message).join(' | ')}>
                                  ❌ Error
                                </span>
                              ) : hasWarning ? (
                                <span className="status-pill status-warn" title={rowErrors.map(e => e.message).join(' | ')}>
                                  ⚠️ Warning
                                </span>
                              ) : (
                                <span className="status-pill status-valid">✓ Valid</span>
                              )}
                            </td>
                          </>
                        )}

                        {activeSection === 'b2c' && (
                          <>
                            <td>{row.invoiceNo}</td>
                            <td>{row.invoiceDate}</td>
                            <td><span className="pill-type">{row.type}</span></td>
                            <td>{row.posName} ({row.pos})</td>
                            <td className="num-col font-mono">{formatCurrency(row.taxableValue)}</td>
                            <td className="num-col">{row.gstRate}%</td>
                            <td className="num-col font-mono">{formatCurrency(row.igst)}</td>
                            <td className="num-col font-mono">{formatCurrency(row.cgst + row.sgst)}</td>
                          </>
                        )}

                        {activeSection === 'cdn' && (
                          <>
                            <td><strong>{row.noteNo}</strong></td>
                            <td>{row.noteDate}</td>
                            <td><span className={`pill-note ${row.noteType}`}>{row.noteType}</span></td>
                            <td><code>{row.recipientGstin}</code></td>
                            <td>{row.originalInvoiceNo}</td>
                            <td className="num-col font-mono">{formatCurrency(row.taxableValue)}</td>
                            <td className="num-col font-mono">{formatCurrency((row.igst || 0) + (row.cgst || 0) + (row.sgst || 0))}</td>
                          </>
                        )}

                        {activeSection === 'exports' && (
                          <>
                            <td><strong>{row.invoiceNo}</strong></td>
                            <td>{row.invoiceDate}</td>
                            <td>{row.shippingBillNo || '—'}</td>
                            <td><code>{row.port || '—'}</code></td>
                            <td>{row.country || 'International'}</td>
                            <td className="num-col font-mono">{formatCurrency(row.taxableValue)}</td>
                          </>
                        )}

                        {activeSection === 'hsn' && (
                          <>
                            <td><code>{row.hsn}</code></td>
                            <td>{row.description}</td>
                            <td>{row.uqc}</td>
                            <td className="num-col">{row.quantity}</td>
                            <td className="num-col">{row.rate}%</td>
                            <td className="num-col font-mono">{formatCurrency(row.taxableValue)}</td>
                            <td className="num-col font-mono">{formatCurrency((row.igst || 0) + (row.cgst || 0) + (row.sgst || 0))}</td>
                          </>
                        )}

                        {['advances', 'amendments', 'docs'].includes(activeSection) && (
                          <>
                            <td><code>{row.advanceNo || row.originalInvoiceNo || row.nature}</code></td>
                            <td>{row.recipientName || row.reason || row.fromNo + ' to ' + row.toNo}</td>
                            <td className="num-col font-mono">{formatCurrency(row.taxableValue || row.advanceValue || row.totalIssued)}</td>
                          </>
                        )}

                        {/* Table Row Action Menu */}
                        <td className="action-col">
                          <div className="row-actions-group">
                            <button className="row-action-btn" title="Edit Record" onClick={() => handleOpenEditModal(row)}>
                              ✏️
                            </button>
                            <button className="row-action-btn" title="Duplicate Record" onClick={() => handleDuplicateRecord(row)}>
                              📋
                            </button>
                            <button className="row-action-btn btn-del" title="Delete Record" onClick={() => handleDeleteRecord(row.id)}>
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Validation Errors & Warnings Drawer */}
        {showErrorDrawer && (
          <div className="validation-drawer">
            <div className="drawer-header">
              <h3>Validation Findings ({errorsList.length})</h3>
              <button className="drawer-close" onClick={() => setShowErrorDrawer(false)}>✕</button>
            </div>
            <div className="drawer-body">
              {errorsList.length === 0 ? (
                <div className="alert alert-success">
                  ✓ No errors or warnings found! Return data is fully valid.
                </div>
              ) : (
                <div className="findings-list">
                  {errorsList.map((err, idx) => (
                    <div
                      key={idx}
                      className={`finding-card ${err.severity === 'error' ? 'finding-error' : 'finding-warn'}`}
                      onClick={() => {
                        setActiveSection(err.section);
                        setRecentlyUpdatedId(err.id);
                      }}
                    >
                      <div className="finding-title">
                        <span className="finding-severity-tag">
                          {err.severity === 'error' ? '❌ Critical Error' : '⚠️ Warning'}
                        </span>
                        <strong>{err.label}</strong>
                        <span className="finding-sec-badge">{err.sectionName}</span>
                      </div>
                      <p className="finding-msg">
                        <strong>Field: {err.field}</strong> — {err.message}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Add / Edit Invoice Modal Dialog */}
        {isModalOpen && (
          <div className="modal-overlay" role="dialog" aria-modal="true">
            <div className="modal-card studio-modal-card smart-invoice-modal">
              {/* Fixed Header */}
              <div className="modal-header">
                <div>
                  <h2>{editingRecord ? '✏️ Edit Return Record' : '➕ Add New Return Record'} ({activeSection.toUpperCase()})</h2>
                  <p className="modal-subtitle">Enter details for {returnPeriod === '092026' ? 'September 2026' : returnPeriod} return period</p>
                </div>
                <button className="modal-close" onClick={() => setIsModalOpen(false)}>✕</button>
              </div>

              {/* Scrollable Body Content */}
              <div className="modal-body-scroll">
                {/* Quick Preset Buyer Selector for B2B */}
                {activeSection === 'b2b' && !editingRecord && (
                  <div className="quick-buyer-bar">
                    <span className="quick-label">⚡ Quick Select Client:</span>
                    <div className="quick-buyer-pills">
                      {[
                        { name: 'ABC Technologies', gstin: '27AAABM1234C1ZK', pos: '27', posName: 'Maharashtra' },
                        { name: 'Quantum Devices', gstin: '07QABCD1234E1ZP', pos: '07', posName: 'Delhi' },
                        { name: 'TechStore KA', gstin: '29TECHS1234F1ZK', pos: '29', posName: 'Karnataka' },
                        { name: 'Meridian Corp', gstin: '33MERID1234G1ZL', pos: '33', posName: 'Tamil Nadu' }
                      ].map((buyer, idx) => (
                        <button
                          key={idx}
                          type="button"
                          className="buyer-pill-btn"
                          onClick={() => {
                            const isInter = buyer.pos !== BUSINESS.stateCode;
                            const taxVal = Number(modalForm.taxableValue || 50000);
                            const rate = Number(modalForm.gstRate ?? 18);
                            const tax = (taxVal * rate) / 100;
                            setModalForm(prev => ({
                              ...prev,
                              recipientGstin: buyer.gstin,
                              recipientName: buyer.name,
                              pos: buyer.pos,
                              posName: buyer.posName,
                              igst: isInter ? tax : 0,
                              cgst: isInter ? 0 : tax / 2,
                              sgst: isInter ? 0 : tax / 2
                            }));
                          }}
                        >
                          + {buyer.name} ({buyer.posName})
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <form id="studio-invoice-form" onSubmit={handleSaveModalRecord} className="studio-modal-form">
                  <div className="form-main-layout">
                    {/* Left Column: Form Fields */}
                    <div className="form-fields-column">
                      {activeSection === 'b2b' && (
                        <>
                          <div className="form-row-2col">
                            <div className="form-group">
                              <div className="field-label-row">
                                <label htmlFor="modal-inv-no">Invoice Number *</label>
                              </div>
                              <input
                                id="modal-inv-no"
                                type="text"
                                required
                                placeholder="e.g. INV-1055"
                                value={modalForm.invoiceNo || ''}
                                onChange={e => setModalForm({ ...modalForm, invoiceNo: e.target.value })}
                              />
                            </div>

                            <div className="form-group">
                              <div className="field-label-row">
                                <label htmlFor="modal-inv-date">Invoice Date *</label>
                              </div>
                              <input
                                id="modal-inv-date"
                                type="date"
                                required
                                value={modalForm.invoiceDate || ''}
                                onChange={e => setModalForm({ ...modalForm, invoiceDate: e.target.value })}
                              />
                            </div>
                          </div>

                          <div className="form-row-2col">
                            <div className="form-group">
                              <div className="field-label-row">
                                <label htmlFor="modal-recipient-gstin">Recipient GSTIN *</label>
                                {modalForm.recipientGstin && (
                                  <span className={`gstin-valid-badge ${validateGstin(modalForm.recipientGstin) ? 'invalid' : 'valid'}`}>
                                    {validateGstin(modalForm.recipientGstin) ? '✕ Invalid' : '✓ Valid'}
                                  </span>
                                )}
                              </div>
                              <input
                                id="modal-recipient-gstin"
                                type="text"
                                required
                                maxLength={15}
                                placeholder="e.g. 27AAABM1234C1ZK"
                                value={modalForm.recipientGstin || ''}
                                onChange={e => {
                                  const upper = e.target.value.toUpperCase();
                                  let updates = { recipientGstin: upper };
                                  if (upper.length >= 2) {
                                    const stateCode = upper.substring(0, 2);
                                    const posObj = PLACES_OF_SUPPLY.find(p => p.code === stateCode);
                                    if (posObj) {
                                      const isInter = stateCode !== BUSINESS.stateCode;
                                      const taxVal = Number(modalForm.taxableValue || 0);
                                      const rate = Number(modalForm.gstRate ?? 18);
                                      const tax = (taxVal * rate) / 100;
                                      updates.pos = posObj.code;
                                      updates.posName = posObj.name;
                                      updates.igst = isInter ? tax : 0;
                                      updates.cgst = isInter ? 0 : tax / 2;
                                      updates.sgst = isInter ? 0 : tax / 2;
                                    }
                                  }
                                  setModalForm(prev => ({ ...prev, ...updates }));
                                }}
                              />
                            </div>

                            <div className="form-group">
                              <div className="field-label-row">
                                <label htmlFor="modal-recipient-name">Recipient Trade / Legal Name</label>
                              </div>
                              <input
                                id="modal-recipient-name"
                                type="text"
                                placeholder="e.g. Acme Tech Pvt. Ltd."
                                value={modalForm.recipientName || ''}
                                onChange={e => setModalForm({ ...modalForm, recipientName: e.target.value })}
                              />
                            </div>
                          </div>

                          <div className="form-row-2col">
                            <div className="form-group">
                              <div className="field-label-row">
                                <label htmlFor="modal-pos">Place of Supply (POS) *</label>
                              </div>
                              <select
                                id="modal-pos"
                                value={modalForm.pos || '27'}
                                onChange={e => {
                                  const posObj = PLACES_OF_SUPPLY.find(p => p.code === e.target.value);
                                  const isInter = e.target.value !== BUSINESS.stateCode;
                                  const taxVal = Number(modalForm.taxableValue || 0);
                                  const rate = Number(modalForm.gstRate ?? 18);
                                  const tax = (taxVal * rate) / 100;
                                  setModalForm({
                                    ...modalForm,
                                    pos: e.target.value,
                                    posName: posObj ? posObj.name : '',
                                    igst: isInter ? tax : 0,
                                    cgst: isInter ? 0 : tax / 2,
                                    sgst: isInter ? 0 : tax / 2
                                  });
                                }}
                              >
                                {PLACES_OF_SUPPLY.map(p => (
                                  <option key={p.code} value={p.code}>{p.code} — {p.name}</option>
                                ))}
                              </select>
                            </div>

                            <div className="form-group">
                              <div className="field-label-row">
                                <label htmlFor="modal-hsn">HSN / SAC Code</label>
                              </div>
                              <input
                                id="modal-hsn"
                                type="text"
                                placeholder="e.g. 8471"
                                value={modalForm.hsn || '8471'}
                                onChange={e => setModalForm({ ...modalForm, hsn: e.target.value })}
                              />
                            </div>
                          </div>

                          <div className="form-group">
                            <label htmlFor="modal-taxable-val">Taxable Value (₹) *</label>
                            <input
                              id="modal-taxable-val"
                              type="number"
                              required
                              min={1}
                              placeholder="Enter amount before tax"
                              value={modalForm.taxableValue || ''}
                              onChange={e => {
                                const taxVal = Number(e.target.value);
                                const rate = Number(modalForm.gstRate ?? 18);
                                const isInter = modalForm.pos !== BUSINESS.stateCode;
                                const tax = (taxVal * rate) / 100;
                                setModalForm({
                                  ...modalForm,
                                  taxableValue: taxVal,
                                  igst: isInter ? tax : 0,
                                  cgst: isInter ? 0 : tax / 2,
                                  sgst: isInter ? 0 : tax / 2
                                });
                              }}
                            />
                          </div>

                          {/* GST Rate Quick Pills */}
                          <div className="form-group">
                            <label>Applicable GST Tax Rate</label>
                            <div className="gst-rate-pills">
                              {[0, 5, 12, 18, 28].map(r => {
                                const currentRate = modalForm.gstRate === 0 ? 0 : (modalForm.gstRate || 18);
                                return (
                                  <button
                                    key={r}
                                    type="button"
                                    className={`rate-pill ${currentRate === r ? 'active' : ''}`}
                                    onClick={() => {
                                      const taxVal = Number(modalForm.taxableValue || 0);
                                      const isInter = modalForm.pos !== BUSINESS.stateCode;
                                      const tax = (taxVal * r) / 100;
                                      setModalForm(prev => ({
                                        ...prev,
                                        gstRate: r,
                                        igst: isInter ? tax : 0,
                                        cgst: isInter ? 0 : tax / 2,
                                        sgst: isInter ? 0 : tax / 2
                                      }));
                                    }}
                                  >
                                    {r}%
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </>
                      )}

                      {activeSection === 'hsn' && (
                        <>
                          <div className="form-group">
                            <label>HSN / SAC Code *</label>
                            <input
                              type="text"
                              required
                              placeholder="e.g. 8471"
                              value={modalForm.hsn || ''}
                              onChange={e => setModalForm({ ...modalForm, hsn: e.target.value })}
                            />
                          </div>

                          <div className="form-group">
                            <label>Item Description</label>
                            <input
                              type="text"
                              placeholder="e.g. Electronic Processors"
                              value={modalForm.description || ''}
                              onChange={e => setModalForm({ ...modalForm, description: e.target.value })}
                            />
                          </div>

                          <div className="form-row-2col">
                            <div className="form-group">
                              <label>UQC (Unit Code)</label>
                              <select
                                value={modalForm.uqc || 'NOS'}
                                onChange={e => setModalForm({ ...modalForm, uqc: e.target.value })}
                              >
                                <option value="NOS">NOS - Numbers</option>
                                <option value="KGS">KGS - Kilograms</option>
                                <option value="MTR">MTR - Meters</option>
                                <option value="BOX">BOX - Boxes</option>
                              </select>
                            </div>

                            <div className="form-group">
                              <label>Quantity</label>
                              <input
                                type="number"
                                value={modalForm.quantity || 1}
                                onChange={e => setModalForm({ ...modalForm, quantity: Number(e.target.value) })}
                              />
                            </div>
                          </div>

                          <div className="form-group">
                            <label>Taxable Value (₹) *</label>
                            <input
                              type="number"
                              required
                              value={modalForm.taxableValue || ''}
                              onChange={e => setModalForm({ ...modalForm, taxableValue: Number(e.target.value) })}
                            />
                          </div>
                        </>
                      )}

                      {activeSection !== 'b2b' && activeSection !== 'hsn' && (
                        <>
                          <div className="form-group">
                            <label>Reference / Invoice No *</label>
                            <input
                              type="text"
                              required
                              value={modalForm.invoiceNo || modalForm.noteNo || ''}
                              onChange={e => setModalForm({ ...modalForm, invoiceNo: e.target.value, noteNo: e.target.value })}
                            />
                          </div>

                          <div className="form-group">
                            <label>Taxable Value (₹) *</label>
                            <input
                              type="number"
                              required
                              value={modalForm.taxableValue || ''}
                              onChange={e => setModalForm({ ...modalForm, taxableValue: Number(e.target.value) })}
                            />
                          </div>
                        </>
                      )}
                    </div>

                    {/* Right Column: Live Tax Receipt Calculation Card */}
                    <div className="form-summary-column">
                      <div className="tax-receipt-card">
                        <h3>Invoice Tax Breakdown</h3>

                        <div className="receipt-row">
                          <span>Supply Classification</span>
                          <strong>
                            {modalForm.pos !== BUSINESS.stateCode ? '⚡ Inter-State (IGST)' : '🏠 Intra-State (CGST+SGST)'}
                          </strong>
                        </div>

                        <div className="receipt-row">
                          <span>Place of Supply</span>
                          <span>{modalForm.posName || 'Maharashtra'} ({modalForm.pos || '27'})</span>
                        </div>

                        <div className="receipt-divider" />

                        <div className="receipt-row">
                          <span>Taxable Value</span>
                          <strong>{formatCurrency(modalForm.taxableValue || 0)}</strong>
                        </div>

                        <div className="receipt-row">
                          <span>GST Rate</span>
                          <span>{modalForm.gstRate ?? 18}%</span>
                        </div>

                        {modalForm.pos !== BUSINESS.stateCode ? (
                          <div className="receipt-row tax-highlight">
                            <span>Integrated Tax (IGST)</span>
                            <strong>+ {formatCurrency(modalForm.igst || 0)}</strong>
                          </div>
                        ) : (
                          <>
                            <div className="receipt-row tax-highlight">
                              <span>Central Tax (CGST @ {(modalForm.gstRate ?? 18)/2}%)</span>
                              <strong>+ {formatCurrency(modalForm.cgst || 0)}</strong>
                            </div>
                            <div className="receipt-row tax-highlight">
                              <span>State Tax (SGST @ {(modalForm.gstRate ?? 18)/2}%)</span>
                              <strong>+ {formatCurrency(modalForm.sgst || 0)}</strong>
                            </div>
                          </>
                        )}

                        <div className="receipt-divider grand-total-divider" />

                        <div className="receipt-grand-total">
                          <span>Total Invoice Value</span>
                          <span className="grand-price">
                            {formatCurrency(
                              Number(modalForm.taxableValue || 0) +
                              Number(modalForm.igst || 0) +
                              Number(modalForm.cgst || 0) +
                              Number(modalForm.sgst || 0)
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </form>
              </div>

              {/* Fixed Bottom Actions Bar */}
              <div className="modal-actions-bar">
                <button type="button" className="btn-modal-cancel" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>

                {!editingRecord && activeSection === 'b2b' && (
                  <button
                    type="button"
                    className="btn-modal-add-another"
                    onClick={(e) => {
                      handleSaveModalRecord(e);
                      setTimeout(() => handleOpenAddModal(), 100);
                    }}
                  >
                     Save &amp; Add Another ➕
                  </button>
                )}

                <button type="submit" form="studio-invoice-form" className="btn-modal-save">
                  {editingRecord ? 'Save Changes ✓' : 'Save Invoice Record ✓'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
