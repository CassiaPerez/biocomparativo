import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { RelatorioDownload } from '../types/database';
import { Download, ChartBar as BarChart3, MapPin, Users, Package, ArrowLeft, Calendar, TrendingUp } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface EstatisticaRegiao {
  regiao: string;
  total: number;
  vendedores: Set<string>;
  produtos: Set<string>;
}

interface EstatisticaVendedor {
  nome: string;
  telefone: string;
  total: number;
  regioes: Set<string>;
}

interface EstatisticaProduto {
  nome: string;
  tipo: 'cropfield' | 'concorrente';
  total: number;
}

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
    lastAutoTable: { finalY: number };
  }
}

export default function Relatorios() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [relatorios, setRelatorios] = useState<RelatorioDownload[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroInicio, setFiltroInicio] = useState('');
  const [filtroFim, setFiltroFim] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    carregarRelatorios();
  }, [user, navigate]);

  const carregarRelatorios = async () => {
    try {
      const { data, error } = await supabase
        .from('relatorio_downloads')
        .select('*')
        .order('data_criacao', { ascending: false });

      if (error) throw error;
      setRelatorios(data || []);
    } catch (error) {
      console.error('Erro ao carregar relatórios:', error);
    } finally {
      setLoading(false);
    }
  };

  const relatorisFiltrados = relatorios.filter(r => {
    if (!filtroInicio && !filtroFim) return true;
    const data = new Date(r.data_criacao);
    const inicio = filtroInicio ? new Date(filtroInicio) : null;
    const fim = filtroFim ? new Date(filtroFim + 'T23:59:59') : null;

    if (inicio && data < inicio) return false;
    if (fim && data > fim) return false;
    return true;
  });

  const calcularEstatisticas = () => {
    const regioes = new Map<string, EstatisticaRegiao>();
    const vendedores = new Map<string, EstatisticaVendedor>();
    const produtos = new Map<string, EstatisticaProduto>();

    relatorisFiltrados.forEach(rel => {
      const regiao = rel.estado && rel.cidade
        ? `${rel.cidade} - ${rel.estado}`
        : rel.estado || rel.cidade || 'Não informado';

      if (!regioes.has(regiao)) {
        regioes.set(regiao, {
          regiao,
          total: 0,
          vendedores: new Set(),
          produtos: new Set()
        });
      }
      const estatRegiao = regioes.get(regiao)!;
      estatRegiao.total++;
      estatRegiao.vendedores.add(rel.nome_vendedor);
      if (rel.produto_cropfield) estatRegiao.produtos.add(rel.produto_cropfield);
      if (rel.produto_concorrente) estatRegiao.produtos.add(rel.produto_concorrente);

      if (!vendedores.has(rel.nome_vendedor)) {
        vendedores.set(rel.nome_vendedor, {
          nome: rel.nome_vendedor,
          telefone: rel.telefone_vendedor || '',
          total: 0,
          regioes: new Set()
        });
      }
      const estatVendedor = vendedores.get(rel.nome_vendedor)!;
      estatVendedor.total++;
      estatVendedor.regioes.add(regiao);

      if (rel.produto_cropfield) {
        const key = `cropfield_${rel.produto_cropfield}`;
        if (!produtos.has(key)) {
          produtos.set(key, {
            nome: rel.produto_cropfield,
            tipo: 'cropfield',
            total: 0
          });
        }
        produtos.get(key)!.total++;
      }

      if (rel.produto_concorrente) {
        const key = `concorrente_${rel.produto_concorrente}`;
        if (!produtos.has(key)) {
          produtos.set(key, {
            nome: rel.produto_concorrente,
            tipo: 'concorrente',
            total: 0
          });
        }
        produtos.get(key)!.total++;
      }
    });

    return {
      regioes: Array.from(regioes.values()).sort((a, b) => b.total - a.total),
      vendedores: Array.from(vendedores.values()).sort((a, b) => b.total - a.total),
      produtos: Array.from(produtos.values()).sort((a, b) => b.total - a.total)
    };
  };

  const gerarPDF = () => {
    const doc = new jsPDF();
    const stats = calcularEstatisticas();

    const addHeader = (pageNum: number = 1) => {
      doc.setFillColor(34, 139, 34);
      doc.rect(0, 0, 210, 40, 'F');

      try {
        const logo = document.querySelector('img[src*="gcf_logo"]') as HTMLImageElement;
        if (logo) {
          doc.addImage(logo.src, 'PNG', 15, 8, 25, 25);
        }
      } catch (e) {
        console.log('Logo não carregado');
      }

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text('Relatório de Uso do Sistema', 45, 18);

      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text('Análise de Comparativos e Estatísticas', 45, 27);

      doc.setTextColor(100, 100, 100);
      doc.setFontSize(9);
      const dataAtual = new Date().toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      });
      doc.text(`Gerado em: ${dataAtual}`, 15, 48);

      if (filtroInicio || filtroFim) {
        const periodo = `Período: ${filtroInicio ? new Date(filtroInicio).toLocaleDateString('pt-BR') : '...'} até ${filtroFim ? new Date(filtroFim).toLocaleDateString('pt-BR') : '...'}`;
        doc.text(periodo, 15, 53);
      }
    };

    addHeader();

    doc.setFontSize(16);
    doc.setTextColor(34, 139, 34);
    doc.setFont('helvetica', 'bold');
    doc.text('Resumo Geral', 15, 65);

    doc.setFontSize(11);
    doc.setTextColor(60, 60, 60);
    doc.setFont('helvetica', 'normal');

    const totalComparações = relatorisFiltrados.length;
    const totalRegioes = stats.regioes.length;
    const totalVendedores = stats.vendedores.length;
    const totalProdutos = stats.produtos.length;

    const resumoData = [
      ['Total de Comparações', totalComparações.toString()],
      ['Regiões Atendidas', totalRegioes.toString()],
      ['Vendedores Ativos', totalVendedores.toString()],
      ['Produtos Comparados', totalProdutos.toString()]
    ];

    doc.autoTable({
      startY: 70,
      head: [['Métrica', 'Valor']],
      body: resumoData,
      theme: 'grid',
      headStyles: {
        fillColor: [34, 139, 34],
        textColor: [255, 255, 255],
        fontSize: 11,
        fontStyle: 'bold'
      },
      bodyStyles: {
        fontSize: 10,
        textColor: [60, 60, 60]
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      },
      margin: { left: 15, right: 15 }
    });

    let currentY = doc.lastAutoTable.finalY + 15;

    doc.setFontSize(16);
    doc.setTextColor(34, 139, 34);
    doc.setFont('helvetica', 'bold');
    doc.text('Estatísticas por Região', 15, currentY);

    const regioesTop10 = stats.regioes.slice(0, 10);
    const regioesData = regioesTop10.map(r => [
      r.regiao,
      r.total.toString(),
      r.vendedores.size.toString(),
      r.produtos.size.toString()
    ]);

    doc.autoTable({
      startY: currentY + 5,
      head: [['Região', 'Comparações', 'Vendedores', 'Produtos']],
      body: regioesData,
      theme: 'grid',
      headStyles: {
        fillColor: [34, 139, 34],
        textColor: [255, 255, 255],
        fontSize: 10,
        fontStyle: 'bold'
      },
      bodyStyles: {
        fontSize: 9,
        textColor: [60, 60, 60]
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      },
      margin: { left: 15, right: 15 }
    });

    doc.addPage();
    addHeader(2);

    doc.setFontSize(16);
    doc.setTextColor(34, 139, 34);
    doc.setFont('helvetica', 'bold');
    doc.text('Estatísticas por Vendedor', 15, 65);

    const vendedoresTop10 = stats.vendedores.slice(0, 10);
    const vendedoresData = vendedoresTop10.map(v => [
      v.nome,
      v.telefone || '-',
      v.total.toString(),
      v.regioes.size.toString()
    ]);

    doc.autoTable({
      startY: 70,
      head: [['Nome', 'Telefone', 'Comparações', 'Regiões']],
      body: vendedoresData,
      theme: 'grid',
      headStyles: {
        fillColor: [34, 139, 34],
        textColor: [255, 255, 255],
        fontSize: 10,
        fontStyle: 'bold'
      },
      bodyStyles: {
        fontSize: 9,
        textColor: [60, 60, 60]
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      },
      margin: { left: 15, right: 15 },
      columnStyles: {
        0: { cellWidth: 60 },
        1: { cellWidth: 40 }
      }
    });

    currentY = doc.lastAutoTable.finalY + 15;

    doc.setFontSize(16);
    doc.setTextColor(34, 139, 34);
    doc.setFont('helvetica', 'bold');
    doc.text('Produtos Mais Comparados', 15, currentY);

    const produtosTop10 = stats.produtos.slice(0, 10);
    const produtosData = produtosTop10.map(p => [
      p.nome,
      p.tipo === 'cropfield' ? 'CropField' : 'Concorrente',
      p.total.toString()
    ]);

    doc.autoTable({
      startY: currentY + 5,
      head: [['Produto', 'Tipo', 'Comparações']],
      body: produtosData,
      theme: 'grid',
      headStyles: {
        fillColor: [34, 139, 34],
        textColor: [255, 255, 255],
        fontSize: 10,
        fontStyle: 'bold'
      },
      bodyStyles: {
        fontSize: 9,
        textColor: [60, 60, 60]
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      },
      margin: { left: 15, right: 15 }
    });

    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.text(
        `Página ${i} de ${totalPages}`,
        105,
        290,
        { align: 'center' }
      );
    }

    const nomeArquivo = `Relatorio_Uso_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(nomeArquivo);
  };

  const stats = calcularEstatisticas();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gcf-green mx-auto"></div>
          <p className="mt-4 text-gcf-black/60">Carregando relatórios...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/admin')}
              className="p-2 hover:bg-white rounded-[10px] transition-colors"
            >
              <ArrowLeft className="text-gcf-black" size={24} />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gcf-black">Relatórios e Estatísticas</h1>
              <p className="text-gcf-black/60 mt-1">Análise de uso do sistema de comparativos</p>
            </div>
          </div>

          <button
            onClick={gerarPDF}
            className="flex items-center gap-2 px-6 py-3 bg-gcf-green hover:bg-gcf-green/90 text-white rounded-[12px] font-semibold transition-all shadow-lg hover:shadow-xl"
          >
            <Download size={20} />
            Baixar Relatório PDF
          </button>
        </div>

        <div className="bg-white rounded-[16px] shadow-sm border border-gcf-black/5 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Calendar className="text-gcf-green" size={20} />
            <h2 className="text-lg font-bold text-gcf-black">Filtro por Período</h2>
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="label-gcf">Data Início</label>
              <input
                type="date"
                value={filtroInicio}
                onChange={(e) => setFiltroInicio(e.target.value)}
                className="input-gcf"
              />
            </div>
            <div className="flex-1">
              <label className="label-gcf">Data Fim</label>
              <input
                type="date"
                value={filtroFim}
                onChange={(e) => setFiltroFim(e.target.value)}
                className="input-gcf"
              />
            </div>
            {(filtroInicio || filtroFim) && (
              <div className="flex items-end">
                <button
                  onClick={() => {
                    setFiltroInicio('');
                    setFiltroFim('');
                  }}
                  className="px-4 py-2 border border-gcf-black/20 text-gcf-black rounded-[10px] hover:bg-gcf-black/5 transition-colors"
                >
                  Limpar
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-[16px] shadow-sm border border-gcf-black/5 p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-gcf-green/10 rounded-[10px]">
                <BarChart3 className="text-gcf-green" size={24} />
              </div>
              <div>
                <p className="text-sm text-gcf-black/60">Total de Comparações</p>
                <p className="text-3xl font-bold text-gcf-black">{relatorisFiltrados.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[16px] shadow-sm border border-gcf-black/5 p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-500/10 rounded-[10px]">
                <MapPin className="text-blue-600" size={24} />
              </div>
              <div>
                <p className="text-sm text-gcf-black/60">Regiões Atendidas</p>
                <p className="text-3xl font-bold text-gcf-black">{stats.regioes.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[16px] shadow-sm border border-gcf-black/5 p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-purple-500/10 rounded-[10px]">
                <Users className="text-purple-600" size={24} />
              </div>
              <div>
                <p className="text-sm text-gcf-black/60">Vendedores Ativos</p>
                <p className="text-3xl font-bold text-gcf-black">{stats.vendedores.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[16px] shadow-sm border border-gcf-black/5 p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-orange-500/10 rounded-[10px]">
                <Package className="text-orange-600" size={24} />
              </div>
              <div>
                <p className="text-sm text-gcf-black/60">Produtos Comparados</p>
                <p className="text-3xl font-bold text-gcf-black">{stats.produtos.length}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-[16px] shadow-sm border border-gcf-black/5 p-6">
            <div className="flex items-center gap-3 mb-4">
              <MapPin className="text-gcf-green" size={20} />
              <h2 className="text-lg font-bold text-gcf-black">Top 10 Regiões</h2>
            </div>
            <div className="space-y-3">
              {stats.regioes.slice(0, 10).map((regiao, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gcf-black/[0.02] rounded-[10px] border border-gcf-black/5">
                  <div className="flex-1">
                    <p className="font-semibold text-gcf-black">{regiao.regiao}</p>
                    <p className="text-xs text-gcf-black/60">
                      {regiao.vendedores.size} vendedores • {regiao.produtos.size} produtos
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gcf-green">{regiao.total}</p>
                    <p className="text-xs text-gcf-black/60">comparações</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-[16px] shadow-sm border border-gcf-black/5 p-6">
            <div className="flex items-center gap-3 mb-4">
              <Users className="text-gcf-green" size={20} />
              <h2 className="text-lg font-bold text-gcf-black">Top 10 Vendedores</h2>
            </div>
            <div className="space-y-3">
              {stats.vendedores.slice(0, 10).map((vendedor, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gcf-black/[0.02] rounded-[10px] border border-gcf-black/5">
                  <div className="flex-1">
                    <p className="font-semibold text-gcf-black">{vendedor.nome}</p>
                    <p className="text-xs text-gcf-black/60">
                      {vendedor.telefone} • {vendedor.regioes.size} regiões
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gcf-green">{vendedor.total}</p>
                    <p className="text-xs text-gcf-black/60">comparações</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-[16px] shadow-sm border border-gcf-black/5 p-6">
          <div className="flex items-center gap-3 mb-4">
            <TrendingUp className="text-gcf-green" size={20} />
            <h2 className="text-lg font-bold text-gcf-black">Produtos Mais Comparados</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {stats.produtos.slice(0, 10).map((produto, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gcf-black/[0.02] rounded-[10px] border border-gcf-black/5">
                <div className="flex-1">
                  <p className="font-semibold text-gcf-black">{produto.nome}</p>
                  <p className="text-xs text-gcf-black/60">
                    {produto.tipo === 'cropfield' ? 'Produto CropField' : 'Produto Concorrente'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-gcf-green">{produto.total}</p>
                  <p className="text-xs text-gcf-black/60">vezes</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
