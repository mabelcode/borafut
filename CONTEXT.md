# Borafut — Contexto Global do Projeto

> **Para o assistente de IA:** Este arquivo é a fonte de verdade da arquitetura e regras de negócio do Borafut. Leia-o no início de cada sessão antes de implementar qualquer funcionalidade.

---

## 1. Visão Geral do Produto

**Borafut** é um Web App Mobile-First para gestão de partidas amadoras de futebol society. Resolve três dores principais:
1. **Lista de presença** gerenciada via pagamento ("Pay-to-Play").
2. **Balanceamento técnico** dos times via avaliação peer-to-peer (360°).
3. **Interface com zero fricção** — fluxo rápido, mobile-first.

---

## 2. Stack Tecnológica

| Camada | Tecnologia |
|---|---|
| Frontend | Vite + React + TypeScript (strict) |
| Estilização | Tailwind CSS (v4, CSS-first via `@theme`) |
| Estado / Cache | TanStack React Query |
| Banco de Dados | **Supabase** (PostgreSQL + Auth + RLS) |
| Autenticação | **Supabase Auth** — Google OAuth |
| Pagamentos | **Pix Manual** — `qrcode-pix` + `react-qr-code` (100% frontend) |
| Observabilidade | **Sentry** — erros, performance e rastreamento de sessão |
| Testes | **Vitest** (unit) |
| Ícones | lucide-react |
| Fonte | Inter (Google Fonts) |

> **Nota sobre Pagamentos (MVP):** Confirmação manual pelo Group Admin, sem CNPJ. Admin cadastra chave Pix pessoal. App gera QR Code Pix estático. Taxa de 5% informativa. Split e webhook automático (OpenPix/Woovi) ficam para fase pós-MEI.

---

## 3. Hierarquia de Papéis

A hierarquia é **inclusiva**: cada nível herda as capacidades do anterior.

```
Super Admin  ⊃  Admin  ⊃  Player

Player      → joga, paga, se inscreve em partidas dos seus grupos
Admin       → tudo do Player + cria partidas, confirma pagamentos,
              gera link de convite, visualiza membros do grupo
              pode ser Admin em N grupos e Player em outros
Super Admin → tudo do Admin em TODOS os grupos + Painel Super Admin
              (criar/deletar grupos, gerenciar users, ver histórico)
```

### Implementação dos papéis

```
users.isSuperAdmin boolean DEFAULT false
  └── plataforma (definido MANUALMENTE via SQL no banco, nunca via app)
  └── bypassa toda RLS — vê e gerencia absolutamente tudo

group_members.role = 'ADMIN' | 'PLAYER'
  └── escopo do grupo — promovido a ADMIN via Painel Super Admin ou SQL manual
  └── PLAYER é o padrão ao entrar por link de convite
```

---

## 4. Conceito de Bolha (Grupo)

- Cada **bolha** é um grupo isolado com seus próprios membros e partidas.
- Usuários entram via **link de convite** gerado pelo Group Admin:
  - URL: `borafut.app/?token=<inviteToken>` — token hex de 32 chars
  - Multi-uso; admin define duração (24h / 7d / 30d / sem expiração)
  - Admin pode invalidar regenerando o token
- Pós-onboarding sem grupo → tela "Aguardando convite".
- Toda visibilidade é filtrada por bolha via RLS.

---

## 5. Funcionalidades

### A. Autenticação e Perfil
- Login via **Google OAuth** (Supabase Auth).
- Onboarding: Nome/Apelido, Posição, WhatsApp.
- Pós-onboarding: entra no grupo via token ou aguarda convite.
- Link "Entrar com outra conta" no onboarding (sign out).

### B. Gestão de Partidas (Group Admin)
- Admin cria partida no grupo: Data/Hora, Vagas, Valor.

### C. Pay-to-Play — MVP Manual
- "Tô Dentro" → `RESERVED` + QR Code Pix.
- Admin verifica extrato → clica "Confirmar" → `CONFIRMED`.
- Acima do limite → `WAITLIST`.
- Admin também é jogador — se inscreve e paga normalmente.

### D. Algoritmo de Sorteio
- Apenas `CONFIRMED`. Snake draft por posição + `globalScore`. Persiste `teamNumber`.

### E. Avaliação 360° e MVP (Pós-Jogo)
- **Não mandatório:** Jogadores escolhem se desejam realizar a avaliação.
- **Escopo:** Cada jogador pode avaliar todos os demais participantes daquela partida específica.
- **Nota 1–5:** Impacta o `globalScore` do jogador avaliado.
- **Craque da Partida (MVP):** Jogador com a maior média de notas na partida.
- **Card de Destaque:** O Admin pode gerar e compartilhar um card visual (imagem) do MVP através da Web Share API.
- **Histórico:** Avaliações e o destaque (MVP) ficam vinculados à partida e visíveis no histórico de todos os participantes.

### F. Painel Super Admin
Acessível via ícone 🛡 no header da Home (visível apenas para `isSuperAdmin`).

**Tab: Grupos**
- Listagem otimizada de grupos com ordenação múltipla (Nome, Data, Nº de Membros).
- Acesso à Tela de Detalhes do Grupo (`GroupDetailsView`), permitindo:
  - Adição direta de qualquer usuário da plataforma ao grupo.
  - Promoção/Rebaixamento de cargos (Player ↔ Admin).
  - Compartilhamento via Web Share API nativa.

**Tab: Usuários**
- Listagem global de usuários com exibição de Nível (Score) e Posição.
- Filtro em tempo real por nome/telefone.
- Acesso à Tela de Detalhes do Usuário (`UserDetailsView`), permitindo:
  - Edição do `globalScore` e `mainPosition` do usuário (atualizado em tempo real via chamada RPC).
  - Visualização de todas as `bolhas` (grupos) que o usuário participa.
  - Remoção forçada do usuário de grupos específicos.

**Tab: Histórico (Log de Auditoria)**
- Monitoramento de ações sistêmicas (Promover, Rebaixar, Adicionar Membro, Alterar Perfil).
- Metadados completos exibidos através de parse JSON para rápida auditoria.
- Suporte estrito a traduções amigáveis do Dicionário de Auditoria (`MEMBER_UPDATED`, `PROMOTE_ADMIN`, etc).
- Implementado via tabela `audit_log` no banco

### G. Painel do Usuário (Perfil do Jogador)
Acessível via ícone de avatar (foto de perfil) no header da Home. Garante autonomia ao jogador.

**1. Identidade e Configurações**
- **Foto de Perfil:** Obtida automaticamente via Supabase Auth (Google OAuth). Caso não exista falhe ou não tenha foto, usar as iniciais do `displayName`. **Não haverá suporte para upload de imagens (Supabase Storage) neste momento.**
- **Edição Básica:** Permite alterar `displayName`, `mainPosition` e cadastrar/atualizar `pixKey`.
- **Sessão:** Ação clara de "Sair da conta" (Logout).

**2. Nível e Reputação**
- Exibição de destaque do `globalScore` atual (1 a 5).
- Estatísticas baseadas no histórico (ex: quantidade de partidas jogadas na plataforma).

**3. Histórico e Vínculos**
- **Grupos (Bolhas):** Lista de todos os grupos do qual o usuário é membro. **O usuário tem autonomia para se auto-remover (Sair do Grupo) a qualquer momento.**
- **Histórico de Partidas:** Lista cronológica das partidas anteriores onde o status foi `CONFIRMED`. Clique leva aos detalhes da partida (para preencher as avaliações 360° ou visualizar o MVP e estatísticas daquela rodada).

---

## 6. Observabilidade — Sentry

- **Instalação:** `@sentry/react` + `@sentry/vite-plugin`
- **Inicialização:** em `main.tsx` via `Sentry.init()`
- **Captura automática:** erros de runtime React, performance (Web Vitals), replays
- **Captura manual:** `Sentry.captureException(error)` em blocos `catch` críticos (Supabase, pagamento, sorteio)
- **Identificação de usuário:** `Sentry.setUser({ id, email })` após autenticação

---

## 7. Testes

### Unitários — Vitest
- Funções puras: algoritmo de sorteio (snake draft), formatação de moeda, validação de Pix key, parsing de datas
- Hooks: `useCurrentUser`, `useMatches` (com mock do Supabase client)
- Arquivo de configuração: `vitest.config.ts`


---

## 8. Modelo de Dados

```sql
users (
  id             uuid PRIMARY KEY,
  phoneNumber    text UNIQUE,
  displayName    text,
  mainPosition   text CHECK (IN 'GOALKEEPER','DEFENSE','ATTACK'),
  globalScore    numeric DEFAULT 3.0,
  isSuperAdmin   boolean DEFAULT false,
  pixKey         text,
  createdAt      timestamptz DEFAULT now()
)

groups (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name             text NOT NULL,
  inviteToken      text UNIQUE DEFAULT replace(gen_random_uuid()::text, '-', ''),
  inviteExpiresAt  timestamptz,
  createdAt        timestamptz DEFAULT now()
)

group_members (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  groupId   uuid REFERENCES groups(id) ON DELETE CASCADE,
  userId    uuid REFERENCES users(id) ON DELETE CASCADE,
  role      text CHECK (role IN ('ADMIN','PLAYER')) DEFAULT 'PLAYER',
  joinedAt  timestamptz DEFAULT now(),
  UNIQUE (groupId, userId)
)

matches (
  id           uuid PRIMARY KEY,
  groupId      uuid REFERENCES groups(id),
  managerId    uuid REFERENCES users(id),
  title        text,
  scheduledAt  timestamptz,
  maxPlayers   int,
  price        numeric,
  status       text CHECK (IN 'OPEN','CLOSED','FINISHED') DEFAULT 'OPEN',
  createdAt    timestamptz DEFAULT now()
)

match_registrations (
  id, matchId, userId, snapshotPosition, snapshotScore,
  status CHECK (IN 'RESERVED','CONFIRMED','WAITLIST'),
  paymentId, teamNumber, reservedUntil, createdAt
)

evaluations (
  id, matchId, evaluatorId, evaluatedId,
  scoreGiven CHECK (1-5), createdAt
)

-- Fase futura (MVP avançado)
audit_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actorId     uuid REFERENCES users(id),
  action      text NOT NULL,   -- ex: 'CONFIRM_PAYMENT', 'CREATE_GROUP', 'PROMOTE_ADMIN'
  targetType  text,            -- 'user' | 'group' | 'match' | 'registration'
  targetId    uuid,
  metadata    jsonb,
  createdAt   timestamptz DEFAULT now()
)
```

---

## 9. RLS

| Tabela | Operação | Condição |
|---|---|---|
| `users` | SELECT | qualquer autenticado |
| `users` | UPDATE | próprio `id` |
| `groups` | SELECT | membro do grupo OR `isSuperAdmin` |
| `groups` | INSERT/UPDATE | `isSuperAdmin` OR group admin |
| `group_members` | SELECT | membro do grupo OR `isSuperAdmin` |
| `group_members` | INSERT | próprio `userId` OR `isSuperAdmin` |
| `group_members` | UPDATE | group admin OR `isSuperAdmin` |
| `matches` | SELECT | membro do `groupId` OR `isSuperAdmin` |
| `matches` | INSERT/UPDATE | group admin OR `isSuperAdmin` |
| `match_registrations` | SELECT | membro do grupo |
| `match_registrations` | INSERT | membro do grupo |
| `match_registrations` | UPDATE | próprio OR group admin OR `isSuperAdmin` |

---

## 10. Regras de Negócio Críticas

- **Sem reembolso:** Nunca implementar estorno no app.
- **Confirmação manual (MVP):** `CONFIRMED` via frontend pelo Group Admin.
- **Elevação de admin por SQL:** `isSuperAdmin` sempre via SQL manual. `ADMIN` em grupos via Painel Super Admin ou SQL.
- **Score inicial:** `globalScore = 3.0`.
- **Snake draft:** Distribuição alternada por posição + score.
- **Snapshot:** `snapshotScore` e `snapshotPosition` preservam histórico ao sortear.
- **Pix:** `pixKey` em `users`. QR Code 100% frontend via `qrcode-pix` + `react-qr-code`.
- **Avaliações Pós-Jogo:** Opcionais (não mandatórias). Um jogador pode avaliar qualquer outro que participou da mesma partida. O registro é vinculado à partida e a média das notas atualiza o `globalScore`.
- **Taxa:** 5% informativa no MVP.
- **Ciclo de Vida da Partida:** `OPEN` (inscricões) -> `CLOSED` (sorteada/em andamento) -> `FINISHED` (finalizada).
- **Encerramento:** O Admin deve encerrar a partida manualmente para liberar as avaliações 360°.
- **Bolha:** visibilidade escopada ao `groupId`. Sem grupo → tela "Aguardando convite".
- **Link de convite:** multi-uso, duração opcional via `inviteExpiresAt`.
- **Sentry:** todo `catch` de operação crítica deve chamar `Sentry.captureException()` ou usar o `logger.error()`.

---

## 11. Padrões de Desenvolvimento

### Testes e Cobertura
- **Obrigatório:** Todo novo código (componentes, hooks, utilitários) deve vir acompanhado de testes.
- **Unitários (Vitest):** Devem cobrir lógica de negócio, transformações de dados e estados de componentes básicos.
- **Cobertura de Linhas:** Alvo mínimo de 80% em lógica de negócio (`src/lib`, `src/hooks`).

### Logging e Observabilidade
- **Proibido:** Uso de `console.log` no branch `main`.
- Utilizar a utility `logger` (`src/lib/logger.ts`) com os seguintes níveis:
  - `TRACE`: Detalhes exaustivos sobre o fluxo de execução (ex: logs de rendering detalhado).
  - `DEBUG`: Informações úteis para depuração (ex: payloads de API em dev).
  - `INFO`: Mensagens gerais sobre o estado da aplicação (ex: "Carrinho atualizado").
  - `WARN`: Situações inesperadas que não impedem o funcionamento (logado no Sentry como **Warning**).
  - `ERROR`: Falhas que exigem atenção imediata (logado no Sentry como **Exception**).
- Todo erro interceptado em blocos `catch` deve ser registrado via `logger.error(message, error)`.- **Grants explícitos:** tabelas criadas via migration exigem `GRANT` explícito ao role `authenticated` (não é automático como no Dashboard).
