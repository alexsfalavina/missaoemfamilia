# JESSICA AI MARKETING

Plataforma profissional de marketing para Instagram com IA desenvolvida para **Jessica Nalin** ([@eujessynalin](https://www.instagram.com/eujessynalin/) — *Missão em Família / Método ALMA*).

Projetada para automatizar o planejamento, criação e design de conteúdo de Instagram, permitindo que a revisão e aprovação semanal sejam feitas em **10 a 15 minutos todos os sábados**, sempre exigindo **aprovação humana explícita**.

## Módulos Entregues (Etapa 1 — Interativos com Dados de Demonstração)

1. **Painel Geral (`/`)**: Total de seguidores, crescimento de seguidores, alcance semanal, engajamento, posts publicados, conteúdos aguardando aprovação (em tempo real) e clientes em potencial (leads), com identificação clara de *Modo Demonstração*.
2. **Central de Aprovação (`/aprovacao`)**: Prévia visual das 7 publicações da semana (carrosséis multi-slide, Reels com roteiro, Posts Únicos e Stories), legenda, formato, objetivo de marketing, data/horário recomendados, ações **APROVAR**, **SOLICITAR ALTERAÇÕES** e **REJEITAR**, além de aprovação individual e em lote (*Aprovar selecionados*).
3. **Calendário Editorial (`/calendario`)**: Visualização semanal de segunda a domingo com conteúdos aprovados/agendados localmente e reagendamento interativo de data e horário.
4. **Gestão de Conteúdo & Designer IA (`/conteudo`)**:
   - *Estratégia Semanal IA*: geração de 7 ideias focadas em captação de clientes nas 5 categorias (Educativo, Emocional, Construção de Autoridade, Engajamento e Comercial).
   - *Criador de Conteúdo*: edição e criação de Carrosséis, Roteiros de Reels, Posts Únicos e Stories com legendas, hashtags e CTA.
   - *Designer IA (1080px)*: estúdio visual com suporte a `1080×1350` (Feed/Carrossel), `1080×1920` (Stories/Reels), múltiplos slides, identidade visual roxa e verde e exportação real em PNG.
5. **Perfil da Marca (`/marca`)**: Configurações editáveis completas de Jessica Nalin, serviços oferecidos, tom de voz, paleta visual e objetivos de negócio.
6. **Analytics (`/analytics`)**: Alcance, compartilhamentos, salvamentos, comentários, visitas ao perfil, novos seguidores, leads gerados e funil de conversão (claramente marcados como demonstração).
7. **Automação Semanal & Integrações (`/automacao`)**: Configuração da rotina de sábado e painel de prontidão server-side para Supabase, Google Gemini API e Instagram Graph API.

## Segurança e Arquitetura

- **Next.js App Router + TypeScript (modo estrito)** com rotas de API server-side em `src/app/api/**`.
- **Nenhuma chave de API no frontend**: todas as variáveis sensíveis vivem exclusivamente no servidor (veja `.env.example`).
- **Pronto para Supabase**: esquema PostgreSQL com auditoria de aprovação humana e RLS em `src/lib/supabase/schema.sql`.
- **Trava de publicação**: nenhuma publicação automática no Instagram é executada ou simulada na Etapa 1.

## Como Executar Localmente

```bash
npm install
npm run dev
```

Acesse `http://localhost:3000`.
