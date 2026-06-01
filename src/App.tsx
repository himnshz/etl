/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, 
  Download, 
  Play, 
  Trash2, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Info, 
  Settings2,
  BarChart3,
  Terminal,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ETLService } from './services/etlService';
import { ETLData, DataQualityReport, ETLConfig, ETLLog } from './types';
import { cn } from './lib/utils';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';

const etl = new ETLService();

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [data, setData] = useState<ETLData[]>([]);
  const [processedData, setProcessedData] = useState<ETLData[]>([]);
  const [report, setReport] = useState<DataQualityReport | null>(null);
  const [logs, setLogs] = useState<ETLLog[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [config, setConfig] = useState<ETLConfig>({
    removeDuplicates: true,
    fillMissingValues: true,
    standardizeText: true,
    trimWhitespace: true,
    roundNumbers: true,
    calculateTotal: true,
    validateAge: true,
    validateSalary: true,
    validateEmails: true,
    removeEmptyRows: true,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      etl.clearLogs();
      const extractedData = await etl.extract(selectedFile);
      setData(extractedData);
      setLogs([...etl.getLogs()]);
    }
  };

  const runPipeline = async () => {
    if (!file || data.length === 0) return;

    setIsProcessing(true);
    // Simulate a bit of delay for the "automated" feel
    await new Promise(r => setTimeout(r, 1000));

    const transformed = etl.transform(data, config);
    setProcessedData(transformed);
    
    const newReport = etl.generateReport(transformed);
    setReport(newReport);
    
    setLogs([...etl.getLogs()]);
    setIsProcessing(false);
  };

  const downloadCSV = () => {
    if (processedData.length === 0) return;
    const csv = etl.load(processedData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `cleaned_${file?.name || 'data.csv'}`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const reset = () => {
    setFile(null);
    setData([]);
    setProcessedData([]);
    setReport(null);
    setLogs([]);
    etl.clearLogs();
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const missingDataChart = report ? Object.entries(report.missingValues).map(([name, value]) => ({ name, value })) : [];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <RefreshCw className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">AutoETL</h1>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={reset}
              className="text-slate-500 hover:text-slate-700 p-2 rounded-full hover:bg-slate-100 transition-colors"
              title="Reset Pipeline"
            >
              <Trash2 className="w-5 h-5" />
            </button>
            <a 
              href="https://github.com/pandas-dev/pandas" 
              target="_blank" 
              rel="noreferrer"
              className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
            >
              Docs
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Controls & Config */}
          <div className="lg:col-span-4 space-y-6">
            {/* Upload Section */}
            <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Upload className="w-5 h-5 text-indigo-600" />
                1. Extract
              </h2>
              <div 
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all",
                  file ? "border-indigo-200 bg-indigo-50" : "border-slate-200 hover:border-indigo-300 hover:bg-slate-50"
                )}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept=".csv" 
                  className="hidden" 
                />
                {file ? (
                  <>
                    <FileText className="w-10 h-10 text-indigo-600 mb-2" />
                    <p className="text-sm font-medium text-slate-900 truncate max-w-full">{file.name}</p>
                    <p className="text-xs text-slate-500 mt-1">{(file.size / 1024).toFixed(2)} KB</p>
                  </>
                ) : (
                  <>
                    <Upload className="w-10 h-10 text-slate-400 mb-2" />
                    <p className="text-sm font-medium text-slate-600">Click to upload CSV</p>
                    <p className="text-xs text-slate-400 mt-1">or drag and drop</p>
                  </>
                )}
              </div>
            </section>

            {/* Transform Config */}
            <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-indigo-600" />
                2. Transform Rules
              </h2>
              <div className="space-y-4">
                {Object.entries(config).map(([key, value]) => (
                  <label key={key} className="flex items-center justify-between cursor-pointer group">
                    <span className="text-sm text-slate-600 group-hover:text-slate-900 transition-colors capitalize">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                    <div className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={value} 
                        onChange={() => setConfig(prev => ({ ...prev, [key]: !prev[key] }))}
                        className="sr-only peer" 
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </div>
                  </label>
                ))}
              </div>
              <button
                disabled={!file || isProcessing}
                onClick={runPipeline}
                className={cn(
                  "w-full mt-6 py-3 px-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all",
                  !file || isProcessing 
                    ? "bg-slate-100 text-slate-400 cursor-not-allowed" 
                    : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200 active:scale-[0.98]"
                )}
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5 fill-current" />
                    Run Pipeline
                  </>
                )}
              </button>
            </section>

            {/* Load Section */}
            <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Download className="w-5 h-5 text-indigo-600" />
                3. Load
              </h2>
              <button
                disabled={processedData.length === 0}
                onClick={downloadCSV}
                className={cn(
                  "w-full py-3 px-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all",
                  processedData.length === 0
                    ? "bg-slate-100 text-slate-400 cursor-not-allowed" 
                    : "bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-200 active:scale-[0.98]"
                )}
              >
                <Download className="w-5 h-5" />
                Download Cleaned CSV
              </button>
            </section>
          </div>

          {/* Right Column: Results & Logs */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Summary Stats / Report */}
            <AnimatePresence mode="wait">
              {report ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="grid grid-cols-1 md:grid-cols-3 gap-4"
                >
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <p className="text-sm text-slate-500 mb-1">Total Rows</p>
                    <p className="text-3xl font-bold text-slate-900">{report.totalRows}</p>
                  </div>
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <p className="text-sm text-slate-500 mb-1">Missing Values</p>
                    <p className="text-3xl font-bold text-amber-600">
                      {Object.values(report.missingValues).reduce((a: number, b: number) => a + b, 0)}
                    </p>
                  </div>
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <p className="text-sm text-slate-500 mb-1">Columns</p>
                    <p className="text-3xl font-bold text-indigo-600">{Object.keys(report.missingValues).length}</p>
                  </div>
                </motion.div>
              ) : (
                <div className="bg-white p-12 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center justify-center text-center">
                  <BarChart3 className="w-16 h-16 text-slate-200 mb-4" />
                  <h3 className="text-lg font-medium text-slate-900">No data processed yet</h3>
                  <p className="text-slate-500 max-w-xs mt-2">Upload a CSV and run the pipeline to see the data quality report.</p>
                </div>
              )}
            </AnimatePresence>

            {/* Charts & Details */}
            {report && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                  <h3 className="text-md font-semibold mb-6 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-indigo-600" />
                    Missing Values by Column
                  </h3>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={missingDataChart}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis fontSize={12} tickLine={false} axisLine={false} />
                        <Tooltip 
                          cursor={{ fill: '#f8fafc' }}
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                          {missingDataChart.map((entry: { name: string; value: number }, index) => (
                            <Cell key={`cell-${index}`} fill={entry.value > 0 ? '#f59e0b' : '#6366f1'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </section>

                <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                  <h3 className="text-md font-semibold mb-4 flex items-center gap-2">
                    <Info className="w-5 h-5 text-indigo-600" />
                    Summary Statistics
                  </h3>
                  <div className="space-y-4 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                    {Object.entries(report.summaryStats).map(([key, stats]: [string, { min: number; max: number; mean: number; median: number }]) => (
                      <div key={key} className="p-3 bg-slate-50 rounded-xl">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{key}</p>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-slate-500">Mean:</span>
                            <span className="font-medium">{stats.mean.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Median:</span>
                            <span className="font-medium">{stats.median.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Min:</span>
                            <span className="font-medium">{stats.min}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Max:</span>
                            <span className="font-medium">{stats.max}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                    {Object.keys(report.summaryStats).length === 0 && (
                      <p className="text-sm text-slate-400 text-center py-8">No numeric columns found for statistics.</p>
                    )}
                  </div>
                </section>
              </div>
            )}

            {/* Logs Section */}
            <section className="bg-slate-900 rounded-2xl shadow-xl border border-slate-800 overflow-hidden">
              <div className="bg-slate-800 px-4 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-slate-400" />
                  <span className="text-xs font-mono text-slate-300 uppercase tracking-widest">Pipeline Logs</span>
                </div>
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/50"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500/20 border border-amber-500/50"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/20 border border-emerald-500/50"></div>
                </div>
              </div>
              <div className="p-4 h-64 overflow-y-auto font-mono text-sm space-y-2 custom-scrollbar">
                {logs.length === 0 ? (
                  <p className="text-slate-600 italic">Waiting for input...</p>
                ) : (
                  logs.map((log, i) => (
                    <div key={i} className="flex gap-3 animate-in fade-in slide-in-from-left-2 duration-300">
                      <span className="text-slate-500 shrink-0">[{log.timestamp}]</span>
                      <span className={cn(
                        "font-medium",
                        log.level === 'info' && "text-blue-400",
                        log.level === 'success' && "text-emerald-400",
                        log.level === 'warning' && "text-amber-400",
                        log.level === 'error' && "text-red-400"
                      )}>
                        {log.level.toUpperCase()}:
                      </span>
                      <span className="text-slate-300">{log.message}</span>
                    </div>
                  ))
                )}
                <div ref={logEndRef} />
              </div>
            </section>

            {/* Data Preview */}
            {processedData.length > 0 && (
              <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="text-md font-semibold mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-600" />
                  Cleaned Data Preview (First 5 rows)
                </h3>
                <div className="overflow-x-auto rounded-xl border border-slate-100">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 uppercase text-xs font-bold">
                      <tr>
                        {Object.keys(processedData[0]).map(key => (
                          <th key={key} className="px-4 py-3">{key}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {processedData.slice(0, 5).map((row, i) => (
                        <tr key={i} className="hover:bg-slate-50 transition-colors">
                          {Object.values(row).map((val, j) => (
                            <td key={j} className="px-4 py-3 text-slate-600">
                              {val === null || val === undefined ? 'NULL' : String(val)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </div>
        </div>
      </main>

      <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 border-t border-slate-200 mt-12">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-indigo-600" />
            <span className="font-bold text-slate-900">AutoETL</span>
          </div>
          <p className="text-sm text-slate-500">
            Built with React, Tailwind, and Pandas-inspired logic for automated data processing.
          </p>
          <div className="flex gap-6">
            <a href="#" className="text-slate-400 hover:text-indigo-600 transition-colors">Privacy</a>
            <a href="#" className="text-slate-400 hover:text-indigo-600 transition-colors">Terms</a>
            <a href="#" className="text-slate-400 hover:text-indigo-600 transition-colors">Github</a>
          </div>
        </div>
      </footer>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
        .bg-slate-900 .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #334155;
        }
        .bg-slate-900 .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #475569;
        }
      `}</style>
    </div>
  );
}
