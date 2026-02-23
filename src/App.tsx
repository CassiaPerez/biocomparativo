import React, { useState, useEffect, useRef } from 'react';
import { Plus, ArrowRightLeft, Trash2, Hash, Calculator, TrendingUp, TrendingDown, Minus } from 'lucide-react';
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

// Scientific Input Component (Split View)
const ScientificInput = ({ 
  value, 
  onChange, 
  placeholder, 
  className 
}: { 
  value: string, 
  onChange: (val: string) => void, 
  placeholder?: string,
  className?: string 
}) => {
  const [mantissa, setMantissa] = useState('');
  const [exponent, setExponent] = useState('');

  // Sync state with prop value
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
    <div className={`flex items-center bg-white border-2 border-slate-200 rounded-xl px-4 py-3 focus-within:border-indigo-400 focus-within:ring-4 focus-within:ring-indigo-100 transition-all ${className}`}>
      {/* Mantissa Input */}
      <input
        type="text"
        value={mantissa}
        onChange={(e) => updateParent(e.target.value, exponent)}
        className="w-full min-w-[60px] text-3xl font-bold text-slate-800 text-right outline-none bg-transparent placeholder-slate-300"
        placeholder="0"
        inputMode="decimal"
      />
      
      {/* Scientific Notation Separator */}
      <div className="mx-2 text-xl text-slate-400 font-medium select-none">
        × 10
      </div>

      {/* Exponent Input (Elevated) */}
      <div className="relative -top-3">
        <input
          type="text"
          value={exponent}
          onChange={(e) => updateParent(mantissa, e.target.value)}
          className="w-16 text-xl font-bold text-indigo-600 outline-none bg-slate-50 border border-slate-200 rounded-lg text-center py-1 focus:bg-indigo-50 focus:border-indigo-300 transition-colors"
          placeholder="0"
          inputMode="numeric"
        />
      </div>
    </div>
  );
};

// Component for displaying large numbers with toggle
const BigNumberDisplay = ({ value, label, isCurrency = false, colorClass = "text-slate-800" }: { value: Decimal, label: string, isCurrency?: boolean, colorClass?: string }) => {
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
        <span>
          {mantissa.replace('.', ',')} × 10<sup>{exponent.replace('+', '')}</sup>
        </span>
      );
    }

    const parts = value.toFixed(0).split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return parts.join(',');
  };

  return (
    <div className="flex flex-col">
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</span>
        {isLarge && !isCurrency && (
          <button 
            onClick={() => setShowScientific(!showScientific)}
            className="text-xs p-1 rounded hover:bg-slate-100 text-slate-400 transition-colors"
            title="Alternar formato"
          >
            {showScientific ? <Hash size={12} /> : <Calculator size={12} />}
          </button>
        )}
      </div>
      <div className={`text-xl md:text-2xl font-bold font-mono tracking-tight ${colorClass}`}>
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

  // Effects to trigger forward calculation when inputs change
  useEffect(() => {
    setCropCalculated(calculate(cropData));
  }, [cropData.Concentracao_por_ml_ou_g, cropData.Dose_ha_ml_ou_g, cropData["Custo_R$_por_L_ou_kg"]]);

  useEffect(() => {
    setCompCalculated(calculate(compData));
  }, [compData.Concentracao_por_ml_ou_g, compData.Dose_ha_ml_ou_g, compData["Custo_R$_por_L_ou_kg"]]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement> | { target: { name: string, value: string } }, isCompetitor = false) => {
    const { name, value } = e.target;
    const setter = isCompetitor ? setCompData : setCropData;
    setter(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Special handler for Reverse Calculation (Editing UFC)
  const handleUfcChange = (value: string, isCompetitor = false) => {
    const setter = isCompetitor ? setCompData : setCropData;
    const currentData = isCompetitor ? compData : cropData;
    
    // If we have a valid concentration, we can calculate the dose
    const conc = new Decimal(currentData.Concentracao_por_ml_ou_g || 0);
    
    if (conc.isZero()) {
      // Cannot reverse calc without concentration
      return; 
    }

    try {
      const targetUfc = new Decimal(value || 0);
      // Dose = UFC / Concentration
      const newDose = targetUfc.dividedBy(conc);
      
      setter(prev => ({
        ...prev,
        Dose_ha_ml_ou_g: newDose.toString()
      }));
    } catch (e) {
      // Invalid input, ignore
    }
  };

  const clearAll = () => {
    setCropData(INITIAL_STATE_CROPFIELD);
    setCompData(INITIAL_STATE_CONCORRENTE);
  };

  const formatCurrency = (val: Decimal) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val.toNumber());

  const formatDiff = (val: Decimal, isCurrency = false) => {
    if (isCurrency) return formatCurrency(val);
    
    if (val.abs().gte(1e9)) {
      const exponential = val.toExponential(2);
      const [mantissa, exponent] = exponential.split('e');
      return (
        <span>
          {mantissa.replace('.', ',')} × 10<sup>{exponent.replace('+', '')}</sup>
        </span>
      );
    }
    
    const parts = val.toFixed(0).split('.');
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
    const isCropfield = !isCompetitor;
    
    return (
      <div className={`flex flex-col h-full bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100 transition-all duration-300 hover:shadow-2xl`}>
        {/* Header */}
        <div className={`px-8 py-6 bg-gradient-to-br ${isCropfield ? 'from-emerald-500 to-teal-600' : 'from-blue-500 to-indigo-600'} text-white`}>
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
              <p className="text-white/80 text-sm mt-1 font-medium">Dados do Produto</p>
            </div>
            <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
              <Hash className="text-white" size={20} />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-8 flex-1 flex flex-col gap-8">
          {/* Inputs */}
          <div className="space-y-5">
            <div className="group">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Produto</label>
              <input 
                type="text" 
                name="Produto"
                value={data.Produto}
                onChange={(e) => handleInputChange(e, isCompetitor)}
                className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:bg-white focus:border-slate-300 focus:ring-0 outline-none transition-all font-medium text-slate-700"
                placeholder="Nome do produto"
              />
            </div>

            <div className="grid grid-cols-1 gap-5">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Concentração (mL ou g)</label>
                <ScientificInput 
                  value={data.Concentracao_por_ml_ou_g}
                  onChange={(val) => handleInputChange({ target: { name: 'Concentracao_por_ml_ou_g', value: val } }, isCompetitor)}
                  className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:bg-white focus:border-slate-300 focus:ring-0 outline-none transition-all font-mono text-slate-700"
                  placeholder="Ex: 1e10"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Dose (mL ou g / ha)</label>
                <input 
                  type="number" 
                  name="Dose_ha_ml_ou_g"
                  value={data.Dose_ha_ml_ou_g}
                  onChange={(e) => handleInputChange(e, isCompetitor)}
                  step="any"
                  className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:bg-white focus:border-slate-300 focus:ring-0 outline-none transition-all font-mono text-slate-700"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Custo (R$ / L ou kg)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">R$</span>
                  <input 
                    type="number" 
                    name="Custo_R$_por_L_ou_kg"
                    value={data["Custo_R$_por_L_ou_kg"]}
                    onChange={(e) => handleInputChange(e, isCompetitor)}
                    step="any"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:bg-white focus:border-slate-300 focus:ring-0 outline-none transition-all font-mono text-slate-700"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="w-full h-px bg-slate-100"></div>

          {/* Results */}
          <div className="space-y-6">
            
            {/* Editable UFC */}
            <div className="flex flex-col">
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1">UFC / ha (Alvo)</label>
                <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200">Editável</span>
              </div>
              <ScientificInput 
                value={calculated.UFC_ou_conidios_ha.toString()}
                onChange={(val) => handleUfcChange(val, isCompetitor)}
                className={`w-full px-4 py-3 border-2 rounded-xl focus:bg-white focus:ring-0 outline-none transition-all font-mono text-lg font-bold ${isCropfield ? 'bg-emerald-50 border-emerald-100 text-emerald-700 focus:border-emerald-300' : 'bg-blue-50 border-blue-100 text-blue-700 focus:border-blue-300'}`}
                placeholder="Calculado..."
              />
              <div className="flex flex-col mt-1 ml-1 gap-0.5">
                <p className="text-[10px] text-slate-400">
                  Fórmula: Concentração × Dose
                </p>
                <p className="text-[10px] text-slate-400">
                  * Alterar este valor recalcula a Dose automaticamente.
                </p>
              </div>
            </div>
            
            <div>
              <BigNumberDisplay 
                value={calculated.UFC_ou_conidios_mm2_superficie} 
                label="UFC / mm² (Superfície)" 
                colorClass={isCropfield ? "text-emerald-600" : "text-blue-600"}
              />
              <p className="text-[10px] text-slate-400 mt-1 ml-1">
                Fórmula: UFC/ha ÷ 10.000
              </p>
            </div>

            <div className={`p-5 rounded-2xl ${isCropfield ? 'bg-emerald-50' : 'bg-blue-50'}`}>
              <BigNumberDisplay 
                value={calculated["Custo_R$_por_ha"]} 
                label="Custo / ha" 
                isCurrency={true}
                colorClass={isCropfield ? "text-emerald-700" : "text-blue-700"}
              />
              <p className={`text-[10px] mt-1 ml-1 ${isCropfield ? 'text-emerald-600/70' : 'text-blue-600/70'}`}>
                Fórmula: (Dose × Custo Unitário) ÷ 1.000
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-indigo-100 selection:text-indigo-900">
      
      {/* Navbar */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-slate-900 p-2 rounded-lg text-white">
              <Calculator size={20} />
            </div>
            <span className="font-bold text-lg tracking-tight text-slate-900">BioCompare</span>
          </div>
          <button 
            onClick={clearAll}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
          >
            <Trash2 size={16} />
            <span>Limpar</span>
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight mb-3">
            Comparativo de Biológicos
          </h1>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto">
            Analise a eficiência e o custo-benefício entre produtos agrícolas com precisão decimal.
          </p>
        </div>

        {/* Comparison Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start relative">
          
          {/* VS Badge (Desktop) */}
          <div className="hidden lg:flex absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 z-10 bg-white p-3 rounded-full shadow-xl border border-slate-100 text-slate-400 font-black text-xl">
            VS
          </div>

          {renderProductColumn('Cropfield', cropData, cropCalculated, false)}
          {renderProductColumn('Concorrente', compData, compCalculated, true)}
        </div>

        {/* Differences Section */}
        <div className="mt-16">
          <div className="flex items-center gap-4 mb-8">
            <div className="h-px flex-1 bg-slate-200"></div>
            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <ArrowRightLeft className="text-slate-400" size={20} />
              Análise de Diferenças
            </h3>
            <div className="h-px flex-1 bg-slate-200"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Custo Diff */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center text-center">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Diferença Custo / ha</span>
              <div className={`text-2xl font-bold font-mono mb-2 ${diffCustoHa.gt(0) ? 'text-red-500' : diffCustoHa.lt(0) ? 'text-emerald-500' : 'text-slate-700'}`}>
                {formatDiff(diffCustoHa, true)}
              </div>
              <div className="flex items-center gap-1.5 text-sm font-medium">
                {diffCustoHa.gt(0) ? (
                  <>
                    <TrendingUp size={16} className="text-red-500" />
                    <span className="text-red-600">Concorrente mais caro</span>
                  </>
                ) : diffCustoHa.lt(0) ? (
                  <>
                    <TrendingDown size={16} className="text-emerald-500" />
                    <span className="text-emerald-600">Concorrente mais barato</span>
                  </>
                ) : (
                  <span className="text-slate-400">Mesmo custo</span>
                )}
              </div>
            </div>

            {/* UFC Diff */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center text-center">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Diferença UFC / ha</span>
              <div className={`text-xl font-bold font-mono mb-2 ${diffUfcHa.lt(0) ? 'text-red-500' : diffUfcHa.gt(0) ? 'text-emerald-500' : 'text-slate-700'}`}>
                {formatDiff(diffUfcHa)}
              </div>
              <div className="flex items-center gap-1.5 text-sm font-medium">
                {diffUfcHa.gt(0) ? (
                  <>
                    <TrendingUp size={16} className="text-emerald-500" />
                    <span className="text-emerald-600">Concorrente superior</span>
                  </>
                ) : diffUfcHa.lt(0) ? (
                  <>
                    <TrendingDown size={16} className="text-red-500" />
                    <span className="text-red-600">Concorrente inferior</span>
                  </>
                ) : (
                  <span className="text-slate-400">Mesma concentração</span>
                )}
              </div>
            </div>

            {/* UFC mm2 Diff */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center text-center">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Diferença UFC / mm²</span>
              <div className={`text-xl font-bold font-mono mb-2 ${diffUfcMm2.lt(0) ? 'text-red-500' : diffUfcMm2.gt(0) ? 'text-emerald-500' : 'text-slate-700'}`}>
                {formatDiff(diffUfcMm2)}
              </div>
              <div className="text-sm text-slate-400 font-medium">
                Superfície
              </div>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
