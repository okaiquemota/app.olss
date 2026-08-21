import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

export function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!text) {
    return <span className="text-gray-400 text-[13px] font-medium italic">Não cadastrado</span>;
  }

  return (
    <div className="flex items-center gap-2 group">
      <span className="text-sm font-mono text-gray-700 truncate">{text}</span>
      <button
        type="button"
        onClick={handleCopy}
        className="text-gray-500 hover:text-green-600 transition-colors opacity-0 group-hover:opacity-100 p-1.5 rounded-none hover:bg-green-50 cursor-pointer shrink-0"
        title="Copiar"
      >
        {copied ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
      </button>
    </div>
  );
}
