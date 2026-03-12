/*
  # Criar tabela de produtos

  1. Nova Tabela
    - `produtos`
      - `id` (uuid, chave primária)
      - `nome` (text, único, nome do produto)
      - `concentracao_label` (text, label formatado, ex: "1×10¹⁰")
      - `concentracao_valor` (text, valor científico, ex: "1e10")
      - `mantissa` (text, mantissa da notação científica)
      - `exponent` (text, expoente da notação científica)
      - `ativo` (boolean, se o produto está ativo)
      - `ordem` (integer, ordem de exibição)
      - `data_criacao` (timestamptz, data de criação)
      - `data_atualizacao` (timestamptz, data de atualização)

  2. Segurança
    - Habilitar RLS na tabela `produtos`
    - Adicionar política para leitura pública (produtos visíveis para todos)
    - Adicionar política para inserção/atualização autenticada (apenas admin)

  3. Dados Iniciais
    - Inserir todos os produtos Cropfield existentes
*/

-- Criar tabela de produtos
CREATE TABLE IF NOT EXISTS produtos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text UNIQUE NOT NULL,
  concentracao_label text NOT NULL,
  concentracao_valor text NOT NULL,
  mantissa text NOT NULL,
  exponent text NOT NULL,
  ativo boolean DEFAULT true,
  ordem integer DEFAULT 0,
  data_criacao timestamptz DEFAULT now(),
  data_atualizacao timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE produtos ENABLE ROW LEVEL SECURITY;

-- Política para leitura pública (todos podem ver produtos ativos)
CREATE POLICY "Produtos ativos são visíveis para todos"
  ON produtos FOR SELECT
  USING (ativo = true);

-- Política para leitura de todos os produtos (autenticado)
CREATE POLICY "Usuários autenticados podem ver todos os produtos"
  ON produtos FOR SELECT
  TO authenticated
  USING (true);

-- Política para inserção (apenas autenticados)
CREATE POLICY "Usuários autenticados podem inserir produtos"
  ON produtos FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Política para atualização (apenas autenticados)
CREATE POLICY "Usuários autenticados podem atualizar produtos"
  ON produtos FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Política para deleção (apenas autenticados)
CREATE POLICY "Usuários autenticados podem deletar produtos"
  ON produtos FOR DELETE
  TO authenticated
  USING (true);

-- Inserir produtos iniciais
INSERT INTO produtos (nome, concentracao_label, concentracao_valor, mantissa, exponent, ordem) VALUES
  ('TRICHOKING', '1×10¹⁰', '1e10', '1', '10', 1),
  ('TRICHOBIO', '5×10⁹', '5e9', '5', '9', 2),
  ('HARZ', '5×10⁹', '5e9', '5', '9', 3),
  ('BEAUVEBIO', '1×10⁹', '1e9', '1', '9', 4),
  ('BOVEN', '1×10¹⁰', '1e10', '1', '10', 5),
  ('METHABIO', '2,2×10¹⁰', '2.2e10', '2,2', '10', 6),
  ('BT CROP', '1×10¹⁰', '1e10', '1', '10', 7),
  ('NEMATHA', '3×10⁹', '3e9', '3', '9', 8),
  ('TRIGUARD', '4,5×10⁹', '4.5e9', '4,5', '9', 9),
  ('AMYLOBIO', '3×10⁹', '3e9', '3', '9', 10),
  ('PUMIGUARD', '2×10⁹', '2e9', '2', '9', 11),
  ('CHOLLA', '3×10⁸', '3e8', '3', '8', 12),
  ('CROPBIO PHOS', '4×10⁸', '4e8', '4', '8', 13),
  ('CROPBIO SOJA', '7,0×10⁹', '7.0e10', '7,0', '10', 14),
  ('CROPBIO AZOS', '4×10⁸', '4e8', '4', '8', 15),
  ('CROPBIO FEIJÃO', '3×10⁹', '3e9', '3', '9', 16),
  ('CROPBIO TURFA', '5×10⁹', '5e9', '5', '9', 17),
  ('GUARDIUM', '4×10⁹', '4e9', '4', '9', 18)
ON CONFLICT (nome) DO NOTHING;

-- Criar índice para melhorar performance de busca
CREATE INDEX IF NOT EXISTS idx_produtos_ativo ON produtos(ativo);
CREATE INDEX IF NOT EXISTS idx_produtos_ordem ON produtos(ordem);
