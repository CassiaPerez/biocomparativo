import React, { useState, useEffect } from 'react';
import {
  Plus,
  ArrowRightLeft,
  Trash2,
  Hash,
  Calculator,
  TrendingUp,
  TrendingDown,
  Minus,
  Leaf,
  LayoutDashboard,
  AlertCircle,
  Download,
  Menu,
  X,
} from 'lucide-react';
import { Decimal } from 'decimal.js';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const gcfLogo = '/gcf_logo.png';

// Types
interface BiologicoRecord {
  Produto: string;
  Concentracao_por_ml_ou_g: string;
  Dose_ha_ml_ou_g: string;
  'Custo_R$_por_L_ou_kg': string;
}

interface CalculatedValues {
  UFC_ou_conidios_ha: Decimal;
  UFC_ou_conidios_mm2_superficie: Decimal;
  'Custo_R$_por_ha': Decimal;
}

const INITIAL_STATE_CROPFIELD: BiologicoRecord = {
  Produto: 'Cropfield',
  Concentracao_por_ml_ou_g: '',
  Dose_ha_ml_ou_g: '',
  'Custo_R$_por_L_ou_kg': '',
};

const INITIAL_STATE_CONCORRENTE: BiologicoRecord = {
  Produto: 'Concorrente',
  Concentracao_por_ml_ou_g: '',
  Dose_ha_ml_ou_g: '',
  'Custo_R$_por_L_ou_kg': '',
};

const INITIAL_CALCULATED: CalculatedValues = {
  UFC_ou_conidios_ha: new Decimal(0),
  UFC_ou_conidios_mm2_superficie: new Decimal(0),
  'Custo_R$_por_ha': new Decimal(0),
};

const ScientificInput = ({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
}) => {
  const [mantissa, setMantissa] = useState('');
  const [exponent, setExponent] = useState('');
  const [status, setStatus] = useState<'default' | 'error' | 'warning'>('default');
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    if (!value) {
      setMantissa('');
      setExponent('');
      setStatus('default');
      setMessage('');
      return;
    }

    try {
      const dec = new Decimal(value);
      if (dec.isZero()) {
        setMantissa('0');
        setExponent('0');
        return;
      }

      const sciStr = dec.toExponential();
      const [m, e] = sciStr.split('e');

      setMantissa((prev) => {
        try {
          if (prev && exponent && new Decimal(`${prev}e${exponent}`).equals(dec)) return prev;
        } catch (_) {}
        return m;
      });

      setExponent((prev) => {
        try {
          if (mantissa && prev && new Decimal(`${mantissa}e${prev}`).equals(dec)) return prev;
        } catch (_) {}
        return e.replace('+', '');
      });

      setStatus('default');
      setMessage('');
    } catch (_) {
      setStatus('error');
      setMessage('Número inválido');
    }
  }, [value]);

  const validateAndNotify = (m: string, e: string) => {
    if (m === '' || m === '-') {
      setStatus('default');
      setMessage('');
      return;
    }

    try {
      if (isNaN(Number(m))) throw new Error();
      const safeE = e === '' || e === '-' ? '0' : e;
      const val = new Decimal(`${m}e${safeE}`);
      const expVal = parseInt(safeE, 10);
      
      if (Number.isFinite(expVal) && Math.abs(expVal) > 50) {
        setStatus('warning');
        setMessage('Expoente extremo');
      } else if (val.isNegative()) {
        setStatus('warning');
        setMessage('Valor negativo');
      } else {
        setStatus('default');
        setMessage('');
      }

      onChange(val.toString());
    } catch (_) {
      setStatus('error');
      setMessage('Número inválido');
    }
  };

  const handleMantissaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newM = e.target.value;
    setMantissa(newM);
    validateAndNotify(newM, exponent);
  };

  const handleExponentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newE = e.target.value;
    setExponent(newE);
    validateAndNotify(mantissa, newE);
  };

  return (
    <div className="relative mb-6">
      <div className={`group flex items-center bg-white border rounded-[14px] px-3 sm:px-4 py-3 sm:py-4 transition-all shadow-sm ${
        status === 'error' ? 'border-red-200' : 'border-[rgba(41,44,45,0.12)] focus-within:border-gcf-green'
      } ${className ?? ''}`}>
        <div className="flex-1 min-w-[60px]">
          <input
            type="text"
            value={mantissa}
            onChange={handleMantissaChange}
            className="w-full text-2xl sm:text-4xl font-bold text-right outline-none bg-transparent tracking-tighter text-gcf-black placeholder-gcf-black/20"
            placeholder="0"
            inputMode="decimal"
          />
        </div>
        <div className="mx-1 sm:mx-3 text-lg sm:text-2xl text-gcf-black/30 font-serif italic select-none">× 10</div>
        <div className="relative -top-2 sm:-top-4">
          <input
            type="text"
            value={exponent}
            onChange={handleExponentChange}
            className="w-14 sm:w-24 text-lg sm:text-2xl font-bold outline-none border rounded-[10px] text-center py-1 transition-all bg-gcf-green/5 border-gcf-green/20 text-gcf-green focus:bg-white"
            placeholder="0"
            inputMode="numeric"
          />
        </div>
      </div>
      {message && <div className="absolute -bottom-4 right-2 text-[9px] font-bold uppercase text-gcf-black/40">{message}</div>}
    </div>
  );
};

const BigNumberDisplay = ({
  value,
  label,
  isCurrency = false,
  colorClass = 'text-gcf-black',
}: {
  value: Decimal;
  label?: string;
  isCurrency?: boolean;
  colorClass?: string;
}) => {
  const [showScientific, setShowScientific] = useState(false);
  const isLarge = value.gte(1e9);

  useEffect(() => {
    if (isLarge) setShowScientific(true);
  }, [isLarge]);

  const formatValue = () => {
    if (value.isZero()) return isCurrency ? 'R$ 0,00' : '0';
    if (isCurrency) return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value.toNumber());

    if (showScientific) {
      const [mantissa, exponent] = value.toExponential(2).split('e');
      return (
        <span className="inline-flex items-baseline">
          <span className="text-xl sm:text-3xl font-bold tracking-tighter">{mantissa.replace('.', ',')}</span>
          <span className="mx-1 text-sm sm:text-xl text-gcf-black/20 font-serif italic">× 10</span>
          <sup className="text-sm sm:text-xl font-bold text-gcf-green -top-1 sm:-top-2 relative">{exponent.replace('+', '')}</sup>
        </span>
      );
    }

    return value.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  return (
    <div className="flex flex-col">
      <div className="flex justify-between items-center mb-1 sm:mb-2">
        {label && <span className="text-[9px] sm:text-[10px] font-bold text-gcf-black/40 uppercase tracking-widest">{label}</span>}
        {isLarge && !isCurrency && (
          <button onClick={() => setShowScientific(!showScientific)} className="p-1 bg-gcf-black/5 rounded text-gcf-black/60 text-[8px] font-bold uppercase tracking-widest">
            {showScientific ? 'Normal' : 'Científica'}
          </button>
        )}
      </div>
      <div className={`font-mono ${!showScientific ? 'text-lg sm:text-3xl font-bold tracking-tighter' : ''} ${colorClass}`}>
        {formatValue()}
      </div>
    </div>
  );
};

export default function App() {
  const [cropData, setCropData] = useState<BiologicoRecord>(INITIAL_STATE_CROPFIELD);
  const [cropCalculated, setCropCalculated] = useState<CalculatedValues>(INITIAL_CALCULATED);
  const [compData, setCompData] = useState<BiologicoRecord>(INITIAL_STATE_CONCORRENTE);
  const [compCalculated, setCompCalculated] = useState<CalculatedValues>(INITIAL_CALCULATED);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const calculate = (data: BiologicoRecord): CalculatedValues => {
    try {
      const conc = new Decimal(data.Concentracao_por_ml_ou_g || 0);
      const dose = new Decimal(data.Dose_ha_ml_ou_g || 0);
      const custo = new Decimal(data['Custo_R$_por_L_ou_kg'] || 0);
      return {
        UFC_ou_conidios_ha: conc.times(dose),
        UFC_ou_conidios_mm2_superficie: conc.times(dose).dividedBy(1e10),
        'Custo_R$_por_ha': dose.times(custo).dividedBy(1000),
      };
    } catch (_) { return INITIAL_CALCULATED; }
  };

  useEffect(() => { setCropCalculated(calculate(cropData)); }, [cropData]);
  useEffect(() => { setCompCalculated(calculate(compData)); }, [compData]);

  const handleInputChange = (e: any, isCompetitor = false) => {
    const { name, value } = e.target;
    const setter = isCompetitor ? setCompData : setCropData;
    setter(prev => ({ ...prev, [name]: value }));
  };

  const handleUfcChange = (value: string, isCompetitor = false) => {
    const data = isCompetitor ? compData : cropData;
    const conc = new Decimal(data.Concentracao_por_ml_ou_g || 0);
    if (conc.isZero()) return;
    const setter = isCompetitor ? setCompData : setCropData;
    setter(prev => ({ ...prev, Dose_ha_ml_ou_g: new Decimal(value).dividedBy(conc).toString() }));
  };

  const clearAll = () => {
    setCropData(INITIAL_STATE_CROPFIELD);
    setCompData(INITIAL_STATE_CONCORRENTE);
  };

  const downloadReportPdf = () => {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    doc.setFontSize(18);
    doc.text('Relatório — Comparativo de Biológicos', 40, 48);
    autoTable(doc, {
      startY: 80,
      head: [['Campo', 'Cropfield', 'Concorrente']],
      body: [
        ['Produto', cropData.Produto, compData.Produto],
        ['Concentração', cropData.Concentracao_por_ml_ou_g, compData.Concentracao_por_ml_ou_g],
        ['Dose (mL ou g/ha)', cropData.Dose_ha_ml_ou_g, compData.Dose_ha_ml_ou_g],
        ['Custo (R$/ha)', cropCalculated['Custo_R$_por_ha'].toFixed(2), compCalculated['Custo_R$_por_ha'].toFixed(2)],
      ],
      theme: 'grid',
      headStyles: { fillColor: [0, 178, 98] }
    });
    doc.save(`relatorio-${Date.now()}.pdf`);
  };

  const renderProductColumn = (title: string, data: BiologicoRecord, calculated: CalculatedValues, isCompetitor: boolean) => {
    const isCropfield = !isCompetitor;
    return (
      <div className="card-gcf flex flex-col group h-full">
        <div className={`px-4 sm:px-8 py-5 sm:py-8 bg-gradient-to-br ${isCropfield ? 'from-gcf-green to-[#008f4f]' : 'from-gcf-black to-[#1a1c1d]'} text-gcf-offwhite relative overflow-hidden`}>
          <div className="flex justify-between items-center relative z-10">
            <div>
              <h2 className="text-xl sm:text-3xl font-bold tracking-tighter">{title}</h2>
              <p className="text-gcf-offwhite/70 text-[9px] font-bold uppercase tracking-widest">{isCropfield ? 'Tecnologia GCF' : 'Mercado'}</p>
            </div>
            <div className="bg-white/20 p-2 sm:p-3 rounded-xl backdrop-blur-md">{isCropfield ? <Leaf size={18} /> : <Hash size={18} />}</div>
          </div>
        </div>

        <div className="p-4 sm:p-8 flex-1 flex flex-col gap-5 sm:gap-10">
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="label-gcf text-[10px]">Produto</label>
              <input type="text" name="Produto" value={data.Produto} onChange={(e) => handleInputChange(e, isCompetitor)} className="input-gcf text-sm sm:text-base" />
            </div>
            <div className="space-y-1">
              <label className="label-gcf text-[10px]">Concentração (UFC/mL ou g)</label>
              <ScientificInput value={data.Concentracao_por_ml_ou_g} onChange={(val) => handleInputChange({ target: { name: 'Concentracao_por_ml_ou_g', value: val } }, isCompetitor)} />
            </div>
            <div className="grid grid-cols-1 xs:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="label-gcf text-[10px]">Dose (mL/ha)</label>
                <input type="number" name="Dose_ha_ml_ou_g" value={data.Dose_ha_ml_ou_g} onChange={(e) => handleInputChange(e, isCompetitor)} className="input-gcf font-mono text-sm" />
              </div>
              <div className="space-y-1">
                <label className="label-gcf text-[10px]">Custo (R$/L)</label>
                <input type="number" name="Custo_R$_por_L_ou_kg" value={data['Custo_R$_por_L_ou_kg']} onChange={(e) => handleInputChange(e, isCompetitor)} className="input-gcf font-mono text-sm" />
              </div>
            </div>
          </div>

          <div className="space-y-6 pt-4 border-t border-gcf-black/5">
            <div className="space-y-2">
              <span className="text-[9px] font-bold text-gcf-black/40 uppercase tracking-widest">UFC / ha</span>
              <ScientificInput value={calculated.UFC_ou_conidios_ha.toString()} onChange={(val) => handleUfcChange(val, isCompetitor)} className={isCropfield ? 'bg-gcf-green/5' : 'bg-gcf-black/5'} />
            </div>
            <BigNumberDisplay label="UFC / mm²" value={calculated.UFC_ou_conidios_mm2_superficie} colorClass={isCropfield ? 'text-gcf-green' : 'text-gcf-black'} />
            <div className={`p-4 sm:p-6 rounded-2xl ${isCropfield ? 'bg-gcf-green shadow-lg shadow-gcf-green/20' : 'bg-gcf-black shadow-lg shadow-gcf-black/20'}`}>
              <div className="text-xl sm:text-3xl font-bold font-mono text-gcf-offwhite tracking-tighter">
                <span className="text-xs mr-1 opacity-50">R$</span>
                {calculated['Custo_R$_por_ha'].toFixed(2).replace('.', ',')}
              </div>
              <p className="text-[8px] text-gcf-offwhite/50 font-bold uppercase mt-1">Investimento / ha</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gcf-offwhite font-sans text-gcf-black flex overflow-hidden">
      {mobileMenuOpen && <button className="fixed inset-0 bg-black/40 z-40 md:hidden" onClick={() => setMobileMenuOpen(false)} />}

      <aside className={`bg-gcf-black text-gcf-offwhite z-50 flex flex-col fixed inset-y-0 left-0 w-64 transition-transform duration-300 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:static md:translate-x-0 ${isSidebarOpen ? 'md:w-64' : 'md:w-20'}`}>
        <div className="h-16 flex items-center px-4 border-b border-white/5">
          <div className="flex items-center gap-3 w-full">
            <button className="md:hidden p-2" onClick={() => setMobileMenuOpen(false)}><X size={20} /></button>
            <div className="bg-gcf-green p-2 rounded-lg shrink-0"><Leaf size={20} /></div>
            {isSidebarOpen && <span className="font-bold tracking-tighter">CROPFIELD</span>}
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-2">
          <button className="w-full flex items-center gap-3 p-3 rounded-xl bg-gcf-green text-gcf-offwhite">
            <LayoutDashboard size={20} />
            {isSidebarOpen && <span className="font-bold text-sm">Comparativo</span>}
          </button>
        </nav>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="hidden md:flex p-4 border-t border-white/5 justify-center"><Minus size={16} /></button>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 bg-white border-b border-gcf-black/10 flex items-center justify-between px-4 sm:px-8 z-40">
          <div className="flex items-center gap-3">
            <button className="md:hidden p-2 bg-gcf-black/5 rounded-lg" onClick={() => setMobileMenuOpen(true)}><Menu size={18} /></button>
            <h2 className="font-bold text-sm sm:text-base truncate">Análise Técnica</h2>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={downloadReportPdf} className="p-2 bg-gcf-black/5 rounded-lg text-gcf-black/60"><Download size={18} /></button>
            <button onClick={clearAll} className="p-2 bg-gcf-black/5 rounded-lg text-gcf-black/60"><Trash2 size={18} /></button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-8 lg:p-12">
          <div className="max-w-6xl mx-auto">
            <div className="mb-8 sm:mb-12">
              <h1 className="text-2xl sm:text-5xl font-bold tracking-tighter">Análise de <span className="text-gcf-green">Eficiência</span></h1>
              <p className="text-sm sm:text-lg text-gcf-black/40 font-medium">Compare resultados biológicos com precisão.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10 relative">
              <div className="hidden lg:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 bg-gcf-offwhite p-3 rounded-full border border-gcf-black/10 font-black text-xs">VS</div>
              {renderProductColumn('Cropfield', cropData, cropCalculated, false)}
              {renderProductColumn('Concorrente', compData, compCalculated, true)}
            </div>

            <div className="mt-12 sm:mt-20">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                <div className="bg-gcf-green p-6 sm:p-8 rounded-3xl text-center text-gcf-offwhite">
                  <span className="text-[9px] uppercase font-bold opacity-60">Δ Custo / ha</span>
                  <div className="text-3xl sm:text-5xl font-bold font-mono my-2">
                    {cropCalculated['Custo_R$_por_ha'].isZero() ? '-' : `${compCalculated['Custo_R$_por_ha'].minus(cropCalculated['Custo_R$_por_ha']).dividedBy(cropCalculated['Custo_R$_por_ha']).times(100).toFixed(0)}%`}
                  </div>
                </div>
                {/* Outros cards seguem o mesmo padrão de redução de padding e fonte no mobile */}
                <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gcf-black/10 text-center">
                  <span className="text-[9px] uppercase font-bold text-gcf-black/40">Δ UFC / ha</span>
                  <div className="text-3xl sm:text-5xl font-bold font-mono my-2 text-gcf-green">
                    {cropCalculated.UFC_ou_conidios_ha.isZero() ? '-' : `${compCalculated.UFC_ou_conidios_ha.minus(cropCalculated.UFC_ou_conidios_ha).dividedBy(cropCalculated.UFC_ou_conidios_ha).times(100).toFixed(0)}%`}
                  </div>
                </div>
                <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gcf-black/10 text-center">
                  <span className="text-[9px] uppercase font-bold text-gcf-black/40">Δ UFC / mm²</span>
                  <div className="text-3xl sm:text-5xl font-bold font-mono my-2 text-gcf-black">
                     {cropCalculated.UFC_ou_conidios_mm2_superficie.isZero() ? '-' : `${compCalculated.UFC_ou_conidios_mm2_superficie.minus(cropCalculated.UFC_ou_conidios_mm2_superficie).dividedBy(cropCalculated.UFC_ou_conidios_mm2_superficie).times(100).toFixed(0)}%`}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}