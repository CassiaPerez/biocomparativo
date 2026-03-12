import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, Download, Package, ArrowLeft, Leaf, LogOut, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import DownloadsView from '../components/DownloadsView';
import ProductsManager from '../components/ProductsManager';

type TabType = 'downloads' | 'products';

const gcfLogo = '/gcf_logo.png';

export default function Admin() {
  const [activeTab, setActiveTab] = useState<TabType>('downloads');
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gcf-offwhite">
      <header className="bg-white border-b border-gcf-black/10 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center gap-6">
              <img src={gcfLogo} alt="GCF Logo" className="h-8 w-auto" draggable={false} />
              <div className="h-8 w-px bg-gcf-black/10"></div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gcf-green/10 rounded-[10px]">
                  <Settings size={20} className="text-gcf-green" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gcf-black tracking-tight">Painel Administrativo</h1>
                  <p className="text-xs text-gcf-black/60">Gerencie produtos e visualize downloads</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {user && (
                <div className="hidden sm:flex items-center gap-2 px-3 py-2 bg-gcf-green/10 rounded-[12px]">
                  <User size={16} className="text-gcf-green" />
                  <span className="text-sm font-medium text-gcf-black">{user.email}</span>
                </div>
              )}

              <button
                onClick={() => navigate('/')}
                className="flex items-center gap-2 px-4 py-2 bg-gcf-black/5 hover:bg-gcf-black/10 text-gcf-black rounded-[12px] font-semibold text-sm transition-colors"
              >
                <ArrowLeft size={16} />
                <span className="hidden sm:inline">Voltar ao Comparativo</span>
              </button>

              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-[12px] font-semibold text-sm transition-colors"
                title="Sair"
              >
                <LogOut size={16} />
                <span className="hidden sm:inline">Sair</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex gap-2 bg-white p-2 rounded-[14px] border border-gcf-black/10 inline-flex">
            <button
              onClick={() => setActiveTab('downloads')}
              className={`flex items-center gap-2 px-6 py-3 rounded-[12px] font-semibold text-sm transition-all ${
                activeTab === 'downloads'
                  ? 'bg-gcf-green text-white shadow-lg shadow-gcf-green/20'
                  : 'text-gcf-black/60 hover:text-gcf-black hover:bg-gcf-black/5'
              }`}
            >
              <Download size={18} />
              Downloads de Relatórios
            </button>
            <button
              onClick={() => setActiveTab('products')}
              className={`flex items-center gap-2 px-6 py-3 rounded-[12px] font-semibold text-sm transition-all ${
                activeTab === 'products'
                  ? 'bg-gcf-green text-white shadow-lg shadow-gcf-green/20'
                  : 'text-gcf-black/60 hover:text-gcf-black hover:bg-gcf-black/5'
              }`}
            >
              <Package size={18} />
              Gerenciar Produtos
            </button>
          </div>
        </div>

        <div className="bg-white rounded-[24px] border border-gcf-black/10 shadow-xl p-6 sm:p-8">
          {activeTab === 'downloads' && <DownloadsView />}
          {activeTab === 'products' && <ProductsManager />}
        </div>
      </div>

      <footer className="mt-16 pb-8 text-center">
        <div className="flex items-center justify-center gap-2 text-gcf-black/40 text-sm">
          <Leaf size={16} className="text-gcf-green" />
          <span>Cropfield</span>
          <span className="mx-2">•</span>
          <span>Sistema de Comparação de Biológicos</span>
        </div>
      </footer>
    </div>
  );
}
