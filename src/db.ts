import { Decimal } from 'decimal.js';

// In-memory storage to replace SQLite for Bolt.new compatibility
const db: BiologicoRecord[] = [];
let currentId = 1;

export function initDb() {
  console.log('Initialized in-memory database');
}

export interface BiologicoInput {
  Produto: string;
  Concentracao_por_ml_ou_g: string | number;
  Dose_ha_ml_ou_g: string | number;
  "Custo_R$_por_L_ou_kg": string | number;
}

export interface BiologicoRecord extends BiologicoInput {
  id: number;
  UFC_ou_conidios_ha: string;
  UFC_ou_conidios_mm2_superficie: string;
  "Custo_R$_por_ha": string;
  created_at: string;
  updated_at: string;
}

export function calculateFields(input: BiologicoInput) {
  const conc = new Decimal(input.Concentracao_por_ml_ou_g || 0);
  const dose = new Decimal(input.Dose_ha_ml_ou_g || 0);
  const custo = new Decimal(input["Custo_R$_por_L_ou_kg"] || 0);

  // UFC_ou_conidios_ha = Concentracao_por_ml_ou_g * Dose_ha_ml_ou_g
  const UFC_ou_conidios_ha = conc.times(dose);
  
  // Custo_R$_por_ha = (Dose_ha_ml_ou_g * Custo_R$_por_L_ou_kg) / 1000
  const Custo_R$_por_ha = dose.times(custo).dividedBy(1000);
  
  // UFC_ou_conidios_mm2_superficie = UFC_ou_conidios_ha / 10000
  const UFC_ou_conidios_mm2_superficie = UFC_ou_conidios_ha.dividedBy(10000);

  return {
    UFC_ou_conidios_ha: UFC_ou_conidios_ha.toString(),
    "Custo_R$_por_ha": Custo_R$_por_ha.toString(),
    UFC_ou_conidios_mm2_superficie: UFC_ou_conidios_mm2_superficie.toString()
  };
}

export const BiologicosModel = {
  create: (input: BiologicoInput): BiologicoRecord => {
    const calculated = calculateFields(input);
    
    const record: BiologicoRecord = {
      id: currentId++,
      ...input,
      ...calculated,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    db.push(record);
    return record;
  },

  update: (id: number, input: BiologicoInput): BiologicoRecord | undefined => {
    const index = db.findIndex(r => r.id === id);
    if (index === -1) return undefined;

    const calculated = calculateFields(input);
    
    const updatedRecord: BiologicoRecord = {
      ...db[index],
      ...input,
      ...calculated,
      updated_at: new Date().toISOString()
    };

    db[index] = updatedRecord;
    return updatedRecord;
  },

  getById: (id: number): BiologicoRecord | undefined => {
    return db.find(r => r.id === id);
  },

  getByProduto: (produto: string): BiologicoRecord | undefined => {
    // Sort by created_at desc (newest first)
    const records = db.filter(r => r.Produto === produto)
                      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return records[0];
  },

  getAll: (limit = 50, offset = 0): BiologicoRecord[] => {
    return db.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
             .slice(offset, offset + limit);
  }
};
