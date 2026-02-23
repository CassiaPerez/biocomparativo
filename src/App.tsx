import React, { useState, useEffect } from 'react';
import { 
  ArrowRightLeft, 
  Trash2, 
  Hash, 
  Calculator, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Sprout,
  Target,
  FlaskConical,
  Droplets,
  Coins,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Decimal } from 'decimal.js';

// Types
interface BiologicoRecord {
  Produto: string;
  Concentracao_por_ml_ou_g: string;
  Dose_ha_ml_ou_g: string;
  "Custo_R$_por_L_ou_kg": string;
}

interface CalculatedValues {
  UFC_ou_conidios_ha: Decimal;
  UFC_ou_conidios_mm2_superficie: Decimal;
  "Custo_R$_por_ha": Decimal;
}

const INITIAL_STATE_CROPFIELD: BiologicoRecord = {
  Produto: 'Cropfield',
  Concentracao_por_ml_ou_g: '',
  Dose_ha_ml_ou_g: '',
  "Custo_R$_por_L_ou_kg": '',
};

const INITIAL_STATE_CONCORRENTE: BiologicoRecord = {
  Produto: 'Concorrente',
  Concentracao_por_ml_ou_g: '',
  Dose_ha_ml_ou_g: '',
  "Custo_R$_por_L_ou_kg": '',
};

const INITIAL_CALCULATED: CalculatedValues = {
  UFC_ou_conidios_ha: new Decimal(0),
  UFC_ou_conidios_mm2_superficie: new Decimal(0),
  "Custo_R$_por_ha": new Decimal(0)
};

// Scientific Input Component (Refined)
const ScientificInput = ({ 
  value, 
  onChange, 
  placeholder, 
  className,
  label
}: { 
  value: string, 
  onChange: (val: string) => void, 
  placeholder?: string,
  className?: string,
  label?: string
}) => {
  const [mantissa, setMantissa] = useState('');
  const [exponent, setExponent] = useState('');

  useEffect(() => {
    if (!value) {
      setMantissa('');
      setExponent('');
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
      
      setMantissa(prev => {
        try {
            if (prev && exponent && new Decimal(`${prev}e${exponent}`).equals(dec)) {
                return prev;
            }
        } catch(e) {}
        return m;
      });
      
      setExponent(prev => {
         try {
            if (mantissa && prev && new Decimal(`${mantissa}e${prev}`).equals(dec)) {
                return prev;
            }
        } catch(e) {}
        return e.replace('+', '');
      });

    } catch (e) {
      // Invalid input, ignore
    }
  }, [value]);

  const updateParent = (m: string, e: string) => {
    setMantissa(m);
    setExponent(e);

    if (m === '' || m === '-' || m.endsWith('.')) return;
    if (e === '' || e === '-') return;

    try {
      const val = new Decimal(`${m}e${e || '0'}`);
      onChange(val.toString());
    } catch (err) {
      // Invalid number
    }
  };

  return (
    <div className={`group relative bg-white border border-gray-200 rounded-lg px-3 py-2 focus-within:border-gray-400 focus-within:ring-1 focus-within:ring-gray-400 transition-all shadow-sm hover:border-gray-300 ${className}`}>
      {label && <label className="absolute -top-2 left-2 bg-white px-1 text-[10px] font-medium text-gray-500 uppercase tracking-wider">{label}</label>}
      <div className="flex items-baseline gap-1">
        <input
          type="text"
          value={mantissa}
          onChange={(e) => updateParent(e.target.value, exponent)}
          className="flex-1 min-w-0 text-lg font-mono font-medium text-gray-900 text-right outline-none bg-transparent placeholder-gray-300"
          placeholder="0"
          inputMode="decimal"
        />
        <span className="text-gray-400 font-serif italic text-sm select-none">× 10</span>
        <input
          type="text"
          value={exponent}
          onChange={(e) => updateParent(mantissa, e.target.value)}
          className="w-10 text-sm font-bold text-gray-700 outline-none bg-gray-50 border border-gray-200 rounded text-center py-0.5 focus:bg-white focus:border-gray-400 transition-all"
          placeholder="0"
          inputMode="numeric"
        />
      </div>
    </div>
  );
};

// Standard Input Component
const StandardInput = ({
  value,
  onChange,
  label,
  prefix,
  placeholder,
  type = "text"
}: {
  value: string,
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void,
  label: string,
  prefix?: string,
  placeholder?: string,
  type?: string
}) => (
  <div className="group relative bg-white border border-gray-200 rounded-lg px-3 py-2 focus-within:border-gray-400 focus-within:ring-1 focus-within:ring-gray-400 transition-all shadow-sm hover:border-gray-300">
    <label className="absolute -top-2 left-2 bg-white px-1 text-[10px] font-medium text-gray-500 uppercase tracking-wider">{label}</label>
    <div className="flex items-center gap-2">
      {prefix && <span className="text-gray-400 font-medium text-sm select-none">{prefix}</span>}
      <input 
        type={type}
        value={value}
        onChange={onChange}
        className="w-full text-lg font-medium text-gray-900 outline-none bg-transparent placeholder-gray-300"
        placeholder={placeholder}
      />
    </div>
  </div>
);

// Big Number Display
const BigNumberDisplay = ({ 
  value, 
  label, 
  subLabel,
  isCurrency = false, 
  highlight = false,
  accentColor = "gray"
}: { 
  value: Decimal, 
  label: string, 
  subLabel?: string,
  isCurrency?: boolean, 
  highlight?: boolean,
  accentColor?: "emerald" | "blue" | "gray"
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
          {mantissa.replace('.', ',')}
          <span className="mx-1 text-sm text-gray-400 font-serif italic">× 10</span>
          <sup className="text-xs font-bold text-gray-500 -top-1 relative">{exponent.replace('+', '')}</sup>
        </span>
      );
    }

    const parts = value.toFixed(0).split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return parts.join(',');
  };

  const colorClasses = {
    emerald: "text-emerald-700",
    blue: "text-blue-700",
    gray: "text-gray-900"
  };

  return (
    <div className={`flex flex-col p-4 rounded-xl border ${highlight ? 'bg-white border-gray-200 shadow-sm' : 'bg-transparent border-transparent'}`}>
      <div className="flex justify-between items-start mb-1">
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</span>
        {isLarge && !isCurrency && (
          <button 
            onClick={() => setShowScientific(!showScientific)}
            className="text-gray-300 hover:text-gray-500 transition-colors"
          >
            {showScientific ? <Hash size={12} /> : <Calculator size={12} />}
          </button>
        )}
      </div>
      <div className={`text-2xl font-mono font-medium tracking-tight ${colorClasses[accentColor]}`}>
        {formatValue()}
      </div>
      {subLabel && <div className="text-[10px] text-gray-400 mt-1">{subLabel}</div>}
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
      const custo = new Decimal(data["Custo_R$_por_L_ou_kg"] || 0);

      const ufcHa = conc.times(dose);
      const custoHa = dose.times(custo).dividedBy(1000);
      const ufcMm2 = ufcHa.dividedBy(10000);

      return {
        UFC_ou_conidios_ha: ufcHa,
        UFC_ou_conidios_mm2_superficie: ufcMm2,
        "Custo_R$_por_ha": custoHa
      };
    } catch (e) {
      return INITIAL_CALCULATED;
    }
  };

  useEffect(() => {
    setCropCalculated(calculate(cropData));
  }, [cropData.Concentracao_por_ml_ou_g, cropData.Dose_ha_ml_ou_g, cropData["Custo_R$_por_L_ou_kg"]]);

  useEffect(() => {
    setCompCalculated(calculate(compData));
  }, [compData.Concentracao_por_ml_ou_g, compData.Dose_ha_ml_ou_g, compData["Custo_R$_por_L_ou_kg"]]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement> | { target: { name: string, value: string } }, isCompetitor = false) => {
    const { name, value } = e.target;
    const setter = isCompetitor ? setCompData : setCropData;
    setter(prev => ({ ...prev, [name]: value }));
  };

  const handleUfcChange = (value: string, isCompetitor = false) => {
    const setter = isCompetitor ? setCompData : setCropData;
    const currentData = isCompetitor ? compData : cropData;
    const conc = new Decimal(currentData.Concentracao_por_ml_ou_g || 0);
    
    if (conc.isZero()) return;

    try {
      const targetUfc = new Decimal(value || 0);
      const newDose = targetUfc.dividedBy(conc);
      setter(prev => ({ ...prev, Dose_ha_ml_ou_g: newDose.toString() }));
    } catch (e) {}
  };

  const clearAll = () => {
    setCropData(INITIAL_STATE_CROPFIELD);
    setCompData(INITIAL_STATE_CONCORRENTE);
  };

  const formatDiff = (val: Decimal, isCurrency = false) => {
    if (isCurrency) return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val.abs().toNumber());
    
    if (val.abs().gte(1e9)) {
      const exponential = val.abs().toExponential(2);
      const [mantissa, exponent] = exponential.split('e');
      return (
        <span className="inline-flex items-baseline">
          {mantissa.replace('.', ',')}
          <span className="mx-0.5 text-[10px] text-gray-400">×10</span>
          <sup className="text-[10px]">{exponent.replace('+', '')}</sup>
        </span>
      );
    }
    
    const parts = val.abs().toFixed(0).split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return parts.join(',');
  };

  const diffCustoHa = compCalculated["Custo_R$_por_ha"].minus(cropCalculated["Custo_R$_por_ha"]);
  const diffUfcHa = compCalculated.UFC_ou_conidios_ha.minus(cropCalculated.UFC_ou_conidios_ha);
  const diffUfcMm2 = compCalculated.UFC_ou_conidios_mm2_superficie.minus(cropCalculated.UFC_ou_conidios_mm2_superficie);

  const renderProductColumn = (
    title: string, 
    data: BiologicoRecord, 
    calculated: CalculatedValues, 
    isCompetitor: boolean
  ) => {
    const accentColor = isCompetitor ? "blue" : "emerald";
    const bgAccent = isCompetitor ? "bg-blue-50" : "bg-emerald-50";
    const borderAccent = isCompetitor ? "border-blue-100" : "border-emerald-100";
    const textAccent = isCompetitor ? "text-blue-700" : "text-emerald-700";

    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className={`px-6 py-4 rounded-t-2xl border-t border-x ${borderAccent} ${bgAccent} flex justify-between items-center`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg bg-white shadow-sm ${textAccent}`}>
              {isCompetitor ? <Target size={18} /> : <Sprout size={18} />}
            </div>
            <div>
              <h2 className={`text-lg font-bold tracking-tight ${textAccent}`}>{title}</h2>
              <p className="text-xs text-gray-500 font-medium">Dados do Produto</p>
            </div>
          </div>
        </div>

        {/* Card Body */}
        <div className="flex-1 bg-white border-x border-b border-gray-200 rounded-b-2xl shadow-sm p-6 space-y-8">
          
          {/* Inputs Section */}
          <div className="space-y-4">
            <StandardInput
              label="Nome do Produto"
              value={data.Produto}
              onChange={(e) => handleInputChange(e, isCompetitor)}
              placeholder="Ex: Trichoderma"
            />

            <div className="grid grid-cols-1 gap-4">
              <ScientificInput 
                label="Concentração (mL ou g)"
                value={data.Concentracao_por_ml_ou_g}
                onChange={(val) => handleInputChange({ target: { name: 'Concentracao_por_ml_ou_g', value: val } }, isCompetitor)}
                placeholder="Ex: 1e10"
              />

              <div className="grid grid-cols-2 gap-4">
                <StandardInput
                  label="Dose / ha"
                  value={data.Dose_ha_ml_ou_g}
                  onChange={(e) => handleInputChange(e, isCompetitor)}
                  placeholder="0"
                  type="number"
                  prefix={isCompetitor ? "mL/g" : "mL/g"}
                />
                <StandardInput
                  label="Custo Unitário"
                  value={data["Custo_R$_por_L_ou_kg"]}
                  onChange={(e) => handleInputChange(e, isCompetitor)}
                  placeholder="0.00"
                  type="number"
                  prefix="R$"
                />
              </div>
            </div>
          </div>

          <div className="h-px bg-gray-100 w-full"></div>

          {/* Results Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <FlaskConical size={16} className="text-gray-400" />
                Resultados Calculados
              </h3>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {/* Editable UFC */}
              <div className={`relative group rounded-xl border ${borderAccent} ${bgAccent} p-4 transition-all hover:shadow-md`}>
                <label className="absolute -top-2 left-4 bg-white px-1 text-[10px] font-bold text-gray-500 uppercase tracking-wider border border-gray-100 rounded shadow-sm">
                  UFC / ha (Alvo)
                </label>
                <div className="flex items-baseline gap-2">
                  <ScientificInput 
                    value={calculated.UFC_ou_conidios_ha.toString()}
                    onChange={(val) => handleUfcChange(val, isCompetitor)}
                    className="flex-1 border-transparent bg-transparent shadow-none hover:border-transparent focus-within:ring-0 px-0 py-0"
                  />
                </div>
                <p className="text-[10px] text-gray-500 mt-1 opacity-70">
                  * Editável: Recalcula a dose automaticamente
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <BigNumberDisplay 
                  value={calculated.UFC_ou_conidios_mm2_superficie} 
                  label="UFC / mm²" 
                  subLabel="Cobertura"
                  highlight
                  accentColor={isCompetitor ? "blue" : "emerald"}
                />
                <BigNumberDisplay 
                  value={calculated["Custo_R$_por_ha"]} 
                  label="Custo / ha" 
                  subLabel="Investimento"
                  isCurrency
                  highlight
                  accentColor={isCompetitor ? "blue" : "emerald"}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900 pb-20">
      
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-20 backdrop-blur-md bg-white/80 supports-[backdrop-filter]:bg-white/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gray-900 p-2 rounded-lg text-white shadow-lg shadow-gray-900/20">
              <Sprout size={20} />
            </div>
            <span className="font-bold text-lg tracking-tight text-gray-900">BioCompare</span>
          </div>
          <button 
            onClick={clearAll}
            className="group flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
          >
            <Trash2 size={16} className="group-hover:scale-110 transition-transform" />
            <span>Limpar Dados</span>
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        <div className="mb-10">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Comparativo Técnico</h1>
          <p className="text-gray-500 mt-1">Simule cenários e compare a eficiência biológica e econômica.</p>
        </div>

        {/* Comparison Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-12 items-start relative">
          
          {/* VS Badge */}
          <div className="hidden lg:flex absolute left-1/2 top-[280px] -translate-x-1/2 -translate-y-1/2 z-10">
            <div className="bg-white p-2 rounded-full shadow-lg border border-gray-100">
              <div className="bg-gray-50 w-10 h-10 rounded-full flex items-center justify-center border border-gray-200">
                <span className="text-gray-400 font-black text-xs">VS</span>
              </div>
            </div>
          </div>

          {renderProductColumn('Referência (Cropfield)', cropData, cropCalculated, false)}
          {renderProductColumn('Concorrente', compData, compCalculated, true)}
        </div>

        {/* Analysis Section */}
        <div className="mt-12 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <ArrowRightLeft size={18} className="text-gray-400" />
              Análise Comparativa
            </h3>
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Delta (Δ)</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-gray-100">
            
            {/* Custo Analysis */}
            <div className="p-6 flex flex-col items-center text-center hover:bg-gray-50/50 transition-colors">
              <div className="mb-3 p-3 rounded-full bg-gray-100 text-gray-500">
                <Coins size={24} strokeWidth={1.5} />
              </div>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Diferença de Custo</span>
              <div className="text-2xl font-mono font-medium text-gray-900 mb-2">
                {diffCustoHa.isZero() ? '—' : `R$ ${formatDiff(diffCustoHa)}`}
              </div>
              <div className="h-6 flex items-center justify-center">
                {diffCustoHa.gt(0) ? (
                  <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                    <CheckCircle2 size={14} />
                    <span>Referência economiza</span>
                  </div>
                ) : diffCustoHa.lt(0) ? (
                  <div className="flex items-center gap-1.5 text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded-full">
                    <AlertCircle size={14} />
                    <span>Referência mais cara</span>
                  </div>
                ) : (
                  <span className="text-xs text-gray-400">Custos iguais</span>
                )}
              </div>
            </div>

            {/* UFC Analysis */}
            <div className="p-6 flex flex-col items-center text-center hover:bg-gray-50/50 transition-colors">
              <div className="mb-3 p-3 rounded-full bg-gray-100 text-gray-500">
                <FlaskConical size={24} strokeWidth={1.5} />
              </div>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Diferença Biológica</span>
              <div className="text-2xl font-mono font-medium text-gray-900 mb-2">
                {diffUfcHa.isZero() ? '—' : formatDiff(diffUfcHa)}
              </div>
              <div className="h-6 flex items-center justify-center">
                {diffUfcHa.lt(0) ? (
                  <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                    <CheckCircle2 size={14} />
                    <span>Referência superior</span>
                  </div>
                ) : diffUfcHa.gt(0) ? (
                  <div className="flex items-center gap-1.5 text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded-full">
                    <AlertCircle size={14} />
                    <span>Referência inferior</span>
                  </div>
                ) : (
                  <span className="text-xs text-gray-400">Mesma concentração</span>
                )}
              </div>
            </div>

            {/* Coverage Analysis */}
            <div className="p-6 flex flex-col items-center text-center hover:bg-gray-50/50 transition-colors">
              <div className="mb-3 p-3 rounded-full bg-gray-100 text-gray-500">
                <Droplets size={24} strokeWidth={1.5} />
              </div>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Cobertura (mm²)</span>
              <div className="text-2xl font-mono font-medium text-gray-900 mb-2">
                {diffUfcMm2.isZero() ? '—' : formatDiff(diffUfcMm2)}
              </div>
              <div className="text-xs text-gray-400 max-w-[150px]">
                Diferença de propágulos por milímetro quadrado
              </div>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
