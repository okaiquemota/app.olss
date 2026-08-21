-- ============================================================
-- OLSS — Um relatório por cliente/mês
--
-- Como rodar: painel do Supabase → SQL Editor → cole e execute
-- as partes na ordem. A parte 1 apenas mostra; a 2 apaga; a 3 protege.
--
-- Por que existe: nada impedia gravar dois relatórios do mesmo cliente para
-- o mesmo mês. A grade da tela abre sempre o mais recente, então a duplicata
-- ficava invisível — mas aparecia no gráfico do PDF, que chegou a mostrar o
-- valor antigo em vez do corrigido.
-- ============================================================


-- ------------------------------------------------------------
-- 1) DIAGNÓSTICO — quais clientes/meses têm mais de um relatório
--    Rode primeiro e confira o resultado antes de apagar qualquer coisa.
-- ------------------------------------------------------------
select
  c.nome_razao_social,
  r.mes_referencia,
  count(*)                          as qtd,
  array_agg(r.geracao_atual order by r.created_at desc) as geracoes_do_mais_novo_ao_mais_antigo,
  array_agg(r.created_at    order by r.created_at desc) as criados_em
from public.relatorios r
join public.clientes c on c.id = r.cliente_id
group by c.nome_razao_social, r.mes_referencia
having count(*) > 1
order by c.nome_razao_social, r.mes_referencia;


-- ------------------------------------------------------------
-- 2) LIMPEZA — mantém o relatório mais recente de cada cliente/mês
--    e apaga os antigos. Confira o passo 1 antes: isto apaga dados.
-- ------------------------------------------------------------
-- delete from public.relatorios r
-- using (
--   select id,
--          row_number() over (
--            partition by cliente_id, mes_referencia
--            order by created_at desc
--          ) as posicao
--   from public.relatorios
-- ) ranking
-- where r.id = ranking.id
--   and ranking.posicao > 1;


-- ------------------------------------------------------------
-- 3) PROTEÇÃO — impede novas duplicatas
--    Só funciona depois que o passo 2 tiver limpado as existentes.
-- ------------------------------------------------------------
-- create unique index if not exists relatorios_cliente_mes_unico
--   on public.relatorios (cliente_id, mes_referencia);


-- ------------------------------------------------------------
-- 4) CONFERÊNCIA — deve voltar zero linhas
-- ------------------------------------------------------------
-- select cliente_id, mes_referencia, count(*)
-- from public.relatorios
-- group by cliente_id, mes_referencia
-- having count(*) > 1;
