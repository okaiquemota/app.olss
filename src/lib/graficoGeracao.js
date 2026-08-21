// Desenha o gráfico de barras da geração mensal num canvas local e devolve a
// imagem em base64 para o PDF.
//
// Antes isso era montado pelo quickchart.io: o histórico de geração do cliente
// era codificado na URL e enviado a um serviço de terceiros a cada relatório, e
// o gráfico sumia do PDF quando o serviço não respondia. Desenhando aqui, o
// dado não sai do navegador e o PDF nunca fica sem o gráfico.

const COR_BARRA = '#064E3B';
const COR_GRADE = '#E2E8F0';
const COR_TICK = '#64748B';
const COR_LABEL_X = '#1E293B';

// Escala fixa: o canvas é desenhado em 2x e exibido em 470pt no PDF
const ESCALA = 2;
const LARGURA = 600;
const ALTURA = 250;

const PAD_TOP = 26;
const PAD_BOTTOM = 30;
const PAD_LEFT = 46;
const PAD_RIGHT = 14;

// Escolhe um passo "redondo" (1, 2, 5 ou 10 vezes potência de 10) para os ticks
// do eixo Y. Só múltiplos inteiros: geração é medida em kWh cheios, e um passo
// fracionário produziria ticks como 0 / 3 / 5 / 8 no PDF do cliente.
function escalaDoEixo(maiorValor, quantidadeTicks) {
  const alvo = maiorValor > 0 ? maiorValor * 1.25 : 10;
  const passoBruto = alvo / quantidadeTicks;
  const magnitude = 10 ** Math.floor(Math.log10(passoBruto));
  const normalizado = passoBruto / magnitude;

  const multiplicador = normalizado <= 1 ? 1
    : normalizado <= 2 ? 2
    : normalizado <= 5 ? 5
    : 10;

  const passo = multiplicador * magnitude;
  return { passo, topo: passo * quantidadeTicks };
}

const formatarTick = (v) => v.toLocaleString('pt-BR', { maximumFractionDigits: 0 });

export function gerarGraficoGeracaoBase64(historico) {
  if (!historico || historico.length === 0) return null;

  // Sem canvas (ex.: ambiente sem DOM) o PDF simplesmente sai sem o gráfico
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  canvas.width = LARGURA * ESCALA;
  canvas.height = ALTURA * ESCALA;
  ctx.scale(ESCALA, ESCALA);

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, LARGURA, ALTURA);

  const TICKS = 4;
  const valores = historico.map(h => Number(h.geracao) || 0);
  const { passo: passoTick, topo } = escalaDoEixo(Math.max(...valores), TICKS);

  const areaLargura = LARGURA - PAD_LEFT - PAD_RIGHT;
  const areaAltura = ALTURA - PAD_TOP - PAD_BOTTOM;
  const baseY = PAD_TOP + areaAltura;
  const alturaDe = (v) => (topo > 0 ? (v / topo) * areaAltura : 0);

  // Grade horizontal tracejada + ticks do eixo Y
  ctx.setLineDash([4, 4]);
  ctx.lineWidth = 1;
  ctx.strokeStyle = COR_GRADE;
  ctx.fillStyle = COR_TICK;
  ctx.font = '10px Helvetica, Arial, sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';

  for (let i = 0; i <= TICKS; i++) {
    const valor = passoTick * i;
    const y = baseY - alturaDe(valor);
    ctx.beginPath();
    ctx.moveTo(PAD_LEFT, y);
    ctx.lineTo(PAD_LEFT + areaLargura, y);
    ctx.stroke();
    ctx.fillText(formatarTick(valor), PAD_LEFT - 8, y);
  }
  ctx.setLineDash([]);

  // Barras, com o valor acima e o mês abaixo
  const passo = areaLargura / historico.length;
  const larguraBarra = Math.min(40, passo * 0.55);

  historico.forEach((h, i) => {
    const valor = Number(h.geracao) || 0;
    const centro = PAD_LEFT + passo * i + passo / 2;
    const altura = alturaDe(valor);
    const x = centro - larguraBarra / 2;
    const y = baseY - altura;

    if (altura > 0) {
      ctx.fillStyle = COR_BARRA;
      // Topo levemente arredondado, como no gráfico anterior
      const raio = Math.min(4, larguraBarra / 2, altura);
      ctx.beginPath();
      ctx.moveTo(x, baseY);
      ctx.lineTo(x, y + raio);
      ctx.quadraticCurveTo(x, y, x + raio, y);
      ctx.lineTo(x + larguraBarra - raio, y);
      ctx.quadraticCurveTo(x + larguraBarra, y, x + larguraBarra, y + raio);
      ctx.lineTo(x + larguraBarra, baseY);
      ctx.closePath();
      ctx.fill();
    }

    if (valor > 0) {
      ctx.fillStyle = COR_BARRA;
      ctx.font = 'bold 13px Helvetica, Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(formatarTick(valor), centro, y - 5);
    }

    ctx.fillStyle = COR_LABEL_X;
    ctx.font = 'bold 12px Helvetica, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(String(h.mes ?? ''), centro, baseY + 8);
  });

  // Linha de base
  ctx.strokeStyle = COR_GRADE;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PAD_LEFT, baseY);
  ctx.lineTo(PAD_LEFT + areaLargura, baseY);
  ctx.stroke();

  return canvas.toDataURL('image/png');
}
