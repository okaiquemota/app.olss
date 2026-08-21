import { useState } from 'react';
import { Check, Copy, Eye, EyeOff } from 'lucide-react';

// `mascarar` esconde o valor por trás de bolinhas até o usuário clicar no olho.
// Usado nas senhas do Monitoramento, que ficam abertas na tela o tempo todo.
export function CopyButton({ text, mascarar = false }) {
  const [copied, setCopied] = useState(false);
  const [revelado, setRevelado] = useState(false);

  const handleCopy = () => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!text) {
    return <span className="text-gray-500 text-[13px] font-medium italic">Não cadastrado</span>;
  }

  const escondido = mascarar && !revelado;

  return (
    <div className="flex items-center gap-1 group">
      <span
        className={`text-sm font-mono truncate ${escondido ? 'text-gray-500 tracking-widest select-none' : 'text-gray-700'}`}
        title={escondido ? 'Oculto — clique no olho para exibir' : text}
      >
        {escondido ? '••••••••' : text}
      </span>

      {mascarar && (
        <button
          type="button"
          onClick={() => setRevelado(v => !v)}
          className="text-gray-500 hover:text-gray-800 transition-colors p-1.5 rounded-none hover:bg-gray-200 cursor-pointer shrink-0"
          title={revelado ? 'Ocultar' : 'Exibir'}
          aria-label={revelado ? 'Ocultar senha' : 'Exibir senha'}
        >
          {revelado ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      )}

      <button
        type="button"
        onClick={handleCopy}
        className="text-gray-500 hover:text-green-600 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 p-1.5 rounded-none hover:bg-green-50 cursor-pointer shrink-0"
        title="Copiar"
        aria-label="Copiar"
      >
        {copied ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
      </button>
    </div>
  );
}
