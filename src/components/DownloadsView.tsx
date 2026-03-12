import { useState, useEffect } from 'react';
import { MapPin, Download, Calendar, User, Phone, Package } from 'lucide-react';
import { supabase, supabaseEnabled } from '../lib/supabase';
import type { RelatorioDownload } from '../types/database';

export default function DownloadsView() {
  const [downloads, setDownloads] = useState<RelatorioDownload[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDownloads();
  }, []);

  const loadDownloads = async () => {
    if (!supabaseEnabled || !supabase) {
      setError('Supabase não está configurado');
      setLoading(false);
      return;
    }

    try {
      const { data, error: fetchError } = await supabase
        .from('relatorio_downloads')
        .select('*')
        .order('data_criacao', { ascending: false })
        .limit(100);

      if (fetchError) throw fetchError;

      setDownloads(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar downloads');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(dateString));
  };

  const formatPhone = (phone: string | null) => {
    if (!phone) return '-';
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 11) return digits.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    if (digits.length === 10) return digits.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    return phone;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-gcf-black/40">Carregando downloads...</div>
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

  if (downloads.length === 0) {
    return (
      <div className="p-12 text-center">
        <Download size={48} className="mx-auto text-gcf-black/20 mb-4" />
        <p className="text-gcf-black/40 font-medium">Nenhum download de relatório registrado ainda.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-2xl font-bold text-gcf-black">Downloads de Relatórios</h3>
          <p className="text-sm text-gcf-black/60 mt-1">{downloads.length} registros encontrados</p>
        </div>
        <button
          onClick={loadDownloads}
          className="px-4 py-2 bg-gcf-green text-white rounded-[12px] font-semibold text-sm hover:bg-gcf-green/90 transition-colors"
        >
          Atualizar
        </button>
      </div>

      <div className="grid gap-4">
        {downloads.map((download) => (
          <div
            key={download.id}
            className="bg-white border border-gcf-black/10 rounded-[14px] p-6 hover:shadow-lg transition-shadow"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <User size={18} className="text-gcf-green mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs font-bold text-gcf-black/40 uppercase tracking-wider">Cliente</p>
                    <p className="text-sm font-semibold text-gcf-black mt-1">{download.nome_cliente}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <User size={18} className="text-gcf-green mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs font-bold text-gcf-black/40 uppercase tracking-wider">Vendedor</p>
                    <p className="text-sm font-semibold text-gcf-black mt-1">{download.nome_vendedor}</p>
                  </div>
                </div>

                {download.telefone_vendedor && (
                  <div className="flex items-start gap-3">
                    <Phone size={18} className="text-gcf-green mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs font-bold text-gcf-black/40 uppercase tracking-wider">Telefone</p>
                      <p className="text-sm font-mono text-gcf-black mt-1">
                        {formatPhone(download.telefone_vendedor)}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                {download.produto_cropfield && (
                  <div className="flex items-start gap-3">
                    <Package size={18} className="text-gcf-green mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs font-bold text-gcf-black/40 uppercase tracking-wider">Produto Cropfield</p>
                      <p className="text-sm font-semibold text-gcf-green mt-1">{download.produto_cropfield}</p>
                    </div>
                  </div>
                )}

                {download.produto_concorrente && (
                  <div className="flex items-start gap-3">
                    <Package size={18} className="text-gcf-black/40 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs font-bold text-gcf-black/40 uppercase tracking-wider">Produto Concorrente</p>
                      <p className="text-sm font-semibold text-gcf-black mt-1">{download.produto_concorrente}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <Calendar size={18} className="text-gcf-green mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs font-bold text-gcf-black/40 uppercase tracking-wider">Data/Hora</p>
                    <p className="text-sm font-mono text-gcf-black mt-1">{formatDate(download.data_criacao)}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {download.latitude && download.longitude && (
                  <div className="flex items-start gap-3">
                    <MapPin size={18} className="text-gcf-green mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs font-bold text-gcf-black/40 uppercase tracking-wider">Localização</p>
                      <p className="text-xs font-mono text-gcf-black mt-1">
                        Lat: {Number(download.latitude).toFixed(6)}
                      </p>
                      <p className="text-xs font-mono text-gcf-black">
                        Lng: {Number(download.longitude).toFixed(6)}
                      </p>
                      {download.precisao_localizacao && (
                        <p className="text-xs text-gcf-black/60 mt-1">
                          Precisão: {Math.round(Number(download.precisao_localizacao))}m
                        </p>
                      )}
                      <a
                        href={`https://www.google.com/maps?q=${download.latitude},${download.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block mt-2 text-xs font-semibold text-gcf-green hover:underline"
                      >
                        Ver no mapa
                      </a>
                    </div>
                  </div>
                )}

                {download.nome_pdf && (
                  <div className="flex items-start gap-3">
                    <Download size={18} className="text-gcf-green mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs font-bold text-gcf-black/40 uppercase tracking-wider">Arquivo PDF</p>
                      <p className="text-xs font-mono text-gcf-black/60 mt-1 break-all">{download.nome_pdf}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
