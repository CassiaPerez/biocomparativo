import React, { useState, useEffect } from 'react';
import {
  Plus,
  ArrowRightLeft,
  Hash,
  Calculator,
  TrendingUp,
  TrendingDown,
  Minus,
  Leaf,
  LayoutDashboard,
  Download,
} from 'lucide-react';
import { Decimal } from 'decimal.js';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// ✅ Logo via PUBLIC (evita erro de import no Bolt/Vite)
// Coloque o arquivo exatamente em: public/gcf_logo.png
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

type SciParts = { mantissa: string; exponent: string };

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
// ✅ "×10" é fixo no UI
// ✅ mantissa e expoente variam
// ✅ preserveUserDisplay = NÃO normaliza (ex.: 10×10^9 NÃO vira 1×10^10)
const ScientificInput = ({
  value,
  onChange,
  onPartsChange,
  preserveUserDisplay = false,
  emitOnSync = true,
  placeholder,
  className,
}: {
  value: string;
  onChange: (val: string) => void;
  onPartsChange?: (mantissa: string, exponent: string) => void;
  preserveUserDisplay?: boolean;
  emitOnSync?: boolean;
  placeholder?: string;
  className?: string;
}) => {
  const [mantissa, setMantissa] = useState('');
  const [exponent, setExponent] = useState('');
  const [status, setStatus] = useState<'default' | 'error' | 'warning'>('default');
  const [message, setMessage] = useState<string>('');
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    // ✅ Se preserveUserDisplay=true: não reescreve mantissa/expoente a partir do "value"
    if (preserveUserDisplay) {
      if (!value && !isDirty) {
        setMantissa('');
        setExponent('');
        setStatus('default');
        setMessage('');
      }
      return;
    }

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
        if (emitOnSync) onPartsChange?.('0', '0');
        return;
      }

      const sciStr = dec.toExponential();
      const [m, e] = sciStr.split('e');
      const exp = (e || '0').replace('+', '');

      setMantissa(m);
      setExponent(exp);

      if (emitOnSync) onPartsChange?.(m, exp);

      setStatus('default');
      setMessage('');
    } catch (_) {
      setStatus('error');
      setMessage('Número inválido');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, preserveUserDisplay, isDirty, emitOnSync]);

  const validateAndNotify = (m: string, e: string) => {
    if (m === '' || m === '-') {
      setStatus('default');
      setMessage('');
      onPartsChange?.(m, e);
      return;
    }

    try {
      if (isNaN(Number(m.replace(',', '.')))) throw new Error();
      if (e !== '' && e !== '-' && isNaN(Number(e))) throw new Error();

      const safeM = m.replace(',', '.');
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

      onPartsChange?.(m, e);
      onChange(val.toString());
    } catch (_) {
      setStatus('error');
      setMessage('Número inválido');
      onPartsChange?.(m, e);
    }
  };

  const handleMantissaChange = (ev: React.ChangeEvent<HTMLInputElement>) => {
    setIsDirty(true);
    const newM = ev.target.value;
    setMantissa(newM);
    validateAndNotify(newM, exponent);
  };

  const handleExponentChange = (ev: React.ChangeEvent<HTMLInputElement>) => {
    setIsDirty(true);
    const newE = ev.target.value;
    setExponent(newE);
    validateAndNotify(mantissa, newE);
  };

  const handleBlur = () => setIsDirty(false);

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
            onBlur={handleBlur}
            className={`w-full text-3xl sm:text-4xl font-bold text-right outline-none bg-transparent tracking-tighter ${
              status === 'error' ? 'text-gcf-black/60' : 'text-gcf-black'
            } placeholder-gcf-black/20`}
            placeholder={placeholder ?? '0'}
            inputMode="decimal"
          />
        </div>

        {/* ✅ fixo */}
        <div className="mx-3 text-2xl text-gcf-black/30 font-serif italic select-none pb-1">× 10</div>

        <div className="relative -top-4">
          <input
            type="text"
            value={exponent}
            onChange={handleExponentChange}
            onBlur={handleBlur}
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

// ✅ UFC/ha automático: somente leitura com notação científica (mantissa + expoente)
const ScientificReadOnly = ({
  value,
  className,
  accent = false,
}: {
  value: Decimal;
  className?: string;
  accent?: boolean;
}) => {
  const isZero = !value || (value as any).isNaN?.() || value.isZero();

  const getParts = () => {
    try {
      if (isZero) return { m: '0', e: '0' };
      const [mRaw, eRaw = '0'] = value.toExponential(2).split('e');
      const m = mRaw.replace(/(\.[0-9]*?)0+$/, '$1').replace(/\.$/, '').replace('.', ',');
      const e = (eRaw || '0').replace('+', '').replace(/^0+(?=\d)/, '') || '0';
      return { m, e };
    } catch {
      return { m: '0', e: '0' };
    }
  };

  const { m, e } = getParts();

  return (
    <div
      className={`group flex items-center border rounded-[14px] px-4 py-4 transition-all shadow-sm ${
        accent ? 'bg-gcf-green/5 border-gcf-green/20' : 'bg-gcf-black/5 border-gcf-black/10'
      } ${className ?? ''}`}
    >
      <div className="flex-1 min-w-[80px] text-right">
        <div className={`text-3xl sm:text-4xl font-bold tracking-tighter ${accent ? 'text-gcf-green' : 'text-gcf-black'}`}>
          {m}
        </div>
      </div>
      <div className="mx-3 text-2xl text-gcf-black/30 font-serif italic select-none pb-1">× 10</div>
      <div className="relative -top-4">
        <div
          className={`w-20 sm:w-24 text-xl sm:text-2xl font-bold border rounded-[12px] text-center py-1.5 shadow-sm ${
            accent ? 'bg-gcf-green/5 border-gcf-green/20 text-gcf-green' : 'bg-gcf-black/5 border-gcf-black/10 text-gcf-black/60'
          }`}
        >
          {e}
        </div>
      </div>
    </div>
  );
};

// Component for displaying large numbers with toggle (UI only)
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
      const [m, e] = exponential.split('e');
      return (
        <span className="inline-flex items-baseline">
          <span className="text-3xl font-bold tracking-tighter">{m.replace('.', ',')}</span>
          <span className="mx-2 text-xl text-gcf-black/20 font-serif italic">× 10</span>
          <sup className="text-xl font-bold text-gcf-green -top-2 relative">{e.replace('+', '')}</sup>
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

  // ✅ guarda exatamente o “manual” para o PDF (somente CONCENTRAÇÃO)
  const [cropConcParts, setCropConcParts] = useState<SciParts>({ mantissa: '', exponent: '' });
  const [compConcParts, setCompConcParts] = useState<SciParts>({ mantissa: '', exponent: '' });

  const calculate = (data: BiologicoRecord): CalculatedValues => {
    try {
      const conc = new Decimal(data.Concentracao_por_ml_ou_g || 0);
      const dose = new Decimal(data.Dose_ha_ml_ou_g || 0);
      const custo = new Decimal(data['Custo_R$_por_L_ou_kg'] || 0);

      // ✅ UFC/ha automático = Concentração × Dose
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
    setCropConcParts({ mantissa: '', exponent: '' });
    setCompConcParts({ mantissa: '', exponent: '' });
  };

  const downloadReportPdf = () => {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });

    const now = new Date();
    const dt = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(now);

    const safeDec = (raw: string) => {
      try {
        if (!raw) return null;
        const d = new Decimal(raw);
        if ((d as any).isNaN?.()) return null;
        return d;
      } catch {
        return null;
      }
    };

    // ✅ token interno estável (para desenhar como "2x10⁹" no PDF)
    // Decimal -> "2x10^9"
    const toSciToken = (d: Decimal, mantissaDigits = 1) => {
      try {
        if (!d || (d as any).isNaN?.()) return '0x10^0';
        if (d.isZero()) return '0x10^0';

        const sci = d.toExponential(mantissaDigits);
        const [mRaw, eRaw = '0'] = sci.split('e');
        const m = mRaw.replace(/\.0+$/, '').replace(/(\.[0-9]*?)0+$/, '$1');
        const e = (eRaw || '0').replace('+', '').replace(/^0+(?=\d)/, '') || '0';
        return `${m}x10^${e}`;
      } catch {
        return '0x10^0';
      }
    };

    // ✅ concentração manual -> token interno
    const partsToToken = (parts: SciParts, fallback?: Decimal | null) => {
      const m = (parts.mantissa ?? '').trim();
      const e = (parts.exponent ?? '').trim();

      if (m && m !== '-') {
        const mant = m.replace(',', '.');
        const exp = e === '' || e === '-' ? '0' : e.replace('+', '').trim();
        return `${mant}x10^${exp}`;
      }

      if (fallback && !(fallback as any).isNaN?.() && !fallback.isZero()) return toSciToken(fallback, 1);
      return '-';
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

    // ✅ variação do concorrente vs cropfield: (concorrente - cropfield) / cropfield * 100
    // → fica NEGATIVO quando concorrente é inferior (ex.: -96%)
    const pctConcVsCrop = (crop: Decimal, comp: Decimal) => {
      try {
        if (!crop || (crop as any).isNaN?.()) return null;
        if (crop.isZero()) return null;
        return comp.minus(crop).dividedBy(crop).times(100);
      } catch {
        return null;
      }
    };

    const fmtPctSigned = (p: Decimal | null) => {
      if (!p) return '-';
      const v = p.toDecimalPlaces(0);
      const n = v.toNumber();
      if (n === 0) return '0%';
      return `${n > 0 ? '+' : ''}${v.toFixed(0)}%`;
    };

    // ✅ desenhar como "2x10⁹" (expoente elevado uma única vez)
    type CellSci = { m: string; e: string };

    const didParseSciCell = (data: any) => {
      const raw = String(data.cell?.text?.[0] ?? '').trim();

      // aceita "2x10^9" (token interno)
      const match = raw.match(/^([+-]?\d+(?:[.,]\d+)?)x10\^([+-]?\d+)\s*$/i);
      if (!match) return;

      const m = match[1];
      const e = match[2];

      // ✅ impede o autoTable de desenhar o texto original
      data.cell.text = [''];
      (data.cell as any)._gcfSci = { m, e } as CellSci;
    };

    const didDrawSciCell = (data: any) => {
      const sci: CellSci | undefined = (data.cell as any)?._gcfSci;
      if (!sci) return;

      const { m, e } = sci;

      // respeita a cor do texto da célula
      const tc = data.cell.styles?.textColor;
      if (Array.isArray(tc)) doc.setTextColor(tc[0], tc[1], tc[2]);
      else doc.setTextColor(0, 0, 0);

      const paddingLeft = data.cell.padding('left');

      const x = data.cell.x + paddingLeft;
      const y = data.cell.y + data.cell.height / 2;

      const baseFont = 10;
      const expFont = 7;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(baseFont);

      // ✅ base SEM espaço: "2x10"
      const baseText = `${m}x10`;
      doc.text(baseText, x, y, { baseline: 'middle' } as any);

      const baseW = doc.getTextWidth(baseText);

      // ✅ expoente elevado: vira visualmente "⁹"
      doc.setFontSize(expFont);
      doc.text(e, x + baseW + 1.5, y - 6, { baseline: 'middle' } as any);

      doc.setFontSize(baseFont);
      doc.setTextColor(0, 0, 0);
    };

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('Relatório — Comparativo de Biológicos', 40, 48);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Gerado em: ${dt}`, 40, 66);

    doc.setDrawColor(41, 44, 45);
    doc.setLineWidth(0.5);
    doc.line(40, 78, 555, 78);

    // ✅ Concentração no PDF = exatamente preenchido (mantissa + expoente)
    const cropConcPdf = partsToToken(cropConcParts, safeDec(cropData.Concentracao_por_ml_ou_g));
    const compConcPdf = partsToToken(compConcParts, safeDec(compData.Concentracao_por_ml_ou_g));

    autoTable(doc, {
      startY: 92,
      head: [['Campo', 'Cropfield', 'Concorrente']],
      body: [
        ['Produto', cropData.Produto || '-', compData.Produto || '-'],
        ['Concentração (UFC/mL ou g)', cropConcPdf, compConcPdf],
        ['Dose (mL ou g/ha)', cropData.Dose_ha_ml_ou_g || '-', compData.Dose_ha_ml_ou_g || '-'],
        ['Custo (R$/L ou kg)', cropData['Custo_R$_por_L_ou_kg'] || '-', compData['Custo_R$_por_L_ou_kg'] || '-'],
      ],
      styles: { fontSize: 10, cellPadding: 6 },
      headStyles: { fillColor: [41, 44, 45], textColor: [252, 250, 240] },
      theme: 'grid',
      didParseCell: didParseSciCell,
      didDrawCell: didDrawSciCell,
    });

    const yAfterInputs = (doc as any).lastAutoTable.finalY + 18;

    // ✅ UFC/ha automático no PDF: sempre do cálculo (Concentração × Dose)
    const cropUfcPdf = toSciToken(cropCalculated.UFC_ou_conidios_ha, 2);
    const compUfcPdf = toSciToken(compCalculated.UFC_ou_conidios_ha, 2);

    autoTable(doc, {
      startY: yAfterInputs,
      head: [['Métrica', 'Cropfield', 'Concorrente']],
      body: [
        ['UFC/ha', cropUfcPdf, compUfcPdf],
        [
          'UFC/mm² (superfície)',
          cropCalculated.UFC_ou_conidios_mm2_superficie.toFixed(2),
          compCalculated.UFC_ou_conidios_mm2_superficie.toFixed(2),
        ],
        ['Custo/ha', fmtMoney(cropCalculated['Custo_R$_por_ha']), fmtMoney(compCalculated['Custo_R$_por_ha'])],
      ],
      styles: { fontSize: 10, cellPadding: 6 },
      headStyles: { fillColor: [0, 178, 98], textColor: [252, 250, 240] },
      theme: 'grid',
      didParseCell: didParseSciCell,
      didDrawCell: didDrawSciCell,
    });

    const yAfterResults = (doc as any).lastAutoTable.finalY + 18;

    const diffMm2Abs = compCalculated.UFC_ou_conidios_mm2_superficie.minus(cropCalculated.UFC_ou_conidios_mm2_superficie);

    // ✅ percentuais com sinal (negativo quando concorrente é inferior)
    const reducUfc = pctConcVsCrop(cropCalculated.UFC_ou_conidios_ha, compCalculated.UFC_ou_conidios_ha);
    const reducCusto = pctConcVsCrop(cropCalculated['Custo_R$_por_ha'], compCalculated['Custo_R$_por_ha']);

    autoTable(doc, {
      startY: yAfterResults,
      head: [['Análise Técnica/Comercial do Concorrente', 'Valor']],
      body: [
        ['Redução (%) UFC/ha', fmtPctSigned(reducUfc)],
        ['Redução (%) Custo/ha', fmtPctSigned(reducCusto)],
        // ✅ NÃO incluir custo/ha(abs) e UFC/ha(abs) (removidos conforme pedido)
        ['UFC/mm² (abs)', diffMm2Abs.toFixed(0)],
      ],
      styles: { fontSize: 10, cellPadding: 6 },
      headStyles: { fillColor: [41, 44, 45], textColor: [252, 250, 240] },
      theme: 'grid',
      didParseCell: didParseSciCell,
      didDrawCell: didDrawSciCell,
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

                {/* ✅ NÃO normaliza o que foi digitado */}
                <ScientificInput
                  value={data.Concentracao_por_ml_ou_g}
                  onChange={(val) =>
                    handleInputChange({ target: { name: 'Concentracao_por_ml_ou_g', value: val } }, isCompetitor)
                  }
                  onPartsChange={(m, e) => {
                    if (isCompetitor) setCompConcParts({ mantissa: m, exponent: e });
                    else setCropConcParts({ mantissa: m, exponent: e });
                  }}
                  preserveUserDisplay
                  emitOnSync={false}
                  className="w-full font-mono text-gcf-black"
                  placeholder="Ex: 2"
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

          <div className="space-y-8">
            <div className="flex flex-col space-y-3">
              <div className="flex justify-between items-center px-1">
                <span className="text-[10px] font-bold text-gcf-black/40 uppercase tracking-[0.2em]">UFC ou Conídios / ha</span>
                <span className="text-[9px] font-bold bg-gcf-black/5 text-gcf-black/60 px-2 py-0.5 rounded-full border border-gcf-black/10 uppercase tracking-widest">
                  Automático
                </span>
              </div>

              {/* ✅ AUTOMÁTICO (somente leitura): Concentração × Dose */}
              <ScientificReadOnly value={calculated.UFC_ou_conidios_ha} accent={isCropfield} />

              <div className="px-1 space-y-1">
                <p className="text-[9px] text-gcf-black/40 font-bold uppercase tracking-widest">Fórmula: Concentração × Dose</p>
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
                <BigNumberDisplay
                  value={calculated.UFC_ou_conidios_mm2_superficie}
                  colorClass={isCropfield ? 'text-gcf-green' : 'text-gcf-black'}
                />
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
              <div
                className={`p-6 rounded-[14px] shadow-lg ${
                  isCropfield ? 'bg-gcf-green shadow-gcf-green/20' : 'bg-gcf-black shadow-gcf-black/20'
                }`}
              >
                <div className="text-3xl font-bold font-mono text-gcf-offwhite tracking-tighter">
                  <span className="text-gcf-offwhite/50 text-sm mr-2">R$</span>
                  {calculated['Custo_R$_por_ha'].toFixed(2).replace('.', ',')}
                </div>
                <p className="text-[9px] text-gcf-offwhite/50 mt-3 font-bold uppercase tracking-widest">
                  Fórmula: (Dose × Custo) ÷ 1.000
                </p>
              </div>
            </div>

            {/* botão invisível para “reset” opcional (sem mexer no layout) */}
            <button type="button" onClick={clearAll} className="hidden" aria-hidden="true" tabIndex={-1}>
              reset
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ✅ inicia recolhida
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gcf-offwhite font-sans text-gcf-black flex overflow-hidden relative">
      {/* Backdrop (mobile) */}
      {isSidebarOpen && (
        <button
          type="button"
          aria-label="Fechar menu"
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`bg-gcf-black text-gcf-offwhite transition-all duration-300 flex flex-col z-50
        fixed lg:static inset-y-0 left-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        ${isSidebarOpen ? 'w-72 lg:w-64' : 'w-72 lg:w-20'}
        `}
      >
        <div className="h-20 flex items-center px-6 border-b border-white/5">
          <div className="flex items-center gap-3 overflow-hidden">
            {isSidebarOpen ? (
              <img src={gcfLogo} alt="GCF Logo" className="h-9 w-auto invert brightness-200" draggable={false} />
            ) : (
              <div className="bg-gcf-green p-2 rounded-[10px] text-gcf-offwhite shrink-0">
                <Leaf size={20} />
              </div>
            )}
          </div>
        </div>

        <nav className="flex-1 py-6 px-4 space-y-2">
          {[{ icon: LayoutDashboard, label: 'Comparativo', active: true }].map((item, idx) => (
            <button
              key={idx}
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-[12px] transition-all group ${
                item.active
                  ? 'bg-gcf-green text-gcf-offwhite shadow-lg shadow-gcf-green/20'
                  : 'text-gcf-offwhite/60 hover:bg-white/5 hover:text-gcf-offwhite'
              }`}
              type="button"
            >
              <item.icon
                size={20}
                className={item.active ? 'text-gcf-offwhite' : 'text-gcf-offwhite/40 group-hover:text-gcf-offwhite'}
              />
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
        <header className="bg-white border-b border-[rgba(41,44,45,0.12)] flex items-center justify-between px-4 md:px-8 z-40 h-auto md:h-20 py-3 md:py-0 gap-3 flex-wrap">
          <div className="flex items-center gap-3 md:gap-6">
            {/* Menu (mobile) */}
            <button
              type="button"
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden w-10 h-10 rounded-[12px] bg-gcf-black/5 hover:bg-gcf-black/10 flex items-center justify-center"
              aria-label="Abrir menu"
              title="Menu"
            >
              <Plus size={18} />
            </button>

            <img src={gcfLogo} alt="GCF Logo" className="h-8 hidden md:block w-auto" draggable={false} />
            <div className="h-8 w-px bg-gcf-black/10 hidden md:block"></div>
            <div className="flex items-center gap-4">
              <h2 className="font-bold text-gcf-black tracking-tight">Comparativo de Biológicos</h2>
              <span className="px-2 py-1 bg-gcf-green/10 text-gcf-green text-[10px] font-bold rounded-full uppercase tracking-widest">
                v2.0
              </span>
            </div>
          </div>

          {/* ✅ apenas 1 botão no header (download) */}
          <div className="flex items-center gap-2 md:gap-6 flex-wrap justify-end">
            <button
              onClick={downloadReportPdf}
              className="btn-secondary !py-2 !px-4 !text-xs uppercase tracking-widest"
              type="button"
              title="Baixar relatório em PDF"
            >
              <Download size={14} />
              <span className="hidden sm:inline">Baixar PDF</span>
            </button>
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
                  <span className="text-[10px] font-bold text-gcf-offwhite/60 uppercase tracking-[0.2em] mb-4 relative z-10">
                    Diferença Custo / ha
                  </span>
                  {(() => {
                    const cropCusto = cropCalculated['Custo_R$_por_ha'];
                    const compCusto = compCalculated['Custo_R$_por_ha'];

                    if (cropCusto.isZero()) {
                      return (
                        <div className="text-2xl font-bold font-mono mb-2 text-gcf-offwhite/40 relative z-10">-</div>
                      );
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
                  <span className="text-[10px] font-bold text-gcf-black/40 uppercase tracking-[0.2em] mb-4">
                    Diferença UFC / ha
                  </span>
                  {(() => {
                    const cropUfc = cropCalculated.UFC_ou_conidios_ha;
                    const compUfc = compCalculated.UFC_ou_conidios_ha;

                    if (cropUfc.isZero()) {
                      return <div className="text-2xl font-bold font-mono mb-2 text-gcf-black/20">-</div>;
                    }

                    const reducPercent = cropUfc.minus(compUfc).dividedBy(cropUfc).times(100);
                    const isEqual = reducPercent.isZero();
                    const isConcorrenteInferior = reducPercent.gt(0);

                    return (
                      <>
                        <div
                          className={`text-4xl sm:text-5xl md:text-6xl font-bold font-mono mb-6 tracking-tighter ${
                            isEqual
                              ? 'text-gcf-black'
                              : isConcorrenteInferior
                                ? 'text-gcf-green'
                                : 'text-gcf-black/60'
                          }`}
                        >
                          {isEqual ? '0%' : `${reducPercent.abs().toFixed(0)}%`}
                        </div>
                        <div
                          className={`flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-bold border uppercase tracking-widest ${
                            isEqual
                              ? 'bg-gcf-black/5 text-gcf-black/40 border-gcf-black/10'
                              : isConcorrenteInferior
                                ? 'bg-gcf-green/10 text-gcf-green border-gcf-green/20'
                                : 'bg-gcf-black/5 text-gcf-black/60 border-gcf-black/10'
                          }`}
                        >
                          {isEqual ? (
                            <span>Mesma concentração</span>
                          ) : isConcorrenteInferior ? (
                            <>
                              <TrendingDown size={14} />
                              <span>Concorrente inferior</span>
                            </>
                          ) : (
                            <>
                              <TrendingUp size={14} />
                              <span>Concorrente superior</span>
                            </>
                          )}
                        </div>
                      </>
                    );
                  })()}
                </div>

                <div className="bg-white p-8 sm:p-10 rounded-[28px] border border-gcf-black/10 shadow-xl shadow-gcf-black/5 flex flex-col items-center text-center group">
                  <span className="text-[10px] font-bold text-gcf-black/40 uppercase tracking-[0.2em] mb-4">
                    Diferença UFC / mm²
                  </span>
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
                            isEqual
                              ? 'text-gcf-black'
                              : isConcorrenteSuperior
                                ? 'text-gcf-green'
                                : 'text-gcf-black/60'
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
  );
}