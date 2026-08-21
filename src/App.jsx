import { useState, useEffect } from 'react';
import {
  Activity,
  FileText,
  LayoutDashboard,
  Loader2,
  LogOut,
  Map,
  Menu,
  Settings,
  StickyNote,
  Users,
  X,
  Zap,
} from 'lucide-react';

import { Clientes } from './pages/Clientes';
import { Configuracoes } from './pages/Configuracoes';
import { Login } from './pages/Login';
import { MapaUsinas } from './pages/MapaUsinas';
import { Monitoramento } from './pages/Monitoramento';
import { Pendencias } from './pages/Pendencias';
import { Relatorios } from './pages/Relatorios';
import { VisaoGeral } from './pages/VisaoGeral';
import { supabase } from './lib/supabase';

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

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSessao(data.session));

    const { data: listener } = supabase.auth.onAuthStateChange((_evento, novaSessao) => {
      setSessao(novaSessao);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const selecionarTela = (id) => {
    setTelaAtiva(id);
    if (window.innerWidth < 768) setMenuAberto(false);
  };

  if (sessao === undefined) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gray-200 text-gray-600">
        <Loader2 className="animate-spin" size={24} />
      </div>
    );
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
            onClick={() => supabase.auth.signOut()}
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
          {telaAtiva === 'dashboard' && <VisaoGeral />}
          {telaAtiva === 'relatorios' && <Relatorios />}
          {telaAtiva === 'clientes' && <Clientes />}
          {telaAtiva === 'pendencias' && <Pendencias />}
          {telaAtiva === 'monitoramento' && <Monitoramento />}
          {telaAtiva === 'mapa' && <MapaUsinas />}
          {telaAtiva === 'configuracoes' && <Configuracoes />}

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
    </div>
  );
}

export default App;