// Lê o hash da URL assim que o app carrega, ANTES do supabase-js consumir e
// limpar o endereço. É por ele que chegam os links de e-mail do Supabase:
//
//   #access_token=...&type=invite      -> convite para criar acesso
//   #access_token=...&type=recovery    -> redefinição de senha
//   #error=access_denied&error_code=otp_expired  -> link vencido ou já usado
//
// Sem capturar aqui, o app não teria como saber que a pessoa chegou por um
// convite e precisa definir a senha.

const MENSAGENS_ERRO = {
  otp_expired: 'Este link expirou ou já foi usado. Peça um novo para quem enviou o convite.',
  access_denied: 'Este link não é mais válido. Peça um novo para quem enviou o convite.',
};

function capturar() {
  if (typeof window === 'undefined') return { tipo: null, erro: null };

  const hash = window.location.hash || '';
  if (!hash.startsWith('#')) return { tipo: null, erro: null };

  const params = new URLSearchParams(hash.slice(1));

  const codigoErro = params.get('error_code') || params.get('error');
  if (codigoErro) {
    return {
      tipo: null,
      erro: MENSAGENS_ERRO[codigoErro]
        || params.get('error_description')
        || 'Este link não pôde ser usado. Peça um novo para quem enviou o convite.',
    };
  }

  const tipo = params.get('type');
  return {
    tipo: tipo === 'invite' || tipo === 'recovery' ? tipo : null,
    erro: null,
  };
}

// Capturado uma única vez, no carregamento do módulo
export const linkAuth = capturar();
