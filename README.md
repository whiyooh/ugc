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

   Para visualizar a interface sem criar uma conta, use **Abrir preview visual** na tela de entrada ou configuração. Esse modo usa apenas conteúdo demonstrativo em memória, não autentica, não acessa a nuvem e descarta as alterações ao sair ou recarregar.

   Os links de confirmação e recuperação retornam para a origem em que o formulário foi enviado. Se um link expirar, abra a aplicação, informe o e-mail na tela de entrada e use **Enviar novo link de confirmação**. Em **Supabase → Authentication → URL Configuration**, mantenha o Site URL apontando para a URL principal publicada e adicione as origens locais realmente usadas, por exemplo `http://localhost:3000/**`, `http://localhost:5173/**` e `http://127.0.0.1:5173/**`, às Redirect URLs. A URL precisa corresponder à porta em que o app está rodando. No template de confirmação de e-mail, use `{{ .ConfirmationURL }}` no link em vez de codificar `localhost` diretamente.

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

## Publicação no GitHub Pages

O repositório `whiyooh/ugc` usa automaticamente o caminho-base `/ugc/` nos builds do GitHub Actions. O `npm run dev` e o `npm run preview` continuam usando `/` e não dependem do GitHub Pages.

1. No projeto Supabase, aplique as migrations e configure Authentication.
2. No GitHub, abra **Settings → Secrets and variables → Actions → Variables** e crie:
   - `VITE_SUPABASE_URL`: Project URL mostrada em **Supabase → Project Settings → API**.
   - `VITE_SUPABASE_ANON_KEY`: chave pública `anon` (ou `publishable`) da mesma página.
3. Nunca coloque a `service_role`/secret key em Actions Variables, Secrets usados no build do frontend, arquivos `VITE_*` ou no repositório. A chave anon/publishable é pública por definição; o isolamento depende do Auth e das políticas RLS.
4. Abra **Settings → Pages** do repositório e escolha **GitHub Actions** como source.
5. Envie alterações para a branch `main` ou execute manualmente o workflow **Deploy to GitHub Pages** em **Actions**. O workflow verifica as variáveis, instala com `npm ci`, compila e publica `dist/`.
6. Confira o resultado e a URL em **Actions → Deploy to GitHub Pages → deploy → environment**. A publicação só ocorre após o workflow completar com sucesso.
7. Nas configurações de Auth do Supabase, adicione `https://whiyooh.github.io/ugc/` e `http://localhost:5173/` às Redirect URLs. Ajuste o Site URL conforme a URL de produção em uso.

Para validar localmente o mesmo caminho-base da publicação sem alterar o servidor dev, execute `GITHUB_ACTIONS=true npm run build`; os assets e links de autenticação usarão `/ugc/`.

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
