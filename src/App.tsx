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
} from 'lucide-react';
import { Decimal } from 'decimal.js';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// ✅ Logo (mais confiável no Bolt/Vite): importe se o arquivo estiver em src/
// Coloque o arquivo em: src/gcf_logo.png
import gcfLogo from './gcf_logo.png';

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

// Scientific Input Component (Split View)
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

  // Sync state with prop value
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
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const validateAndNotify = (m: string, e: string) => {
    if (m === '' || m === '-') {
      setStatus('default');
      setMessage('');
      return;
    }

    try {
      if (isNaN(Number(m))) throw new Error();
      if (e !== '' && e !== '-' && isNaN(Number(e))) throw new Error();

      const safeM = m;
      const safeE = e === '' || e === '-' ? '0' : e;

      const val = new Decimal(`${safeM}e${safeE}`);

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

  const getStatusClasses = () => {
    switch (status) {
      case 'error':
        return '!border-gcf-black/40 !focus-within:border-gcf-black/60 !focus-within:ring-gcf-black/5';
      case 'warning':
        return '!border-gcf-black/20 !focus-within:border-gcf-black/40 !focus-within:ring-gcf-black/5';
      default:
        return 'border-[rgba(41,44,45,0.12)] focus-within:border-gcf-green focus-within:ring-gcf-green/10 hover:border-[rgba(41,44,45,0.2)]';
    }
  };

  return (
    <div className="relative mb-6">
      <div
        className={`group flex items-center bg-white border rounded-[14px] px-4 py-4 transition-all shadow-sm ${getStatusClasses()} ${className ?? ''}`}
      >
        <div className="flex-1 min-w-[80px]">
          <input
            type="text"
            value={mantissa}
            onChange={handleMantissaChange}
            className={`w-full text-4xl font-bold text-right outline-none bg-transparent tracking-tighter ${
              status === 'error' ? 'text-gcf-black/60' : 'text-gcf-black'
            } placeholder-gcf-black/20`}
            placeholder="0"
            inputMode="decimal"
          />
        </div>

        <div className="mx-3 text-2xl text-gcf-black/30 font-serif italic select-none pb-1">× 10</div>

        <div className="relative -top-4">
          <input
            type="text"
            value={exponent}
            onChange={handleExponentChange}
            className={`w-24 text-2xl font-bold outline-none border rounded-[12px] text-center py-1.5 transition-all shadow-sm ${
              status === 'error'
                ? 'bg-gcf-black/5 border-gcf-black/20 text-gcf-black/60 focus:border-gcf-black/40'
                : status === 'warning'
                  ? 'bg-gcf-black/5 border-gcf-black/10 text-gcf-black/40 focus:border-gcf-black/30'
                  : 'bg-gcf-green/5 border-gcf-green/20 text-gcf-green focus:bg-white focus:border-gcf-green'
            }`}
            placeholder="0"
            inputMode="numeric"
          />
        </div>
      </div>

      {message && (
        <div
          className={`absolute -bottom-5 right-2 text-[10px] font-bold uppercase tracking-wider ${
            status === 'error' ? 'text-gcf-black/60' : 'text-gcf-black/40'
          }`}
        >
          {message}
        </div>
      )}
    </div>
  );
};

// Component for displaying large numbers with toggle
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
  const isZero = value.isZero();

  useEffect(() => {
    if (isLarge) setShowScientific(true);
  }, [isLarge]);

  const formatValue = () => {
    if (isZero) return isCurrency ? 'R$ 0,00' : '0';

    if (isCurrency) {
      return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value.toNumber());
    }

    if (showScientific) {
      const exponential = value.toExponential(2);
      const [mantissa, exponent] = exponential.split('e');
      return (
        <span className="inline-flex items-baseline">
          <span className="text-3xl font-bold tracking-tighter">{mantissa.replace('.', ',')}</span>
          <span className="mx-2 text-xl text-gcf-black/20 font-serif italic">× 10</span>
          <sup className="text-xl font-bold text-gcf-green -top-2 relative">{exponent.replace('+', '')}</sup>
        </span>
      );
    }

    const parts = value.toFixed(0).split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return parts.join(',');
  };

  return (
    <div className="flex flex-col">
      {(label || (isLarge && !isCurrency)) && (
        <div className="flex justify-between items-center mb-2">
          {label && <span className="text-[10px] font-bold text-gcf-black/40 uppercase tracking-[0.15em]">{label}</span>}
          {isLarge && !isCurrency && (
            <button
              onClick={() => setShowScientific(!showScientific)}
              className="flex items-center gap-1.5 px-2 py-1 rounded-[8px] bg-gcf-black/5 hover:bg-gcf-black/10 text-gcf-black/60 text-[9px] font-bold uppercase tracking-widest transition-all active:scale-95 ml-auto"
              title="Alternar formato"
              type="button"
            >
              {showScientific ? <Hash size={10} /> : <Calculator size={10} />}
              <span>{showScientific ? 'Normal' : 'Científica'}</span>
            </button>
          )}
        </div>
      )}
      <div className={`font-mono ${!showScientific ? 'text-2xl md:text-3xl font-bold tracking-tighter' : ''} ${colorClass}`}>
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

  const calculate = (data: BiologicoRecord): CalculatedValues => {
    try {
      const conc = new Decimal(data.Concentracao_por_ml_ou_g || 0);
      const dose = new Decimal(data.Dose_ha_ml_ou_g || 0);
      const custo = new Decimal(data['Custo_R$_por_L_ou_kg'] || 0);

      const ufcHa = conc.times(dose);
      const custoHa = dose.times(custo).dividedBy(1000);
      const ufcMm2 = ufcHa.dividedBy(1e10);

      return {
        UFC_ou_conidios_ha: ufcHa,
        UFC_ou_conidios_mm2_superficie: ufcMm2,
        'Custo_R$_por_ha': custoHa,
      };
    } catch (_) {
      return INITIAL_CALCULATED;
    }
  };

  // Effects to trigger forward calculation when inputs change
  useEffect(() => {
    setCropCalculated(calculate(cropData));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cropData.Concentracao_por_ml_ou_g, cropData.Dose_ha_ml_ou_g, cropData['Custo_R$_por_L_ou_kg']]);

  useEffect(() => {
    setCompCalculated(calculate(compData));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compData.Concentracao_por_ml_ou_g, compData.Dose_ha_ml_ou_g, compData['Custo_R$_por_L_ou_kg']]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement> | { target: { name: string; value: string } },
    isCompetitor = false
  ) => {
    const { name, value } = e.target;
    const setter = isCompetitor ? setCompData : setCropData;
    setter((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Special handler for Reverse Calculation (Editing UFC)
  const handleUfcChange = (value: string, isCompetitor = false) => {
    const setter = isCompetitor ? setCompData : setCropData;
    const currentData = isCompetitor ? compData : cropData;

    const conc = new Decimal(currentData.Concentracao_por_ml_ou_g || 0);
    if (conc.isZero()) return;

    try {
      const targetUfc = new Decimal(value || 0);
      const newDose = targetUfc.dividedBy(conc);

      setter((prev) => ({
        ...prev,
        Dose_ha_ml_ou_g: newDose.toString(),
      }));
    } catch (_) {}
  };

  const clearAll = () => {
    setCropData(INITIAL_STATE_CROPFIELD);
    setCompData(INITIAL_STATE_CONCORRENTE);
  };

  // ✅ PDF: gerar relatório e baixar
  const downloadReportPdf = () => {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });

    const now = new Date();
    const dt = new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(now);

    const fmtDec = (d: Decimal) => {
      try {
        if (!d || (d as any).isNaN?.()) return '0';
        if (d.abs().gte(new Decimal('1e9'))) return d.toExponential(2);
        // para números médios, mostra sem notação científica
        return d.toFixed(2);
      } catch {
        return '0';
      }
    };

    const fmtMoney = (d: Decimal) =>
      new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
        (() => {
          try {
            return d?.toNumber?.() ?? 0;
          } catch {
            return 0;
          }
        })()
      );

    // Cabeçalho
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('Relatório — Comparativo de Biológicos', 40, 48);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Gerado em: ${dt}`, 40, 66);

    doc.setDrawColor(41, 44, 45);
    doc.setLineWidth(0.5);
    doc.line(40, 78, 555, 78);

    // Entradas
    autoTable(doc, {
      startY: 92,
      head: [['Campo', 'Cropfield', 'Concorrente']],
      body: [
        ['Produto', cropData.Produto || '-', compData.Produto || '-'],
        ['Concentração (UFC/mL ou g)', cropData.Concentracao_por_ml_ou_g || '-', compData.Concentracao_por_ml_ou_g || '-'],
        ['Dose (mL ou g/ha)', cropData.Dose_ha_ml_ou_g || '-', compData.Dose_ha_ml_ou_g || '-'],
        ['Custo (R$/L ou kg)', cropData['Custo_R$_por_L_ou_kg'] || '-', compData['Custo_R$_por_L_ou_kg'] || '-'],
      ],
      styles: { fontSize: 10, cellPadding: 6 },
      headStyles: { fillColor: [41, 44, 45], textColor: [252, 250, 240] },
      theme: 'grid',
    });

    const yAfterInputs = (doc as any).lastAutoTable.finalY + 18;

    // Resultados
    autoTable(doc, {
      startY: yAfterInputs,
      head: [['Métrica', 'Cropfield', 'Concorrente']],
      body: [
        ['UFC/ha', fmtDec(cropCalculated.UFC_ou_conidios_ha), fmtDec(compCalculated.UFC_ou_conidios_ha)],
        ['UFC/mm² (superfície)', fmtDec(cropCalculated.UFC_ou_conidios_mm2_superficie), fmtDec(compCalculated.UFC_ou_conidios_mm2_superficie)],
        ['Custo/ha', fmtMoney(cropCalculated['Custo_R$_por_ha']), fmtMoney(compCalculated['Custo_R$_por_ha'])],
      ],
      styles: { fontSize: 10, cellPadding: 6 },
      headStyles: { fillColor: [0, 178, 98], textColor: [252, 250, 240] },
      theme: 'grid',
    });

    const yAfterResults = (doc as any).lastAutoTable.finalY + 18;

    // Diferenças
    const diffCusto = compCalculated['Custo_R$_por_ha'].minus(cropCalculated['Custo_R$_por_ha']);
    const diffUfc = compCalculated.UFC_ou_conidios_ha.minus(cropCalculated.UFC_ou_conidios_ha);
    const diffMm2 = compCalculated.UFC_ou_conidios_mm2_superficie.minus(cropCalculated.UFC_ou_conidios_mm2_superficie);

    autoTable(doc, {
      startY: yAfterResults,
      head: [['Diferença (Concorrente − Cropfield)', 'Valor']],
      body: [
        ['Δ Custo/ha', fmtMoney(diffCusto)],
        ['Δ UFC/ha', fmtDec(diffUfc)],
        ['Δ UFC/mm²', fmtDec(diffMm2)],
      ],
      styles: { fontSize: 10, cellPadding: 6 },
      headStyles: { fillColor: [41, 44, 45], textColor: [252, 250, 240] },
      theme: 'grid',
    });

    const safe = now.toISOString().slice(0, 19).replace(/[:T]/g, '-');
    doc.save(`relatorio-comparativo-${safe}.pdf`);
  };

  const renderProductColumn = (title: string, data: BiologicoRecord, calculated: CalculatedValues, isCompetitor: boolean) => {
    const isCropfield = !isCompetitor;

    return (
      <div className="card-gcf h-full flex flex-col group">
        {/* Header */}
        <div
          className={`px-8 py-8 bg-gradient-to-br ${
            isCropfield ? 'from-gcf-green to-[#008f4f]' : 'from-gcf-black to-[#1a1c1d]'
          } text-gcf-offwhite relative overflow-hidden`}
        >
          <div className="absolute top-0 right-0 -mt-6 -mr-6 w-32 h-32 bg-white/10 rounded-full blur-3xl transition-transform group-hover:scale-110"></div>
          <div className="flex justify-between items-center relative z-10">
            <div>
              <h2 className="text-3xl font-bold tracking-tighter">{title}</h2>
              <p className="text-gcf-offwhite/70 text-[10px] mt-1 font-bold uppercase tracking-[0.2em]">
                {isCropfield ? 'Tecnologia GCF' : 'Referência de Mercado'}
              </p>
            </div>
            <div className="bg-white/20 p-3 rounded-[14px] backdrop-blur-md border border-white/20 shadow-inner">
              {isCropfield ? <Leaf size={24} className="text-gcf-offwhite" /> : <Hash size={24} className="text-gcf-offwhite" />}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-8 flex-1 flex flex-col gap-10">
          {/* Inputs */}
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="label-gcf">Identificação do Produto</label>
              <input
                type="text"
                name="Produto"
                value={data.Produto}
                onChange={(e) => handleInputChange(e, isCompetitor)}
                className="input-gcf"
                placeholder="Ex: BioControl"
              />
            </div>

            <div className="grid grid-cols-1 gap-6">
              <div className="space-y-2">
                <label className="label-gcf">Concentração (UFC / mL ou g)</label>
                <ScientificInput
                  value={data.Concentracao_por_ml_ou_g}
                  onChange={(val) =>
                    handleInputChange({ target: { name: 'Concentracao_por_ml_ou_g', value: val } }, isCompetitor)
                  }
                  className="w-full font-mono text-gcf-black"
                  placeholder="Ex: 1e10"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="label-gcf">Dose (mL ou g / ha)</label>
                  <input
                    type="number"
                    name="Dose_ha_ml_ou_g"
                    value={data.Dose_ha_ml_ou_g}
                    onChange={(e) => handleInputChange(e, isCompetitor)}
                    step="any"
                    className="input-gcf font-mono"
                  />
                </div>

                <div className="space-y-2">
                  <label className="label-gcf">Custo (R$ / L ou kg)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gcf-black/40 font-bold text-sm">R$</span>
                    <input
                      type="number"
                      name="Custo_R$_por_L_ou_kg"
                      value={data['Custo_R$_por_L_ou_kg']}
                      onChange={(e) => handleInputChange(e, isCompetitor)}
                      step="any"
                      className="input-gcf pl-10 font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="w-full h-px bg-gcf-black/5"></div>

          {/* Results */}
          <div className="space-y-8">
            {/* Editable UFC */}
            <div className="flex flex-col space-y-3">
              <div className="flex justify-between items-center px-1">
                <span className="text-[10px] font-bold text-gcf-black/40 uppercase tracking-[0.2em]">UFC ou Conídios / ha</span>
                <span className="text-[9px] font-bold bg-gcf-green/10 text-gcf-green px-2 py-0.5 rounded-full border border-gcf-green/20 uppercase tracking-widest">
                  Alvo Editável
                </span>
              </div>
              <ScientificInput
                value={calculated.UFC_ou_conidios_ha.toString()}
                onChange={(val) => handleUfcChange(val, isCompetitor)}
                className={`w-full font-mono text-xl font-bold ${
                  isCropfield ? 'bg-gcf-green/5 border-gcf-green/20 text-gcf-green' : 'bg-gcf-black/5 border-gcf-black/10 text-gcf-black'
                }`}
                placeholder="Calculado..."
              />
              <div className="px-1 space-y-1">
                <p className="text-[9px] text-gcf-black/40 font-bold uppercase tracking-widest">Fórmula: Concentração × Dose</p>
                <p className="text-[9px] text-gcf-black/30 font-medium italic">* Alterar este valor recalcula a Dose automaticamente.</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center px-1">
                <span className="text-[10px] font-bold text-gcf-black/40 uppercase tracking-[0.2em]">UFC / mm² (Superfície)</span>
                <span className="text-[9px] font-bold bg-gcf-black/5 text-gcf-black/60 px-2 py-0.5 rounded-full border border-gcf-black/10 uppercase tracking-widest">
                  Concentração
                </span>
              </div>
              <div className="bg-gcf-black/5 p-6 rounded-[14px] border border-gcf-black/5">
                <BigNumberDisplay value={calculated.UFC_ou_conidios_mm2_superficie} colorClass={isCropfield ? 'text-gcf-green' : 'text-gcf-black'} />
                <p className="text-[9px] text-gcf-black/40 mt-3 font-bold uppercase tracking-widest">Fórmula: UFC/ha ÷ 10¹⁰</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center px-1">
                <span className="text-[10px] font-bold text-gcf-black/40 uppercase tracking-[0.2em]">Investimento / ha</span>
                <span className="text-[9px] font-bold bg-gcf-black/5 text-gcf-black/60 px-2 py-0.5 rounded-full border border-gcf-black/10 uppercase tracking-widest">
                  Comercial
                </span>
              </div>
              <div className={`p-6 rounded-[14px] shadow-lg ${isCropfield ? 'bg-gcf-green shadow-gcf-green/20' : 'bg-gcf-black shadow-gcf-black/20'}`}>
                <div className="text-3xl font-bold font-mono text-gcf-offwhite tracking-tighter">
                  <span className="text-gcf-offwhite/50 text-sm mr-2">R$</span>
                  {calculated['Custo_R$_por_ha'].toFixed(2).replace('.', ',')}
                </div>
                <p className="text-[9px] text-gcf-offwhite/50 mt-3 font-bold uppercase tracking-widest">Fórmula: (Dose × Custo) ÷ 1.000</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <div className="min-h-screen bg-gcf-offwhite font-sans text-gcf-black flex overflow-hidden">
      {/* Sidebar */}
      <aside className={`bg-gcf-black text-gcf-offwhite transition-all duration-300 flex flex-col z-50 ${isSidebarOpen ? 'w-64' : 'w-20'}`}>
        <div className="h-20 flex items-center px-6 border-b border-white/5">
          <div className="flex items-center gap-3 overflow-hidden">
            {isSidebarOpen ? (
              <img src={gcfLogo} alt="GCF Logo" className="h-9 w-auto" draggable={false} />
            ) : (
              <div className="bg-gcf-green p-2 rounded-[10px] text-gcf-offwhite shrink-0">
                <Leaf size={20} />
              </div>
            )}
          </div>
        </div>

        <nav className="flex-1 py-6 px-4 space-y-2">
          {[
            { icon: LayoutDashboard, label: 'Comparativo', active: true },
          ].map((item, idx) => (
            <button
              key={idx}
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-[12px] transition-all group ${
                item.active ? 'bg-gcf-green text-gcf-offwhite shadow-lg shadow-gcf-green/20' : 'text-gcf-offwhite/60 hover:bg-white/5 hover:text-gcf-offwhite'
              }`}
              type="button"
            >
              <item.icon size={20} className={item.active ? 'text-gcf-offwhite' : 'text-gcf-offwhite/40 group-hover:text-gcf-offwhite'} />
              {isSidebarOpen && <span className="font-bold text-sm">{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-white/5">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="w-full flex items-center justify-center p-3 rounded-[12px] bg-white/5 hover:bg-white/10 transition-all"
            type="button"
          >
            {isSidebarOpen ? <Minus size={16} /> : <Plus size={16} />}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-20 bg-white border-b border-[rgba(41,44,45,0.12)] flex items-center justify-between px-8 z-40">
          <div className="flex items-center gap-6">
            <img src={gcfLogo} alt="GCF Logo" className="h-8 hidden md:block w-auto" draggable={false} />
            <div className="h-8 w-px bg-gcf-black/10 hidden md:block"></div>
            <div className="flex items-center gap-4">
              <h2 className="font-bold text-gcf-black tracking-tight">Comparativo de Biológicos</h2>
              <span className="px-2 py-1 bg-gcf-green/10 text-gcf-green text-[10px] font-bold rounded-full uppercase tracking-widest">v2.0</span>
            </div>
          </div>

          <div className="flex items-center gap-3 md:gap-6">
            <button
              onClick={downloadReportPdf}
              className="btn-secondary !py-2 !px-4 !text-xs uppercase tracking-widest"
              type="button"
              title="Baixar relatório em PDF"
            >
              <Download size={14} />
              <span>Baixar PDF</span>
            </button>

            <button
              onClick={clearAll}
              className="btn-secondary !py-2 !px-4 !text-xs uppercase tracking-widest"
              type="button"
            >
              <Trash2 size={14} />
              <span>Limpar Dados</span>
            </button>

            <div className="h-8 w-px bg-gcf-black/10 hidden md:block"></div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gcf-black/5 flex items-center justify-center text-gcf-black/40">
                <AlertCircle size={20} />
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8 md:p-12">
          <div className="max-w-7xl mx-auto">
            <div className="mb-16">
              <h1 className="text-5xl font-bold text-gcf-black tracking-tighter mb-4">
                Análise de <span className="text-gcf-green">Eficiência</span>
              </h1>
              <p className="text-lg text-gcf-black/40 max-w-2xl font-medium">
                Compare a tecnologia Cropfield com referências de mercado através de dados técnicos e comerciais precisos.
              </p>
            </div>

            {/* Comparison Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start relative">
              {/* VS Badge (Desktop) */}
              <div className="hidden lg:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 bg-gcf-offwhite p-4 rounded-full shadow-xl border border-gcf-black/5 text-gcf-black/20 font-black text-2xl tracking-tighter">
                VS
              </div>

              {renderProductColumn('Cropfield', cropData, cropCalculated, false)}
              {renderProductColumn('Concorrente', compData, compCalculated, true)}
            </div>

            {/* Differences Section */}
            <div className="mt-24">
              <div className="flex items-center gap-6 mb-12">
                <div className="h-px flex-1 bg-gcf-black/10"></div>
                <div className="flex items-center gap-3 px-6 py-2 bg-white border border-gcf-black/10 rounded-[14px] shadow-sm">
                  <ArrowRightLeft className="text-gcf-green" size={20} />
                  <h3 className="text-lg font-bold text-gcf-black uppercase tracking-tighter">Análise de Diferenças</h3>
                </div>
                <div className="h-px flex-1 bg-gcf-black/10"></div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="bg-gcf-green p-10 rounded-[28px] shadow-2xl shadow-gcf-green/20 flex flex-col items-center text-center relative overflow-hidden group">
                  <div className="absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 bg-white/10 rounded-full blur-3xl transition-all group-hover:scale-150"></div>
                  <span className="text-[10px] font-bold text-gcf-offwhite/60 uppercase tracking-[0.2em] mb-4 relative z-10">Diferença Custo / ha</span>
                  {(() => {
                    const cropCusto = cropCalculated['Custo_R$_por_ha'];
                    const compCusto = compCalculated['Custo_R$_por_ha'];

                    if (cropCusto.isZero()) {
                      return <div className="text-2xl font-bold font-mono mb-2 text-gcf-offwhite/40 relative z-10">-</div>;
                    }

                    const diffPercent = compCusto.minus(cropCusto).dividedBy(cropCusto).times(100);
                    const isMoreExpensive = diffPercent.gt(0);
                    const isEqual = diffPercent.isZero();

                    return (
                      <>
                        <div className="text-6xl font-bold font-mono mb-6 relative z-10 text-gcf-offwhite tracking-tighter">
                          {isEqual ? '0%' : `${isMoreExpensive ? '+' : ''}${diffPercent.toFixed(0)}%`}
                        </div>
                        <div className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full text-[10px] font-bold text-gcf-offwhite relative z-10 border border-white/10 uppercase tracking-widest">
                          {isEqual ? (
                            <span>Mesmo custo</span>
                          ) : isMoreExpensive ? (
                            <>
                              <TrendingUp size={14} className="text-gcf-offwhite/60" />
                              <span>Concorrente mais caro</span>
                            </>
                          ) : (
                            <>
                              <TrendingDown size={14} className="text-gcf-offwhite" />
                              <span>Concorrente mais barato</span>
                            </>
                          )}
                        </div>
                      </>
                    );
                  })()}
                </div>

                {/* UFC Diff (Percentage) */}
                <div className="bg-white p-10 rounded-[28px] border border-gcf-black/10 shadow-xl shadow-gcf-black/5 flex flex-col items-center text-center group">
                  <span className="text-[10px] font-bold text-gcf-black/40 uppercase tracking-[0.2em] mb-4">Diferença UFC / ha</span>
                  {(() => {
                    const cropUfc = cropCalculated.UFC_ou_conidios_ha;
                    const compUfc = compCalculated.UFC_ou_conidios_ha;

                    if (cropUfc.isZero()) {
                      return <div className="text-2xl font-bold font-mono mb-2 text-gcf-black/20">-</div>;
                    }

                    const diffPercent = compUfc.minus(cropUfc).dividedBy(cropUfc).times(100);
                    const isSuperior = diffPercent.gt(0);
                    const isEqual = diffPercent.isZero();

                    return (
                      <>
                        <div className={`text-6xl font-bold font-mono mb-6 tracking-tighter ${isEqual ? 'text-gcf-black' : isSuperior ? 'text-gcf-green' : 'text-gcf-black/60'}`}>
                          {isEqual ? '0%' : `${isSuperior ? '+' : ''}${diffPercent.toFixed(0)}%`}
                        </div>
                        <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-bold border uppercase tracking-widest ${
                          isEqual
                            ? 'bg-gcf-black/5 text-gcf-black/40 border-gcf-black/10'
                            : isSuperior
                              ? 'bg-gcf-green/10 text-gcf-green border-gcf-green/20'
                              : 'bg-gcf-black/5 text-gcf-black/60 border-gcf-black/10'
                        }`}>
                          {isEqual ? (
                            <span>Mesma concentração</span>
                          ) : isSuperior ? (
                            <>
                              <TrendingUp size={14} />
                              <span>Concorrente superior</span>
                            </>
                          ) : (
                            <>
                              <TrendingDown size={14} />
                              <span>Concorrente inferior</span>
                            </>
                          )}
                        </div>
                      </>
                    );
                  })()}
                </div>

                {/* UFC mm2 Diff (Percentage) */}
                <div className="bg-white p-10 rounded-[28px] border border-gcf-black/10 shadow-xl shadow-gcf-black/5 flex flex-col items-center text-center group">
                  <span className="text-[10px] font-bold text-gcf-black/40 uppercase tracking-[0.2em] mb-4">Diferença UFC / mm²</span>
                  {(() => {
                    const cropUfcMm2 = cropCalculated.UFC_ou_conidios_mm2_superficie;
                    const compUfcMm2 = compCalculated.UFC_ou_conidios_mm2_superficie;

                    if (cropUfcMm2.isZero()) {
                      return <div className="text-2xl font-bold font-mono mb-2 text-gcf-black/20">-</div>;
                    }

                    const diffPercent = compUfcMm2.minus(cropUfcMm2).dividedBy(cropUfcMm2).times(100);
                    const isSuperior = diffPercent.gt(0);
                    const isEqual = diffPercent.isZero();

                    return (
                      <>
                        <div className={`text-6xl font-bold font-mono mb-6 tracking-tighter ${isEqual ? 'text-gcf-black' : isSuperior ? 'text-gcf-green' : 'text-gcf-black/60'}`}>
                          {isEqual ? '0%' : `${isSuperior ? '+' : ''}${diffPercent.toFixed(0)}%`}
                        </div>
                        <div className="text-[10px] font-bold text-gcf-black/40 uppercase tracking-widest">Concentração na Superfície</div>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}