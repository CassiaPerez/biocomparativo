import { useState, useEffect } from 'react';
import { Plus, Edit2, Save, X, Trash2, Package } from 'lucide-react';
import { supabase, supabaseEnabled } from '../lib/supabase';
import type { Produto } from '../types/database';

interface ProdutoForm {
  nome: string;
  concentracao_label: string;
  concentracao_valor: string;
  mantissa: string;
  exponent: string;
  ativo: boolean;
  ordem: number;
}

const EMPTY_FORM: ProdutoForm = {
  nome: '',
  concentracao_label: '',
  concentracao_valor: '',
  mantissa: '',
  exponent: '',
  ativo: true,
  ordem: 0,
};

export default function ProductsManager() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<ProdutoForm>(EMPTY_FORM);

  useEffect(() => {
    loadProdutos();
  }, []);

  const loadProdutos = async () => {
    if (!supabaseEnabled || !supabase) {
      setError('Supabase não está configurado');
      setLoading(false);
      return;
    }

    try {
      const { data, error: fetchError } = await supabase
        .from('produtos')
        .select('*')
        .order('ordem', { ascending: true });

      if (fetchError) throw fetchError;

      setProdutos(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar produtos');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!supabaseEnabled || !supabase) {
      alert('Supabase não está configurado');
      return;
    }

    if (!formData.nome.trim()) {
      alert('Nome do produto é obrigatório');
      return;
    }

    try {
      if (editingId) {
        const { error: updateError } = await supabase
          .from('produtos')
          .update({
            ...formData,
            data_atualizacao: new Date().toISOString(),
          })
          .eq('id', editingId);

        if (updateError) throw updateError;
      } else {
        const maxOrdem = produtos.length > 0 ? Math.max(...produtos.map(p => p.ordem)) : 0;

        const { error: insertError } = await supabase
          .from('produtos')
          .insert([{ ...formData, ordem: maxOrdem + 1 }]);

        if (insertError) throw insertError;
      }

      setIsAdding(false);
      setEditingId(null);
      setFormData(EMPTY_FORM);
      await loadProdutos();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao salvar produto');
    }
  };

  const handleEdit = (produto: Produto) => {
    setFormData({
      nome: produto.nome,
      concentracao_label: produto.concentracao_label,
      concentracao_valor: produto.concentracao_valor,
      mantissa: produto.mantissa,
      exponent: produto.exponent,
      ativo: produto.ativo,
      ordem: produto.ordem,
    });
    setEditingId(produto.id);
    setIsAdding(true);
  };

  const handleDelete = async (id: string, nome: string) => {
    if (!confirm(`Tem certeza que deseja excluir o produto "${nome}"?`)) return;

    if (!supabaseEnabled || !supabase) {
      alert('Supabase não está configurado');
      return;
    }

    try {
      const { error: deleteError } = await supabase
        .from('produtos')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      await loadProdutos();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao excluir produto');
    }
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData(EMPTY_FORM);
  };

  const updateFormField = (field: keyof ProdutoForm, value: string | boolean | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    if (field === 'mantissa' || field === 'exponent') {
      const mantissa = field === 'mantissa' ? String(value) : formData.mantissa;
      const exponent = field === 'exponent' ? String(value) : formData.exponent;

      if (mantissa && exponent) {
        const mantissaNumber = mantissa.replace(',', '.');
        const scientificValue = `${mantissaNumber}e${exponent}`;

        setFormData(prev => ({
          ...prev,
          concentracao_valor: scientificValue,
          concentracao_label: `${mantissa}×10${getExponentSuperscript(exponent)}`,
        }));
      }
    }
  };

  const getExponentSuperscript = (exp: string): string => {
    const superscripts: { [key: string]: string } = {
      '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
      '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
      '-': '⁻'
    };
    return exp.split('').map(char => superscripts[char] || char).join('');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-gcf-black/40">Carregando produtos...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-[14px]">
        <p className="text-red-600 font-semibold">Erro: {error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold text-gcf-black">Gerenciar Produtos</h3>
          <p className="text-sm text-gcf-black/60 mt-1">{produtos.length} produtos cadastrados</p>
        </div>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gcf-green text-white rounded-[12px] font-semibold text-sm hover:bg-gcf-green/90 transition-colors"
          >
            <Plus size={16} />
            Novo Produto
          </button>
        )}
      </div>

      {isAdding && (
        <form onSubmit={handleSubmit} className="bg-gcf-green/5 border border-gcf-green/20 rounded-[14px] p-6">
          <h4 className="text-lg font-bold text-gcf-black mb-4">
            {editingId ? 'Editar Produto' : 'Novo Produto'}
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gcf-black/60 uppercase tracking-wider">
                Nome do Produto
              </label>
              <input
                type="text"
                value={formData.nome}
                onChange={(e) => updateFormField('nome', e.target.value)}
                className="w-full px-4 py-3 border border-gcf-black/20 rounded-[12px] focus:border-gcf-green focus:ring-2 focus:ring-gcf-green/20 outline-none transition-all"
                placeholder="Ex: TRICHOKING"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gcf-black/60 uppercase tracking-wider">
                Ativo
              </label>
              <div className="flex items-center gap-3 h-[50px]">
                <input
                  type="checkbox"
                  checked={formData.ativo}
                  onChange={(e) => updateFormField('ativo', e.target.checked)}
                  className="w-5 h-5 text-gcf-green rounded focus:ring-gcf-green"
                />
                <span className="text-sm text-gcf-black/80">Produto está ativo</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gcf-black/60 uppercase tracking-wider">
                Mantissa (Ex: 1 ou 2,2)
              </label>
              <input
                type="text"
                value={formData.mantissa}
                onChange={(e) => updateFormField('mantissa', e.target.value)}
                className="w-full px-4 py-3 border border-gcf-black/20 rounded-[12px] focus:border-gcf-green focus:ring-2 focus:ring-gcf-green/20 outline-none transition-all"
                placeholder="Ex: 1"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gcf-black/60 uppercase tracking-wider">
                Expoente (Ex: 10)
              </label>
              <input
                type="text"
                value={formData.exponent}
                onChange={(e) => updateFormField('exponent', e.target.value)}
                className="w-full px-4 py-3 border border-gcf-black/20 rounded-[12px] focus:border-gcf-green focus:ring-2 focus:ring-gcf-green/20 outline-none transition-all"
                placeholder="Ex: 10"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gcf-black/60 uppercase tracking-wider">
                Label (Gerado automaticamente)
              </label>
              <div className="w-full px-4 py-3 border border-gcf-black/10 rounded-[12px] bg-gcf-black/5 text-gcf-black/60">
                {formData.concentracao_label || 'Preencha mantissa e expoente'}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gcf-black/60 uppercase tracking-wider">
                Valor Científico (Gerado automaticamente)
              </label>
              <div className="w-full px-4 py-3 border border-gcf-black/10 rounded-[12px] bg-gcf-black/5 text-gcf-black/60 font-mono">
                {formData.concentracao_valor || 'Preencha mantissa e expoente'}
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              type="submit"
              className="flex items-center gap-2 px-4 py-2 bg-gcf-green text-white rounded-[12px] font-semibold text-sm hover:bg-gcf-green/90 transition-colors"
            >
              <Save size={16} />
              {editingId ? 'Salvar Alterações' : 'Adicionar Produto'}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="flex items-center gap-2 px-4 py-2 bg-gcf-black/10 text-gcf-black rounded-[12px] font-semibold text-sm hover:bg-gcf-black/20 transition-colors"
            >
              <X size={16} />
              Cancelar
            </button>
          </div>
        </form>
      )}

      <div className="grid gap-3">
        {produtos.map((produto) => (
          <div
            key={produto.id}
            className={`bg-white border rounded-[14px] p-5 hover:shadow-lg transition-shadow ${
              produto.ativo ? 'border-gcf-black/10' : 'border-gcf-black/5 bg-gcf-black/5'
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4 flex-1">
                <div className={`p-3 rounded-[12px] ${produto.ativo ? 'bg-gcf-green/10' : 'bg-gcf-black/10'}`}>
                  <Package size={24} className={produto.ativo ? 'text-gcf-green' : 'text-gcf-black/40'} />
                </div>

                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs font-bold text-gcf-black/40 uppercase tracking-wider mb-1">Produto</p>
                    <p className={`text-lg font-bold ${produto.ativo ? 'text-gcf-black' : 'text-gcf-black/40'}`}>
                      {produto.nome}
                    </p>
                    {!produto.ativo && (
                      <span className="inline-block mt-1 px-2 py-0.5 bg-gcf-black/10 text-gcf-black/60 text-xs font-bold rounded-full">
                        Inativo
                      </span>
                    )}
                  </div>

                  <div>
                    <p className="text-xs font-bold text-gcf-black/40 uppercase tracking-wider mb-1">Concentração</p>
                    <p className={`text-lg font-semibold ${produto.ativo ? 'text-gcf-green' : 'text-gcf-black/40'}`}>
                      {produto.concentracao_label}
                    </p>
                    <p className="text-xs font-mono text-gcf-black/40 mt-1">{produto.concentracao_valor}</p>
                  </div>

                  <div>
                    <p className="text-xs font-bold text-gcf-black/40 uppercase tracking-wider mb-1">
                      Mantissa / Expoente
                    </p>
                    <p className={`text-sm font-mono ${produto.ativo ? 'text-gcf-black' : 'text-gcf-black/40'}`}>
                      {produto.mantissa} / {produto.exponent}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(produto)}
                  className="p-2 hover:bg-gcf-green/10 text-gcf-green rounded-[8px] transition-colors"
                  title="Editar produto"
                >
                  <Edit2 size={18} />
                </button>
                <button
                  onClick={() => handleDelete(produto.id, produto.nome)}
                  className="p-2 hover:bg-red-50 text-red-600 rounded-[8px] transition-colors"
                  title="Excluir produto"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
