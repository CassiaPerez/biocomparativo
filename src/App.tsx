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

// ✅ Logo via PUBLIC (evita erro de import no Bolt/Vite)
// Coloque o arquivo exatamente em: public/gcf_logo.png
const gcfLogo = '/gcf_logo.png';

// Superscript helper (expoente elevado) para notação científica: 10¹²
const toSuperscript = (input: string | number) => {
  const map: Record<string, string> = {
    '0': '⁰',
    '1': '¹',
    '2': '²',
    '3': '³',
    '4': '⁴',
    '5': '⁵',
    '6': '⁶',
    '7': '⁷',
    '8': '⁸',
    '9': '⁹',
    '+': '⁺',
    '-': '⁻',
  };

  return String(input)
    .split('')
    .map((ch) => map[ch] ?? ch)
    .join('');
};

const fmtScientificSup = (d: Decimal, mantissaDigits = 1) => {
  try {
    if (!d || (d as any).isNaN?.()) return '0';
    if (d.isZero()) return '0';

    // ex: "-1.5e+12"
    const sci = d.toExponential(mantissaDigits);
    const [mRaw, eRaw = '0'] = sci.split('e');

    const mantissa = mRaw
      .replace(/\.0+$/, '')
      .replace(/(\.[0-9]*?)0+$/, '$1');

    const exp = (eRaw || '0').replace('+', '').replace(/^0+(?=\d)/, '');
    return `${mantissa}×10${toSuperscript(exp)}`;
  } catch {
    return '0';
  }
};

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
        className={`group flex items-center bg-white border rounded-[14px] px-4 py-4 transition-all shadow-sm ${getStatusClasses()} ${
          className ?? ''
        }`}
      >
        <div className="flex-1 min-w-[80px]">
          <input
            type="text"
            value={mantissa}
            onChange={handleMantissaChange}
            className={`w-full text-3xl sm:text-4xl font-bold text-right outline-none bg-transparent tracking-tighter ${
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
            className={`w-20 sm:w-24 text-xl sm:text-2xl font-bold outline-none border rounded-[12px] text-center py-1.5 transition-all shadow-sm ${
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
    <div className="relative">
      {label && <div className="text-xs font-bold text-gcf-black/40 uppercase tracking-widest mb-2">{label}</div>}

      <div className={`text-2xl sm:text-3xl font-bold font-mono tracking-tighter ${colorClass}`}>{formatValue()}</div>

      {!isCurrency && isLarge && (
        <button
          onClick={() => setShowScientific((s) => !s)}
          className="absolute -bottom-6 right-0 text-[10px] font-bold text-gcf-green hover:text-gcf-black transition-colors uppercase tracking-widest"
          type="button"
        >
          {showScientific ? 'Ver padrão' : 'Ver científico'}
        </button>
      )}
    </div>
  );
};

export default function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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

  const clearAll = () => {
    setCropData(INITIAL_STATE_CROPFIELD);
    setCompData(INITIAL_STATE_CONCORRENTE);
  };

  const downloadReportPdf = () => {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });

    const now = new Date();
    const dt = new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(now);

    const safeDec = (v: string) => {
      try {
        if (!v) return null;
        const d = new Decimal(v);
        if ((d as any).isNaN?.()) return null;
        return d;
      } catch {
        return null;
      }
    };

    // Formatação para PDF (notação científica com expoente elevado)
    const fmtSci = (d: Decimal, mantissaDigits = 1) => fmtScientificSup(d, mantissaDigits);

    const fmtDec = (d: Decimal) => {
      try {
        if (!d || (d as any).isNaN?.()) return '0';
        if (d.isZero()) return '0';

        // Para números grandes, imprimir em notação científica (expoente elevado)
        if (d.abs().gte(new Decimal('1e6'))) return fmtSci(d, 1);

        // Para números menores, manter legível
        if (d.abs().lt(1)) return d.toFixed(6);
        return d.toFixed(2);
      } catch {
        return '0';
      }
    };

    // Para diferenças por área (ex.: UFC/ha), o campo deve ser ABSOLUTO (sem %)
    const fmtDeltaArea = (d: Decimal) => {
      try {
        if (!d || (d as any).isNaN?.()) return '0';
        if (d.isZero()) return '0';

        if (d.abs().gte(new Decimal('1e6'))) return fmtSci(d, 1);

        // unidade/área → absoluto (sem %)
        return d.toFixed(0);
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

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('Relatório — Comparativo de Biológicos', 40, 48);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Gerado em: ${dt}`, 40, 66);

    doc.setDrawColor(41, 44, 45);
    doc.setLineWidth(0.5);
    doc.line(40, 78, 555, 78);

    autoTable(doc, {
      startY: 92,
      head: [['Campo', 'Cropfield', 'Concorrente']],
      body: [
        ['Produto', cropData.Produto || '-', compData.Produto || '-'],
        [
          'Concentração (UFC/mL ou g)',
          safeDec(cropData.Concentracao_por_ml_ou_g) ? fmtDec(safeDec(cropData.Concentracao_por_ml_ou_g)!) : '-',
          safeDec(compData.Concentracao_por_ml_ou_g) ? fmtDec(safeDec(compData.Concentracao_por_ml_ou_g)!) : '-',
        ],
        ['Dose (mL ou g/ha)', cropData.Dose_ha_ml_ou_g || '-', compData.Dose_ha_ml_ou_g || '-'],
        ['Custo (R$/L ou kg)', cropData['Custo_R$_por_L_ou_kg'] || '-', compData['Custo_R$_por_L_ou_kg'] || '-'],
      ],
      styles: { fontSize: 10, cellPadding: 6 },
      headStyles: { fillColor: [41, 44, 45], textColor: [252, 250, 240] },
      theme: 'grid',
    });

    const yAfterInputs = (doc as any).lastAutoTable.finalY + 18;

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

    const diffCusto = compCalculated['Custo_R$_por_ha'].minus(cropCalculated['Custo_R$_por_ha']);
    const diffUfc = compCalculated.UFC_ou_conidios_ha.minus(cropCalculated.UFC_ou_conidios_ha);
    const diffMm2 = compCalculated.UFC_ou_conidios_mm2_superficie.minus(cropCalculated.UFC_ou_conidios_mm2_superficie);

    // Percentual de redução (Cropfield vs Concorrente): (Concorrente - Cropfield) / Concorrente
    const pctReduc = (comp: Decimal, crop: Decimal) => {
      try {
        if (!comp || (comp as any).isNaN?.()) return null;
        if (comp.isZero()) return null;
        return comp.minus(crop).dividedBy(comp).times(100);
      } catch {
        return null;
      }
    };

    const pctReducCusto = pctReduc(compCalculated['Custo_R$_por_ha'], cropCalculated['Custo_R$_por_ha']);
    const pctReducUfc = pctReduc(compCalculated.UFC_ou_conidios_ha, cropCalculated.UFC_ou_conidios_ha);
    const pctReducMm2 = pctReduc(compCalculated.UFC_ou_conidios_mm2_superficie, cropCalculated.UFC_ou_conidios_mm2_superficie);

    autoTable(doc, {
      startY: yAfterResults,
      head: [['Diferença (Concorrente − Cropfield)', 'Valor']],
      body: [
        ['Δ Custo/ha', fmtMoney(diffCusto)],
        // ABSOLUTO (sem %), pois é unidade por área
        ['Δ UFC/ha', fmtDeltaArea(diffUfc)],
        // ABSOLUTO (sem %)
        ['Δ UFC/mm²', diffMm2.toFixed(0)],
        // Percentual de redução (ex.: 20%)
        ['Redução (%) Custo/ha', pctReducCusto ? `${pctReducCusto.toFixed(0)}%` : '-'],
        ['Redução (%) UFC/ha', pctReducUfc ? `${pctReducUfc.toFixed(0)}%` : '-'],
        ['Redução (%) UFC/mm²', pctReducMm2 ? `${pctReducMm2.toFixed(0)}%` : '-'],
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
        <div
          className={`px-6 sm:px-8 py-6 sm:py-8 bg-gradient-to-br ${
            isCropfield ? 'from-gcf-green to-[#008f4f]' : 'from-gcf-black to-[#1a1c1d]'
          } text-gcf-offwhite relative overflow-hidden`}
        >
          <div className="absolute top-0 right-0 -mt-6 -mr-6 w-32 h-32 bg-white/10 rounded-full blur-3xl transition-transform group-hover:scale-110"></div>
          <div className="flex justify-between items-center relative z-10">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tighter">{title}</h2>
              <p className="text-gcf-offwhite/70 text-[10px] mt-1 font-bold uppercase tracking-[0.2em]">
                {isCropfield ? 'Tecnologia GCF' : 'Referência de Mercado'}
              </p>
            </div>
            <div className="bg-white/20 p-3 rounded-[14px] backdrop-blur-md border border-white/20 shadow-inner">
              {isCropfield ? <Leaf size={24} className="text-gcf-offwhite" /> : <Hash size={24} className="text-gcf-offwhite" />}
            </div>
          </div>
        </div>

        <div className="p-6 sm:p-8 flex-1 flex flex-col gap-10">
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
                  onChange={(val) => handleInputChange({ target: { name: 'Concentracao_por_ml_ou_g', value: val } }, isCompetitor)}
                  className="w-full font-mono text-gcf-black"
                  placeholder="Ex: 1e10"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="label-gcf">Dose (mL ou g / ha)</label>
                  <input
                    type="number"
                    name="Dose_ha_ml_ou_g"
                    value={data.Dose_ha_ml_ou_g}
                    onChange={(e) => handleInputChange(e, isCompetitor)}
                    className="input-gcf"
                    placeholder="Ex: 400"
                  />
                </div>

                <div className="space-y-2">
                  <label className="label-gcf">Custo (R$ / L ou kg)</label>
                  <input
                    type="number"
                    name="Custo_R$_por_L_ou_kg"
                    value={data['Custo_R$_por_L_ou_kg']}
                    onChange={(e) => handleInputChange(e, isCompetitor)}
                    className="input-gcf"
                    placeholder="Ex: 120"
                  />
                </div>
              </div>
            </div>

            <div className="mt-8">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <Calculator size={16} className={isCropfield ? 'text-gcf-offwhite' : 'text-gcf-black/40'} />
                  <h4 className="text-sm font-bold text-gcf-black uppercase tracking-widest">Resultados</h4>
                </div>

                <button
                  onClick={downloadReportPdf}
                  className="btn-secondary !py-2 !px-4 !text-xs uppercase tracking-widest"
                  type="button"
                >
                  <Download size={14} />
                  <span className="hidden sm:inline">Baixar PDF</span>
                </button>
              </div>

              <div className="space-y-7">
                <BigNumberDisplay value={calculated.UFC_ou_conidios_ha} label="UFC / ha" colorClass={isCropfield ? 'text-gcf-green' : 'text-gcf-black'} />
                <BigNumberDisplay
                  value={calculated.UFC_ou_conidios_mm2_superficie}
                  label="UFC / mm² (superfície)"
                  colorClass={isCropfield ? 'text-gcf-green' : 'text-gcf-black'}
                />
                <BigNumberDisplay
                  value={calculated['Custo_R$_por_ha']}
                  label="Custo / ha"
                  isCurrency
                  colorClass={isCropfield ? 'text-gcf-green' : 'text-gcf-black'}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gcf-offwhite">
      <div className="flex h-screen">
        <aside
          className={`bg-white border-r border-gcf-black/10 w-72 sm:w-80 p-6 flex flex-col transition-transform duration-300 ease-out ${
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } fixed lg:static inset-y-0 left-0 z-50`}
        >
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 rounded-[14px] bg-gcf-black flex items-center justify-center">
              <LayoutDashboard size={20} className="text-gcf-offwhite" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-gcf-black tracking-tighter">BioSimulador</h2>
              <p className="text-xs font-bold text-gcf-black/40 uppercase tracking-widest">Cropfield</p>
            </div>
          </div>

          <div className="flex-1 space-y-6">
            <div className="p-5 bg-gcf-green/5 border border-gcf-green/10 rounded-[18px]">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-[14px] bg-gcf-green flex items-center justify-center">
                  <Leaf size={20} className="text-gcf-offwhite" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gcf-black tracking-tight">Tecnologia Cropfield</h3>
                  <p className="text-[10px] font-bold text-gcf-black/40 uppercase tracking-widest">Comparativo técnico</p>
                </div>
              </div>
              <p className="text-xs text-gcf-black/50 leading-relaxed font-medium">
                Insira os dados do seu biológico e compare com referências de mercado através de cálculos automáticos de UFC, superfície e custo por hectare.
              </p>
            </div>

            <div className="space-y-3">
              <div className="text-[10px] font-bold text-gcf-black/40 uppercase tracking-[0.2em]">Atalhos</div>

              <button
                onClick={clearAll}
                className="w-full flex items-center gap-3 px-4 py-3 bg-gcf-black/5 hover:bg-gcf-black/10 transition-colors rounded-[14px] text-left"
                type="button"
              >
                <Trash2 size={18} className="text-gcf-black/40" />
                <div className="flex-1">
                  <div className="text-sm font-bold text-gcf-black">Limpar Dados</div>
                  <div className="text-[10px] font-bold text-gcf-black/40 uppercase tracking-widest">Resetar tudo</div>
                </div>
              </button>

              <button
                onClick={() => {
                  setCropData((prev) => ({ ...prev, Produto: 'Cropfield' }));
                  setCompData((prev) => ({ ...prev, Produto: 'Concorrente' }));
                }}
                className="w-full flex items-center gap-3 px-4 py-3 bg-gcf-black/5 hover:bg-gcf-black/10 transition-colors rounded-[14px] text-left"
                type="button"
              >
                <Plus size={18} className="text-gcf-black/40" />
                <div className="flex-1">
                  <div className="text-sm font-bold text-gcf-black">Preencher Nomes</div>
                  <div className="text-[10px] font-bold text-gcf-black/40 uppercase tracking-widest">Padrão</div>
                </div>
              </button>
            </div>
          </div>

          <div className="pt-6 border-t border-gcf-black/10">
            <div className="flex items-center gap-3">
              <img src={gcfLogo} alt="GCF" className="w-10 h-10 rounded-[14px] object-contain bg-white border border-gcf-black/10 p-1" />
              <div className="flex-1">
                <div className="text-sm font-bold text-gcf-black">Grupo Cropfield</div>
                <div className="text-[10px] font-bold text-gcf-black/40 uppercase tracking-widest">v1.0</div>
              </div>
            </div>
          </div>
        </aside>

        <div className="flex-1 flex flex-col min-w-0">
          <header className="bg-white border-b border-gcf-black/10 px-4 sm:px-6 md:px-12 py-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="lg:hidden w-10 h-10 rounded-[14px] bg-gcf-black/5 hover:bg-gcf-black/10 transition-colors flex items-center justify-center"
                type="button"
              >
                <Minus size={18} className="text-gcf-black/40" />
              </button>

              <div className="flex items-center gap-3">
                <img src={gcfLogo} alt="GCF" className="w-10 h-10 rounded-[14px] object-contain bg-white border border-gcf-black/10 p-1" />
                <div>
                  <div className="text-sm font-bold text-gcf-black tracking-tight">BioSimulador</div>
                  <div className="text-[10px] font-bold text-gcf-black/40 uppercase tracking-widest">Comparativo</div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button onClick={clearAll} className="btn-secondary !py-2 !px-4 !text-xs uppercase tracking-widest" type="button">
                <Trash2 size={14} />
                <span className="hidden sm:inline">Limpar Dados</span>
              </button>

              <div className="h-8 w-px bg-gcf-black/10 hidden md:block"></div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gcf-black/5 flex items-center justify-center text-gcf-black/40">
                  <AlertCircle size={20} />
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-12">
            <div className="max-w-7xl mx-auto">
              <div className="mb-12 md:mb-16">
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gcf-black tracking-tighter mb-4">
                  Análise de <span className="text-gcf-green">Eficiência</span>
                </h1>
                <p className="text-base sm:text-lg text-gcf-black/40 max-w-2xl font-medium">
                  Compare a tecnologia Cropfield com referências de mercado através de dados técnicos e comerciais precisos.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start relative">
                <div className="hidden lg:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 bg-gcf-offwhite p-4 rounded-full shadow-xl border border-gcf-black/5 text-gcf-black/20 font-black text-2xl tracking-tighter">
                  VS
                </div>

                {renderProductColumn('Cropfield', cropData, cropCalculated, false)}
                {renderProductColumn('Concorrente', compData, compCalculated, true)}
              </div>

              <div className="mt-16 md:mt-24">
                <div className="flex items-center gap-4 md:gap-6 mb-10 md:mb-12">
                  <div className="h-px flex-1 bg-gcf-black/10"></div>
                  <div className="flex items-center gap-3 px-4 md:px-6 py-2 bg-white border border-gcf-black/10 rounded-[14px] shadow-sm">
                    <ArrowRightLeft className="text-gcf-green" size={20} />
                    <h3 className="text-base md:text-lg font-bold text-gcf-black uppercase tracking-tighter">Análise de Diferenças</h3>
                  </div>
                  <div className="h-px flex-1 bg-gcf-black/10"></div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
                  <div className="bg-gcf-green p-8 sm:p-10 rounded-[28px] shadow-2xl shadow-gcf-green/20 flex flex-col items-center text-center relative overflow-hidden group">
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
                          <div className="text-4xl sm:text-5xl md:text-6xl font-bold font-mono mb-6 relative z-10 text-gcf-offwhite tracking-tighter">
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

                  <div className="bg-white p-8 sm:p-10 rounded-[28px] border border-gcf-black/10 shadow-xl shadow-gcf-black/5 flex flex-col items-center text-center group">
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
                          <div
                            className={`text-4xl sm:text-5xl md:text-6xl font-bold font-mono mb-6 tracking-tighter ${
                              isEqual ? 'text-gcf-black' : isSuperior ? 'text-gcf-green' : 'text-gcf-black/60'
                            }`}
                          >
                            {isEqual ? '0%' : `${isSuperior ? '+' : ''}${diffPercent.toFixed(0)}%`}
                          </div>
                          <div
                            className={`flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-bold border uppercase tracking-widest ${
                              isEqual
                                ? 'bg-gcf-black/5 text-gcf-black/40 border-gcf-black/10'
                                : isSuperior
                                  ? 'bg-gcf-green/10 text-gcf-green border-gcf-green/20'
                                  : 'bg-gcf-black/5 text-gcf-black/60 border-gcf-black/10'
                            }`}
                          >
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

                  <div className="bg-white p-8 sm:p-10 rounded-[28px] border border-gcf-black/10 shadow-xl shadow-gcf-black/5 flex flex-col items-center text-center group">
                    <span className="text-[10px] font-bold text-gcf-black/40 uppercase tracking-[0.2em] mb-4">Diferença UFC / mm²</span>
                    {(() => {
                      const cropUfcMm2 = cropCalculated.UFC_ou_conidios_mm2_superficie;
                      const compUfcMm2 = compCalculated.UFC_ou_conidios_mm2_superficie;

                      if (cropUfcMm2.isZero()) {
                        return <div className="text-2xl font-bold font-mono mb-2 text-gcf-black/20">-</div>;
                      }

                      const diffAbs = compUfcMm2.minus(cropUfcMm2);
                      const isEqual = diffAbs.isZero();
                      const isConcorrenteSuperior = diffAbs.gt(0);

                      return (
                        <>
                          <div
                            className={`text-4xl sm:text-5xl md:text-6xl font-bold font-mono mb-6 tracking-tighter ${
                              isEqual ? 'text-gcf-black' : isConcorrenteSuperior ? 'text-gcf-green' : 'text-gcf-black/60'
                            }`}
                          >
                            {isEqual ? '0' : diffAbs.toFixed(0)}
                          </div>
                          <div className="text-[10px] font-bold text-gcf-black/40 uppercase tracking-widest">
                            {isEqual ? 'Sem diferença' : isConcorrenteSuperior ? 'Concorrente superior' : 'Concorrente inferior'}
                          </div>
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
    </div>
  );
}