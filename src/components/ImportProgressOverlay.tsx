import React from 'react';
import { usePortfolio } from '../store/PortfolioContext';

export function ImportProgressOverlay() {
  const { importProgress } = usePortfolio();

  if (!importProgress.visible) return null;

  const percentage = importProgress.total > 0 
    ? Math.round((importProgress.current / importProgress.total) * 100) 
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-xl max-w-md w-full mx-4 space-y-4 border border-slate-200 dark:border-slate-800">
        <h3 className="text-lg font-semibold text-center">{importProgress.message}</h3>
        
        <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-4 overflow-hidden">
          <div 
            className="bg-slate-900 dark:bg-slate-50 h-4 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${percentage}%` }}
          />
        </div>
        
        <div className="flex justify-between text-sm text-slate-500 dark:text-slate-400 font-medium">
          <span>{percentage}%</span>
          <span>{importProgress.current} / {importProgress.total} lines processed</span>
        </div>
      </div>
    </div>
  );
}
