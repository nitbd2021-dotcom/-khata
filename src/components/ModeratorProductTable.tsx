import React, { useState, useEffect, useMemo } from 'react';
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
  Layers, 
  ArrowRight,
  Info,
  Boxes
} from 'lucide-react';
import { ModeratorProductTableRow, User } from '../types';
import { StorageService, generateId } from '../services/storageService';

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

  // New product inline form state
  const [newProductName, setNewProductName] = useState<string>('');
  const [newQty1, setNewQty1] = useState<string>('0');
  const [newQty2, setNewQty2] = useState<string>('0');
  const [newUnit, setNewUnit] = useState<string>('পিস');
  const [showAddRowCard, setShowAddRowCard] = useState<boolean>(false);

  // Re-load if moderatorId changes
  useEffect(() => {
    setRows(StorageService.getModeratorProductTable(moderatorId));
  }, [moderatorId]);

  // Auto-save whenever rows change
  const updateRowsAndSave = (updated: ModeratorProductTableRow[], msg?: string) => {
    setRows(updated);
    StorageService.saveModeratorProductTable(moderatorId, updated);
    if (msg) {
      setFeedback(msg);
      setTimeout(() => setFeedback(null), 3000);
    }
  };

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
    if (window.confirm('আপনি কি এই টেবিলটি প্রাথমিক ডেমো পণ্যের তালিকায় রিসেট করতে চান?')) {
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

    // Add items that are not already present
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

  // Filtered rows for search
  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return rows;
    const s = searchTerm.toLowerCase();
    return rows.filter(r => r.productName.toLowerCase().includes(s));
  }, [rows, searchTerm]);

  // Totals calculations
  const totalQty1 = rows.reduce((sum, r) => sum + (Number(r.quantity1) || 0), 0);
  const totalQty2 = rows.reduce((sum, r) => sum + (Number(r.quantity2) || 0), 0);
  const grandCombinedTotal = totalQty1 + totalQty2; // Col 2 total + Col 3 total = Col 4 total

  // Export CSV
  const handleExportCsv = () => {
    const header = ['ক্রমিক', 'পণ্য এর নাম (১ম কলাম)', 'পরিমান ১ (২য় কলাম)', 'পরিমান ২ (৩য় কলাম)', 'মোট যোগফল ২+৩ (৪র্থ কলাম)', 'একক'];
    const dataRows = rows.map((r, idx) => [
      idx + 1,
      `"${r.productName}"`,
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
    link.setAttribute('download', `Moderator_Product_Quantity_Table_${new Date().toISOString().slice(0, 10)}.csv`);
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
        <title>মডারেটর পণ্য ও পরিমাণ হিসাব তালিকা</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 25px; color: #1e293b; }
          h1 { margin: 0 0 4px 0; font-size: 20px; color: #0f766e; }
          .sub { color: #64748b; font-size: 13px; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 13px; }
          th { background-color: #f0fdfa; color: #0f766e; border: 1px solid #cbd5e1; padding: 10px; text-align: left; font-weight: bold; }
          td { border: 1px solid #cbd5e1; padding: 8px 10px; }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .total-row { background-color: #f8fafc; font-weight: bold; }
          .sum-cell { background-color: #ecfdf5; font-weight: bold; color: #047857; }
          .header-box { display: flex; justify-content: space-between; border-bottom: 2px solid #0f766e; padding-bottom: 12px; }
          @media print {
            body { padding: 0; }
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header-box">
          <div>
            <h1>মডারেটর পণ্য ও পরিমাণ হিসাব তালিকা</h1>
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
              <th>১ম কলাম: পণ্য এর নাম</th>
              <th style="width: 140px;" class="text-center">২য় কলাম: পরিমান (১)</th>
              <th style="width: 140px;" class="text-center">৩য় কলাম: পরিমান (২)</th>
              <th style="width: 160px;" class="text-center">৪র্থ কলাম: ২+৩ যোগফল</th>
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
          খাতা+ (Khata Plus) মডারেটর ম্যানেজমেন্ট সিস্টেম দ্বারা প্রস্তুতকৃত
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

  return (
    <div className="space-y-4">
      {/* Top Banner & Instructions */}
      <div className="bg-gradient-to-r from-teal-900 via-slate-900 to-slate-950 p-5 sm:p-6 rounded-3xl text-white border border-teal-700/50 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-teal-500/20 text-teal-300 rounded-full text-xs font-bold mb-2 border border-teal-500/30">
              <Boxes className="w-3.5 h-3.5" />
              <span>মডারেটর ক্যালকুলেশন টেবিল</span>
              <span className="bg-teal-400 text-slate-950 px-1.5 py-0.2 text-[10px] font-black rounded-sm">২+৩ যোগ</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              পণ্য ও পরিমাণ হিসাব টেবিল
            </h3>
            <p className="text-xs sm:text-sm text-teal-200/90 mt-1 max-w-2xl font-normal leading-relaxed">
              <strong>১ম কলাম:</strong> পণ্য এর নাম | <strong>২য় কলাম:</strong> পরিমান | <strong>৩য় কলাম:</strong> পরিমান | <strong>৪র্থ কলাম:</strong> ২য় ও ৩য় কলামের স্বয়ংক্রিয় যোগফল (২ + ৩)
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowAddRowCard(prev => !prev)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl text-xs transition cursor-pointer shadow-xs active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>+ নতুন পণ্য</span>
            </button>

            <button
              onClick={handleImportFromInventory}
              title="ইনভেন্টরি থেকে বিদ্যমান পণ্যসমূহ এই টেবিলে লোড করুন"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-teal-800/80 hover:bg-teal-700 text-teal-100 font-bold rounded-xl text-xs transition cursor-pointer border border-teal-600/50 active:scale-95"
            >
              <Package className="w-4 h-4" />
              <span className="hidden sm:inline">ইনভেন্টরি পণ্য আনুন</span>
              <span className="sm:hidden">ইনভেন্টরি</span>
            </button>

            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-teal-200 hover:text-white font-bold rounded-xl text-xs transition cursor-pointer border border-teal-700/50 active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>প্রিন্ট / PDF</span>
            </button>

            <button
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-teal-200 hover:text-white font-bold rounded-xl text-xs transition cursor-pointer border border-teal-700/50 active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>CSV</span>
            </button>
          </div>
        </div>

        {/* 4 Columns Formula Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 mt-5 pt-4 border-t border-teal-800/60">
          <div className="bg-slate-900/80 p-3 rounded-2xl border border-teal-800/50">
            <span className="text-[10px] font-bold text-teal-300 block uppercase tracking-wider">
              ১ম কলাম
            </span>
            <span className="text-xs text-slate-300 font-medium block mt-0.5">
              মোট পণ্য
            </span>
            <span className="text-lg sm:text-xl font-black text-white mt-1 block">
              {rows.length} টি
            </span>
          </div>

          <div className="bg-sky-950/50 p-3 rounded-2xl border border-sky-800/50">
            <span className="text-[10px] font-bold text-sky-300 block uppercase tracking-wider">
              ২য় কলাম
            </span>
            <span className="text-xs text-sky-200 font-medium block mt-0.5">
              মোট পরিমাণ (১)
            </span>
            <span className="text-lg sm:text-xl font-black text-sky-300 mt-1 block">
              {totalQty1.toLocaleString('bn-BD')}
            </span>
          </div>

          <div className="bg-indigo-950/50 p-3 rounded-2xl border border-indigo-800/50">
            <span className="text-[10px] font-bold text-indigo-300 block uppercase tracking-wider">
              ৩য় কলাম
            </span>
            <span className="text-xs text-indigo-200 font-medium block mt-0.5">
              মোট পরিমাণ (২)
            </span>
            <span className="text-lg sm:text-xl font-black text-indigo-300 mt-1 block">
              {totalQty2.toLocaleString('bn-BD')}
            </span>
          </div>

          <div className="bg-emerald-950/70 p-3 rounded-2xl border border-emerald-500/50 shadow-xs ring-1 ring-emerald-500/30">
            <span className="text-[10px] font-bold text-emerald-300 block uppercase tracking-wider flex items-center gap-1">
              <span>৪র্থ কলাম (২+৩ যোগ)</span>
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
        <form onSubmit={handleAddRow} className="bg-white p-4 sm:p-5 rounded-3xl border border-teal-200 shadow-sm space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Plus className="w-4 h-4 text-teal-600" />
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
                ১ম কলাম: পণ্য এর নাম <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="যেমন: মিনিকেট চাল (৫০ কেজি বস্তা)"
                value={newProductName}
                onChange={e => setNewProductName(e.target.value)}
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            {/* Column 2: Quantity 1 */}
            <div>
              <label className="block text-[11px] font-bold text-sky-800 mb-1">
                ২য় কলাম: পরিমান (১)
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
                ৩য় কলাম: পরিমান (২)
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
                className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-teal-500"
              >
                <option value="পিস">পিস</option>
                <option value="প্যাকেট">প্যাকেট</option>
                <option value="বস্তা">বস্তা</option>
                <option value="বোতল">বোতল</option>
                <option value="কার্টুন">কার্টুন</option>
                <option value="কেজি">কেজি</option>
                <option value="লিটার">লিটার</option>
              </select>

              {/* Real-time sum preview */}
              <div className="ml-2 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded-xl border border-emerald-200">
                ৪র্থ কলাম (যোগফল): {(parseFloat(newQty1) || 0) + (parseFloat(newQty2) || 0)}
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
                className="px-4 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs active:scale-95"
              >
                যোগ করুন
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Table Controls (Search & Reset) */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="পণ্য এর নাম দিয়ে খুঁজুন..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <span className="text-xs text-slate-500 font-medium">
            মোট প্রদর্শিত: <strong className="text-slate-800">{filteredRows.length}</strong> / {rows.length}
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

      {/* THE MAIN REQUIRED TABLE */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white text-xs select-none">
                <th className="py-3 px-3.5 text-center w-12 text-slate-400 font-bold">#</th>
                
                {/* 1st Column: Product Name */}
                <th className="py-3 px-4 font-bold tracking-wide">
                  <div className="flex items-center gap-1.5 text-teal-300">
                    <Package className="w-4 h-4" />
                    <span>১ম কলাম: পণ্য এর নাম</span>
                  </div>
                </th>

                {/* 2nd Column: Quantity 1 */}
                <th className="py-3 px-4 font-bold text-center w-40 sm:w-48 bg-sky-950/70 border-x border-slate-800">
                  <div className="flex items-center justify-center gap-1 text-sky-300">
                    <span>২য় কলাম: পরিমান (১)</span>
                  </div>
                </th>

                {/* 3rd Column: Quantity 2 */}
                <th className="py-3 px-4 font-bold text-center w-40 sm:w-48 bg-indigo-950/70 border-r border-slate-800">
                  <div className="flex items-center justify-center gap-1 text-indigo-300">
                    <span>৩য় কলাম: পরিমান (২)</span>
                  </div>
                </th>

                {/* 4th Column: Sum of Col 2 + Col 3 */}
                <th className="py-3 px-4 font-bold text-center w-44 sm:w-56 bg-emerald-950 border-r border-slate-800">
                  <div className="flex items-center justify-center gap-1 text-emerald-300">
                    <span className="font-extrabold">৪র্থ কলাম: ২ + ৩ যোগফল</span>
                  </div>
                </th>

                {/* Action */}
                <th className="py-3 px-3 text-center w-16 text-slate-400 font-bold">অ্যাকশন</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
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

                  return (
                    <tr 
                      key={row.id} 
                      className="hover:bg-slate-50/80 transition group"
                    >
                      {/* Serial */}
                      <td className="py-3 px-3.5 text-center text-slate-400 font-bold">
                        {idx + 1}
                      </td>

                      {/* 1st Column: Product Name */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={row.productName}
                            onChange={e => handleUpdateCell(row.id, 'productName', e.target.value)}
                            className="w-full font-bold text-slate-900 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-teal-500 focus:bg-white px-1.5 py-1 rounded focus:outline-none transition"
                            placeholder="পণ্য এর নাম লিখুন..."
                          />
                          {row.unit && (
                            <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded shrink-0 font-medium">
                              {row.unit}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 2nd Column: Quantity 1 */}
                      <td className="py-2.5 px-3 bg-sky-50/30 border-x border-slate-100">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleStepQty(row.id, 'quantity1', -1)}
                            className="w-6 h-6 rounded-md bg-white border border-sky-200 text-sky-700 hover:bg-sky-100 font-bold flex items-center justify-center cursor-pointer transition active:scale-95 text-xs shadow-2xs"
                            title="১ কমান"
                          >
                            -
                          </button>
                          
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={row.quantity1}
                            onChange={e => handleUpdateCell(row.id, 'quantity1', e.target.value)}
                            className="w-20 text-center font-bold text-sky-950 bg-white border border-sky-300 rounded-lg px-2 py-1 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-2xs"
                          />

                          <button
                            type="button"
                            onClick={() => handleStepQty(row.id, 'quantity1', 1)}
                            className="w-6 h-6 rounded-md bg-white border border-sky-200 text-sky-700 hover:bg-sky-100 font-bold flex items-center justify-center cursor-pointer transition active:scale-95 text-xs shadow-2xs"
                            title="১ বাড়ান"
                          >
                            +
                          </button>
                        </div>
                      </td>

                      {/* 3rd Column: Quantity 2 */}
                      <td className="py-2.5 px-3 bg-indigo-50/30 border-r border-slate-100">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleStepQty(row.id, 'quantity2', -1)}
                            className="w-6 h-6 rounded-md bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-100 font-bold flex items-center justify-center cursor-pointer transition active:scale-95 text-xs shadow-2xs"
                            title="১ কমান"
                          >
                            -
                          </button>
                          
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={row.quantity2}
                            onChange={e => handleUpdateCell(row.id, 'quantity2', e.target.value)}
                            className="w-20 text-center font-bold text-indigo-950 bg-white border border-indigo-300 rounded-lg px-2 py-1 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                          />

                          <button
                            type="button"
                            onClick={() => handleStepQty(row.id, 'quantity2', 1)}
                            className="w-6 h-6 rounded-md bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-100 font-bold flex items-center justify-center cursor-pointer transition active:scale-95 text-xs shadow-2xs"
                            title="১ বাড়ান"
                          >
                            +
                          </button>
                        </div>
                      </td>

                      {/* 4th Column: Sum of Col 2 + Col 3 */}
                      <td className="py-2.5 px-3 bg-emerald-50/50 border-r border-slate-100">
                        <div className="flex flex-col items-center justify-center">
                          <span className="inline-flex items-center justify-center px-3 py-1 rounded-xl bg-emerald-600 text-white font-black text-xs sm:text-sm shadow-2xs min-w-[70px]">
                            {sum2and3.toLocaleString('bn-BD')}
                          </span>
                          <span className="text-[10px] text-emerald-800/80 font-mono mt-0.5">
                            ({q1} + {q2})
                          </span>
                        </div>
                      </td>

                      {/* Action: Delete */}
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => handleDeleteRow(row.id, row.productName)}
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

            {/* TABLE FOOTER / GRAND TOTALS */}
            <tfoot>
              <tr className="bg-slate-900 text-white text-xs font-bold border-t-2 border-slate-800">
                <td className="py-3.5 px-3.5 text-center text-slate-400">∑</td>
                
                {/* 1st Column Total Label */}
                <td className="py-3.5 px-4">
                  <div className="flex items-center justify-between">
                    <span className="text-teal-300 font-extrabold text-xs sm:text-sm">
                      সর্বমোট যোগফল
                    </span>
                    <span className="text-[11px] text-slate-400 font-normal">
                      (মোট {rows.length}টি পণ্য)
                    </span>
                  </div>
                </td>

                {/* 2nd Column Total */}
                <td className="py-3.5 px-4 text-center bg-sky-950/80 border-x border-slate-800">
                  <div className="text-sky-300 text-sm sm:text-base font-black">
                    {totalQty1.toLocaleString('bn-BD')}
                  </div>
                  <span className="text-[10px] text-sky-400 font-normal block">
                    ২য় কলামের মোট
                  </span>
                </td>

                {/* 3rd Column Total */}
                <td className="py-3.5 px-4 text-center bg-indigo-950/80 border-r border-slate-800">
                  <div className="text-indigo-300 text-sm sm:text-base font-black">
                    {totalQty2.toLocaleString('bn-BD')}
                  </div>
                  <span className="text-[10px] text-indigo-400 font-normal block">
                    ৩য় কলামের মোট
                  </span>
                </td>

                {/* 4th Column Grand Total (Col 2 total + Col 3 total) */}
                <td className="py-3.5 px-4 text-center bg-emerald-950 border-r border-slate-800">
                  <div className="text-emerald-300 text-base sm:text-lg font-black">
                    {grandCombinedTotal.toLocaleString('bn-BD')}
                  </div>
                  <span className="text-[10px] text-emerald-400 font-mono block">
                    (∑ ২য় + ∑ ৩য় কলাম)
                  </span>
                </td>

                <td className="py-3.5 px-3"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Helpful usage notice */}
      <div className="p-4 bg-teal-50/60 rounded-2xl border border-teal-100 flex items-start gap-3 text-xs text-teal-900">
        <Info className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong>টিপস:</strong> এই টেবিলটিতে আপনি যেকোনো পণ্যের নাম সরাসরি এডিট করতে পারবেন। ২য় বা ৩য় কলামে পরিমাণ পরিবর্তন করার সাথে সাথে ৪র্থ কলামে যোগফল <strong>(২ + ৩)</strong> স্বয়ংক্রিয়ভাবে আপডেট হয়ে যাবে। আপনার করা যেকোনো পরিবর্তন সাথে সাথেই মডারেটর ড্যাশবোর্ডে সংরক্ষিত থাকে।
        </p>
      </div>
    </div>
  );
};
