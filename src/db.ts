import Database from 'better-sqlite3';
import { Decimal } from 'decimal.js';

const db = new Database('biologicos.db');

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');

export function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS biologicos_comparativo (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      Produto TEXT NOT NULL,
      Concentracao_por_ml_ou_g TEXT NOT NULL,
      Dose_ha_ml_ou_g TEXT NOT NULL,
      "Custo_R$_por_L_ou_kg" TEXT NOT NULL,
      UFC_ou_conidios_ha TEXT NOT NULL,
      UFC_ou_conidios_mm2_superficie TEXT NOT NULL,
      "Custo_R$_por_ha" TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);
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
    
    const stmt = db.prepare(`
      INSERT INTO biologicos_comparativo (
        Produto, 
        Concentracao_por_ml_ou_g, 
        Dose_ha_ml_ou_g, 
        "Custo_R$_por_L_ou_kg",
        UFC_ou_conidios_ha,
        UFC_ou_conidios_mm2_superficie,
        "Custo_R$_por_ha"
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const info = stmt.run(
      input.Produto,
      String(input.Concentracao_por_ml_ou_g),
      String(input.Dose_ha_ml_ou_g),
      String(input["Custo_R$_por_L_ou_kg"]),
      calculated.UFC_ou_conidios_ha,
      calculated.UFC_ou_conidios_mm2_superficie,
      calculated["Custo_R$_por_ha"]
    );

    return BiologicosModel.getById(info.lastInsertRowid as number)!;
  },

  update: (id: number, input: BiologicoInput): BiologicoRecord | undefined => {
    const calculated = calculateFields(input);
    
    const stmt = db.prepare(`
      UPDATE biologicos_comparativo SET
        Produto = ?,
        Concentracao_por_ml_ou_g = ?,
        Dose_ha_ml_ou_g = ?,
        "Custo_R$_por_L_ou_kg" = ?,
        UFC_ou_conidios_ha = ?,
        UFC_ou_conidios_mm2_superficie = ?,
        "Custo_R$_por_ha" = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    const info = stmt.run(
      input.Produto,
      String(input.Concentracao_por_ml_ou_g),
      String(input.Dose_ha_ml_ou_g),
      String(input["Custo_R$_por_L_ou_kg"]),
      calculated.UFC_ou_conidios_ha,
      calculated.UFC_ou_conidios_mm2_superficie,
      calculated["Custo_R$_por_ha"],
      id
    );

    if (info.changes === 0) return undefined;
    return BiologicosModel.getById(id);
  },

  getById: (id: number): BiologicoRecord | undefined => {
    const stmt = db.prepare('SELECT * FROM biologicos_comparativo WHERE id = ?');
    return stmt.get(id) as BiologicoRecord | undefined;
  },

  getByProduto: (produto: string): BiologicoRecord | undefined => {
    const stmt = db.prepare('SELECT * FROM biologicos_comparativo WHERE Produto = ? ORDER BY created_at DESC LIMIT 1');
    return stmt.get(produto) as BiologicoRecord | undefined;
  },

  getAll: (limit = 50, offset = 0): BiologicoRecord[] => {
    const stmt = db.prepare('SELECT * FROM biologicos_comparativo ORDER BY created_at DESC LIMIT ? OFFSET ?');
    return stmt.all(limit, offset) as BiologicoRecord[];
  }
};
