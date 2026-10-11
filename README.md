# UGC AI Creator Hub

Aplicação web em React e TypeScript para organizar produtos, criadoras IA, copies, campanhas, referências, feedbacks e rascunhos. Os registros e imagens são privados por conta e persistidos no Supabase.

## Requisitos

- Node.js 22.12 ou superior
- npm 10 ou superior
- Projeto Supabase com Auth, banco PostgreSQL e Storage

## Configuração local

1. Instale as dependências:

   ```bash
   npm ci
   ```

2. Crie um projeto Supabase e configure as variáveis públicas locais:

   ```bash
   cp .env.example .env.local
   ```

   Preencha `.env.local` com a URL do projeto e a chave pública `anon` (ou `publishable`) encontrada nas configurações de API do Supabase:

   ```dotenv
   VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
   VITE_SUPABASE_ANON_KEY=SUA_CHAVE_PUBLICA
   ```

   Essas variáveis são incorporadas ao JavaScript enviado ao navegador. Nunca use uma chave `service_role`/secret nesse arquivo, no frontend ou em qualquer configuração `VITE_*`. A segurança dos dados depende das políticas RLS da migration.

3. Aplique a migration no projeto Supabase. Com a CLI Supabase instalada e autenticada:

   ```bash
   npx supabase login
   npx supabase link --project-ref SEU_PROJECT_REF
   npx supabase db push
   ```

   A migration cria a tabela `public.user_workspaces`, as políticas RLS, o bucket privado `workspace-images` e as políticas de acesso a imagens.

4. No Supabase Dashboard, configure Authentication:

   - Defina a URL local `http://localhost:5173` em **URL Configuration / Site URL** e nas **Redirect URLs**.
   - Adicione os domínios HTTPS da aplicação publicada às URLs permitidas.
   - Configure o provedor de e-mail e as mensagens/links de confirmação e recuperação de senha.
   - Em produção, configure SMTP próprio e limites adequados de envio de e-mail.

5. Inicie a aplicação:

   ```bash
   npm run dev
   ```

   Acesse `http://localhost:5173`. Sem as variáveis Supabase a aplicação mostra uma mensagem explícita de configuração ausente, em vez de simular login ou persistência.

## Comandos

```bash
npm run dev          # Servidor de desenvolvimento
npm run typecheck    # Verificação TypeScript
npm run build        # Verificação de tipos e build de produção em dist/
npm run preview      # Servidor local para validar o build de produção
npm run format       # Formata os arquivos com oxfmt
npm run format:check # Confere a formatação
```

## Autenticação, privacidade e persistência

- Cadastro, login, logout e recuperação/troca de senha usam Supabase Auth.
- O frontend se conecta diretamente ao Supabase; não há API própria ou chave privilegiada no cliente. Todas as operações da tabela são autenticadas e limitadas por RLS a `user_id = auth.uid()`.
- Cada conta tem uma linha própria com seus produtos, criadoras, copies, campanhas, referências, feedbacks, rascunhos e checklist em JSONB. Um novo espaço começa vazio; os registros demonstrativos antigos não são usados como dados reais.
- Dados que já estavam no `localStorage` de versões anteriores não são importados automaticamente. O app não apaga esse armazenamento antigo, mas seus registros ainda não são transferidos para a nuvem; faça uma cópia antes de adotar a nova versão.
- Alterações são salvas automaticamente. A interface informa falha sem declarar sucesso, permite nova tentativa e impede sair durante o salvamento sem antes confirmar a persistência.
- Imagens são enviadas para o bucket privado com caminho iniciado pelo UUID do usuário. O acesso usa URLs assinadas temporárias; tamanho e tipos MIME permitidos também são limitados no Storage.
- Não mantenha dados sensíveis em conteúdo de formulários; os dados de workspace pertencem à conta autenticada e são armazenados em formato JSONB.

Antes de publicar, valide o isolamento com duas contas: crie registros e envie imagem com a conta A; confirme que a conta B não os vê nem consegue abrir o caminho privado; encerre e retome as sessões em ambos os dispositivos para confirmar a persistência. Não foi possível executar essa verificação real neste ambiente sem credenciais de um projeto Supabase configurado.

## Publicação

1. Aplique todas as migrations ao projeto Supabase de produção.
2. Configure somente `VITE_SUPABASE_URL` e a chave pública anon/publishable no provedor de build.
3. Publique o conteúdo de `dist/` em uma hospedagem estática com HTTPS e fallback de rotas SPA, se aplicável.
4. Inclua a URL HTTPS de produção nas Redirect URLs do Supabase e configure o SMTP de produção.
5. Confirme que a chave `service_role`/secret não foi configurada no frontend, repositório, logs ou artefatos publicados. Restrinja-a a ambientes confiáveis de servidor caso uma operação administrativa futura realmente necessite dela.

## Estrutura

```text
src/
  app/                 # Composição da aplicação e navegação
  auth/                # Estado da sessão Supabase
  components/          # Componentes compartilhados e layout
  data/                # Repositório, autosave, status e URLs de imagens
  features/
    auth/              # Login, cadastro e recuperação de senha
    forms/             # Campos dos formulários
    pages/             # Dashboard e telas do produto
  lib/                 # Cliente Supabase
  styles/              # Estilos globais e responsivos
  types/               # Tipos do domínio
  utils/               # Formatação e identificadores
  main.tsx             # Entrada React
supabase/
  migrations/          # Tabela, RLS e Storage
public/
  assets/              # Ícones e imagens da interface
```

## Créditos e licenças

O nome e os créditos visíveis “UGC AI YOHS” foram mantidos. Os assets existentes foram preservados; este projeto não continha um inventário completo de autoria/licenças para eles. Confirme os direitos de uso e inclua os avisos exigidos pelos respectivos titulares antes de redistribuir o projeto. As dependências de terceiros mantêm suas licenças nos pacotes instalados.
