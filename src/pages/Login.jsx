import { useState } from 'react';
import { Zap, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

export function Login() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro('');
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });

    if (error) setErro('E-mail ou senha inválidos.');
    setLoading(false);
  };

  const inputClass = "w-full bg-white border border-gray-300 px-3 py-2 text-[13px] text-gray-800 focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500 rounded-none placeholder:text-gray-400";
  const labelClass = "block text-[11px] font-bold text-gray-600 mb-1.5 uppercase tracking-wider";

  return (
    <div className="w-full h-screen flex items-center justify-center bg-[#F3F4F6] p-4">
      <div className="w-full max-w-sm bg-white border border-gray-300 shadow-sm">
        <div className="p-6 border-b border-gray-200 flex flex-col items-center text-center">
          <div className="w-10 h-10 bg-green-700 text-white flex items-center justify-center mb-3">
            <Zap size={20} fill="currentColor" />
          </div>
          <h1 className="text-base font-bold text-gray-800 leading-none">OLSS</h1>
          <p className="text-[10px] text-gray-500 font-semibold tracking-wider mt-1">OPERACIONAL</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className={labelClass}>E-mail</label>
            <input
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Senha</label>
            <input
              type="password"
              required
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="••••••••"
              className={inputClass}
            />
          </div>

          {erro && (
            <div className="flex items-center gap-2 text-[12px] text-red-700 bg-red-50 border border-red-200 px-3 py-2">
              <AlertCircle size={14} className="shrink-0" /> {erro}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-green-700 text-white px-4 py-2.5 text-[13px] font-medium hover:bg-green-800 transition-all cursor-pointer disabled:opacity-50 rounded-none"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
