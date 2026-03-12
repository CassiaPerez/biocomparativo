import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, LogIn, AlertCircle, Leaf } from 'lucide-react';
import { supabase, supabaseEnabled } from '../lib/supabase';

const gcfLogo = '/gcf_logo.png';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!supabaseEnabled || !supabase) {
      setError('Autenticação não está configurada');
      return;
    }

    if (!email.trim() || !password.trim()) {
      setError('Preencha email e senha');
      return;
    }

    setLoading(true);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });

      if (signInError) throw signInError;

      if (data.session) {
        navigate('/admin');
      }
    } catch (err: any) {
      console.error('Erro ao fazer login:', err);

      if (err.message?.includes('Invalid login credentials')) {
        setError('Email ou senha inválidos');
      } else if (err.message?.includes('Email not confirmed')) {
        setError('Email não confirmado');
      } else {
        setError(err.message || 'Erro ao fazer login');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gcf-green to-[#008f4f] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-[24px] shadow-2xl p-8 sm:p-10">
          <div className="flex flex-col items-center mb-8">
            <img src={gcfLogo} alt="GCF Logo" className="h-16 w-auto mb-6" draggable={false} />

            <div className="p-4 bg-gcf-green/10 rounded-full mb-4">
              <Lock size={32} className="text-gcf-green" />
            </div>

            <h1 className="text-2xl font-bold text-gcf-black text-center">Painel Administrativo</h1>
            <p className="text-sm text-gcf-black/60 text-center mt-2">
              Faça login para acessar o painel
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-[14px] flex items-start gap-3">
              <AlertCircle size={20} className="text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-red-900">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gcf-black/60 uppercase tracking-wider">
                Email
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gcf-black/40">
                  <Mail size={18} />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border border-gcf-black/20 rounded-[12px] focus:border-gcf-green focus:ring-2 focus:ring-gcf-green/20 outline-none transition-all"
                  placeholder="seu@email.com"
                  disabled={loading}
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gcf-black/60 uppercase tracking-wider">
                Senha
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gcf-black/40">
                  <Lock size={18} />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border border-gcf-black/20 rounded-[12px] focus:border-gcf-green focus:ring-2 focus:ring-gcf-green/20 outline-none transition-all"
                  placeholder="••••••••"
                  disabled={loading}
                  autoComplete="current-password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gcf-green text-white rounded-[12px] font-semibold hover:bg-gcf-green/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Entrando...</span>
                </>
              ) : (
                <>
                  <LogIn size={18} />
                  <span>Entrar</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-gcf-black/10">
            <button
              onClick={() => navigate('/')}
              className="w-full text-sm text-gcf-black/60 hover:text-gcf-black transition-colors font-medium"
            >
              Voltar para o Comparativo
            </button>
          </div>
        </div>

        <div className="mt-6 text-center">
          <div className="flex items-center justify-center gap-2 text-white/80 text-sm">
            <Leaf size={16} />
            <span>Cropfield - Sistema Administrativo</span>
          </div>
        </div>
      </div>
    </div>
  );
}
