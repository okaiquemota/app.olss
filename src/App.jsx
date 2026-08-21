import { useState, useEffect, lazy, Suspense } from 'react';
import {
  Activity,
  FileText,
  LayoutDashboard,
  Loader2,
  LogOut,
  Map,
  Menu,
  AlertCircle,
  Settings,
  StickyNote,
  Users,
  X,
  Zap,
} from 'lucide-react';

import { Login } from './pages/Login';
import { DefinirSenha } from './pages/DefinirSenha';
import { supabase } from './lib/supabase';
import { linkAuth } from './lib/linkAuth';

// Cada tela vira um chunk próprio: quem abre só "Lembretes" não baixa o
// gerador de PDF (Relatórios), o Leaflet (Mapa) nem o Recharts (Visão Geral).
const Clientes = lazy(() => import('./pages/Clientes').then(m => ({ default: m.Clientes })));
const Configuracoes = lazy(() => import('./pages/Configuracoes').then(m => ({ default: m.Configuracoes })));
const MapaUsinas = lazy(() => import('./pages/MapaUsinas').then(m => ({ default: m.MapaUsinas })));
const Monitoramento = lazy(() => import('./pages/Monitoramento').then(m => ({ default: m.Monitoramento })));
const Pendencias = lazy(() => import('./pages/Pendencias').then(m => ({ default: m.Pendencias })));
const Relatorios = lazy(() => import('./pages/Relatorios').then(m => ({ default: m.Relatorios })));
const VisaoGeral = lazy(() => import('./pages/VisaoGeral').then(m => ({ default: m.VisaoGeral })));

const MENU_SECTIONS = [
  {
    label: 'Rotina',
    items: [
      { id: 'dashboard', icon: LayoutDashboard, label: 'Visão Geral' },
      { id: 'pendencias', icon: StickyNote, label: 'Lembretes' },
    ],
  },
  {
    label: 'Operação',
    items: [
      { id: 'clientes', icon: Users, label: 'Cadastros' },
      { id: 'mapa', icon: Map, label: 'Mapa de Usinas' },
      { id: 'monitoramento', icon: Activity, label: 'Monitoramento' },
    ],
  },
  {
    label: 'Faturamento',
    items: [
      { id: 'relatorios', icon: FileText, label: 'Relatórios' },
    ],
  },
];

const PAGE_TITLES = {
  dashboard: 'Visão Geral',
  pendencias: 'Lembretes',
  clientes: 'Cadastros',
  mapa: 'Mapa de Usinas',
  monitoramento: 'Monitoramento',
  relatorios: 'Relatórios',
  configuracoes: 'Configurações',
};

function MenuItem({ id, icon: Icone, label, telaAtiva, onSelect }) {
  const ativo = telaAtiva === id;

  return (
    <button
      type="button"
      onClick={() => onSelect(id)}
      className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors cursor-pointer font-medium text-[13px] border-l-2 ${
        ativo
          ? 'bg-green-500/15 text-green-400 border-green-500'
          : 'text-gray-400 border-transparent hover:bg-white/5 hover:text-white'
      }`}
    >
      <Icone size={17} strokeWidth={ativo ? 2.3 : 1.8} />
      <span className="truncate">{label}</span>
    </button>
  );
}

function App() {
  const [sessao, setSessao] = useState(undefined); // undefined = verificando, null = deslogado
  const [telaAtiva, setTelaAtiva] = useState('dashboard');
  const [menuAberto, setMenuAberto] = useState(true);
  const [confirmandoSaida, setConfirmandoSaida] = useState(false);

  // Chegou por link de convite ou de redefinição de senha
  const [definindoSenha, setDefinindoSenha] = useState(linkAuth.tipo);
  const [erroLink, setErroLink] = useState(linkAuth.erro);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSessao(data.session));

    const { data: listener } = supabase.auth.onAuthStateChange((evento, novaSessao) => {
      // Disparado quando a pessoa abre o link de "esqueci minha senha"
      if (evento === 'PASSWORD_RECOVERY') setDefinindoSenha('recovery');
      setSessao(novaSessao);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  // Esc fecha a confirmação de saída
  useEffect(() => {
    if (!confirmandoSaida) return;
    const aoTeclar = (e) => { if (e.key === 'Escape') setConfirmandoSaida(false); };
    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, [confirmandoSaida]);

  const selecionarTela = (id) => {
    setTelaAtiva(id);
    if (window.innerWidth < 768) setMenuAberto(false);
  };

  // Link de e-mail vencido ou já usado
  if (erroLink) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gray-200 p-4">
        <div className="w-full max-w-sm bg-white border border-gray-400 shadow-sm p-6 flex flex-col items-center text-center gap-3">
          <div className="w-10 h-10 bg-red-600 text-white flex items-center justify-center">
            <AlertCircle size={20} />
          </div>
          <h1 className="text-base font-bold text-gray-800 leading-none">Link inválido</h1>
          <p className="text-[13px] text-gray-700 leading-relaxed">{erroLink}</p>
          <button
            type="button"
            onClick={() => setErroLink('')}
            className="w-full mt-2 bg-green-700 text-white px-4 py-2.5 text-[13px] font-medium hover:bg-green-800 transition-colors cursor-pointer rounded-none"
          >
            Ir para o login
          </button>
        </div>
      </div>
    );
  }

  if (sessao === undefined) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gray-200 text-gray-600">
        <Loader2 className="animate-spin" size={24} />
      </div>
    );
  }

  // Convite ou redefinição: a sessão do link já vale, falta escolher a senha
  if (definindoSenha && sessao) {
    return <DefinirSenha tipo={definindoSenha} onConcluido={() => setDefinindoSenha(null)} />;
  }

  if (!sessao) {
    return <Login />;
  }

  return (
    <div className="flex h-screen bg-gray-200 font-sans overflow-hidden antialiased text-sm text-gray-800">
      {menuAberto && (
        <button
          type="button"
          aria-label="Fechar menu"
          onClick={() => setMenuAberto(false)}
          className="fixed inset-0 bg-black/20 z-20 md:hidden"
        />
      )}

      <aside className={`fixed md:relative inset-y-0 left-0 z-30 w-64 bg-gray-900 border-r border-gray-950 flex flex-col transition-transform duration-200 ${menuAberto ? 'translate-x-0' : '-translate-x-full md:-ml-64'}`}>
        <div className="h-12 border-b border-white/10 px-3 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 bg-green-600 text-white flex items-center justify-center">
              <Zap size={16} fill="currentColor" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-bold leading-none text-white">OLSS</h1>
              <p className="text-[10px] text-gray-400 font-semibold tracking-wider mt-0.5">OPERACIONAL</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMenuAberto(false)}
            className="p-1.5 text-gray-400 hover:bg-white/10 hover:text-white cursor-pointer"
            title="Fechar menu"
          >
            <X size={17} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-2">
          {MENU_SECTIONS.map(section => (
            <div key={section.label} className="py-2">
              <p className="px-3 pb-1 text-[10px] font-bold text-gray-500 uppercase tracking-wider">{section.label}</p>
              <div>
                {section.items.map(item => (
                  <MenuItem
                    key={item.id}
                    id={item.id}
                    icon={item.icon}
                    label={item.label}
                    telaAtiva={telaAtiva}
                    onSelect={selecionarTela}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-white/10 py-2">
          <p className="px-3 pb-1.5 text-[11px] text-gray-500 font-medium truncate" title={sessao.user?.email}>
            {sessao.user?.email}
          </p>
          <MenuItem id="configuracoes" icon={Settings} label="Configurações" telaAtiva={telaAtiva} onSelect={selecionarTela} />
          <button
            type="button"
            onClick={() => setConfirmandoSaida(true)}
            className="w-full flex items-center gap-3 px-3 py-2 text-gray-400 hover:bg-red-500/10 hover:text-red-400 transition-colors font-medium text-[13px] cursor-pointer border-l-2 border-transparent"
          >
            <LogOut size={17} strokeWidth={1.8} />
            Sair do Sistema
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">
        <header className="h-12 bg-white border-b border-gray-300 shadow-sm px-3 md:px-4 flex items-center gap-3 shrink-0 z-10">

          {!menuAberto && (
            <>
              <button
                type="button"
                onClick={() => setMenuAberto(true)}
                className="p-2 text-gray-700 hover:bg-gray-200 cursor-pointer"
                title="Abrir menu"
              >
                <Menu size={19} />
              </button>
              <div className="h-5 w-px bg-gray-300" />
            </>
          )}

          <h2 className="text-sm font-bold text-gray-800 truncate">{PAGE_TITLES[telaAtiva] || telaAtiva}</h2>
        </header>

        <div className="flex-1 overflow-y-auto p-3 md:p-4">
          <Suspense fallback={
            <div className="w-full h-full flex items-center justify-center text-gray-600">
              <Loader2 className="animate-spin" size={24} />
            </div>
          }>
            {telaAtiva === 'dashboard' && <VisaoGeral />}
            {telaAtiva === 'relatorios' && <Relatorios />}
            {telaAtiva === 'clientes' && <Clientes />}
            {telaAtiva === 'pendencias' && <Pendencias />}
            {telaAtiva === 'monitoramento' && <Monitoramento />}
            {telaAtiva === 'mapa' && <MapaUsinas />}
            {telaAtiva === 'configuracoes' && <Configuracoes />}
          </Suspense>

          {!['dashboard', 'relatorios', 'clientes', 'pendencias', 'monitoramento', 'mapa', 'configuracoes'].includes(telaAtiva) && (
            <div className="h-full border border-dashed border-gray-400 bg-white flex items-center justify-center">
              <div className="text-center">
                <Activity size={28} strokeWidth={1.5} className="mx-auto mb-3 text-gray-400" />
                <h2 className="text-sm font-semibold text-gray-800 capitalize">{telaAtiva.replace('_', ' ')}</h2>
                <p className="text-xs text-gray-600 mt-1">Módulo em estruturação.</p>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* CONFIRMAÇÃO DE SAÍDA — evita deslogar por clique acidental */}
      {confirmandoSaida && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-[70] flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setConfirmandoSaida(false); }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-confirmar-saida"
            className="bg-white shadow-2xl border border-gray-400 w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 rounded-none"
          >
            <div className="flex justify-between items-center p-4 border-b border-gray-400 bg-gray-100">
              <h3 id="titulo-confirmar-saida" className="font-bold text-[13px] uppercase tracking-wider text-gray-800">Sair do Sistema</h3>
              <button
                type="button"
                onClick={() => setConfirmandoSaida(false)}
                className="text-gray-600 hover:text-red-600 hover:bg-red-50 p-1.5 transition-colors cursor-pointer border border-transparent hover:border-red-200 rounded-none"
                title="Fechar"
              >
                <X size={16} strokeWidth={2.5} />
              </button>
            </div>

            <div className="p-5">
              <p className="text-[13px] text-gray-700 leading-relaxed">
                Deseja mesmo encerrar a sessão? Você precisará entrar com e-mail e senha novamente.
              </p>

              <div className="flex gap-2 mt-5">
                <button
                  type="button"
                  autoFocus
                  onClick={() => setConfirmandoSaida(false)}
                  className="flex-1 bg-white border border-gray-400 text-gray-700 px-4 py-2.5 text-[12px] font-bold hover:bg-gray-200 transition-colors cursor-pointer rounded-none"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => { setConfirmandoSaida(false); supabase.auth.signOut(); }}
                  className="flex-1 flex items-center justify-center gap-2 bg-red-600 text-white px-4 py-2.5 text-[12px] font-bold hover:bg-red-700 transition-colors cursor-pointer rounded-none"
                >
                  <LogOut size={14} strokeWidth={2.2} />
                  Sair
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;