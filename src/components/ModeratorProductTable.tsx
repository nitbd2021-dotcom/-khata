import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  Plus, 
  Trash2, 
  Printer, 
  Download, 
  RotateCcw, 
  Search, 
  CheckCircle2, 
  FileSpreadsheet, 
  Package, 
  ExternalLink,
  Copy,
  Check,
  Link as LinkIcon,
  Info,
  Boxes,
  Eye,
  SlidersHorizontal,
  FileText,
  RefreshCw,
  AlertCircle,
  Maximize2,
  Minimize2,
  Table as TableIcon,
  Layers,
  Sparkles,
  Zap,
  Radio,
  Activity,
  CheckCheck
} from 'lucide-react';
import { ModeratorProductTableRow, User } from '../types';
import { StorageService, generateId } from '../services/storageService';
import { GoogleSheetsService } from '../services/googleSheetsService';

interface ModeratorProductTableProps {
  moderatorId: string;
  moderatorName?: string;
  currentUser?: User;
}

export const ModeratorProductTable: React.FC<ModeratorProductTableProps> = ({
  moderatorId,
  moderatorName,
  currentUser,
}) => {
  const [rows, setRows] = useState<ModeratorProductTableRow[]>(() => {
    return StorageService.getModeratorProductTable(moderatorId);
  });

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [copiedForSheet, setCopiedForSheet] = useState<boolean>(false);
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(0);

  // Google Sheet Link Management
  const [googleSheetUrl, setGoogleSheetUrl] = useState<string>(() => {
    return StorageService.getModeratorProductSheetUrl(moderatorId);
  });
  const [showSheetSettings, setShowSheetSettings] = useState<boolean>(false);
  const [inputSheetUrl, setInputSheetUrl] = useState<string>('');
  const [isLoadingSheetData, setIsLoadingSheetData] = useState<boolean>(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Auto Background Sync Management
  const [isAutoSyncEnabled, setIsAutoSyncEnabled] = useState<boolean>(() => {
    return StorageService.getModeratorAutoSync(moderatorId);
  });
  const [webhookUrl, setWebhookUrl] = useState<string>(() => {
    return StorageService.getModeratorWebhookUrl(moderatorId);
  });
  const [inputWebhookUrl, setInputWebhookUrl] = useState<string>('');
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(() => {
    return StorageService.getModeratorLastSyncTime(moderatorId);
  });
  const [isAutoSyncing, setIsAutoSyncing] = useState<boolean>(false);
  const [copiedScript, setCopiedScript] = useState<boolean>(false);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // View mode: 'table' (হিসাব টেবিল), 'embed' (সরাসরি গুগল শিট), 'split' (উভয় একসাথে)
  const [viewMode, setViewMode] = useState<'table' | 'embed' | 'split'>('table');
  const [isIframeFullscreen, setIsIframeFullscreen] = useState<boolean>(false);
  const [iframeKey, setIframeKey] = useState<number>(1);

  // New product inline form state
  const [newProductName, setNewProductName] = useState<string>('');
  const [newQty1, setNewQty1] = useState<string>('0');
  const [newQty2, setNewQty2] = useState<string>('0');
  const [newUnit, setNewUnit] = useState<string>('পিস');
  const [showAddRowCard, setShowAddRowCard] = useState<boolean>(false);

  // Re-load if moderatorId changes
  useEffect(() => {
    setRows(StorageService.getModeratorProductTable(moderatorId));
    const savedUrl = StorageService.getModeratorProductSheetUrl(moderatorId);
    setGoogleSheetUrl(savedUrl);
    setIsAutoSyncEnabled(StorageService.getModeratorAutoSync(moderatorId));
    setWebhookUrl(StorageService.getModeratorWebhookUrl(moderatorId));
    setLastSyncTime(StorageService.getModeratorLastSyncTime(moderatorId));
  }, [moderatorId]);

  // Extract sheet ID or embeddable URL
  const sheetEmbedInfo = useMemo(() => {
    if (!googleSheetUrl || !googleSheetUrl.trim()) {
      return { embedUrl: '', sheetId: '', isPub: false };
    }
    const trimmed = googleSheetUrl.trim();

    // If it's a published Google Sheet (pubhtml)
    if (trimmed.includes('/pubhtml')) {
      const cleanPub = trimmed.split('?')[0];
      return {
        embedUrl: `${cleanPub}?widget=true&headers=true`,
        sheetId: '',
        isPub: true
      };
    }

    const sheetId = GoogleSheetsService.extractSheetId(trimmed);
    if (sheetId) {
      // Standard embed preview for Google Sheets
      return {
        embedUrl: `https://docs.google.com/spreadsheets/d/${sheetId}/htmlembed?widget=true&headers=true`,
        sheetId,
        isPub: false
      };
    }

    return { embedUrl: trimmed, sheetId: '', isPub: false };
  }, [googleSheetUrl]);

  // Debounced auto background push to Google Sheet Webhook or API
  const triggerBackgroundPush = useCallback((updatedRows: ModeratorProductTableRow[]) => {
    const isAuto = StorageService.getModeratorAutoSync(moderatorId);
    if (!isAuto) return;

    const currentWebhook = StorageService.getModeratorWebhookUrl(moderatorId);
    const currentSheetUrl = StorageService.getModeratorProductSheetUrl(moderatorId);

    if (!currentWebhook && !currentSheetUrl) return;

    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }

    setIsAutoSyncing(true);
    syncTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await GoogleSheetsService.syncModeratorProductsToSheet(
          currentWebhook,
          currentSheetUrl,
          updatedRows
        );
        const now = new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setLastSyncTime(now);
        StorageService.setModeratorLastSyncTime(moderatorId, now);
        if (res.method === 'webhook' || res.method === 'oauth') {
          setFeedback('গুগল শিটে লাইভ ব্যাকগ্রাউন্ড সিঙ্ক সম্পন্ন হয়েছে ✓');
          setTimeout(() => setFeedback(null), 3000);
        }
      } catch (err) {
        console.warn('Auto background push failed:', err);
      } finally {
        setIsAutoSyncing(false);
      }
    }, 1000);
  }, [moderatorId]);

  // Auto-save whenever rows change and trigger background sync
  const updateRowsAndSave = (updated: ModeratorProductTableRow[], msg?: string) => {
    setRows(updated);
    StorageService.saveModeratorProductTable(moderatorId, updated);
    if (msg) {
      setFeedback(msg);
      setTimeout(() => setFeedback(null), 3500);
    }
    triggerBackgroundPush(updated);
  };

  // Helper: parse CSV lines handling quoted values
  const parseCsvLine = (line: string): string[] => {
    const result: string[] = [];
    let startValueIndex = 0;
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        inQuotes = !inQuotes;
      } else if (c === ',' && !inQuotes) {
        let val = line.substring(startValueIndex, i).trim();
        if (val.startsWith('"') && val.endsWith('"')) {
          val = val.substring(1, val.length - 1).replace(/""/g, '"');
        }
        result.push(val);
        startValueIndex = i + 1;
      }
    }
    let lastVal = line.substring(startValueIndex).trim();
    if (lastVal.startsWith('"') && lastVal.endsWith('"')) {
      lastVal = lastVal.substring(1, lastVal.length - 1).replace(/""/g, '"');
    }
    result.push(lastVal);
    return result;
  };

  // Fetch and sync data from the linked Google Sheet (supports silent auto-sync)
  const handleFetchSheetData = async (urlToFetch?: string, isSilent = false) => {
    const targetUrl = urlToFetch || googleSheetUrl;
    if (!targetUrl || !targetUrl.trim()) {
      if (!isSilent) {
        setFeedback('প্রথমে আপনার গুগল শিটের লিঙ্ক যুক্ত করুন।');
        setShowSheetSettings(true);
      }
      return;
    }

    if (!isSilent) {
      setIsLoadingSheetData(true);
      setSyncError(null);
    } else {
      setIsAutoSyncing(true);
    }

    const sheetId = GoogleSheetsService.extractSheetId(targetUrl.trim());
    
    // Determine the export CSV endpoint
    let csvUrl = '';
    if (targetUrl.includes('/pubhtml') || targetUrl.includes('/pub?')) {
      csvUrl = targetUrl.replace('/pubhtml', '/pub?output=csv');
      if (!csvUrl.includes('output=csv')) {
        csvUrl += (csvUrl.includes('?') ? '&' : '?') + 'output=csv';
      }
    } else if (sheetId) {
      csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv`;
    } else {
      csvUrl = targetUrl;
    }

    try {
      const res = await fetch(csvUrl, { cache: 'no-cache' });
      if (!res.ok) {
        throw new Error(`Google Sheets HTTP ${res.status}: শিট পড়তে সমস্যা হয়েছে`);
      }

      const csvText = await res.text();
      if (!csvText || !csvText.trim()) {
        throw new Error('গুগল শিটে কোনো ডেটা পাওয়া যায়নি');
      }

      const lines = csvText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      if (lines.length <= 1) {
        throw new Error('গুগল শিটে ডেটার কোনো সারি পাওয়া যায়নি (শুধু হেডার বা খালি শিট)');
      }

      const newRows: ModeratorProductTableRow[] = [];

      // Loop through rows skipping header (line 0)
      for (let i = 1; i < lines.length; i++) {
        const cols = parseCsvLine(lines[i]);
        if (cols.length === 0 || !cols[0] || !cols[0].trim()) continue;

        // Stop if total row
        if (cols[0].includes('সর্বমোট') || cols[0].toLowerCase().includes('total') || cols[0].includes('যোগফল')) {
          continue;
        }

        const name = cols[0].trim();
        const q1 = Math.max(0, parseFloat(cols[1]?.replace(/[^\d.-]/g, '')) || 0);
        const q2 = Math.max(0, parseFloat(cols[2]?.replace(/[^\d.-]/g, '')) || 0);
        const unit = cols[4]?.trim() || cols[3]?.match(/[\u0980-\u09FFa-zA-Z]+/)?.[0] || 'পিস';

        newRows.push({
          id: generateId(),
          productName: name,
          quantity1: q1,
          quantity2: q2,
          unit: unit,
          updatedAt: new Date().toISOString(),
          note: 'গুগল শিট থেকে সিঙ্ককৃত'
        });
      }

      if (newRows.length > 0) {
        setRows(prevRows => {
          const isDifferent = prevRows.length !== newRows.length || newRows.some((nr, idx) => {
            const cr = prevRows[idx];
            return !cr || cr.productName !== nr.productName || cr.quantity1 !== nr.quantity1 || cr.quantity2 !== nr.quantity2;
          });

          if (isDifferent) {
            StorageService.saveModeratorProductTable(moderatorId, newRows);
            if (isSilent) {
              setFeedback('গুগল শিট থেকে ব্যাকগ্রাউন্ডে স্বয়ংক্রিয় তথ্য আপডেট সম্পন্ন 🟢');
              setTimeout(() => setFeedback(null), 3000);
            }
            return newRows;
          }
          return prevRows;
        });

        if (!isSilent) {
          setFeedback(`গুগল শিট থেকে ${newRows.length}টি পণ্যের তথ্য সফলভাবে লোড ও সিঙ্ক করা হয়েছে!`);
          setTimeout(() => setFeedback(null), 3500);
          setViewMode('table');
        }

        const nowStr = new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setLastSyncTime(nowStr);
        StorageService.setModeratorLastSyncTime(moderatorId, nowStr);
      } else {
        throw new Error('গুগল শিট থেকে পণ্যের নাম পাওয়া যায়নি। নিশ্চিত করুন ১ম কলামে পণ্যের নাম এবং ২য় ও ৩য় কলামে পরিমাণ রয়েছে।');
      }
    } catch (err: any) {
      console.warn('Direct Google Sheet fetch failed:', err);
      if (!isSilent) {
        setSyncError(
          'সরাসরি শিট পড়তে সমস্যা হয়েছে। দয়া করে গুগল শিটে গিয়ে Share > "Anyone with the link can view" দিন অথবা File > Share > "Publish to web" সিলেক্ট করুন।'
        );
        // Even if direct CSV fetch requires sharing permission, the embedded live Google Sheet view will still display!
        setViewMode('embed');
      }
    } finally {
      if (!isSilent) {
        setIsLoadingSheetData(false);
      } else {
        setIsAutoSyncing(false);
      }
    }
  };

  // Periodic background auto-fetch from Google Sheet
  useEffect(() => {
    if (!isAutoSyncEnabled || !googleSheetUrl) return;

    // Check Google Sheet in background every 35 seconds
    const interval = setInterval(() => {
      handleFetchSheetData(googleSheetUrl, true);
    }, 35000);

    return () => clearInterval(interval);
  }, [isAutoSyncEnabled, googleSheetUrl]);

  // Update a specific cell
  const handleUpdateCell = (id: string, field: 'productName' | 'quantity1' | 'quantity2' | 'unit', value: any) => {
    const updated = rows.map(r => {
      if (r.id !== id) return r;
      if (field === 'quantity1' || field === 'quantity2') {
        const valNum = Math.max(0, parseFloat(value) || 0);
        return { ...r, [field]: valNum };
      }
      return { ...r, [field]: value };
    });
    updateRowsAndSave(updated);
  };

  // Adjust quantity with +/- step
  const handleStepQty = (id: string, field: 'quantity1' | 'quantity2', delta: number) => {
    const updated = rows.map(r => {
      if (r.id !== id) return r;
      const current = r[field] || 0;
      const newVal = Math.max(0, current + delta);
      return { ...r, [field]: newVal };
    });
    updateRowsAndSave(updated);
  };

  // Delete a row
  const handleDeleteRow = (id: string, name: string) => {
    const updated = rows.filter(r => r.id !== id);
    updateRowsAndSave(updated, `"${name}" টেবিল থেকে মুছে ফেলা হয়েছে`);
  };

  // Add a new row
  const handleAddRow = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductName.trim()) return;

    const q1 = Math.max(0, parseFloat(newQty1) || 0);
    const q2 = Math.max(0, parseFloat(newQty2) || 0);

    const newRow: ModeratorProductTableRow = {
      id: generateId(),
      productName: newProductName.trim(),
      quantity1: q1,
      quantity2: q2,
      unit: newUnit.trim() || 'পিস',
      updatedAt: new Date().toISOString(),
    };

    const updated = [...rows, newRow];
    updateRowsAndSave(updated, `"${newRow.productName}" টেবিলে যোগ করা হয়েছে`);
    setNewProductName('');
    setNewQty1('0');
    setNewQty2('0');
    setShowAddRowCard(false);
  };

  // Reset to default sample rows
  const handleResetTable = () => {
    if (window.confirm('আপনি কি এই হিসাব টেবিলটি প্রাথমিক ডেমো পণ্যের তালিকায় রিসেট করতে চান?')) {
      const resetRows = StorageService.resetModeratorProductTable(moderatorId);
      setRows(resetRows);
      setFeedback('টেবিলটি সফলভাবে রিসেট করা হয়েছে');
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  // Import products from existing inventory if available
  const handleImportFromInventory = () => {
    const userIdForInv = currentUser?.id || moderatorId;
    const invItems = StorageService.getInventory(userIdForInv);
    if (invItems.length === 0) {
      alert('আপনার সিস্টেমে কোনো পণ্য ইনভেন্টরি পাওয়া যায়নি।');
      return;
    }

    const existingNames = new Set(rows.map(r => r.productName.trim().toLowerCase()));
    const toAdd: ModeratorProductTableRow[] = [];

    invItems.forEach(item => {
      if (!existingNames.has(item.name.trim().toLowerCase())) {
        toAdd.push({
          id: generateId(),
          productName: item.name,
          quantity1: item.currentStock || 0,
          quantity2: 0,
          unit: item.unit || 'পিস',
          note: `ইনভেন্টরি থেকে আমদানিকৃত`
        });
      }
    });

    if (toAdd.length === 0) {
      alert('ইনভেন্টরির সকল পণ্য ইতিমধ্যে এই টেবিলে অন্তর্ভুক্ত রয়েছে।');
      return;
    }

    const updated = [...rows, ...toAdd];
    updateRowsAndSave(updated, `${toAdd.length}টি পণ্য ইনভেন্টরি থেকে যুক্ত করা হয়েছে`);
  };

  // Save Google Sheet URL, Webhook URL, and Auto Sync Settings
  const handleSaveSheetSettings = (e: React.FormEvent) => {
    e.preventDefault();
    
    // 1. Google Sheet URL
    const cleanUrl = inputSheetUrl.trim();
    if (!cleanUrl) {
      StorageService.saveModeratorProductSheetUrl(moderatorId, '');
      setGoogleSheetUrl('');
    } else {
      const extractedId = GoogleSheetsService.extractSheetId(cleanUrl);
      let finalUrl = cleanUrl;
      if (extractedId && !cleanUrl.includes('/pubhtml')) {
        finalUrl = `https://docs.google.com/spreadsheets/d/${extractedId}/edit`;
      }
      StorageService.saveModeratorProductSheetUrl(moderatorId, finalUrl);
      setGoogleSheetUrl(finalUrl);
      handleFetchSheetData(finalUrl, false);
    }

    // 2. Webhook URL (for 2-way automatic push)
    const cleanWebhook = inputWebhookUrl.trim();
    StorageService.saveModeratorWebhookUrl(moderatorId, cleanWebhook);
    setWebhookUrl(cleanWebhook);

    // 3. Auto sync status
    StorageService.setModeratorAutoSync(moderatorId, isAutoSyncEnabled);

    setShowSheetSettings(false);
    setFeedback('গুগল শিট ও ব্যাকগ্রাউন্ড সিঙ্ক সেটিংস সফলভাবে সংরক্ষিত হয়েছে!');
    setTimeout(() => setFeedback(null), 3500);

    // If rows exist, push current state to keep sheet in sync
    if (rows.length > 0 && (cleanWebhook || cleanUrl)) {
      triggerBackgroundPush(rows);
    }
  };

  // Toggle Auto-Sync On / Off
  const toggleAutoSync = () => {
    const nextVal = !isAutoSyncEnabled;
    setIsAutoSyncEnabled(nextVal);
    StorageService.setModeratorAutoSync(moderatorId, nextVal);
    setFeedback(nextVal ? 'স্বয়ংক্রিয় ব্যাকগ্রাউন্ড সিঙ্ক চালু করা হয়েছে 🟢' : 'স্বয়ংক্রিয় সিঙ্ক বন্ধ করা হয়েছে');
    setTimeout(() => setFeedback(null), 3000);
    if (nextVal) {
      triggerBackgroundPush(rows);
      if (googleSheetUrl) {
        handleFetchSheetData(googleSheetUrl, true);
      }
    }
  };

  // Manual trigger: Full 2-way sync now
  const handleManualSyncNow = async () => {
    setIsAutoSyncing(true);
    setFeedback('গুগল শিটের সাথে সিঙ্ক হচ্ছে...');
    try {
      // 1. Push current state
      triggerBackgroundPush(rows);
      // 2. Fetch latest if url exists
      if (googleSheetUrl) {
        await handleFetchSheetData(googleSheetUrl, false);
      } else {
        setFeedback('ব্যাকগ্রাউন্ড সিঙ্ক সম্পন্ন হয়েছে ✓');
        setTimeout(() => setFeedback(null), 3000);
      }
    } finally {
      setIsAutoSyncing(false);
    }
  };

  // Copy Google Apps Script snippet for 1-click install
  const handleCopyAppsScript = async () => {
    try {
      const code = GoogleSheetsService.getProductTableAppsScriptSnippet();
      await navigator.clipboard.writeText(code);
      setCopiedScript(true);
      setFeedback('Google Apps Script কোড কপি হয়েছে! গুগল শিটে Extensions > Apps Script-এ পেস্ট করে Deploy করুন।');
      setTimeout(() => {
        setCopiedScript(false);
        setFeedback(null);
      }, 5000);
    } catch {
      alert('ক্লিপবোর্ডে কপি করতে সমস্যা হয়েছে।');
    }
  };

  // Open in Google Sheets
  const handleOpenGoogleSheets = () => {
    if (googleSheetUrl && googleSheetUrl.trim().startsWith('http')) {
      window.open(googleSheetUrl, '_blank');
    } else {
      window.open('https://sheets.new', '_blank');
    }
  };

  // Copy Formatted Data for Instant 1-Click Paste into Google Sheets
  const handleCopyForGoogleSheet = async () => {
    try {
      const headers = ['পণ্য এর নাম', 'পরিমান ১ (২য় কলাম)', 'পরিমান ২ (৩য় কলাম)', '২+৩ যোগফল (৪র্থ কলাম)', 'একক'];
      
      const tsvRows = rows.map((r, i) => {
        const rowNum = i + 2;
        const formulaSum = `=B${rowNum}+C${rowNum}`;
        return [
          r.productName,
          r.quantity1,
          r.quantity2,
          formulaSum,
          r.unit || 'পিস'
        ].join('\t');
      });

      const totalRowNum = rows.length + 2;
      const totalRow = [
        'সর্বমোট যোগফল',
        `=SUM(B2:B${totalRowNum - 1})`,
        `=SUM(C2:C${totalRowNum - 1})`,
        `=SUM(D2:D${totalRowNum - 1})`,
        ''
      ].join('\t');

      const fullTsv = [headers.join('\t'), ...tsvRows, totalRow].join('\n');
      await navigator.clipboard.writeText(fullTsv);

      setCopiedForSheet(true);
      setFeedback('গুগল শিট ফরম্যাটে কপি সম্পন্ন! গুগল শিটে গিয়ে Ctrl+V চাপলেই সূত্রসহ সব বসে যাবে।');
      setTimeout(() => {
        setCopiedForSheet(false);
        setFeedback(null);
      }, 5000);
    } catch {
      alert('ক্লিপবোর্ডে কপি করতে সমস্যা হয়েছে।');
    }
  };

  // Totals calculations
  const totalQty1 = rows.reduce((sum, r) => sum + (Number(r.quantity1) || 0), 0);
  const totalQty2 = rows.reduce((sum, r) => sum + (Number(r.quantity2) || 0), 0);
  const grandCombinedTotal = totalQty1 + totalQty2; // Col 2 total + Col 3 total = Col 4 total

  // Filtered rows for search
  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return rows;
    const s = searchTerm.toLowerCase();
    return rows.filter(r => r.productName.toLowerCase().includes(s));
  }, [rows, searchTerm]);

  // Export CSV ready for Google Sheets / Excel
  const handleExportCsv = () => {
    const header = ['ক্রমিক', 'পণ্য এর নাম (১ম কলাম)', 'পরিমান ১ (২য় কলাম)', 'পরিমান ২ (৩য় কলাম)', 'মোট যোগফল ২+৩ (৪র্থ কলাম)', 'একক'];
    const dataRows = rows.map((r, idx) => [
      idx + 1,
      `"${r.productName.replace(/"/g, '""')}"`,
      r.quantity1,
      r.quantity2,
      r.quantity1 + r.quantity2,
      `"${r.unit || ''}"`
    ]);
    const summaryRow = [
      'সর্বমোট যোগফল',
      'মোট পণ্য: ' + rows.length,
      totalQty1,
      totalQty2,
      grandCombinedTotal,
      ''
    ];

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [header, ...dataRows, summaryRow].map(e => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Google_Sheets_Product_Quantity_Table_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print / PDF
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('প্রিন্ট উইন্ডো খুলতে পারেনি। ব্রাউজার পপআপ এলাউ করুন।');
      return;
    }

    const html = `
      <!DOCTYPE html>
      <html lang="bn">
      <head>
        <meta charset="utf-8" />
        <title>গুগল শিট - পণ্য ও পরিমাণ হিসাব তালিকা</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 25px; color: #1e293b; }
          h1 { margin: 0 0 4px 0; font-size: 20px; color: #047857; }
          .sub { color: #64748b; font-size: 13px; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 13px; }
          th { background-color: #ecfdf5; color: #065f46; border: 1px solid #cbd5e1; padding: 10px; text-align: left; font-weight: bold; }
          td { border: 1px solid #cbd5e1; padding: 8px 10px; }
          .text-center { text-align: center; }
          .total-row { background-color: #f8fafc; font-weight: bold; }
          .sum-cell { background-color: #d1fae5; font-weight: bold; color: #047857; }
          .header-box { display: flex; justify-content: space-between; border-bottom: 2px solid #059669; padding-bottom: 12px; }
          @media print {
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="header-box">
          <div>
            <h1>গুগল শিট - পণ্য ও পরিমাণ হিসাব তালিকা</h1>
            <div class="sub">হিসাব: ১ম কলাম: পণ্য এর নাম | ২য় কলাম: পরিমান | ৩য় কলাম: পরিমান | ৪র্থ কলাম: (২+৩) যোগফল</div>
          </div>
          <div style="text-align: right; font-size: 12px; color: #64748b;">
            <div>তারিখ: ${new Date().toLocaleDateString('bn-BD')}</div>
            <div>মডারেটর: ${moderatorName || 'মডারেটর মনিটরিং হাব'}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 45px;" class="text-center">#</th>
              <th>১ম কলাম: পণ্য এর নাম (A)</th>
              <th style="width: 140px;" class="text-center">২য় কলাম: পরিমান ১ (B)</th>
              <th style="width: 140px;" class="text-center">৩য় কলাম: পরিমান ২ (C)</th>
              <th style="width: 160px;" class="text-center">৪র্থ কলাম: ২+৩ যোগফল (D = B+C)</th>
              <th style="width: 80px;" class="text-center">একক</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map((r, i) => `
              <tr>
                <td class="text-center">${i + 1}</td>
                <td style="font-weight: 600;">${r.productName}</td>
                <td class="text-center">${r.quantity1}</td>
                <td class="text-center">${r.quantity2}</td>
                <td class="text-center sum-cell">${r.quantity1 + r.quantity2}</td>
                <td class="text-center" style="color: #64748b;">${r.unit || 'পিস'}</td>
              </tr>
            `).join('')}
            <tr class="total-row">
              <td colspan="2" style="font-size: 14px;">সর্বমোট যোগফল (মোট ${rows.length}টি পণ্য)</td>
              <td class="text-center" style="font-size: 14px; color: #0284c7;">${totalQty1}</td>
              <td class="text-center" style="font-size: 14px; color: #6366f1;">${totalQty2}</td>
              <td class="text-center sum-cell" style="font-size: 15px;">${grandCombinedTotal}</td>
              <td></td>
            </tr>
          </tbody>
        </table>
        
        <div style="margin-top: 30px; font-size: 11px; color: #94a3b8; text-align: right;">
          খাতা+ (Khata Plus) গুগল শিট ইন্টিগ্রেশন দ্বারা প্রস্তুতকৃত
        </div>

        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  // Selected row for active formula bar display
  const activeSelectedRow = selectedRowIndex !== null && filteredRows[selectedRowIndex] ? filteredRows[selectedRowIndex] : filteredRows[0];
  const activeRowNumber = (selectedRowIndex !== null ? selectedRowIndex : 0) + 2;
  const activeFormulaText = activeSelectedRow 
    ? `=B${activeRowNumber} + C${activeRowNumber}  ➔  (${activeSelectedRow.quantity1} + ${activeSelectedRow.quantity2} = ${(Number(activeSelectedRow.quantity1) || 0) + (Number(activeSelectedRow.quantity2) || 0)})`
    : `=B2 + C2`;

  return (
    <div className="space-y-4">
      {/* Top Google Sheets Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-teal-950 to-slate-950 p-4 sm:p-6 rounded-3xl text-white border border-emerald-700/60 shadow-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/25 text-emerald-300 rounded-full text-xs font-bold mb-2 border border-emerald-500/40">
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>গুগল শিট লাইভ ইন্টিগ্রেশন</span>
              <span className="bg-emerald-400 text-slate-950 px-2 py-0.5 text-[10px] font-black rounded-md">
                {googleSheetUrl ? 'শিট সংযুক্ত ✓' : 'শিট সংযুক্ত করুন'}
              </span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <span>সংযুক্ত গুগল শিট ও হিসাব তালিকা</span>
            </h3>
            <p className="text-xs sm:text-sm text-emerald-100/90 mt-1 max-w-2xl font-normal leading-relaxed">
              আপনি যে গুগল শিট লিংক করবেন, সেই শিটটি সরাসরি এখানে দেখা যাবে এবং সেটার সকল তথ্য ও হিসাব রিয়েল-টাইমে এখানে প্রদর্শিত হবে।
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Auto Background Sync Status / Toggle Widget */}
            <div className="flex items-center gap-1.5 bg-slate-900/90 border border-emerald-500/40 px-3 py-2 rounded-xl shadow-xs">
              <button
                type="button"
                onClick={toggleAutoSync}
                className="flex items-center gap-2 text-xs font-bold text-left cursor-pointer group"
                title={isAutoSyncEnabled ? 'স্বয়ংক্রিয় ব্যাকগ্রাউন্ড সিঙ্ক সক্রিয় (ক্লিক করে বন্ধ করতে পারেন)' : 'স্বয়ংক্রিয় সিঙ্ক বন্ধ (ক্লিক করে চালু করুন)'}
              >
                <span className="relative flex h-2.5 w-2.5">
                  {isAutoSyncEnabled && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  )}
                  <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isAutoSyncEnabled ? 'bg-emerald-400 ring-2 ring-emerald-300/40' : 'bg-slate-500'}`}></span>
                </span>
                <span className={isAutoSyncEnabled ? 'text-emerald-300 group-hover:text-white' : 'text-slate-400 group-hover:text-slate-200'}>
                  {isAutoSyncing ? 'সিঙ্ক হচ্ছে...' : isAutoSyncEnabled ? 'অটো-সিঙ্ক লাইভ' : 'অটো-সিঙ্ক বন্ধ'}
                </span>
              </button>

              {/* Quick Sync Now Button */}
              <button
                type="button"
                onClick={handleManualSyncNow}
                disabled={isAutoSyncing}
                className="ml-1 p-1 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-200 rounded-md transition cursor-pointer"
                title="এখনই ম্যানুয়ালি সিঙ্ক করুন"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isAutoSyncing ? 'animate-spin text-emerald-300' : ''}`} />
              </button>
            </div>

            {/* Sheet Link Config Button */}
            <button
              onClick={() => {
                setShowSheetSettings(prev => !prev);
                if (!showSheetSettings) {
                  setInputSheetUrl(googleSheetUrl);
                  setInputWebhookUrl(webhookUrl);
                }
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs transition cursor-pointer shadow-md active:scale-95"
              title="আপনার গুগল শিট ও ব্যাকগ্রাউন্ড সিঙ্ক সেটিংস"
            >
              <LinkIcon className="w-4 h-4 text-slate-950" />
              <span>{googleSheetUrl ? 'শিট ও সিঙ্ক সেটিংস' : 'গুগল শিট লিঙ্ক করুন'}</span>
            </button>

            {/* Sync / Load Data from Google Sheet */}
            {googleSheetUrl && (
              <button
                onClick={() => handleFetchSheetData(undefined, false)}
                disabled={isLoadingSheetData || isAutoSyncing}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl text-xs transition cursor-pointer shadow-xs active:scale-95 disabled:opacity-50"
                title="গুগল শিট থেকে সর্বশেষ তথ্য নিয়ে আসুন"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingSheetData ? 'animate-spin' : ''}`} />
                <span>{isLoadingSheetData ? 'তথ্য লোড হচ্ছে...' : 'শিট থেকে তথ্য আনুন'}</span>
              </button>
            )}

            {/* Direct Google Sheets Open */}
            <button
              onClick={handleOpenGoogleSheets}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white font-bold rounded-xl text-xs transition cursor-pointer border border-slate-700 active:scale-95"
              title={googleSheetUrl ? 'নতুন ট্যাবে এই গুগল শিটটি খুলুন' : 'নতুন গুগল শিট খুলুন'}
            >
              <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
              <span>গুগলে খুলুন</span>
            </button>

            {/* 1-Click Copy for Google Sheets */}
            <button
              onClick={handleCopyForGoogleSheet}
              className={`inline-flex items-center gap-1.5 px-3 py-2.5 font-bold rounded-xl text-xs transition cursor-pointer border active:scale-95 ${
                copiedForSheet
                  ? 'bg-emerald-600 text-white border-emerald-400'
                  : 'bg-emerald-950/80 hover:bg-emerald-900 text-emerald-200 border-emerald-600/60'
              }`}
              title="গুগল শিটে পেস্ট করতে কপি করুন (Ctrl+V)"
            >
              {copiedForSheet ? <Check className="w-3.5 h-3.5 text-emerald-200" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedForSheet ? 'কপি হয়েছে!' : 'কপি (Ctrl+V)'}</span>
            </button>

            {/* Print / PDF */}
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white font-bold rounded-xl text-xs transition cursor-pointer border border-slate-700 active:scale-95"
              title="প্রিন্ট বা পিডিএফ"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>প্রিন্ট</span>
            </button>
          </div>
        </div>

        {/* Linked Sheet URL & Auto Sync Status Line */}
        <div className="mt-4 pt-3 border-t border-emerald-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-emerald-200 truncate">
            <span className="font-bold text-emerald-400 shrink-0">সংযুক্ত শিট:</span>
            {googleSheetUrl ? (
              <span className="font-mono text-emerald-100 truncate underline cursor-pointer" onClick={handleOpenGoogleSheets} title={googleSheetUrl}>
                {googleSheetUrl}
              </span>
            ) : (
              <span className="text-emerald-300/70 italic cursor-pointer underline" onClick={() => setShowSheetSettings(true)}>
                কোনো শিট লিঙ্ক করা নেই (শিট লিঙ্ক করুন)
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {lastSyncTime && (
              <span className="text-[11px] bg-slate-900/90 text-emerald-300 px-2.5 py-0.5 rounded-md border border-emerald-800/60 flex items-center gap-1 font-mono">
                <Activity className="w-3 h-3 text-emerald-400" />
                সর্বশেষ সিঙ্ক: {lastSyncTime}
              </span>
            )}
            <span className="text-[11px] bg-emerald-900/80 text-emerald-300 px-2 py-0.5 rounded-md border border-emerald-700/50">
              স্বয়ংক্রিয় ২+৩ যোগফল সক্রিয়
            </span>
          </div>
        </div>

        {/* View Mode Switcher: Live Sheet vs. Calculation Table vs. Split */}
        <div className="mt-4 pt-4 border-t border-emerald-800/60 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center bg-slate-950/80 p-1 rounded-2xl border border-emerald-800/60">
            <button
              onClick={() => setViewMode('table')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'text-emerald-300 hover:text-white'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>হিসাব টেবিল ভিউ</span>
            </button>

            <button
              onClick={() => setViewMode('embed')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'embed'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'text-emerald-300 hover:text-white'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>সরাসরি গুগল শিট ভিউ</span>
            </button>

            <button
              onClick={() => setViewMode('split')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer hidden sm:flex ${
                viewMode === 'split'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'text-emerald-300 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>উভয় ভিউ একসাথে</span>
            </button>
          </div>

          {/* Quick Add Product Button */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddRowCard(prev => !prev)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-teal-700 hover:bg-teal-600 text-white font-bold rounded-xl text-xs transition cursor-pointer shadow-xs active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ নতুন পণ্য</span>
            </button>
            <button
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white font-bold rounded-xl text-xs transition cursor-pointer border border-slate-700 active:scale-95"
            >
              <Download className="w-3 h-3" />
              <span>CSV</span>
            </button>
          </div>
        </div>

        {/* 4 Columns Summary Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 mt-4 pt-4 border-t border-emerald-800/60">
          <div className="bg-slate-900/90 p-3 rounded-2xl border border-emerald-800/50">
            <span className="text-[10px] font-bold text-emerald-300 block uppercase tracking-wider font-mono">
              কলাম A (১ম)
            </span>
            <span className="text-xs text-slate-300 font-medium block mt-0.5">
              মোট পণ্য
            </span>
            <span className="text-lg sm:text-xl font-black text-white mt-1 block">
              {rows.length} টি
            </span>
          </div>

          <div className="bg-sky-950/60 p-3 rounded-2xl border border-sky-800/60">
            <span className="text-[10px] font-bold text-sky-300 block uppercase tracking-wider font-mono">
              কলাম B (২য়)
            </span>
            <span className="text-xs text-sky-200 font-medium block mt-0.5">
              মোট পরিমাণ (১)
            </span>
            <span className="text-lg sm:text-xl font-black text-sky-300 mt-1 block">
              {totalQty1.toLocaleString('bn-BD')}
            </span>
          </div>

          <div className="bg-indigo-950/60 p-3 rounded-2xl border border-indigo-800/60">
            <span className="text-[10px] font-bold text-indigo-300 block uppercase tracking-wider font-mono">
              কলাম C (৩য়)
            </span>
            <span className="text-xs text-indigo-200 font-medium block mt-0.5">
              মোট পরিমাণ (২)
            </span>
            <span className="text-lg sm:text-xl font-black text-indigo-300 mt-1 block">
              {totalQty2.toLocaleString('bn-BD')}
            </span>
          </div>

          <div className="bg-emerald-950/80 p-3 rounded-2xl border border-emerald-500/60 shadow-xs ring-1 ring-emerald-500/40">
            <span className="text-[10px] font-bold text-emerald-300 block uppercase tracking-wider font-mono flex items-center gap-1">
              <span>কলাম D (=B+C)</span>
            </span>
            <span className="text-xs text-emerald-200 font-medium block mt-0.5">
              সর্বমোট যোগফল
            </span>
            <span className="text-lg sm:text-xl font-black text-emerald-300 mt-1 block">
              {grandCombinedTotal.toLocaleString('bn-BD')}
            </span>
          </div>
        </div>
      </div>

      {/* Google Sheet & Auto Background Sync Setup Drawer / Card */}
      {showSheetSettings && (
        <form onSubmit={handleSaveSheetSettings} className="bg-white p-4 sm:p-6 rounded-3xl border border-emerald-300 shadow-xl space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold shadow-xs">
                <FileSpreadsheet className="w-5 h-5 text-emerald-700" />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900">
                  গুগল শিট ও স্বয়ংক্রিয় ব্যাকগ্রাউন্ড সিঙ্ক সেটিংস
                </h4>
                <p className="text-[11px] text-slate-500">
                  শিট লিঙ্ক করা থাকলে লেনদেন বা পণ্যের পরিমাণ পরিবর্তন হওয়া মাত্র স্বয়ংক্রিয়ভাবে গুগল শিটে লাইভ আপডেট হবে।
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowSheetSettings(false)}
              className="w-7 h-7 flex items-center justify-center text-xs text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>

          {/* 1. Google Sheet Link Section */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-800">
                ১. গুগল শিটের লিঙ্ক (Google Sheet URL বা ID)
              </label>
              {googleSheetUrl && (
                <button
                  type="button"
                  onClick={handleOpenGoogleSheets}
                  className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 cursor-pointer"
                >
                  <span>শিটটি খুলুন</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              )}
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-2">
              <input
                type="text"
                placeholder="যেমন: https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMd.../edit"
                value={inputSheetUrl}
                onChange={e => setInputSheetUrl(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="button"
                onClick={() => window.open('https://sheets.new', '_blank')}
                className="w-full sm:w-auto px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer shrink-0"
                title="গুগলে নতুন ব্ল্যাঙ্ক শিট খুলুন"
              >
                নতুন শিট খুলুন
              </button>
            </div>
            <p className="text-[11px] text-slate-500">
              গুগল শিটের লিঙ্ক দিলে সরাসরি নিচে শিট প্রদর্শিত হবে এবং ডেটা স্বয়ংক্রিয়ভাবে পাঠাতে ও আনতে পারবে।
            </p>
          </div>

          {/* 2. Auto Background Sync Feature Toggle */}
          <div className="p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-2xl flex items-start justify-between gap-3">
            <div className="space-y-0.5">
              <span className="text-xs font-black text-emerald-950 flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-emerald-600 fill-emerald-600" />
                স্বয়ংক্রিয় ব্যাকগ্রাউন্ড সিঙ্ক (Auto Background Sync)
              </span>
              <p className="text-[11px] text-emerald-800 leading-relaxed">
                চালু থাকলে পণ্য বা পরিমাণের হিসাব বদলানোর সাথে সাথেই স্বয়ংক্রিয়ভাবে ব্যাকগ্রাউন্ডে গুগল শিটে ডেটা সিঙ্ক হয়ে যাবে। বারবার ম্যানুয়ালি ক্লিক করতে হবে না।
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
              <input
                type="checkbox"
                checked={isAutoSyncEnabled}
                onChange={e => setIsAutoSyncEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          {/* 3. Google Apps Script Webhook (Optional for 2-way live sync) */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
              <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-indigo-600" />
                <span>Apps Script Webhook URL (রিয়েল-টাইম ব্যাকগ্রাউন্ড পুশ - ঐচ্ছিক)</span>
              </label>
              <button
                type="button"
                onClick={handleCopyAppsScript}
                className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-lg border transition cursor-pointer ${
                  copiedScript
                    ? 'bg-emerald-600 text-white border-emerald-500'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                }`}
              >
                {copiedScript ? <Check className="w-3 h-3 text-emerald-200" /> : <Copy className="w-3 h-3 text-slate-500" />}
                <span>{copiedScript ? 'কোড কপি হয়েছে!' : 'Apps Script কোড কপি'}</span>
              </button>
            </div>

            <input
              type="text"
              placeholder="https://script.google.com/macros/s/.../exec"
              value={inputWebhookUrl}
              onChange={e => setInputWebhookUrl(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <div className="text-[11px] text-slate-600 space-y-1">
              <p>
                <strong>কিভাবে ব্যবহার করবেন:</strong> ১. ওপরের "Apps Script কোড কপি" বাটনে ক্লিক করুন। ২. আপনার গুগল শিটে গিয়ে <strong>Extensions &gt; Apps Script</strong>-এ পেস্ট করে <strong>Deploy &gt; New deployment &gt; Web app (Anyone)</strong> হিসেবে Deploy করে প্রাপ্ত URL-টি এখানে বসান।
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowSheetSettings(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              বাতিল
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-md active:scale-95 flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>সেটিংস সংরক্ষণ করুন</span>
            </button>
          </div>
        </form>
      )}

      {/* Sync error notice */}
      {syncError && (
        <div className="p-3.5 bg-amber-50 border border-amber-300 text-amber-900 rounded-2xl text-xs font-medium flex items-start gap-2.5 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold text-amber-950">শিটের তথ্য সিঙ্ক করার জন্য নির্দেশনা:</span>
            <p className="text-amber-900 text-[11px] leading-relaxed">{syncError}</p>
            <p className="text-amber-800 text-[11px]">
              তবে আপনার গুগল শিটটি সরাসরি নিচের <strong>"সরাসরি গুগল শিট ভিউ"</strong> ট্যাবে লাইভ দেখা যাচ্ছে।
            </p>
          </div>
          <button onClick={() => setSyncError(null)} className="ml-auto text-amber-500 hover:text-amber-800">✕</button>
        </div>
      )}

      {/* Feedback Toast */}
      {feedback && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-2xl text-xs font-bold flex items-center justify-between animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{feedback}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-slate-700">✕</button>
        </div>
      )}

      {/* Add New Product Form Card */}
      {showAddRowCard && (
        <form onSubmit={handleAddRow} className="bg-white p-4 sm:p-5 rounded-3xl border border-emerald-200 shadow-sm space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Plus className="w-4 h-4 text-emerald-600" />
              <span>টেবিলে নতুন পণ্য সারি যোগ করুন</span>
            </h4>
            <button
              type="button"
              onClick={() => setShowAddRowCard(false)}
              className="text-xs text-slate-400 hover:text-slate-700 font-bold"
            >
              বন্ধ করুন
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            {/* Column 1: Product Name */}
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                ১ম কলাম (A): পণ্য এর নাম <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="যেমন: মিনিকেট চাল (৫০ কেজি বস্তা)"
                value={newProductName}
                onChange={e => setNewProductName(e.target.value)}
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Column 2: Quantity 1 */}
            <div>
              <label className="block text-[11px] font-bold text-sky-800 mb-1">
                ২য় কলাম (B): পরিমান (১)
              </label>
              <input
                type="number"
                min="0"
                step="any"
                placeholder="০"
                value={newQty1}
                onChange={e => setNewQty1(e.target.value)}
                className="w-full bg-sky-50/60 border border-sky-200 rounded-xl px-3 py-2 text-xs font-bold text-sky-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            {/* Column 3: Quantity 2 */}
            <div>
              <label className="block text-[11px] font-bold text-indigo-800 mb-1">
                ৩য় কলাম (C): পরিমান (২)
              </label>
              <input
                type="number"
                min="0"
                step="any"
                placeholder="০"
                value={newQty2}
                onChange={e => setNewQty2(e.target.value)}
                className="w-full bg-indigo-50/60 border border-indigo-200 rounded-xl px-3 py-2 text-xs font-bold text-indigo-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">একক:</span>
              <select
                value={newUnit}
                onChange={e => setNewUnit(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="পিস">পিস</option>
                <option value="প্যাকেট">প্যাকেট</option>
                <option value="বস্তা">বস্তা</option>
                <option value="বোতল">বোতল</option>
                <option value="কার্টুন">কার্টুন</option>
                <option value="কেজি">কেজি</option>
                <option value="লিটার">লিটার</option>
              </select>

              <div className="ml-2 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded-xl border border-emerald-200">
                ৪র্থ কলাম সূত্র (D = B+C): {(parseFloat(newQty1) || 0) + (parseFloat(newQty2) || 0)}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowAddRowCard(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 font-semibold cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs active:scale-95"
              >
                যোগ করুন
              </button>
            </div>
          </div>
        </form>
      )}

      {/* SECTION 1: LIVE EMBEDDED GOOGLE SHEET IFRAME VIEW */}
      {(viewMode === 'embed' || viewMode === 'split') && (
        <div className={`bg-white rounded-3xl border border-slate-300 shadow-sm overflow-hidden transition-all ${
          isIframeFullscreen ? 'fixed inset-4 z-50 shadow-2xl flex flex-col' : ''
        }`}>
          {/* Embedded Google Sheet Control Bar */}
          <div className="bg-slate-900 text-white px-4 py-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold border border-emerald-500/40">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                  <span>সরাসরি গুগল শিট ভিউ (Live Google Sheet)</span>
                  <span className="text-[10px] bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full font-normal">
                    লাইভ দৃশ্যমান
                  </span>
                </h4>
                <p className="text-[11px] text-slate-400 truncate max-w-md">
                  {googleSheetUrl || 'এখনও কোনো লিঙ্ক করা হয়নি'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {googleSheetUrl && (
                <button
                  onClick={() => setIframeKey(k => k + 1)}
                  className="p-1.5 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
                  title="শিটটি পুনরায় লোড করুন"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">রিফ্রেশ</span>
                </button>
              )}

              <button
                onClick={handleOpenGoogleSheets}
                className="p-1.5 text-emerald-300 hover:text-white bg-emerald-950 hover:bg-emerald-900 border border-emerald-700/60 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
                title="গুগল শিট আলাদা ট্যাবে খুলুন"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">নতুন উইন্ডো</span>
              </button>

              <button
                onClick={() => setIsIframeFullscreen(f => !f)}
                className="p-1.5 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
                title={isIframeFullscreen ? 'ছোট করুন' : 'বড় পর্দা'}
              >
                {isIframeFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Iframe Container or Prompt to Link Sheet */}
          {googleSheetUrl && sheetEmbedInfo.embedUrl ? (
            <div className="relative w-full bg-slate-100 flex-1 min-h-[500px]">
              <iframe
                key={iframeKey}
                src={sheetEmbedInfo.embedUrl}
                title="Google Sheet Live View"
                className="w-full h-[550px] sm:h-[650px] border-0"
                allow="clipboard-read; clipboard-write"
                loading="lazy"
              />
            </div>
          ) : (
            <div className="p-8 sm:p-12 text-center bg-slate-50 space-y-4">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <FileSpreadsheet className="w-7 h-7" />
              </div>
              <div className="max-w-md mx-auto space-y-1.5">
                <h4 className="text-base font-bold text-slate-900">
                  এখনো কোনো গুগল শিট লিঙ্ক করা হয়নি
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  আপনার গুগল শিটের লিঙ্কটি দিলে সেটি সরাসরি এখানে লোড হবে এবং সেটার তথ্য এই পৃষ্ঠায় দেখা যাবে।
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
                <button
                  onClick={() => setShowSheetSettings(true)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
                >
                  গুগল শিট লিঙ্ক করুন
                </button>
                <button
                  onClick={() => window.open('https://sheets.new', '_blank')}
                  className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition"
                >
                  নতুন শিট তৈরি করুন (sheets.new)
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SECTION 2: CALCULATION TABLE (কলাম ১: পণ্য, কলাম ২: পরিমান ১, কলাম ৩: পরিমান ২, কলাম ৪: ২+৩ যোগফল) */}
      {(viewMode === 'table' || viewMode === 'split') && (
        <div className="space-y-3">
          {/* Table Controls (Search & Actions) */}
          <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="পণ্য এর নাম দিয়ে টেবিলে খুঁজুন..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
              <button
                onClick={handleImportFromInventory}
                title="ইনভেন্টরি থেকে পণ্যসমূহ এই টেবিলে লোড করুন"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer active:scale-95"
              >
                <Package className="w-3.5 h-3.5 text-emerald-600" />
                <span>ইনভেন্টরি থেকে আনুন</span>
              </button>

              <span className="text-xs text-slate-500 font-medium">
                মোট পণ্য: <strong className="text-slate-800">{filteredRows.length}</strong>
              </span>

              <button
                onClick={handleResetTable}
                title="প্রাথমিক পণ্য তালিকায় রিসেট করুন"
                className="flex items-center gap-1 text-xs text-slate-500 hover:text-rose-600 font-semibold px-2 py-1 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>রিসেট</span>
              </button>
            </div>
          </div>

          {/* Mobile Horizontal Scroll Instruction Badge (Fixing mobile clipping) */}
          <div className="sm:hidden flex items-center justify-center gap-1 py-1.5 px-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold rounded-xl text-center">
            <span>↔ ডানে-বামে স্ক্রোল করুন (সব কলাম ও ২+৩ যোগফল দেখতে)</span>
          </div>

          {/* THE MAIN SPREADSHEET TABLE (With min-width so text is never cropped on mobile) */}
          <div className="bg-white rounded-3xl border border-slate-300 shadow-sm overflow-hidden">
            
            {/* Google Sheets Table Top Bar */}
            <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 flex items-center justify-between text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <span className="font-bold text-slate-700">হিসাব তালিকা (Google Sheets Sync Ready)</span>
                <span className="text-[11px] text-slate-400 font-mono">Sheet1</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded">
                  ৪র্থ কলাম = B + C স্বয়ংক্রিয় যোগ
                </span>
              </div>
            </div>

            {/* Scrollable table container */}
            <div className="overflow-x-auto w-full">
              <table className="w-full min-w-[700px] sm:min-w-[760px] text-left border-collapse font-sans">
                <thead>
                  {/* Spreadsheet Column Alphabet Letters Row (Google Sheets Standard) */}
                  <tr className="bg-slate-200/90 text-slate-600 text-[11px] font-mono border-b border-slate-300 select-none">
                    <th className="py-1.5 px-3 text-center w-12 border-r border-slate-300 font-bold"></th>
                    <th className="py-1.5 px-4 text-center border-r border-slate-300 font-bold min-w-[220px]">A</th>
                    <th className="py-1.5 px-4 text-center w-36 sm:w-44 border-r border-slate-300 font-bold bg-sky-100/60 text-sky-800">B</th>
                    <th className="py-1.5 px-4 text-center w-36 sm:w-44 border-r border-slate-300 font-bold bg-indigo-100/60 text-indigo-800">C</th>
                    <th className="py-1.5 px-4 text-center w-48 sm:w-56 border-r border-slate-300 font-bold bg-emerald-100/70 text-emerald-900">D (=B+C)</th>
                    <th className="py-1.5 px-3 text-center w-16">অ্যাকশন</th>
                  </tr>

                  {/* Functional Bengali Column Headers */}
                  <tr className="bg-slate-900 text-white text-xs select-none">
                    <th className="py-3 px-3.5 text-center w-12 text-slate-400 font-bold border-r border-slate-800">#</th>
                    
                    {/* 1st Column: Product Name (A) */}
                    <th className="py-3 px-4 font-bold tracking-wide border-r border-slate-800 min-w-[220px]">
                      <div className="flex items-center gap-1.5 text-emerald-300">
                        <Package className="w-4 h-4 shrink-0" />
                        <span className="whitespace-nowrap">১ম কলাম (A): পণ্য এর নাম</span>
                      </div>
                    </th>

                    {/* 2nd Column: Quantity 1 (B) */}
                    <th className="py-3 px-4 font-bold text-center w-36 sm:w-44 bg-sky-950/80 border-r border-slate-800">
                      <div className="flex items-center justify-center gap-1 text-sky-300">
                        <span className="whitespace-nowrap">২য় কলাম (B): পরিমান (১)</span>
                      </div>
                    </th>

                    {/* 3rd Column: Quantity 2 (C) */}
                    <th className="py-3 px-4 font-bold text-center w-36 sm:w-44 bg-indigo-950/80 border-r border-slate-800">
                      <div className="flex items-center justify-center gap-1 text-indigo-300">
                        <span className="whitespace-nowrap">৩য় কলাম (C): পরিমান (২)</span>
                      </div>
                    </th>

                    {/* 4th Column: Sum of Col 2 + Col 3 (D) */}
                    <th className="py-3 px-4 font-bold text-center w-48 sm:w-56 bg-emerald-950 border-r border-slate-800">
                      <div className="flex items-center justify-center gap-1 text-emerald-300">
                        <span className="font-extrabold whitespace-nowrap">৪র্থ কলাম (D): ২ + ৩ যোগফল</span>
                      </div>
                    </th>

                    {/* Action */}
                    <th className="py-3 px-3 text-center w-16 text-slate-400 font-bold">মুছুন</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200 text-xs text-slate-800">
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400 font-medium">
                        কোনো পণ্য পাওয়া যায়নি। উপরে "+ নতুন পণ্য" বাটনে ক্লিক করে সারি যোগ করুন।
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((row, idx) => {
                      const q1 = Number(row.quantity1) || 0;
                      const q2 = Number(row.quantity2) || 0;
                      const sum2and3 = q1 + q2; // ৪র্থ কলামে ২ + ৩ নাম্বার কলাম যোগ হবে
                      const rowSheetNumber = idx + 2;
                      const isSelected = selectedRowIndex === idx;

                      return (
                        <tr 
                          key={row.id} 
                          onClick={() => setSelectedRowIndex(idx)}
                          className={`transition cursor-pointer group ${
                            isSelected ? 'bg-emerald-50/70 ring-1 ring-emerald-400' : 'hover:bg-slate-50'
                          }`}
                        >
                          {/* Spreadsheet Row Number */}
                          <td className="py-2.5 px-3 text-center text-slate-400 font-mono font-bold bg-slate-50 border-r border-slate-200">
                            {rowSheetNumber}
                          </td>

                          {/* 1st Column: Product Name (A) - min-w-[220px] ensures text is never clipped! */}
                          <td className="py-2 px-3 border-r border-slate-200 min-w-[220px]">
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={row.productName}
                                onChange={e => handleUpdateCell(row.id, 'productName', e.target.value)}
                                className="w-full font-bold text-slate-900 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-emerald-500 focus:bg-white px-2 py-1 rounded focus:outline-none transition text-xs sm:text-sm min-w-[150px]"
                                placeholder="পণ্য এর নাম লিখুন..."
                              />
                              {row.unit && (
                                <span className="text-[10px] text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded shrink-0 font-medium whitespace-nowrap">
                                  {row.unit}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* 2nd Column: Quantity 1 (B) */}
                          <td className="py-2 px-3 bg-sky-50/40 border-r border-slate-200 w-36 sm:w-44">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStepQty(row.id, 'quantity1', -1);
                                }}
                                className="w-6 h-6 rounded-md bg-white border border-sky-300 text-sky-700 hover:bg-sky-100 font-bold flex items-center justify-center cursor-pointer transition active:scale-95 text-xs shadow-2xs shrink-0"
                                title="১ কমান"
                              >
                                -
                              </button>
                              
                              <input
                                type="number"
                                min="0"
                                step="any"
                                value={row.quantity1}
                                onClick={e => e.stopPropagation()}
                                onChange={e => handleUpdateCell(row.id, 'quantity1', e.target.value)}
                                className="w-16 sm:w-20 text-center font-bold text-sky-950 bg-white border border-sky-300 rounded-lg px-1.5 py-1 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-2xs font-mono"
                              />

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStepQty(row.id, 'quantity1', 1);
                                }}
                                className="w-6 h-6 rounded-md bg-white border border-sky-300 text-sky-700 hover:bg-sky-100 font-bold flex items-center justify-center cursor-pointer transition active:scale-95 text-xs shadow-2xs shrink-0"
                                title="১ বাড়ান"
                              >
                                +
                              </button>
                            </div>
                          </td>

                          {/* 3rd Column: Quantity 2 (C) */}
                          <td className="py-2 px-3 bg-indigo-50/40 border-r border-slate-200 w-36 sm:w-44">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStepQty(row.id, 'quantity2', -1);
                                }}
                                className="w-6 h-6 rounded-md bg-white border border-indigo-300 text-indigo-700 hover:bg-indigo-100 font-bold flex items-center justify-center cursor-pointer transition active:scale-95 text-xs shadow-2xs shrink-0"
                                title="১ কমান"
                              >
                                -
                              </button>
                              
                              <input
                                type="number"
                                min="0"
                                step="any"
                                value={row.quantity2}
                                onClick={e => e.stopPropagation()}
                                onChange={e => handleUpdateCell(row.id, 'quantity2', e.target.value)}
                                className="w-16 sm:w-20 text-center font-bold text-indigo-950 bg-white border border-indigo-300 rounded-lg px-1.5 py-1 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs font-mono"
                              />

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStepQty(row.id, 'quantity2', 1);
                                }}
                                className="w-6 h-6 rounded-md bg-white border border-indigo-300 text-indigo-700 hover:bg-indigo-100 font-bold flex items-center justify-center cursor-pointer transition active:scale-95 text-xs shadow-2xs shrink-0"
                                title="১ বাড়ান"
                              >
                                +
                              </button>
                            </div>
                          </td>

                          {/* 4th Column: Sum of Col 2 + Col 3 (D = B+C) */}
                          <td className="py-2 px-3 bg-emerald-50/70 border-r border-slate-200 w-48 sm:w-56">
                            <div className="flex flex-col items-center justify-center">
                              <span className="inline-flex items-center justify-center px-3.5 py-1 rounded-xl bg-emerald-600 text-white font-black text-xs sm:text-sm shadow-2xs min-w-[80px] font-mono">
                                {sum2and3.toLocaleString('bn-BD')}
                              </span>
                              <span className="text-[10px] text-emerald-800 font-mono mt-0.5 whitespace-nowrap">
                                =B{rowSheetNumber}+C{rowSheetNumber} ({q1}+{q2})
                              </span>
                            </div>
                          </td>

                          {/* Action: Delete */}
                          <td className="py-2 px-3 text-center w-16">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteRow(row.id, row.productName);
                              }}
                              title="এই সারিটি মুছে ফেলুন"
                              className="text-slate-300 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>

                {/* TABLE FOOTER / GRAND TOTALS (GOOGLE SHEETS =SUM) */}
                <tfoot>
                  <tr className="bg-slate-900 text-white text-xs font-bold border-t-2 border-slate-700">
                    <td className="py-3.5 px-3 text-center text-slate-400 font-mono">
                      ∑
                    </td>
                    
                    {/* 1st Column Total Label */}
                    <td className="py-3.5 px-4 border-r border-slate-800 min-w-[220px]">
                      <div className="flex items-center justify-between">
                        <span className="text-emerald-300 font-extrabold text-xs sm:text-sm">
                          সর্বমোট যোগফল
                        </span>
                        <span className="text-[11px] text-slate-400 font-normal">
                          (মোট {rows.length}টি পণ্য)
                        </span>
                      </div>
                    </td>

                    {/* 2nd Column Total (B) */}
                    <td className="py-3.5 px-4 text-center bg-sky-950 border-r border-slate-800 w-36 sm:w-44">
                      <div className="text-sky-300 text-sm sm:text-base font-black font-mono">
                        {totalQty1.toLocaleString('bn-BD')}
                      </div>
                      <span className="text-[10px] text-sky-400 font-mono block">
                        =SUM(B2:B{rows.length + 1})
                      </span>
                    </td>

                    {/* 3rd Column Total (C) */}
                    <td className="py-3.5 px-4 text-center bg-indigo-950 border-r border-slate-800 w-36 sm:w-44">
                      <div className="text-indigo-300 text-sm sm:text-base font-black font-mono">
                        {totalQty2.toLocaleString('bn-BD')}
                      </div>
                      <span className="text-[10px] text-indigo-400 font-mono block">
                        =SUM(C2:C{rows.length + 1})
                      </span>
                    </td>

                    {/* 4th Column Grand Total (D = Col 2 + Col 3) */}
                    <td className="py-3.5 px-4 text-center bg-emerald-950 border-r border-slate-800 w-48 sm:w-56">
                      <div className="text-emerald-300 text-base sm:text-lg font-black font-mono">
                        {grandCombinedTotal.toLocaleString('bn-BD')}
                      </div>
                      <span className="text-[10px] text-emerald-400 font-mono block whitespace-nowrap">
                        =SUM(D2:D{rows.length + 1}) (∑ ২য় + ∑ ৩য়)
                      </span>
                    </td>

                    <td className="py-3.5 px-3"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Helpful Google Sheets Integration Guide Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="p-4 bg-emerald-50/70 rounded-2xl border border-emerald-200 flex items-start gap-3 text-xs text-emerald-950">
          <FileSpreadsheet className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h5 className="font-bold text-emerald-900">গুগল শিট থেকে তথ্য প্রদর্শন ও পেস্ট করার নিয়ম:</h5>
            <p className="leading-relaxed text-emerald-800">
              আপনি উপরে আপনার যেকোনো গুগল শিটের লিঙ্ক যুক্ত করলে সেটি নিচে সরাসরি লোড হবে। এছাড়াও <strong>"শিট থেকে তথ্য আনুন"</strong> বাটনে ক্লিক করে শিটের তথ্য এই হিসাব টেবিলে স্বয়ংক্রিয়ভাবে সিঙ্ক করতে পারবেন।
            </p>
          </div>
        </div>

        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-start gap-3 text-xs text-slate-800">
          <Info className="w-5 h-5 text-teal-700 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h5 className="font-bold text-slate-900">৪র্থ কলামে ২+৩ স্বয়ংক্রিয় যোগফল:</h5>
            <p className="leading-relaxed text-slate-600">
              টেবিলের ২য় কলাম (B) বা ৩য় কলাম (C)-এর ঘরে যেকোনো সংখ্যা লিখলে সাথে সাথেই ৪র্থ কলাম (D = B + C) এর যোগফল স্বয়ংক্রিয়ভাবে হিসাব হয়ে যায়।
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
