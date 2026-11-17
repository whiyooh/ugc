# UGC AI Creator Hub

Aplicação web em React e TypeScript para organizar produtos, criadoras IA, copies, campanhas, referências, feedbacks e rascunhos. Os registros e imagens são privados por conta e persistidos no Supabase.

## Planos, autorização e teste gratuito (Fase 1)

Preços, benefícios, permissões, limites de produtos/criadoras, créditos
mensais e custos provisórios das ações de IA estão centralizados em
[`src/plans/config.ts`](./src/plans/config.ts). Campanhas não têm limite.
O checkout recorrente via Stripe (somente cartão nesta primeira integração)
usa Edge Functions e webhooks; a confirmação do pagamento, não a página de
retorno, libera o plano. Créditos e chamadas de IA continuam fora da integração
de pagamento.

Antes de publicar:

1. Aplique as migrations em `supabase/migrations` no projeto Supabase. A
   migration `20261115180000_plan_trial_access.sql` cria o estado `trial` para
   usuários com e-mail confirmado; o registro usa Plus e não tem expiração por
   calendário. Usuários não confirmados não recebem esse estado. A concessão
   dos 30 créditos e o fim do teste ao consumir o saldo pertencem à Fase 2.
2. Publique a Edge Function `workspace-api`:

   ```sh
   supabase link --project-ref seu-project-ref
   supabase functions deploy workspace-api
   ```

   A função exige JWT (`verify_jwt = true`) e usa `SUPABASE_SERVICE_ROLE_KEY`
   apenas no ambiente seguro do Supabase. Nunca configure essa chave como
   variável `VITE_*` nem a envie ao navegador.
3. Configure `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` no ambiente do
   front-end, como já é feito para a autenticação.

Depois das migrations, consultas e mutações do workspace passam pela função.
As permissões diretas de leitura/gravação no workspace e no Storage são
revogadas para usuários autenticados; a função valida a assinatura e os
limites antes de acessar os dados. A tabela `user_subscriptions` permite ao
usuário ler apenas a própria assinatura. Para mudar o plano manualmente,
execute no SQL Editor do Supabase com o e-mail da conta:

```sql
insert into public.user_subscriptions
  (user_id, plan, status, started_at, expires_at)
select id, 'plus', 'active', now(), now() + interval '1 month'
from auth.users
where email = 'usuario@exemplo.com'
on conflict (user_id) do update
set plan = excluded.plan,
    status = excluded.status,
    started_at = excluded.started_at,
    expires_at = excluded.expires_at;
```

Troque `plus` por `pro` ou `premium` para testar os outros planos. Uma
assinatura pendente, expirada ou em teste não conta como plano pago para
Referências, Feedbacks e Template de campanha; `canceled` mantém esse acesso
somente até `expires_at`. As três telas estão centralizadas em
`lockedScreens` em `src/app/navigation.ts`. O workspace e seus outros dados
continuam acessíveis sem plano pago; referências e feedbacks existentes são
preservados e só ficam visíveis novamente com um plano pago. Dados acima de um
limite após downgrade permanecem guardados, mas novas criações seguem as regras
de limite vigentes. Cliques em telas bloqueadas e acesso direto às suas rotas
levam diretamente a `/planos`, com opção de voltar ao aplicativo.

### Verificação local

```sh
npm test
npm run typecheck
npm run build
```

Sem Supabase configurado, abra a tela de login e escolha **Abrir preview
visual**. Para testar os estados visuais sem persistir alterações, use
`?previewPlan=plus`, `?previewPlan=pro`, `?previewPlan=premium` ou
`?previewPlan=none` na URL. O preview padrão é Pro. O teste gratuito real é
criado após confirmar o e-mail. Para validar o guard do servidor, use uma
conta autenticada com a Edge Function implantada e altere a linha da própria
conta em `user_subscriptions` entre `trial`, `plus`, `pro` e `premium`.

## Pagamentos recorrentes com Stripe (modo de teste)

A integração aceita cartão recorrente em BRL. Não compartilhe nem versione
segredos Stripe. Os preços são conferidos contra `src/plans/config.ts` antes
de abrir o checkout; crie os preços mensais com esses valores:

1. Crie uma conta Stripe e mantenha o Dashboard em **modo de teste**.
2. Crie produtos e preços recorrentes mensais em BRL: Plus R$ 19,90, Pro
   R$ 34,90 e Premium R$ 55,90. Copie os IDs `price_...`.
3. Configure o portal do cliente no Dashboard Stripe, incluindo atualização
   de cartão, cancelamento e, se desejar, alteração entre os três preços.
4. Copie `.env.example` para `.env.local` para desenvolvimento local e
   preencha os IDs de preço, `STRIPE_SECRET_KEY` de teste e
   `APP_BASE_URL=http://localhost:5173`. Configure também as variáveis públicas
   do Supabase descritas acima. Nunca prefixe segredos com `VITE_`.
5. Aplique a migration de billing e inicie o Supabase local:

   ```sh
   supabase start
   supabase migration up
   supabase functions serve --env-file .env.local
   ```

6. Instale/execute Stripe CLI e encaminhe eventos ao webhook local:

   ```sh
   stripe listen --forward-to http://127.0.0.1:54321/functions/v1/stripe-webhook
   ```

   O Stripe CLI imprime um segredo `whsec_...` de teste. Coloque-o em
   `STRIPE_WEBHOOK_SECRET` no `.env.local` e reinicie `functions serve`.
7. Cadastre uma assinatura de teste no app usando o checkout hospedado. Use
   somente cartões de teste oficiais da Stripe (por exemplo,
   `4242 4242 4242 4242`, validade futura e qualquer CVC de teste).
8. No Dashboard Stripe em modo de teste, configure o endpoint
   `https://<project-ref>.supabase.co/functions/v1/stripe-webhook` e habilite:
   `checkout.session.completed`, `customer.subscription.created`,
   `customer.subscription.updated`, `customer.subscription.deleted`,
   `invoice.paid`, `invoice.payment_succeeded`, `invoice.payment_failed` e
   `invoice.payment_action_required`.
9. No Supabase hospedado, publique `billing-api` e `stripe-webhook`, aplique
   as migrations e cadastre como Edge Function Secrets os mesmos valores de
   teste para `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
   `STRIPE_PRICE_PLUS`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_PREMIUM`,
   `STRIPE_PAYMENT_GRACE_DAYS=3` e `APP_BASE_URL` do site publicado. Nunca
   coloque `SUPABASE_SERVICE_ROLE_KEY` ou chaves Stripe no navegador.

   ```sh
   supabase functions deploy billing-api
   supabase functions deploy stripe-webhook
   ```

A função `billing-api` exige JWT e cria sessões de checkout/portal. A função
`stripe-webhook` não exige JWT do Supabase: valida a assinatura Stripe no corpo
original, rejeita assinaturas inválidas e atualiza o plano em uma transação
idempotente no banco. Renovações falhas entram em `past_due` com tolerância
configurável por `STRIPE_PAYMENT_GRACE_DAYS` (padrão 3 dias). Cancelamento
preserva o acesso até o fim do período pago. A migração precisa ser aplicada
antes de publicar as funções.

Pix Automático não está disponível para contas Stripe brasileiras. Pix comum
não é uma renovação automática, e boleto, embora possa ser usado em cobranças
periódicas com pagamento manual, não faz parte deste checkout inicial. Esses
meios não são exibidos para evitar prometer uma renovação que o fluxo atual não
implementa.
