import { useState } from 'react';
import { Zap, Loader2, AlertCircle, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

const MINIMO = 8;

// Tela aberta quando a pessoa chega por um link de convite ou de redefinição de
// senha. O link já autentica a sessão; aqui ela escolhe a própria senha, que
// ninguém mais precisa conhecer.
export function DefinirSenha({ tipo, onConcluido }) {
  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [pronto, setPronto] = useState(false);

  const ehConvite = tipo === 'invite';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro('');

    if (senha.length < MINIMO) {
      setErro(`A senha precisa ter pelo menos ${MINIMO} caracteres.`);
      return;
    }
    if (senha !== confirmacao) {
      setErro('As duas senhas não são iguais.');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: senha });
    setLoading(false);

    if (error) {
      // Sessão do link não vale mais (expirou, já foi usada ou a aba ficou aberta tempo demais)
      setErro(
        error.message?.toLowerCase().includes('session')
          ? 'A sessão deste link expirou. Peça um novo convite e tente de novo.'
          : `Não foi possível salvar a senha: ${error.message || 'erro desconhecido'}`
      );
      return;
    }

    setPronto(true);
  };

  const inputClass = "w-full bg-white border border-gray-400 px-3 py-2 pr-10 text-[13px] text-gray-800 focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500 rounded-none placeholder:text-gray-500";
  const labelClass = "block text-[11px] font-bold text-gray-700 mb-1.5 uppercase tracking-wider";

  if (pronto) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gray-200 p-4">
        <div className="w-full max-w-sm bg-white border border-gray-400 shadow-sm">
          <div className="p-6 flex flex-col items-center text-center gap-3">
            <div className="w-10 h-10 bg-green-700 text-white flex items-center justify-center">
              <CheckCircle2 size={20} />
            </div>
            <h1 className="text-base font-bold text-gray-800 leading-none">Senha definida</h1>
            <p className="text-[13px] text-gray-700 leading-relaxed">
              Sua senha já está valendo. Guarde-a: ninguém mais tem acesso a ela.
            </p>
            <button
              type="button"
              onClick={onConcluido}
              className="w-full mt-2 bg-green-700 text-white px-4 py-2.5 text-[13px] font-medium hover:bg-green-800 transition-colors cursor-pointer rounded-none"
            >
              Entrar no sistema
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen flex items-center justify-center bg-gray-200 p-4">
      <div className="w-full max-w-sm bg-white border border-gray-400 shadow-sm">
        <div className="p-6 border-b border-gray-300 flex flex-col items-center text-center">
          <div className="w-10 h-10 bg-green-700 text-white flex items-center justify-center mb-3">
            <Zap size={20} fill="currentColor" />
          </div>
          <h1 className="text-base font-bold text-gray-800 leading-none">OLSS</h1>
          <p className="text-[10px] text-gray-600 font-semibold tracking-wider mt-1">OPERACIONAL</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <h2 className="text-[13px] font-bold text-gray-800">
              {ehConvite ? 'Crie sua senha de acesso' : 'Defina uma nova senha'}
            </h2>
            <p className="text-[12px] text-gray-600 mt-1 leading-relaxed">
              {ehConvite
                ? 'Escolha uma senha para entrar no sistema. Só você vai saber qual é.'
                : 'Escolha a nova senha da sua conta.'}
            </p>
          </div>

          <div>
            <label className={labelClass} htmlFor="nova-senha">Nova senha</label>
            <div className="relative">
              <input
                id="nova-senha"
                type={mostrarSenha ? 'text' : 'password'}
                required
                autoFocus
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder={`No mínimo ${MINIMO} caracteres`}
                className={inputClass}
              />
              <button
                type="button"
                onClick={() => setMostrarSenha(v => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-800 p-1 cursor-pointer"
                title={mostrarSenha ? 'Ocultar' : 'Exibir'}
                aria-label={mostrarSenha ? 'Ocultar senha' : 'Exibir senha'}
              >
                {mostrarSenha ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label className={labelClass} htmlFor="confirmar-senha">Repita a senha</label>
            <input
              id="confirmar-senha"
              type={mostrarSenha ? 'text' : 'password'}
              required
              value={confirmacao}
              onChange={(e) => setConfirmacao(e.target.value)}
              placeholder="Digite de novo"
              className={inputClass}
            />
          </div>

          {erro && (
            <div className="flex items-start gap-2 text-[12px] text-red-700 bg-red-50 border border-red-200 px-3 py-2">
              <AlertCircle size={14} className="shrink-0 mt-0.5" /> {erro}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-green-700 text-white px-4 py-2.5 text-[13px] font-medium hover:bg-green-800 transition-all cursor-pointer disabled:opacity-50 rounded-none"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : 'Salvar senha'}
          </button>
        </form>
      </div>
    </div>
  );
}
