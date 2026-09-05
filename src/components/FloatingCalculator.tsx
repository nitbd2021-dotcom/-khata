import React, { useState } from 'react';
import { Calculator, X, Check, Delete, RotateCcw, ArrowRight } from 'lucide-react';

interface FloatingCalculatorProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyAmount: (calculatedAmount: number) => void;
  initialValue?: number;
}

export const FloatingCalculator: React.FC<FloatingCalculatorProps> = ({
  isOpen,
  onClose,
  onApplyAmount,
  initialValue = 0,
}) => {
  const [expression, setExpression] = useState<string>(initialValue > 0 ? initialValue.toString() : '');
  const [displayResult, setDisplayResult] = useState<string>(initialValue > 0 ? initialValue.toString() : '0');
  const [history, setHistory] = useState<string[]>([]);

  if (!isOpen) return null;

  // Safe arithmetic evaluator
  const calculateResult = (expr: string): number | null => {
    try {
      if (!expr || expr.trim() === '') return 0;
      // Sanitize input to only allowed characters
      const sanitized = expr.replace(/×/g, '*').replace(/÷/g, '/');
      if (!/^[\d\s\+\-\*\/\.\(\)%]+$/.test(sanitized)) return null;

      // Safe evaluate using Function with strict bounds
      // eslint-disable-next-line no-new-func
      const result = Function(`"use strict"; return (${sanitized})`)();
      if (typeof result === 'number' && !isNaN(result) && isFinite(result)) {
        return Math.round(result * 100) / 100; // 2 decimal precision
      }
      return null;
    } catch {
      return null;
    }
  };

  const handleInput = (char: string) => {
    const isOperator = ['+', '-', '×', '÷'].includes(char);
    
    if (isOperator) {
      if (!expression) {
        if (char === '-') {
          setExpression('-');
        }
        return;
      }
      const lastChar = expression.slice(-1);
      if (['+', '-', '×', '÷'].includes(lastChar)) {
        // Replace last operator
        setExpression(expression.slice(0, -1) + char);
        return;
      }
    }

    const nextExpr = expression + char;
    setExpression(nextExpr);
    
    // Live calculate if expression ends with number
    const res = calculateResult(nextExpr);
    if (res !== null) {
      setDisplayResult(res.toString());
    }
  };

  const handleEquals = () => {
    if (!expression) return;
    const res = calculateResult(expression);
    if (res !== null) {
      setHistory(prev => [expression + ' = ' + res, ...prev.slice(0, 4)]);
      setDisplayResult(res.toString());
      setExpression(res.toString());
    }
  };

  const handleClear = () => {
    setExpression('');
    setDisplayResult('0');
  };

  const handleBackspace = () => {
    if (expression.length === 0) return;
    const nextExpr = expression.slice(0, -1);
    setExpression(nextExpr);
    const res = calculateResult(nextExpr);
    setDisplayResult(res !== null ? res.toString() : '0');
  };

  const handleApply = () => {
    const res = calculateResult(expression);
    const finalVal = res !== null ? res : parseFloat(displayResult) || 0;
    if (finalVal >= 0) {
      onApplyAmount(finalVal);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-60 bg-black/40 backdrop-blur-xs flex items-center justify-center p-3 animate-fadeIn">
      <div 
        className="w-full max-w-xs sm:max-w-sm bg-slate-900 text-white rounded-3xl shadow-2xl border border-slate-700 overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Calculator className="w-4 h-4" />
            </div>
            <div>
              <span className="text-sm font-bold block text-white">বিল্ট-ইন ক্যালকুলেটর</span>
              <span className="text-[10px] text-slate-400 block">হিসাব করে সরাসরি অ্যামাউন্টে বসান</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Display Screen */}
        <div className="p-4 bg-slate-950/80 text-right space-y-1">
          {/* Calculation History / Expression */}
          <div className="min-h-[22px] text-xs font-mono text-slate-400 overflow-x-auto whitespace-nowrap scrollbar-none">
            {expression || '০'}
          </div>
          {/* Main Display Result */}
          <div className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-emerald-400 overflow-x-auto whitespace-nowrap scrollbar-none">
            ৳ {Number(displayResult || 0).toLocaleString('bn-BD')}
          </div>
        </div>

        {/* History pill preview if available */}
        {history.length > 0 && (
          <div className="px-4 py-1.5 bg-slate-800/50 border-y border-slate-800 text-[11px] text-slate-400 flex items-center justify-between gap-2 overflow-x-auto whitespace-nowrap">
            <span className="text-[10px] text-slate-500 font-semibold uppercase">পূর্বের হিসাব:</span>
            <span className="font-mono text-emerald-300 font-bold truncate">{history[0]}</span>
          </div>
        )}

        {/* Keypad Buttons */}
        <div className="p-3 grid grid-cols-4 gap-2 bg-slate-900">
          {/* Row 1 */}
          <button
            type="button"
            onClick={handleClear}
            className="h-12 rounded-2xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-black text-sm transition active:scale-95 flex items-center justify-center border border-rose-500/30 cursor-pointer"
          >
            AC
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            className="h-12 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm transition active:scale-95 flex items-center justify-center border border-slate-700 cursor-pointer"
            title="মুছুন"
          >
            <Delete className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => handleInput('%')}
            className="h-12 rounded-2xl bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold text-base transition active:scale-95 flex items-center justify-center border border-slate-700 cursor-pointer"
          >
            %
          </button>
          <button
            type="button"
            onClick={() => handleInput('÷')}
            className="h-12 rounded-2xl bg-emerald-600/30 hover:bg-emerald-600/40 text-emerald-300 font-black text-xl transition active:scale-95 flex items-center justify-center border border-emerald-500/30 cursor-pointer"
          >
            ÷
          </button>

          {/* Row 2 */}
          <button
            type="button"
            onClick={() => handleInput('7')}
            className="h-12 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-white font-bold text-lg transition active:scale-95 flex items-center justify-center border border-slate-700/60 cursor-pointer"
          >
            7
          </button>
          <button
            type="button"
            onClick={() => handleInput('8')}
            className="h-12 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-white font-bold text-lg transition active:scale-95 flex items-center justify-center border border-slate-700/60 cursor-pointer"
          >
            8
          </button>
          <button
            type="button"
            onClick={() => handleInput('9')}
            className="h-12 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-white font-bold text-lg transition active:scale-95 flex items-center justify-center border border-slate-700/60 cursor-pointer"
          >
            9
          </button>
          <button
            type="button"
            onClick={() => handleInput('×')}
            className="h-12 rounded-2xl bg-emerald-600/30 hover:bg-emerald-600/40 text-emerald-300 font-black text-xl transition active:scale-95 flex items-center justify-center border border-emerald-500/30 cursor-pointer"
          >
            ×
          </button>

          {/* Row 3 */}
          <button
            type="button"
            onClick={() => handleInput('4')}
            className="h-12 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-white font-bold text-lg transition active:scale-95 flex items-center justify-center border border-slate-700/60 cursor-pointer"
          >
            4
          </button>
          <button
            type="button"
            onClick={() => handleInput('5')}
            className="h-12 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-white font-bold text-lg transition active:scale-95 flex items-center justify-center border border-slate-700/60 cursor-pointer"
          >
            5
          </button>
          <button
            type="button"
            onClick={() => handleInput('6')}
            className="h-12 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-white font-bold text-lg transition active:scale-95 flex items-center justify-center border border-slate-700/60 cursor-pointer"
          >
            6
          </button>
          <button
            type="button"
            onClick={() => handleInput('-')}
            className="h-12 rounded-2xl bg-emerald-600/30 hover:bg-emerald-600/40 text-emerald-300 font-black text-xl transition active:scale-95 flex items-center justify-center border border-emerald-500/30 cursor-pointer"
          >
            −
          </button>

          {/* Row 4 */}
          <button
            type="button"
            onClick={() => handleInput('1')}
            className="h-12 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-white font-bold text-lg transition active:scale-95 flex items-center justify-center border border-slate-700/60 cursor-pointer"
          >
            1
          </button>
          <button
            type="button"
            onClick={() => handleInput('2')}
            className="h-12 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-white font-bold text-lg transition active:scale-95 flex items-center justify-center border border-slate-700/60 cursor-pointer"
          >
            2
          </button>
          <button
            type="button"
            onClick={() => handleInput('3')}
            className="h-12 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-white font-bold text-lg transition active:scale-95 flex items-center justify-center border border-slate-700/60 cursor-pointer"
          >
            3
          </button>
          <button
            type="button"
            onClick={() => handleInput('+')}
            className="h-12 rounded-2xl bg-emerald-600/30 hover:bg-emerald-600/40 text-emerald-300 font-black text-xl transition active:scale-95 flex items-center justify-center border border-emerald-500/30 cursor-pointer"
          >
            +
          </button>

          {/* Row 5 */}
          <button
            type="button"
            onClick={() => handleInput('0')}
            className="h-12 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-white font-bold text-lg transition active:scale-95 flex items-center justify-center border border-slate-700/60 cursor-pointer"
          >
            0
          </button>
          <button
            type="button"
            onClick={() => handleInput('00')}
            className="h-12 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-white font-bold text-sm transition active:scale-95 flex items-center justify-center border border-slate-700/60 cursor-pointer"
          >
            00
          </button>
          <button
            type="button"
            onClick={() => handleInput('.')}
            className="h-12 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-white font-bold text-lg transition active:scale-95 flex items-center justify-center border border-slate-700/60 cursor-pointer"
          >
            .
          </button>
          <button
            type="button"
            onClick={handleEquals}
            className="h-12 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xl transition active:scale-95 flex items-center justify-center shadow-md cursor-pointer"
          >
            =
          </button>
        </div>

        {/* Footer Apply Action */}
        <div className="p-3 bg-slate-950/90 border-t border-slate-800 flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer text-center"
          >
            বাতিল
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="flex-2 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black transition active:scale-95 shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>টাকার ঘরে বসান (৳{displayResult || 0})</span>
          </button>
        </div>
      </div>
    </div>
  );
};
