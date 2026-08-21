# OLSS — Operacional

Painel interno para gestão operacional de usinas solares: cadastro de clientes/usinas, mapa, monitoramento, lembretes e geração de relatórios mensais em PDF.

## Stack

- React 19 + Vite
- Tailwind CSS
- Supabase (autenticação + banco de dados com Row Level Security)
- React Leaflet (mapa de usinas)
- Recharts (gráficos)
- pdfmake (geração de relatórios em PDF)

## Setup

```bash
npm install
cp .env.example .env
```

Preencha o `.env` com os dados do projeto Supabase (Project Settings → API):

```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...
```

Use a **publishable key** (anon), nunca a secret key — este projeto é só frontend e a secret key não deve ir para nenhum arquivo do repositório.

```bash
npm run dev
```

### Acesso

Não existe cadastro público. Para criar um usuário, use o painel do Supabase → Authentication → Users → Add User (marcando "Auto Confirm User"). As policies de RLS estão em [`supabase/rls.sql`](supabase/rls.sql).

## Scripts

- `npm run dev` — ambiente de desenvolvimento
- `npm run build` — build de produção
- `npm run lint` — lint do código
- `npm run preview` — preview do build de produção
