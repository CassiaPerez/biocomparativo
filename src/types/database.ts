export interface Produto {
  id: string;
  nome: string;
  concentracao_label: string;
  concentracao_valor: string;
  mantissa: string;
  exponent: string;
  ativo: boolean;
  ordem: number;
  data_criacao: string;
  data_atualizacao: string;
}

export interface RelatorioDownload {
  id: string;
  data_criacao: string;
  nome_cliente: string;
  nome_vendedor: string;
  telefone_vendedor: string | null;
  produto_cropfield: string | null;
  produto_concorrente: string | null;
  latitude: number | null;
  longitude: number | null;
  precisao_localizacao: number | null;
  cidade: string | null;
  estado: string | null;
  pais: string | null;
  ip_usuario: string | null;
  navegador: string | null;
  nome_pdf: string | null;
}
