
import React, { useState, useEffect, useMemo } from 'react';
import { 
  ClipboardCheck, 
  Camera, 
  Settings2, 
  History, 
  AlertCircle, 
  CheckCircle2, 
  ArrowLeft,
  Loader2,
  Trash2,
  LayoutDashboard,
  Filter,
  Mail,
  Calendar
} from 'lucide-react';
import { SLICER_IDS, VARIANTS, SLICE_SPECS } from './constants';
import { VariantType, InspectionRecord, ResultStatus, ShiftType } from './types';
import { extractReportData } from './services/geminiService';
import { sendAlertEmail } from './services/emailService';

export default function App() {
  // Navigation State
  const [step, setStep] = useState<'setup' | 'capture' | 'review' | 'history' | 'dashboard'>('setup');
  
  // Selection State
  const [slicerId, setSlicerId] = useState(SLICER_IDS[0]);
  const [variant, setVariant] = useState<VariantType>('FC');
  const [solidRange, setSolidRange] = useState(SLICE_SPECS[0].solidRange);
  
  // Dashboard Filtering State
  const [dashDate, setDashDate] = useState(new Date().toISOString().split('T')[0]);
  const [dashShift, setDashShift] = useState<ShiftType>('A');

  // Process State
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAlerting, setIsAlerting] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  
  // Data State
  const [history, setHistory] = useState<InspectionRecord[]>([]);
  const [currentRecord, setCurrentRecord] = useState<InspectionRecord | null>(null);

  // Sync Solid Ranges when Variant changes
  useEffect(() => {
    const availableRanges = SLICE_SPECS.filter(s => s.variant === variant).map(s => s.solidRange);
    if (!availableRanges.includes(solidRange)) {
      setSolidRange(availableRanges[0]);
    }
  }, [variant]);

  // Shift Logic Helper
  const getShift = (timeStr: string): ShiftType => {
    const hour = parseInt(timeStr.split(':')[0], 10);
    if (hour >= 6 && hour < 14) return 'A';
    if (hour >= 14 && hour < 22) return 'B';
    return 'C';
  };

  const handleImageCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      processImage(base64);
    };
    reader.readAsDataURL(file);
  };

  const processImage = async (image: string) => {
    setIsProcessing(true);
    setLastError(null);
    try {
      const extracted = await extractReportData(image);
      
      const spec = SLICE_SPECS.find(s => s.variant === variant && s.solidRange === solidRange);
      if (!spec) throw new Error("Specification not found.");

      let status: ResultStatus = 'UNKNOWN';
      if (extracted.x_bar !== null) {
        if (extracted.x_bar < spec.ll) status = 'OUT_OF_RANGE_LOW';
        else if (extracted.x_bar > spec.ul) status = 'OUT_OF_RANGE_HIGH';
        else status = 'OK';
      }

      // Normalize date format from OCR
      const normDate = extracted.date?.replace(/\//g, '-') || new Date().toISOString().split('T')[0];
      const normTime = extracted.time || "00:00";

      const record: InspectionRecord = {
        id: crypto.randomUUID(),
        timestamp: `${normDate}T${normTime}:00`,
        slicerId,
        variant,
        solidRange,
        extractedDate: normDate,
        extractedTime: normTime,
        measuredXBar: extracted.x_bar,
        maxMeasured: extracted.max_thickness,
        minMeasured: extracted.min_thickness,
        ll: spec.ll,
        ul: spec.ul,
        status
      };

      setCurrentRecord(record);
      setStep('review');
    } catch (err: any) {
      setLastError(err.message || "An error occurred during extraction.");
      setStep('capture');
    } finally {
      setIsProcessing(false);
    }
  };

  const saveRecord = async () => {
    if (currentRecord) {
      setHistory(prev => [currentRecord, ...prev]);
      
      // Automatic Alert Check
      if (currentRecord.status !== 'OK') {
        setIsAlerting(true);
        await sendAlertEmail(currentRecord);
        setIsAlerting(false);
      }
      
      setCurrentRecord(null);
      setStep('dashboard');
    }
  };

  // Dashboard filtering logic
  const filteredDashboardData = useMemo(() => {
    return history.filter(record => {
      const recDate = record.extractedDate;
      const recTime = record.extractedTime;
      const recShift = getShift(recTime);

      if (dashShift === 'C') {
        // Shift C Logic: Today 22:00 to Next Day 06:00
        const recDateObj = new Date(recDate);
        const dashDateObj = new Date(dashDate);
        const nextDayObj = new Date(dashDateObj);
        nextDayObj.setDate(nextDayObj.getDate() + 1);

        const isTodayLate = recDate === dashDate && parseInt(recTime.split(':')[0], 10) >= 22;
        const isNextDayEarly = recDate === nextDayObj.toISOString().split('T')[0] && parseInt(recTime.split(':')[0], 10) < 6;
        
        return isTodayLate || isNextDayEarly;
      } else {
        // Shift A & B: strictly same day
        return recDate === dashDate && recShift === dashShift;
      }
    });
  }, [history, dashDate, dashShift]);

  const renderSlicerTable = (id: string) => {
    const data = filteredDashboardData.filter(r => r.slicerId === id);
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6">
        <div className="bg-slate-50 px-4 py-2 border-b flex justify-between items-center">
          <h3 className="font-bold text-slate-700">{id}</h3>
          <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded font-bold uppercase">
            {data.length} Samples
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50/50 text-slate-400 text-[10px] uppercase font-bold tracking-wider">
              <tr>
                <th className="px-4 py-2">Time</th>
                <th className="px-4 py-2">X-Bar</th>
                <th className="px-4 py-2">Variant</th>
                <th className="px-4 py-2 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.length > 0 ? data.map(r => (
                <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-2 font-medium text-slate-600">{r.extractedTime}</td>
                  <td className="px-4 py-2 font-bold text-indigo-600">{r.measuredXBar?.toFixed(3)}</td>
                  <td className="px-4 py-2 text-slate-500">{r.variant}</td>
                  <td className="px-4 py-2 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      r.status === 'OK' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {r.status === 'OK' ? 'OK' : 'NOT OK'}
                    </span>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-slate-400 italic">No data for this shift</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col pb-10">
      <header className="bg-slate-900 text-white shadow-lg p-4 sticky top-0 z-10 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <ClipboardCheck className="w-8 h-8 text-indigo-400" />
          <h1 className="text-xl font-bold tracking-tight">Slicer QC Monitor</h1>
        </div>
        <nav className="flex items-center gap-2">
          <button 
            onClick={() => setStep('setup')}
            className={`p-2 rounded-lg transition-colors ${step === 'setup' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
          >
            <Camera className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setStep('dashboard')}
            className={`p-2 rounded-lg transition-colors ${step === 'dashboard' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
          >
            <LayoutDashboard className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setStep('history')}
            className={`p-2 rounded-lg transition-colors ${step === 'history' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
          >
            <History className="w-5 h-5" />
          </button>
        </nav>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 mt-6">
        {step === 'setup' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-xl mx-auto">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-6 space-y-6">
                <div className="flex items-center gap-2 text-indigo-600 font-semibold border-b pb-4 uppercase tracking-wider text-sm">
                  <Settings2 className="w-5 h-5" />
                  <h2>Initialization</h2>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Target Slicer</label>
                    <div className="grid grid-cols-3 gap-2">
                      {SLICER_IDS.map(id => (
                        <button key={id} onClick={() => setSlicerId(id)}
                          className={`py-2 px-3 rounded-lg text-sm font-bold border transition-all ${
                            slicerId === id ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                          }`}>
                          {id}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Variant</label>
                      <select value={variant} onChange={(e) => setVariant(e.target.value as VariantType)}
                        className="w-full rounded-lg border-slate-200 bg-white py-2 px-3 text-sm font-medium border focus:ring-2 focus:ring-indigo-500 outline-none">
                        <option value="FC">Flat Cut</option>
                        <option value="RC">Ridge Cut</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Solid % Range</label>
                      <select value={solidRange} onChange={(e) => setSolidRange(e.target.value)}
                        className="w-full rounded-lg border-slate-200 bg-white py-2 px-3 text-sm font-medium border focus:ring-2 focus:ring-indigo-500 outline-none">
                        {SLICE_SPECS.filter(s => s.variant === variant).map(s => (
                          <option key={s.solidRange} value={s.solidRange}>{s.solidRange}%</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-6">
                <button
                  onClick={() => setStep('capture')}
                  className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold shadow-lg hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                >
                  Confirm & Capture <Camera className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 'capture' && (
          <div className="max-w-xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 flex flex-col items-center justify-center space-y-6 border-dashed border-2 min-h-[400px]">
              {isProcessing ? (
                <div className="text-center space-y-4">
                  <div className="relative">
                    <Loader2 className="w-16 h-16 text-indigo-600 animate-spin mx-auto" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-8 h-8 bg-indigo-100 rounded-full animate-pulse" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="font-bold text-xl text-slate-800">Processing OCR...</p>
                    <p className="text-slate-500 text-sm">Identifying thickness fields from report</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600">
                    <Camera className="w-12 h-12" />
                  </div>
                  <div className="text-center px-4">
                    <h2 className="text-xl font-bold text-slate-800 mb-2">Snap Report Photo</h2>
                    <p className="text-slate-500 text-sm">Align the printed measurement report to ensure all values are readable.</p>
                  </div>
                  
                  {lastError && (
                    <div className="bg-red-50 border border-red-200 p-4 rounded-xl flex items-center gap-3 text-red-700 w-full">
                      <AlertCircle className="w-5 h-5 flex-shrink-0" />
                      <p className="text-sm font-medium">{lastError}</p>
                    </div>
                  )}

                  <label className="w-full cursor-pointer bg-slate-900 text-white py-4 rounded-xl font-bold shadow-lg hover:bg-slate-800 transition-all flex items-center justify-center gap-3">
                    Open Camera
                    <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageCapture} />
                  </label>
                </>
              )}
            </div>
          </div>
        )}

        {step === 'review' && currentRecord && (
          <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in zoom-in-95 duration-500">
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
              <div className={`p-4 text-center font-bold text-lg flex items-center justify-center gap-2 ${
                currentRecord.status === 'OK' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
              }`}>
                {currentRecord.status === 'OK' ? <CheckCircle2 className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
                {currentRecord.status === 'OK' ? 'SPECIFICATION PASSED' : 'SPECIFICATION FAILED'}
              </div>

              <div className="p-8 space-y-8">
                <div className="flex flex-col items-center justify-center py-10 bg-slate-50 rounded-[2.5rem] border-2 border-slate-100 relative">
                   <span className="text-xs font-black text-slate-400 uppercase absolute top-6 tracking-widest">Measured X-Bar</span>
                   <div className={`text-7xl font-black mb-2 tabular-nums ${currentRecord.status === 'OK' ? 'text-green-600' : 'text-red-600'}`}>
                     {currentRecord.measuredXBar?.toFixed(3) || '??'}
                     <span className="text-2xl font-bold ml-1">mm</span>
                   </div>
                   <div className="flex gap-4 items-center mt-2">
                     <span className="text-slate-400 font-bold text-sm">Range: {currentRecord.ll.toFixed(3)} - {currentRecord.ul.toFixed(3)}</span>
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b pb-1">Context</h3>
                    <div className="space-y-1">
                      <p className="text-sm text-slate-500">Slicer ID: <span className="text-slate-900 font-bold">{currentRecord.slicerId}</span></p>
                      <p className="text-sm text-slate-500">Product: <span className="text-slate-900 font-bold">{currentRecord.variant} ({currentRecord.solidRange}%)</span></p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b pb-1">Report Data</h3>
                    <div className="space-y-1">
                      <p className="text-sm text-slate-500">Date/Time: <span className="text-slate-900 font-bold">{currentRecord.extractedDate} {currentRecord.extractedTime}</span></p>
                      <p className="text-sm text-slate-500">Max/Min: <span className="text-slate-900 font-bold">{currentRecord.maxMeasured}/{currentRecord.minMeasured} mm</span></p>
                    </div>
                  </div>
                </div>

                {currentRecord.status !== 'OK' && (
                  <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex items-start gap-3">
                    <div className="bg-red-100 p-2 rounded-lg text-red-600">
                      <Mail className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-red-800">Automatic Supervisor Alert</p>
                      <p className="text-xs text-red-600 mt-1">An automated thickness alert will be sent to lvoza2003@gmail.com upon saving.</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-slate-50 p-6 flex gap-3">
                <button
                  onClick={() => setStep('capture')}
                  className="flex-1 bg-white border border-slate-200 text-slate-600 py-4 rounded-xl font-bold hover:bg-slate-100 transition-all"
                >
                  Discard
                </button>
                <button
                  onClick={saveRecord}
                  disabled={isAlerting}
                  className="flex-[2] bg-indigo-600 text-white py-4 rounded-xl font-bold shadow-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                >
                  {isAlerting ? <Loader2 className="animate-spin" /> : 'Commit Record'} <CheckCircle2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 'dashboard' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 pb-20">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="space-y-1">
                <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                  <LayoutDashboard className="w-7 h-7 text-indigo-600" />
                  Shift Performance
                </h2>
                <p className="text-slate-500 text-sm">Industrial monitoring dashboard filtered by OCR timestamp.</p>
              </div>
              
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Select Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input type="date" value={dashDate} onChange={(e) => setDashDate(e.target.value)}
                      className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none" />
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Select Shift</label>
                  <div className="flex bg-slate-50 p-1 rounded-lg border border-slate-200">
                    {(['A', 'B', 'C'] as ShiftType[]).map(s => (
                      <button key={s} onClick={() => setDashShift(s)}
                        className={`px-4 py-1.5 rounded-md text-xs font-black transition-all ${
                          dashShift === s ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'
                        }`}>
                        SHIFT {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {SLICER_IDS.map(id => (
                <div key={id} className="animate-in fade-in slide-in-from-bottom-2">
                  {renderSlicerTable(id)}
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 'history' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Full Archive</h2>
              <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-black">
                {history.length} ENTRIES
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {history.map(record => (
                <div key={record.id} className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm ${
                      record.status === 'OK' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700 animate-pulse'
                    }`}>
                      {record.status === 'OK' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                    </div>
                    <div>
                      <p className="font-black text-slate-800 uppercase text-xs">{record.slicerId} • {record.variant} {record.solidRange}%</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{record.extractedDate} {record.extractedTime}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-lg font-black text-indigo-700 tabular-nums">{record.measuredXBar?.toFixed(3)}</p>
                      <p className="text-[10px] font-black text-slate-300 uppercase">MM</p>
                    </div>
                    <button onClick={() => setHistory(h => h.filter(r => r.id !== record.id))}
                      className="p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              {history.length === 0 && (
                <div className="py-20 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                  <History className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">Archive Empty</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Floating Action Button */}
      {step !== 'setup' && step !== 'capture' && step !== 'review' && (
        <button
          onClick={() => setStep('setup')}
          className="fixed bottom-6 right-6 w-16 h-16 bg-indigo-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:bg-indigo-700 transition-all active:scale-95 z-20"
        >
          <Camera className="w-7 h-7" />
        </button>
      )}
    </div>
  );
}
