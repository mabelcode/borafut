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
| Testes | **Vitest** (unit) + **Playwright** (integração/e2e) |
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

### E. Avaliação 360° (Pós-Jogo)
- Nota 1–5. Atualiza `globalScore`.

### F. Painel Super Admin
Acessível via ícone 🛡 no header da Home (visível apenas para `isSuperAdmin`).

**Tab: Grupos**
- Listar todos os grupos (nome, nº de membros, data de criação)
- Criar novo grupo (apenas nome; token gerado automaticamente)
- Acessar grupo → ver membros com roles
- Promover/rebaixar usuário dentro de um grupo
- Adicionar usuário a um grupo
- **Deletar grupo** (soft/hard delete a definir)

**Tab: Usuários**
- Listar todos os usuários (nome, posição, grupos que participa)
- Busca por nome
- Ver detalhes de um usuário: grupos, role em cada grupo, histórico
- Promover a Admin de um grupo específico
- **Deletar usuário** (remove do auth + public.users em cascata)

**Tab: Histórico**
- Log de ações relevantes: quem confirmou pagamento, quem criou/deletou grupo, quem promoveu user, etc.
- Timestamp + usuário responsável + descrição da ação
- Implementado via tabela `audit_log` no banco

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

### Integração/E2E — Playwright
- Fluxo de login (Google OAuth mockado)
- Fluxo de onboarding
- Reserva de vaga + QR Code
- Confirmação de pagamento pelo admin
- Criação de partida
- Entrada via link de convite
- Painel Super Admin: criar grupo, promover usuário

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
- **Taxa:** 5% informativa no MVP.
- **Bolha:** visibilidade escopada ao `groupId`. Sem grupo → tela "Aguardando convite".
- **Link de convite:** multi-uso, duração opcional via `inviteExpiresAt`.
- **Sentry:** todo `catch` de operação crítica deve chamar `Sentry.captureException()`.
- **Grants explícitos:** tabelas criadas via migration exigem `GRANT` explícito ao role `authenticated` (não é automático como no Dashboard).
