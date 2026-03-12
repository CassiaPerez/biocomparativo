import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Settings,
} from 'lucide-react';
import { Decimal } from 'decimal.js';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase, supabaseEnabled } from '../lib/supabase';
import type { Produto } from '../types/database';

// ✅ Logo via PUBLIC
// Coloque o arquivo exatamente em: public/gcf_logo.png
const gcfLogo = '/gcf_logo.png';

// Types
interface BiologicoRecord {
  Produto: string;
  Concentracao_por_ml_ou_g: string;
  Dose_ha_ml_ou_g: string;
  'Custo_R$_por_L_ou_kg': string;
}

interface ProductOption {
  nome: string;
  concentracaoLabel: string;
  concentracaoValor: string;
  mantissa: string;
  exponent: string;
}

interface CalculatedValues {
  UFC_ou_conidios_ha: Decimal;
  UFC_ou_conidios_mm2_superficie: Decimal;
  'Custo_R$_por_ha': Decimal;
}

type SciParts = { mantissa: string; exponent: string };

interface Composicao {
  id: string;
  mantissa: string;
  exponent: string;
  valor: string;
}

interface Microrganismo {
  id: string;
  composicoes: Composicao[];
  custo: string;
  concentracaoTotal: string;
}

interface ReportContactData {
  nomeCliente: string;
  nomeVendedor: string;
  telefoneVendedor: string;
}

interface ReportLocationData {
  latitude: number | null;
  longitude: number | null;
  precisao: number | null;
  capturadoEm: string;
}

type CompetitorConcentrationUnit = '' | 'ml' | 'l';

const INITIAL_STATE_CROPFIELD: BiologicoRecord = {
  Produto: '',
  Concentracao_por_ml_ou_g: '',
  Dose_ha_ml_ou_g: '',
  'Custo_R$_por_L_ou_kg': '',
};

const INITIAL_STATE_CONCORRENTE: BiologicoRecord = {
  Produto: '',
  Concentracao_por_ml_ou_g: '',
  Dose_ha_ml_ou_g: '',
  'Custo_R$_por_L_ou_kg': '',
};

const INITIAL_CALCULATED: CalculatedValues = {
  UFC_ou_conidios_ha: new Decimal(0),
  UFC_ou_conidios_mm2_superficie: new Decimal(0),
  'Custo_R$_por_ha': new Decimal(0),
};


// Scientific input
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
    } catch {
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
    } catch {
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

export default function Comparativo() {
  const navigate = useNavigate();
  const [cropData, setCropData] = useState<BiologicoRecord>(INITIAL_STATE_CROPFIELD);
  const [cropCalculated, setCropCalculated] = useState<CalculatedValues>(INITIAL_CALCULATED);

  const [compData, setCompData] = useState<BiologicoRecord>(INITIAL_STATE_CONCORRENTE);
  const [compCalculated, setCompCalculated] = useState<CalculatedValues>(INITIAL_CALCULATED);

  const [cropConcParts, setCropConcParts] = useState<SciParts>({ mantissa: '', exponent: '' });
  const [compConcParts, setCompConcParts] = useState<SciParts>({ mantissa: '', exponent: '' });

  const [quantidadeMicrorganismos, setQuantidadeMicrorganismos] = useState<number>(1);
  const [competitorMicrorganismos, setCompetitorMicrorganismos] = useState<Microrganismo[]>([
    {
      id: '1',
      composicoes: [{ id: '1', mantissa: '', exponent: '', valor: '' }],
      custo: '',
      concentracaoTotal: '',
    }
  ]);

  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportContactData, setReportContactData] = useState<ReportContactData>({
    nomeCliente: '',
    nomeVendedor: '',
    telefoneVendedor: '',
  });
  const [competitorConcentrationUnit, setCompetitorConcentrationUnit] = useState<CompetitorConcentrationUnit>('');
  const [isSavingReport, setIsSavingReport] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [cropfieldProducts, setCropfieldProducts] = useState<ProductOption[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    if (!supabaseEnabled || !supabase) {
      setLoadingProducts(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('produtos')
        .select('*')
        .eq('ativo', true)
        .order('ordem', { ascending: true });

      if (error) throw error;

      const products: ProductOption[] = (data || []).map((p: Produto) => ({
        nome: p.nome,
        concentracaoLabel: p.concentracao_label,
        concentracaoValor: p.concentracao_valor,
        mantissa: p.mantissa,
        exponent: p.exponent,
      }));

      setCropfieldProducts(products);
    } catch (err) {
      console.error('Erro ao carregar produtos:', err);
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleQuantidadeMicrorganismosChange = (newQuantity: number) => {
    setQuantidadeMicrorganismos(newQuantity);

    const currentLength = competitorMicrorganismos.length;

    if (newQuantity > currentLength) {
      const newMicros: Microrganismo[] = [];
      for (let i = currentLength; i < newQuantity; i++) {
        newMicros.push({
          id: (i + 1).toString(),
          composicoes: [{ id: '1', mantissa: '', exponent: '', valor: '' }],
          custo: '',
          concentracaoTotal: '',
        });
      }
      setCompetitorMicrorganismos([...competitorMicrorganismos, ...newMicros]);
    } else if (newQuantity < currentLength) {
      setCompetitorMicrorganismos(competitorMicrorganismos.slice(0, newQuantity));
    }
  };

  const updateMicrorganismo = (microId: string, field: 'custo', value: string) => {
    setCompetitorMicrorganismos(prev => prev.map(micro =>
      micro.id === microId ? { ...micro, [field]: value } : micro
    ));
  };

  const addComposicao = (microId: string) => {
    setCompetitorMicrorganismos(prev => prev.map(micro => {
      if (micro.id !== microId) return micro;

      const newCompId = (Math.max(...micro.composicoes.map(c => parseInt(c.id)), 0) + 1).toString();
      return {
        ...micro,
        composicoes: [...micro.composicoes, { id: newCompId, mantissa: '', exponent: '', valor: '' }]
      };
    }));
  };

  const removeComposicao = (microId: string, compId: string) => {
    setCompetitorMicrorganismos(prev => prev.map(micro => {
      if (micro.id !== microId) return micro;
      if (micro.composicoes.length <= 1) return micro;

      return {
        ...micro,
        composicoes: micro.composicoes.filter(c => c.id !== compId)
      };
    }));
  };

  const updateComposicao = (microId: string, compId: string, field: 'mantissa' | 'exponent', value: string) => {
    setCompetitorMicrorganismos(prev => prev.map(micro => {
      if (micro.id !== microId) return micro;

      const updatedComposicoes = micro.composicoes.map(comp => {
        if (comp.id !== compId) return comp;

        const updated = { ...comp, [field]: value };

        if (updated.mantissa && updated.exponent) {
          const mantissaNumber = updated.mantissa.replace(',', '.');
          const scientificValue = `${mantissaNumber}e${updated.exponent}`;
          updated.valor = scientificValue;
        } else {
          updated.valor = '';
        }

        return updated;
      });

      let concentracaoTotal = '';
      try {
        let sum = new Decimal(0);
        for (const comp of updatedComposicoes) {
          if (comp.valor) {
            const valor = new Decimal(comp.valor);
            const convertedValue = competitorConcentrationUnit === 'l'
              ? valor.dividedBy(1000)
              : valor;
            sum = sum.plus(convertedValue);
          }
        }
        concentracaoTotal = sum.isZero() ? '' : sum.toString();
      } catch {
        concentracaoTotal = '';
      }

      return {
        ...micro,
        composicoes: updatedComposicoes,
        concentracaoTotal,
      };
    }));
  };

  useEffect(() => {
    try {
      let totalConcentracao = new Decimal(0);
      let totalDose = new Decimal(0);
      let totalCusto = new Decimal(0);
      let totalUFCHa = new Decimal(0);

      for (const micro of competitorMicrorganismos) {
        if (micro.concentracaoTotal && micro.dose) {
          const conc = new Decimal(micro.concentracaoTotal);
          const dose = new Decimal(micro.dose || 0);
          const custo = new Decimal(micro.custo || 0);

          const ufcHa = conc.times(dose);
          totalUFCHa = totalUFCHa.plus(ufcHa);

          totalDose = totalDose.plus(dose);
          totalCusto = totalCusto.plus(custo);
        }
      }

      const concentracaoMedia = totalDose.isZero() ? new Decimal(0) : totalUFCHa.dividedBy(totalDose);

      setCompData(prev => ({
        ...prev,
        Concentracao_por_ml_ou_g: concentracaoMedia.toString(),
        Dose_ha_ml_ou_g: totalDose.toString(),
        'Custo_R$_por_L_ou_kg': totalCusto.toString(),
      }));

      if (!concentracaoMedia.isZero()) {
        const sciStr = concentracaoMedia.toExponential();
        const [m, e] = sciStr.split('e');
        const exp = (e || '0').replace('+', '');
        setCompConcParts({ mantissa: m, exponent: exp });
      } else {
        setCompConcParts({ mantissa: '', exponent: '' });
      }
    } catch (error) {
      console.error('Erro ao calcular totais:', error);
    }
  }, [competitorMicrorganismos, competitorConcentrationUnit]);

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
    } catch {
      return INITIAL_CALCULATED;
    }
  };

  useEffect(() => {
    setCropCalculated(calculate(cropData));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cropData.Concentracao_por_ml_ou_g, cropData.Dose_ha_ml_ou_g, cropData['Custo_R$_por_L_ou_kg']]);

  useEffect(() => {
    if (!competitorConcentrationUnit) {
      setCompCalculated(INITIAL_CALCULATED);
      return;
    }

    setCompCalculated(calculate(compData));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [competitorConcentrationUnit, compData.Concentracao_por_ml_ou_g, compData.Dose_ha_ml_ou_g, compData['Custo_R$_por_L_ou_kg']]);

  const sciPartsToValue = (parts: SciParts) => {
    const mantissa = parts.mantissa.replace(',', '.').trim();
    const exponent = parts.exponent.trim();

    if (!mantissa || mantissa === '-' || !exponent || exponent === '-') return '';
    return `${mantissa}e${exponent}`;
  };

  const convertCompetitorConcentrationToMl = (value: string, unit: CompetitorConcentrationUnit) => {
    if (!value) return '';

    try {
      const decimalValue = new Decimal(value);
      return unit === 'l' ? decimalValue.dividedBy(1000).toString() : decimalValue.toString();
    } catch {
      return value;
    }
  };

  const handleCompetitorConcentrationUnitChange = (unit: CompetitorConcentrationUnit) => {
    setCompetitorConcentrationUnit(unit);
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement> | { target: { name: string; value: string } },
    isCompetitor = false
  ) => {
    const { name, value } = e.target;
    const setter = isCompetitor ? setCompData : setCropData;

    const normalizedValue =
      isCompetitor && name === 'Concentracao_por_ml_ou_g'
        ? competitorConcentrationUnit
          ? convertCompetitorConcentrationToMl(value, competitorConcentrationUnit)
          : value
        : value;

    setter((prev) => ({
      ...prev,
      [name]: normalizedValue,
    }));
  };

  const competitorUnitMissing = !competitorConcentrationUnit;

  const handleCropfieldProductSelect = (productName: string) => {
    const selectedProduct = cropfieldProducts.find((item) => item.nome === productName);

    if (!selectedProduct) {
      setCropData((prev) => ({
        ...prev,
        Produto: '',
        Concentracao_por_ml_ou_g: '',
      }));
      setCropConcParts({ mantissa: '', exponent: '' });
      return;
    }

    setCropData((prev) => ({
      ...prev,
      Produto: selectedProduct.nome,
      Concentracao_por_ml_ou_g: selectedProduct.concentracaoValor,
    }));
    setCropConcParts({ mantissa: selectedProduct.mantissa, exponent: selectedProduct.exponent });
  };

  const clearAll = () => {
    setCropData(INITIAL_STATE_CROPFIELD);
    setCompData(INITIAL_STATE_CONCORRENTE);
    setCropConcParts({ mantissa: '', exponent: '' });
    setCompConcParts({ mantissa: '', exponent: '' });
    setCompetitorConcentrationUnit('');
    setQuantidadeMicrorganismos(1);
    setCompetitorMicrorganismos([{
      id: '1',
      composicoes: [{ id: '1', mantissa: '', exponent: '', valor: '' }],
      custo: '',
      concentracaoTotal: '',
    }]);
  };

  const openReportModal = () => setIsReportModalOpen(true);
  const closeReportModal = () => setIsReportModalOpen(false);

  const handleReportFieldChange = (field: keyof ReportContactData, value: string) => {
    setReportContactData((prev) => ({ ...prev, [field]: value }));
  };

  const reportFieldsMissing =
    !reportContactData.nomeCliente.trim() ||
    !reportContactData.nomeVendedor.trim() ||
    !reportContactData.telefoneVendedor.trim();

  const salvarRelatorioNoBanco = async (
    reportData: ReportContactData,
    reportLocation: ReportLocationData | null,
    nomePdf: string
  ) => {
    if (!supabaseEnabled || !supabase) {
      console.warn('Supabase não configurado. O PDF será gerado sem salvar no banco.');
      return;
    }

    const { error } = await supabase.from('relatorio_downloads').insert([
      {
        nome_cliente: reportData.nomeCliente.trim(),
        nome_vendedor: reportData.nomeVendedor.trim(),
        telefone_vendedor: reportData.telefoneVendedor.trim(),
        produto_cropfield: cropData.Produto?.trim() || null,
        produto_concorrente: compData.Produto?.trim() || null,
        latitude: reportLocation?.latitude ?? null,
        longitude: reportLocation?.longitude ?? null,
        precisao_localizacao: reportLocation?.precisao ?? null,
        navegador: typeof navigator !== 'undefined' ? navigator.userAgent : null,
        nome_pdf: nomePdf,
      },
    ]);

    if (error) throw error;
  };

  const captureReportLocation = async (): Promise<ReportLocationData | null> => {
    if (typeof window === 'undefined' || !('geolocation' in navigator)) return null;

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        });
      });

      return {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        precisao: position.coords.accuracy,
        capturadoEm: new Date().toISOString(),
      };
    } catch {
      return null;
    }
  };

  const handleDownloadWithMetadata = async () => {
    if (reportFieldsMissing) {
      alert('Preencha nome do cliente, nome do vendedor e telefone do vendedor antes de gerar o PDF.');
      return;
    }

    if (competitorUnitMissing) {
      alert('Selecione mL ou L na concentração do concorrente antes de gerar o relatório.');
      return;
    }

    setIsSavingReport(true);

    try {
      const reportLocation = await captureReportLocation();
      const fileName = `relatorio-comparativo-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.pdf`;

      await salvarRelatorioNoBanco(reportContactData, reportLocation, fileName);
      await downloadReportPdf(reportContactData, reportLocation, fileName);
      closeReportModal();
    } catch (error) {
      console.error('Erro ao salvar relatório no banco:', error);
      alert('Não foi possível salvar o relatório no banco de dados. Verifique a configuração do Supabase e a policy de INSERT.');
    } finally {
      setIsSavingReport(false);
    }
  };

  const downloadReportPdf = async (
    reportData: ReportContactData,
    reportLocation?: ReportLocationData | null,
    fileName?: string
  ) => {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });

    const now = new Date();
    const dt = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(now);

    const hiddenLocationMetadata =
      reportLocation?.latitude != null && reportLocation?.longitude != null
        ? `lat:${reportLocation.latitude};lng:${reportLocation.longitude};acc:${reportLocation.precisao ?? 'n/a'};capturadoEm:${reportLocation.capturadoEm}`
        : 'localizacao_nao_disponivel';

    doc.setProperties({
      title: 'Relatório Cropfield',
      subject: `Relatório técnico | ${hiddenLocationMetadata}`,
      author: reportData.nomeVendedor || 'Sistema Cropfield',
      creator: 'Sistema Cropfield',
      keywords: `relatorio,cropfield,${hiddenLocationMetadata}`,
    });

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

    const fmtNumberPt = (d: Decimal | null, decimals = 2) => {
      try {
        if (!d) return '-';
        if ((d as any).isNaN?.()) return '-';
        return d.toFixed(decimals).replace('.', ',');
      } catch {
        return '-';
      }
    };

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

    type CellSci = { m: string; e: string };

    const didParseSciCell = (data: any) => {
      const raw = String(data.cell?.text?.[0] ?? '').trim();
      const match = raw.match(/^([+-]?\d+(?:[.,]\d+)?)x10\^([+-]?\d+)\s*$/i);
      if (!match) return;

      const m = match[1];
      const e = match[2];

      data.cell.text = [''];
      (data.cell as any)._gcfSci = { m, e } as CellSci;
    };

    const didDrawSciCell = (data: any) => {
      const sci: CellSci | undefined = (data.cell as any)?._gcfSci;
      if (!sci) return;

      const tc = data.cell.styles?.textColor;
      if (Array.isArray(tc)) doc.setTextColor(tc[0], tc[1], tc[2]);
      else doc.setTextColor(0, 0, 0);

      const paddingLeft = data.cell.padding('left');
      const x = data.cell.x + paddingLeft;
      const y = data.cell.y + data.cell.height / 2;

      const baseFont = 10;
      const expFont = 7;

      const mDisp = String(sci.m).replace('.', ',');
      const eDisp = String(sci.e);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(baseFont);

      const baseText = `${mDisp}x10`;
      doc.text(baseText, x, y, { baseline: 'middle' } as any);

      const baseW = doc.getTextWidth(baseText);

      doc.setFontSize(expFont);
      doc.text(eDisp, x + baseW + 1.5, y - 6, { baseline: 'middle' } as any);

      doc.setFontSize(baseFont);
      doc.setTextColor(0, 0, 0);
    };

    const calcCostPerUfcMm2 = (custoHa: Decimal, ufcMm2: Decimal) => {
      try {
        if (!ufcMm2 || (ufcMm2 as any).isNaN?.() || ufcMm2.isZero()) return null;
        return custoHa.div(ufcMm2);
      } catch {
        return null;
      }
    };

    const fmtMoneyMicro = (d: Decimal | null, maxDecimals = 12) => {
      try {
        if (!d) return '-';
        if ((d as any).isNaN?.()) return '-';
        const s = d.toFixed(maxDecimals);
        const cleaned = s.replace(/0+$/, '').replace(/\.$/, '');
        return `R$ ${cleaned.replace('.', ',')}`;
      } catch {
        return '-';
      }
    };

    const fmtPhone = (value: string) => {
      const digits = value.replace(/\D/g, '');
      if (digits.length === 11) return digits.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
      if (digits.length === 10) return digits.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
      return value;
    };

    const loadImageAsDataUrl = (src: string) =>
      new Promise<string>((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth || img.width;
            canvas.height = img.naturalHeight || img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              reject(new Error('Falha ao preparar logo'));
              return;
            }
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/png'));
          } catch (error) {
            reject(error);
          }
        };
        img.onerror = () => reject(new Error('Falha ao carregar logo'));
        img.src = src;
      });

    const logoUrl = await loadImageAsDataUrl(gcfLogo).catch(() => null);

    if (logoUrl) {
      doc.addImage(logoUrl, 'PNG', 40, 28, 120, 42, undefined, 'FAST');
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('Relatório — Comparativo de Biológicos', 40, logoUrl ? 88 : 48);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Gerado em: ${dt}`, 40, logoUrl ? 106 : 66);

    autoTable(doc, {
      startY: logoUrl ? 122 : 82,
      theme: 'plain',
      styles: { fontSize: 10, cellPadding: { top: 4, right: 0, bottom: 4, left: 0 }, textColor: [41, 44, 45] },
      columnStyles: { 0: { cellWidth: 120, fontStyle: 'bold' }, 1: { cellWidth: 395 } },
      body: [
        ['Cliente', reportData.nomeCliente.trim() || '-'],
        ['Vendedor', reportData.nomeVendedor.trim() || '-'],
        ['Telefone do vendedor', fmtPhone(reportData.telefoneVendedor.trim()) || '-'],
      ],
    });

    const contactFinalY = (doc as any).lastAutoTable?.finalY ?? (logoUrl ? 122 : 82);

    doc.setDrawColor(41, 44, 45);
    doc.setLineWidth(0.5);
    doc.line(40, contactFinalY + 10, 555, contactFinalY + 10);

    const cropConcPdf = partsToToken(cropConcParts, safeDec(cropData.Concentracao_por_ml_ou_g));
    const compConcPdf = partsToToken(compConcParts, safeDec(compData.Concentracao_por_ml_ou_g));

    autoTable(doc, {
      startY: contactFinalY + 24,
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

    const cropUfcPdf = toSciToken(cropCalculated.UFC_ou_conidios_ha, 2);
    const compUfcPdf = toSciToken(compCalculated.UFC_ou_conidios_ha, 2);

    const cropCostPerUfcMm2 = calcCostPerUfcMm2(cropCalculated['Custo_R$_por_ha'], cropCalculated.UFC_ou_conidios_mm2_superficie);
    const compCostPerUfcMm2 = calcCostPerUfcMm2(compCalculated['Custo_R$_por_ha'], compCalculated.UFC_ou_conidios_mm2_superficie);

    autoTable(doc, {
      startY: yAfterInputs,
      head: [['Métrica', 'Cropfield', 'Concorrente']],
      body: [
        ['UFC/ha', cropUfcPdf, compUfcPdf],
        [
          'UFC/mm² (superfície)',
          fmtNumberPt(cropCalculated.UFC_ou_conidios_mm2_superficie, 2),
          fmtNumberPt(compCalculated.UFC_ou_conidios_mm2_superficie, 2),
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
    const reducUfc = pctConcVsCrop(cropCalculated.UFC_ou_conidios_ha, compCalculated.UFC_ou_conidios_ha);
    const reducCusto = pctConcVsCrop(cropCalculated['Custo_R$_por_ha'], compCalculated['Custo_R$_por_ha']);

    autoTable(doc, {
      startY: yAfterResults,
      head: [['Análise Técnica/Comercial do Concorrente', 'Valor']],
      body: [
        ['Redução (%) UFC/ha', fmtPctSigned(reducUfc)],
        ['Redução (%) Custo/ha', fmtPctSigned(reducCusto)],
        ['UFC/mm² (abs)', diffMm2Abs.toFixed(0)],
        ['Custo por UFC/mm² (Cropfield)', fmtMoneyMicro(cropCostPerUfcMm2)],
        ['Custo por UFC/mm² (Concorrente)', fmtMoneyMicro(compCostPerUfcMm2)],
      ],
      styles: { fontSize: 10, cellPadding: 6 },
      headStyles: { fillColor: [41, 44, 45], textColor: [252, 250, 240] },
      theme: 'grid',
      didParseCell: didParseSciCell,
      didDrawCell: didDrawSciCell,
    });

    const safe = now.toISOString().slice(0, 19).replace(/[:T]/g, '-');
    doc.save(fileName || `relatorio-comparativo-${safe}.pdf`);
  };

  const renderProductColumn = (
    title: string,
    data: BiologicoRecord,
    calculated: CalculatedValues,
    isCompetitor: boolean
  ) => {
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
              {isCropfield ? (
                <select
                  name="Produto"
                  value={data.Produto}
                  onChange={(e) => handleCropfieldProductSelect(e.target.value)}
                  className="input-gcf"
                >
                  <option value="">Selecione um produto</option>
                  {cropfieldProducts.map((product) => (
                    <option key={product.nome} value={product.nome}>
                      {product.nome}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  name="Produto"
                  value={data.Produto}
                  onChange={(e) => handleInputChange(e, isCompetitor)}
                  className="input-gcf"
                  placeholder="Ex: BioControl"
                />
              )}
            </div>

            <div className="grid grid-cols-1 gap-6">
              <div className="space-y-2">
                <label className="label-gcf">Concentração (UFC / mL ou g)</label>

                {isCropfield ? (
                  <div className="input-gcf min-h-[64px] flex items-center justify-between gap-3 bg-gcf-black/[0.02]">
                    <span className={data.Produto ? 'font-semibold text-gcf-black' : 'text-gcf-black/35'}>
                      {data.Produto
                        ? cropfieldProducts.find((product) => product.nome === data.Produto)?.concentracaoLabel ?? '-'
                        : 'Selecione um produto para preencher a concentração'}
                    </span>
                    {data.Produto && (
                      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gcf-green">Automático</span>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <label className="label-gcf">Unidade da concentração</label>
                      <select
                        value={competitorConcentrationUnit}
                        onChange={(e) => handleCompetitorConcentrationUnitChange(e.target.value as CompetitorConcentrationUnit)}
                        className="input-gcf"
                        aria-label="Unidade da concentração do concorrente"
                        title="Selecione se a concentração foi informada em mL ou L"
                      >
                        <option value="">Selecione mL ou L</option>
                        <option value="ml">mL</option>
                        <option value="l">L</option>
                      </select>
                    </div>

                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="label-gcf">Quantidade de Microrganismos</label>
                        <select
                          value={quantidadeMicrorganismos}
                          onChange={(e) => handleQuantidadeMicrorganismosChange(parseInt(e.target.value))}
                          className="input-gcf"
                        >
                          <option value={1}>1 microrganismo</option>
                          <option value={2}>2 microrganismos</option>
                          <option value={3}>3 microrganismos</option>
                          <option value={4}>4 microrganismos</option>
                          <option value={5}>5 microrganismos</option>
                          <option value={6}>6 microrganismos</option>
                          <option value={7}>7 microrganismos</option>
                          <option value={8}>8 microrganismos</option>
                          <option value={9}>9 microrganismos</option>
                          <option value={10}>10 microrganismos</option>
                        </select>
                      </div>

                      {competitorMicrorganismos.map((micro, microIndex) => (
                        <div key={micro.id} className="p-5 bg-gcf-black/5 rounded-[16px] border-2 border-gcf-black/10 space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-gcf-black uppercase tracking-wider">
                              Microrganismo {microIndex + 1}
                            </span>
                          </div>

                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <label className="label-gcf">Composições</label>
                              <button
                                type="button"
                                onClick={() => addComposicao(micro.id)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-gcf-green/10 hover:bg-gcf-green/20 text-gcf-green rounded-[8px] text-xs font-bold uppercase tracking-wider transition-all"
                                title="Adicionar composição"
                              >
                                <Plus size={14} />
                                Adicionar
                              </button>
                            </div>

                            {micro.composicoes.map((comp, compIndex) => (
                              <div key={comp.id} className="p-4 bg-white rounded-[12px] border border-gcf-black/10 space-y-3">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-bold text-gcf-black/60 uppercase tracking-wider">
                                    Composição {compIndex + 1}
                                  </span>
                                  {micro.composicoes.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => removeComposicao(micro.id, comp.id)}
                                      className="p-1 hover:bg-red-100 text-red-600 rounded-[6px] transition-colors"
                                      title="Remover composição"
                                    >
                                      <Minus size={14} />
                                    </button>
                                  )}
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                  <div className="space-y-2">
                                    <label className="label-gcf">Mantissa</label>
                                    <input
                                      type="text"
                                      value={comp.mantissa}
                                      onChange={(e) => updateComposicao(micro.id, comp.id, 'mantissa', e.target.value)}
                                      className="input-gcf font-mono"
                                      placeholder="21"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <label className="label-gcf">Expoente</label>
                                    <input
                                      type="text"
                                      value={comp.exponent}
                                      onChange={(e) => updateComposicao(micro.id, comp.id, 'exponent', e.target.value)}
                                      className="input-gcf font-mono"
                                      placeholder="12"
                                    />
                                  </div>
                                </div>

                                {comp.mantissa && comp.exponent && (
                                  <div className="px-3 py-2 bg-gcf-green/10 rounded-[8px] border border-gcf-green/20">
                                    <p className="text-xs font-mono text-gcf-green">
                                      {comp.mantissa} × 10<sup>{comp.exponent}</sup>
                                    </p>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>

                          {micro.concentracaoTotal && (
                            <div className="space-y-2">
                              <label className="label-gcf">Concentração Total</label>
                              <div className="input-gcf min-h-[64px] flex items-center justify-between gap-3 bg-gcf-black/[0.02]">
                                <span className="font-semibold text-gcf-black font-mono">
                                  {(() => {
                                    try {
                                      const dec = new Decimal(micro.concentracaoTotal);
                                      const [m, e] = dec.toExponential().split('e');
                                      return (
                                        <>
                                          {m} × 10<sup>{(e || '0').replace('+', '')}</sup>
                                        </>
                                      );
                                    } catch {
                                      return '0';
                                    }
                                  })()}
                                </span>
                                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gcf-green">Automático</span>
                              </div>
                            </div>
                          )}

                          <div className="space-y-2">
                            <label className="label-gcf">Custo (R$ / L ou kg)</label>
                            <div className="relative">
                              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gcf-black/40 font-bold text-sm">R$</span>
                              <input
                                type="number"
                                value={micro.custo}
                                onChange={(e) => updateMicrorganismo(micro.id, 'custo', e.target.value)}
                                className="input-gcf pl-10 font-mono"
                                placeholder="200"
                                step="any"
                              />
                            </div>
                          </div>

                          {micro.concentracaoTotal && data.Dose_ha_ml_ou_g && (
                            <div className="space-y-2">
                              <label className="label-gcf">UFC ou Conídios / ha</label>
                              <div className="input-gcf min-h-[64px] flex items-center justify-between gap-3 bg-gcf-black/[0.02]">
                                <span className="font-semibold text-gcf-black font-mono">
                                  {(() => {
                                    try {
                                      const conc = new Decimal(micro.concentracaoTotal);
                                      const dose = new Decimal(data.Dose_ha_ml_ou_g);
                                      const ufcHa = conc.times(dose);
                                      const [m, e] = ufcHa.toExponential(2).split('e');
                                      return (
                                        <>
                                          {m.replace('.', ',')} × 10<sup>{(e || '0').replace('+', '')}</sup>
                                        </>
                                      );
                                    } catch {
                                      return '0';
                                    }
                                  })()}
                                </span>
                                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gcf-green">Automático</span>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    <p className={`text-xs ${competitorUnitMissing ? 'text-red-600 font-semibold' : 'text-gcf-black/60'}`}>
                      {competitorUnitMissing
                        ? 'Selecione mL ou L antes de calcular ou gerar o relatório.'
                        : competitorConcentrationUnit === 'l'
                          ? 'As concentrações informadas por litro são convertidas automaticamente para mL e somadas.'
                          : 'As concentrações informadas já são tratadas como valores por mL e somadas automaticamente.'}
                    </p>
                  </>
                )}
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

            <button type="button" onClick={clearAll} className="hidden" aria-hidden="true" tabIndex={-1}>
              reset
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gcf-offwhite font-sans text-gcf-black flex overflow-hidden relative">
      {isSidebarOpen && (
        <button
          type="button"
          aria-label="Fechar menu"
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
        />
      )}

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

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-[rgba(41,44,45,0.12)] flex items-center justify-between px-4 md:px-8 z-40 h-auto md:h-20 py-3 md:py-0 gap-3 flex-wrap">
          <div className="flex items-center gap-3 md:gap-6">
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

          <div className="flex items-center gap-2 md:gap-3 flex-wrap justify-end">
            <button
              onClick={() => navigate('/admin')}
              className="btn-secondary !py-2 !px-4 !text-xs uppercase tracking-widest"
              type="button"
              title="Acessar painel administrativo"
            >
              <Settings size={14} />
              <span className="hidden sm:inline">Admin</span>
            </button>
            <button
              onClick={openReportModal}
              className="btn-secondary !py-2 !px-4 !text-xs uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
              type="button"
              title={competitorUnitMissing ? 'Selecione mL ou L na concentração do concorrente para liberar o relatório' : 'Baixar relatório em PDF'}
              disabled={competitorUnitMissing}
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

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
                <div className="bg-gcf-green p-8 sm:p-10 rounded-[28px] shadow-2xl shadow-gcf-green/20 flex flex-col items-center text-center relative overflow-hidden group">
                  <div className="absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 bg-white/10 rounded-full blur-3xl transition-all group-hover:scale-150"></div>
                  <span className="text-[10px] font-bold text-gcf-offwhite/60 uppercase tracking-[0.2em] mb-4 relative z-10">
                    Diferença Custo / ha
                  </span>
                  {(() => {
                    const cropCusto = cropCalculated['Custo_R$_por_ha'];
                    const compCusto = compCalculated['Custo_R$_por_ha'];

                    if (!cropCusto || cropCusto.isZero()) {
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
                              <TrendingDown size={14} />
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

                    if (!cropUfc || cropUfc.isZero()) {
                      return <div className="text-2xl font-bold font-mono mb-2 text-gcf-black/20">-</div>;
                    }

                    const reducPercent = cropUfc.minus(compUfc).dividedBy(cropUfc).times(100);
                    const isEqual = reducPercent.isZero();
                    const isConcorrenteInferior = reducPercent.gt(0);

                    return (
                      <>
                        <div
                          className={`text-4xl sm:text-5xl md:text-6xl font-bold font-mono mb-6 tracking-tighter ${
                            isEqual ? 'text-gcf-black' : isConcorrenteInferior ? 'text-gcf-green' : 'text-gcf-black/60'
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
                  <span className="text-[10px] font-bold text-gcf-black/40 uppercase tracking-[0.2em] mb-4">Diferença UFC / mm²</span>
                  {(() => {
                    const cropUfcMm2 = cropCalculated.UFC_ou_conidios_mm2_superficie;
                    const compUfcMm2 = compCalculated.UFC_ou_conidios_mm2_superficie;

                    if (!cropUfcMm2 || cropUfcMm2.isZero()) {
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

                <div className="bg-white p-8 sm:p-10 rounded-[28px] border border-gcf-black/10 shadow-xl shadow-gcf-black/5 flex flex-col items-center text-center group">
                  <span className="text-[10px] font-bold text-gcf-black/40 uppercase tracking-[0.2em] mb-4">Custo por UFC/mm²</span>

                  {(() => {
                    const cropCustoHa = cropCalculated['Custo_R$_por_ha'];
                    const compCustoHa = compCalculated['Custo_R$_por_ha'];

                    const cropUfcMm2 = cropCalculated.UFC_ou_conidios_mm2_superficie;
                    const compUfcMm2 = compCalculated.UFC_ou_conidios_mm2_superficie;

                    if (!cropUfcMm2 || cropUfcMm2.isZero() || !compUfcMm2 || compUfcMm2.isZero()) {
                      return <div className="text-2xl font-bold font-mono mb-2 text-gcf-black/20">-</div>;
                    }

                    const cropRatio = cropCustoHa.div(cropUfcMm2);
                    const compRatio = compCustoHa.div(compUfcMm2);

                    const delta = compRatio.minus(cropRatio);
                    const pct = cropRatio.isZero() ? null : delta.div(cropRatio).times(100);

                    const isEqual = delta.toDecimalPlaces(12).isZero();
                    const isConcorrentePior = delta.gt(0);

                    const fmtMoneyMicroLocal = (d: Decimal) => {
                      try {
                        if (!d || (d as any).isNaN?.()) return '-';
                        const s = d.toFixed(12);
                        const cleaned = s.replace(/0+$/, '').replace(/\.$/, '');
                        return `R$ ${cleaned.replace('.', ',')}`;
                      } catch {
                        return '-';
                      }
                    };

                    const fmtPctSignedLocal = (p: Decimal | null) => {
                      if (!p) return '-';
                      const v = p.toDecimalPlaces(0);
                      const n = v.toNumber();
                      if (n === 0) return '0%';
                      return `${n > 0 ? '+' : ''}${v.toFixed(0)}%`;
                    };

                    return (
                      <>
                        <div className="w-full space-y-3 mb-6">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-[10px] font-bold text-gcf-black/40 uppercase tracking-widest">Cropfield</span>
                            <span className="text-sm font-bold font-mono text-gcf-green">{fmtMoneyMicroLocal(cropRatio)}</span>
                          </div>

                          <div className="flex items-center justify-between gap-3">
                            <span className="text-[10px] font-bold text-gcf-black/40 uppercase tracking-widest">Concorrente</span>
                            <span className="text-sm font-bold font-mono text-gcf-black">{fmtMoneyMicroLocal(compRatio)}</span>
                          </div>
                        </div>

                        <div
                          className={`flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-bold border uppercase tracking-widest ${
                            isEqual
                              ? 'bg-gcf-black/5 text-gcf-black/40 border-gcf-black/10'
                              : isConcorrentePior
                                ? 'bg-gcf-black/5 text-gcf-black/60 border-gcf-black/10'
                                : 'bg-gcf-green/10 text-gcf-green border-gcf-green/20'
                          }`}
                        >
                          {isEqual ? (
                            <span>Mesmo custo por UFC/mm²</span>
                          ) : isConcorrentePior ? (
                            <>
                              <TrendingUp size={14} />
                              <span>Concorrente pior ({fmtPctSignedLocal(pct)})</span>
                            </>
                          ) : (
                            <>
                              <TrendingDown size={14} />
                              <span>Concorrente melhor ({fmtPctSignedLocal(pct)})</span>
                            </>
                          )}
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>

          {isReportModalOpen && (
            <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
              <button
                type="button"
                className="absolute inset-0 bg-gcf-black/60 backdrop-blur-sm"
                onClick={closeReportModal}
                aria-label="Fechar modal"
              />

              <div className="relative w-full max-w-lg bg-white rounded-[24px] shadow-2xl border border-gcf-black/10 p-6 sm:p-8">
                <div className="flex items-center gap-4 mb-6">
                  <div className="h-16 w-16 rounded-[18px] border border-gcf-black/10 bg-gcf-offwhite flex items-center justify-center overflow-hidden shrink-0">
                    <img src={gcfLogo} alt="Logo da empresa" className="max-h-10 w-auto" draggable={false} />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gcf-green mb-1">Dados do relatório</p>
                    <h3 className="text-xl font-bold tracking-tight text-gcf-black">Preencha antes de baixar o PDF</h3>
                    <p className="text-sm text-gcf-black/50 mt-1">
                      Essas informações serão exibidas no cabeçalho do relatório junto com a logo da empresa.
                    </p>
                  </div>
                </div>

                <div className="space-y-5">
                  <div className="space-y-2">
                    <label className="label-gcf">Nome do cliente</label>
                    <input
                      type="text"
                      value={reportContactData.nomeCliente}
                      onChange={(e) => handleReportFieldChange('nomeCliente', e.target.value)}
                      className="input-gcf"
                      placeholder="Ex: Fazenda Santa Helena"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="label-gcf">Nome do vendedor</label>
                    <input
                      type="text"
                      value={reportContactData.nomeVendedor}
                      onChange={(e) => handleReportFieldChange('nomeVendedor', e.target.value)}
                      className="input-gcf"
                      placeholder="Ex: João da Silva"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="label-gcf">Telefone do vendedor</label>
                    <input
                      type="tel"
                      value={reportContactData.telefoneVendedor}
                      onChange={(e) => handleReportFieldChange('telefoneVendedor', e.target.value)}
                      className="input-gcf"
                      placeholder="Ex: (43) 99999-9999"
                    />
                  </div>
                </div>

                <div className="mt-8 flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
                  <button type="button" onClick={closeReportModal} className="btn-secondary !justify-center">
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadWithMetadata}
                    className="btn-primary !justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={competitorUnitMissing || reportFieldsMissing || isSavingReport}
                    title={
                      competitorUnitMissing
                        ? 'Selecione mL ou L na concentração do concorrente para gerar o PDF'
                        : reportFieldsMissing
                          ? 'Preencha os dados do cliente e vendedor para gerar o PDF'
                          : 'Gerar PDF'
                    }
                  >
                    <Download size={16} />
                    <span>{isSavingReport ? 'Salvando...' : 'Gerar PDF'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}