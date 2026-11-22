import type {
  BrandProfile,
  ContentCategory,
  ContentFormat,
  ContentPost,
  DataSourceMode,
} from '@/types/marketing';
import { FORMAT_META, getWeekdayNameFromDate } from '@/lib/constants/labels';

export interface GeminiServerConfig {
  configured: boolean;
  model: string;
}

export interface GenerateWeeklyPlanInput {
  brand: BrandProfile;
  weekStartDate: string; // YYYY-MM-DD (Segunda-feira)
  focusTheme?: string;
}

export interface GenerateSingleContentInput {
  brand: BrandProfile;
  topic: string;
  category: ContentCategory;
  format: ContentFormat;
  marketingObjective: string;
  recommendedDate: string;
  recommendedTime: string;
}

export interface IGeminiMarketingService {
  getMode(): DataSourceMode;
  generateWeeklyPlan(input: GenerateWeeklyPlanInput): Promise<ContentPost[]>;
  generateSingleContent(input: GenerateSingleContentInput): Promise<ContentPost>;
}

/**
 * Verifica configuração do Google Gemini apenas no servidor.
 * Nenhum custo externo é gerado sem credencial e autorização explícita.
 */
export function getGeminiServerConfig(): GeminiServerConfig {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  const model = process.env.GEMINI_MODEL?.trim() || 'gemini-2.5-flash';
  return {
    configured: Boolean(apiKey),
    model,
  };
}

function addDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const dt = new Date(y, (m || 1) - 1, (d || 1) + days);
  const yyyy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Implementação determinística de demonstração (custo zero).
 * Quando GEMINI_API_KEY for autorizada e ativada na Etapa 2,
 * a camada de serviço trocará para chamadas oficiais server-side.
 */
class DemoGeminiMarketingService implements IGeminiMarketingService {
  getMode(): DataSourceMode {
    return 'demo';
  }

  async generateWeeklyPlan(input: GenerateWeeklyPlanInput): Promise<ContentPost[]> {
    const { brand, weekStartDate, focusTheme } = input;
    const themeSuffix = focusTheme?.trim() ? ` (${focusTheme.trim()})` : '';
    const endIso = addDays(weekStartDate, 6);
    const weekLabel = `Semana de ${weekStartDate.slice(8, 10)}/${weekStartDate.slice(5, 7)} a ${endIso.slice(8, 10)}/${endIso.slice(5, 7)}`;
    const now = new Date().toISOString();

    const templates: Array<{
      offset: number;
      time: string;
      category: ContentCategory;
      format: ContentFormat;
      title: string;
      objective: string;
      conversionFocus: string;
      cta: string;
      imageUrl?: string;
      caption: string;
      hashtags: string[];
      slides: ContentPost['slides'];
      reelsScript?: ContentPost['reelsScript'];
    }> = [
      {
        offset: 0,
        time: '19:00',
        category: 'educativo',
        format: 'carrossel',
        title: `4 erros invisíveis ao dar limites — e como corrigir com calma${themeSuffix}`,
        objective: 'Atrair pais que enfrentam desobediência recorrente e gerar salvamentos com pedido de orientação no Direct.',
        conversionFocus: 'Palavra-chave "LIMITES" no Direct para iniciar triagem da Mentoria Método ALMA.',
        cta: 'Comente "LIMITES" para receber o guia inicial e conhecer a Mentoria Método ALMA.',
        imageUrl: '/media/family-connection.jpg',
        caption: `Muitos pais acham que dar limite é falar mais alto ou repetir a mesma ordem cinco vezes.\n\nNo trabalho com ${brand.brandName}, vemos diariamente que a criança coopera quando o limite é claro, previsível e sustentado sem explosões emocionais.\n\nDeslize o carrossel e veja os 4 ajustes simples para aplicar já hoje na sua casa.\n\n💬 Comente "LIMITES" que eu te envio no Direct como podemos estruturar a rotina da sua família.`,
        hashtags: ['#educacaoparental', '#limitescomamor', '#metodoalma', '#missaoemfamilia', '#paisconscientes'],
        slides: [
          {
            id: makeId('sl'),
            order: 1,
            eyebrow: 'EDUCAÇÃO PARENTAL PRÁTICA',
            headline: `4 erros invisíveis ao dar limites${themeSuffix}`,
            body: 'E o ajuste simples do Método ALMA que restaura a cooperação no lar.',
            footer: brand.instagramHandle,
            imageUrl: '/media/family-connection.jpg',
            template: 'retrato_destaque',
          },
          {
            id: makeId('sl'),
            order: 2,
            eyebrow: 'ERRO 01 • AMEAÇAS VAZIAS',
            headline: 'Prometer consequências que você não vai cumprir',
            body: 'Quando o combinado muda conforme o cansaço, a criança testa o limite até descobrir onde ele realmente começa.',
            footer: 'Slide 2 de 4',
            template: 'ametista_editorial',
          },
          {
            id: makeId('sl'),
            order: 3,
            eyebrow: 'ERRO 02 • CORRIGIR NO CALOR DA RAIVA',
            headline: 'Antes de corrigir o filho, regule o seu tom',
            body: 'Na PNL parental, sua respiração e postura corporal comunicam segurança antes mesmo da primeira palavra.',
            footer: 'Slide 3 de 4',
            template: 'verde_acolhimento',
          },
          {
            id: makeId('sl'),
            order: 4,
            eyebrow: 'CONVITE PARA SUA FAMÍLIA',
            headline: 'Quer construir limites firmes sem desgaste diário?',
            body: 'Comente "LIMITES" aqui embaixo e converse com nossa equipe no Direct.',
            footer: `${brand.brandName} • Método ALMA`,
            template: 'metodo_alma_dourado',
          },
        ],
      },
      {
        offset: 1,
        time: '18:30',
        category: 'autoridade',
        format: 'reels',
        title: `Como aplicar a PNL em 30 segundos na hora de desligar as telas${themeSuffix}`,
        objective: 'Construir autoridade imediata com demonstração prática de método e atrair visitas qualificadas ao perfil.',
        conversionFocus: 'CTA para link na bio (Sessão Diagnóstica Familiar).',
        cta: 'Toque no link da bio para agendar sua conversa de diagnóstico do Método ALMA.',
        imageUrl: '/brand/jessica-portrait.jpg',
        caption: `A hora de desligar o celular ou a TV vira guerra aí na sua casa?\n\nA PNL nos ensina a preparar a transição antes do corte brusco. Em vez de arrancar a tela de surpresa, use o aviso de transição + escolha guiada.\n\nAssista até o final e teste hoje mesmo!\n\n💜 Quer um plano de rotina sob medida para a idade dos seus filhos? Link na bio.`,
        hashtags: ['#pnlparapais', '#telasinfantis', '#metodoalma', '#jessicanalin', '#educacaoparental'],
        slides: [
          {
            id: makeId('sl'),
            order: 1,
            eyebrow: 'REELS • MÉTODO NA PRÁTICA',
            headline: 'Desligar as telas sem briga usando PNL em 30 segundos',
            body: 'Técnica de transição guiada para crianças de 3 a 11 anos.',
            footer: `${brand.brandName} • ${brand.instagramHandle}`,
            imageUrl: '/brand/jessica-portrait.jpg',
            template: 'retrato_destaque',
          },
        ],
        reelsScript: [
          {
            id: makeId('rs'),
            timeRange: '00:00 – 00:05',
            visualDirection: 'Jessica em plano médio, tom empático e seguro.',
            spokenLine: 'Se desligar as telas na sua casa sempre termina em choro ou grito, salve essa técnica de 30 segundos.',
            onScreenText: 'Desligar telas SEM guerra (PNL na prática)',
          },
          {
            id: makeId('rs'),
            timeRange: '00:06 – 00:25',
            visualDirection: 'Cortes dinâmicos com 2 passos claros na tela.',
            spokenLine: 'Passo 1: entre no mundo da criança por 10 segundos antes de avisar. Passo 2: dê duas opções válidas para o encerramento.',
            onScreenText: '1. Conecte por 10s • 2. Escolha guiada',
          },
          {
            id: makeId('rs'),
            timeRange: '00:26 – 00:40',
            visualDirection: 'Card final Método ALMA.',
            spokenLine: 'Isso é educar com autonomia e limites. Quer aprender o Método ALMA completo? Clique no link da bio.',
            onScreenText: 'Agende seu Diagnóstico Familiar • Link na bio',
          },
        ],
      },
      {
        offset: 2,
        time: '12:00',
        category: 'emocional',
        format: 'post_unico',
        title: 'Seus filhos não precisam de pais perfeitos — precisam de pais presentes',
        objective: 'Aliviar a culpa parental, gerar alto compartilhamento entre casais e fortalecer confiança na marca.',
        conversionFocus: 'Aquecimento emocional da audiência antes das ofertas da semana.',
        cta: 'Envie este lembrete para o seu cônjuge ou para uma mãe querida.',
        imageUrl: '/media/parents-reading.jpg',
        caption: `Você olha para o final do dia e só enxerga onde errou?\n\nA culpa paralisa, mas a responsabilidade com graça transforma. Cada novo amanhecer é uma nova chance de escolher presença, escuta e direção firme.\n\nEducar é missão — e você não precisa caminhar sozinha.\n\n🌿 Compartilhe com quem divide essa missão com você.`,
        hashtags: ['#missaoemfamilia', '#valorescristaos', '#maesreais', '#paternidadeativa', '#acolhimento'],
        slides: [
          {
            id: makeId('sl'),
            order: 1,
            eyebrow: 'ACOLHIMENTO • MISSÃO EM FAMÍLIA',
            headline: 'Seus filhos não precisam de pais perfeitos. Precisam de pais presentes.',
            body: 'Quando a culpa sai de cena, sobra espaço para amar, guiar e ensinar com firmeza.',
            footer: `${brand.brandName} • ${brand.instagramHandle}`,
            imageUrl: '/media/parents-reading.jpg',
            template: 'retrato_destaque',
          },
        ],
      },
      {
        offset: 3,
        time: '10:30',
        category: 'engajamento',
        format: 'stories',
        title: 'Diagnóstico rápido nos Stories: qual pilar do Método ALMA sua casa mais precisa hoje?',
        objective: 'Qualificar leads ativos diretamente nos Stories e puxar conversas 1-a-1 no Direct.',
        conversionFocus: 'Segmentar interessados por pilar (Autonomia, Limites, Maturidade ou Acolhimento) para oferta sob medida.',
        cta: 'Vote na enquete dos Stories e receba uma recomendação prática no seu Direct.',
        imageUrl: '/media/calm-journal.jpg',
        caption:
          'Sequência interativa de 3 Stories convidando os pais a identificarem qual pilar do Método ALMA mais precisa de atenção nesta semana, gerando respostas diretas para nutrição comercial.',
        hashtags: ['#storiesestrategicos', '#metodoalma', '#educacaoparental'],
        slides: [
          {
            id: makeId('sl'),
            order: 1,
            eyebrow: 'STORY 1 • ENQUETE DIAGNÓSTICA',
            headline: 'Qual pilar do Método ALMA sua família mais precisa fortalecer agora?',
            body: '• Autonomia nas tarefas\n• Limites sem gritos\n• Maturidade emocional\n• Acolhimento e conexão',
            footer: 'Vote e receba uma dica no Direct',
            imageUrl: '/media/calm-journal.jpg',
            template: 'verde_acolhimento',
          },
          {
            id: makeId('sl'),
            order: 2,
            eyebrow: 'STORY 2 • CONVITE LEVE',
            headline: 'Cada família tem uma estação diferente',
            body: 'Me chama com a palavra "DIAGNÓSTICO" que eu te mostro qual próximo passo faz mais sentido para a idade dos seus filhos.',
            footer: brand.instagramHandle,
            template: 'ametista_editorial',
          },
        ],
      },
      {
        offset: 4,
        time: '19:30',
        category: 'comercial',
        format: 'carrossel',
        title: 'Como funciona a Mentoria Familiar Método ALMA (e como aplicar esta semana)',
        objective: 'Converter seguidores aquecidos em pedidos reais de agendamento e preenchimento de aplicação.',
        conversionFocus: 'Apresentação transparente do processo da mentoria com CTA direto para o Direct e link da bio.',
        cta: 'Envie "MENTORIA" no Direct para receber os detalhes e horários disponíveis.',
        imageUrl: '/brand/jessica-portrait.jpg',
        caption: `Dicas soltas ajudam por um dia. Um método acompanhado transforma a dinâmica da casa inteira.\n\nNa Mentoria Familiar Método ALMA, caminhamos lado a lado para estruturar rotina, limites claros e comunicação afetiva respeitando os valores da sua família.\n\nDeslize para ver como funciona em 3 etapas simples.\n\n📩 Envie "MENTORIA" no Direct ou acesse o link da bio para agendar sua avaliação.`,
        hashtags: ['#mentoriaparapais', '#metodoalma', '#jessicanalin', '#consultoriafamiliar', '#missaoemfamilia'],
        slides: [
          {
            id: makeId('sl'),
            order: 1,
            eyebrow: 'MENTORIA INDIVIDUAL & FAMILIAR',
            headline: 'Transforme o clima da sua casa com acompanhamento próximo',
            body: 'Entenda como funciona a Mentoria Método ALMA em 3 passos simples.',
            footer: 'Agenda aberta esta semana',
            imageUrl: '/brand/jessica-portrait.jpg',
            template: 'retrato_destaque',
          },
          {
            id: makeId('sl'),
            order: 2,
            eyebrow: 'ETAPA 1 • DIAGNÓSTICO DO LAR',
            headline: 'Mapeamos os pontos reais de desgaste da rotina',
            body: 'Olhamos para a idade dos filhos, temperamentos, horários críticos e valores da família.',
            footer: 'Slide 2 de 4',
            template: 'metodo_alma_dourado',
          },
          {
            id: makeId('sl'),
            order: 3,
            eyebrow: 'ETAPA 2 • PLANO PRÁTICO ALMA',
            headline: 'Ferramentas claras de PNL e limites saudáveis',
            body: 'Nada de teoria distante: você sai de cada encontro sabendo exatamente o que dizer e fazer.',
            footer: 'Slide 3 de 4',
            template: 'verde_acolhimento',
          },
          {
            id: makeId('sl'),
            order: 4,
            eyebrow: 'PRÓXIMO PASSO',
            headline: 'Envie "MENTORIA" no Direct agora',
            body: 'Vamos conversar sem compromisso para verificar se a mentoria é o ideal para o seu momento.',
            footer: brand.instagramHandle,
            template: 'ametista_editorial',
          },
        ],
      },
      {
        offset: 5,
        time: '09:30',
        category: 'educativo',
        format: 'carrossel',
        title: 'Checklist de autonomia infantil por idade (3 a 10 anos)',
        objective: 'Conteúdo altamente salvável que posiciona o Método ALMA como referência prática para mães e pais.',
        conversionFocus: 'Incentivar envio no WhatsApp entre famílias e direcionar para o Guia Prático na bio.',
        cta: 'Salve este checklist e escreva a idade do seu filho nos comentários!',
        imageUrl: '/media/family-connection.jpg',
        caption: `Fazer tudo pelo seu filho parece amor no curto prazo, mas rouba dele a confiança de descobrir do que é capaz.\n\nPreparamos um checklist simples de pequenas responsabilidades adequadas para cada fase (de 3 a 10 anos).\n\n📌 Salve este post e comente a idade dos seus filhos para eu trazer mais ideias sob medida!`,
        hashtags: ['#autonomiainfantil', '#educacaoparental', '#metodoalma', '#rotinainfantil', '#missaoemfamilia'],
        slides: [
          {
            id: makeId('sl'),
            order: 1,
            eyebrow: 'PILAR AUTONOMIA • CHECKLIST',
            headline: 'O que seu filho já pode fazer sozinho (de 3 a 10 anos)',
            body: 'Pequenos passos diários que constroem segurança e responsabilidade.',
            footer: 'Salve para consultar na rotina',
            imageUrl: '/media/family-connection.jpg',
            template: 'retrato_destaque',
          },
          {
            id: makeId('sl'),
            order: 2,
            eyebrow: '3 A 5 ANOS • PRIMEIROS PASSOS',
            headline: 'Guardar brinquedos, escolher a roupa entre 2 opções e colocar o prato na pia',
            body: 'Nessa fase, o segredo é fazer junto com leveza até virar hábito.',
            footer: 'Slide 2 de 3',
            template: 'verde_acolhimento',
          },
          {
            id: makeId('sl'),
            order: 3,
            eyebrow: '6 A 10 ANOS • RESPONSABILIDADE',
            headline: 'Arrumar a própria cama, organizar a mochila e ajudar a pôr a mesa',
            body: 'Autonomia ensinada com paciência hoje evita sobrecarga e conflitos na adolescência.',
            footer: brand.instagramHandle,
            template: 'ametista_editorial',
          },
        ],
      },
      {
        offset: 6,
        time: '18:00',
        category: 'emocional',
        format: 'post_unico',
        title: 'Uma intenção simples para a sua família nesta semana que começa',
        objective: 'Encerrar a semana com acolhimento, valores cristãos e conexão espiritual com a comunidade.',
        conversionFocus: 'Convite sutil para a Lista VIP Missão em Família na bio.',
        cta: 'Deixe um "Amém" ou sua intenção da semana nos comentários e entre na lista VIP da bio.',
        imageUrl: '/media/calm-journal.jpg',
        caption: `Antes que a correria da segunda-feira comece, escolha uma única intenção para o seu lar nesta semana:\n\nMenos pressa nas respostas. Mais olho no olho.\n\nQue Deus renove suas forças, sua sabedoria e sua alegria na missão de educar. 💜🌿\n\nSe quiser caminhar mais perto de nós, o link da Comunidade Missão em Família está na bio.`,
        hashtags: ['#domingoemfamilia', '#feefamilia', '#missaoemfamilia', '#paznolar', '#jessicanalin'],
        slides: [
          {
            id: makeId('sl'),
            order: 1,
            eyebrow: 'REFLEXÃO DE DOMINGO',
            headline: 'Menos pressa nas respostas. Mais olho no olho nesta semana.',
            body: 'Um lar de paz é construído em pequenas escolhas diárias de presença e graça.',
            footer: `${brand.brandName} • Missão em Família`,
            imageUrl: '/media/calm-journal.jpg',
            template: 'metodo_alma_dourado',
          },
        ],
      },
    ];

    return templates.map((item, idx) => {
      const dateStr = addDays(weekStartDate, item.offset);
      const formatSpec = FORMAT_META[item.format];
      return {
        id: makeId(`post-w-${idx + 1}`),
        weekLabel,
        dayOfWeek: getWeekdayNameFromDate(dateStr),
        title: item.title,
        category: item.category,
        format: item.format,
        aspectRatio: formatSpec.aspectRatio,
        marketingObjective: item.objective,
        conversionFocus: item.conversionFocus,
        caption: item.caption,
        hashtags: item.hashtags,
        cta: item.cta,
        recommendedDate: dateStr,
        recommendedTime: item.time,
        status: 'aguardando_aprovacao',
        publishingState: 'bloqueado_sem_integracao',
        dataSource: 'demo',
        slides: item.slides,
        reelsScript: item.reelsScript,
        auditLog: [],
        createdAt: now,
        updatedAt: now,
      };
    });
  }

  async generateSingleContent(input: GenerateSingleContentInput): Promise<ContentPost> {
    const now = new Date().toISOString();
    const formatSpec = FORMAT_META[input.format];
    const topicClean = input.topic.trim() || 'Limites saudáveis no dia a dia familiar';
    const dayOfWeek = getWeekdayNameFromDate(input.recommendedDate);

    const isVertical = formatSpec.aspectRatio === '1080x1920';
    const baseImage =
      input.category === 'comercial' || input.category === 'autoridade'
        ? '/brand/jessica-portrait.jpg'
        : input.category === 'emocional'
          ? '/media/parents-reading.jpg'
          : '/media/family-connection.jpg';

    const slides: ContentPost['slides'] =
      input.format === 'carrossel'
        ? [
            {
              id: makeId('sl'),
              order: 1,
              eyebrow: 'EDUCAÇÃO PARENTAL • MÉTODO ALMA',
              headline: topicClean,
              body: 'Deslize para aplicar passos práticos com amor, clareza e firmeza.',
              footer: input.brand.instagramHandle,
              imageUrl: baseImage,
              template: 'retrato_destaque',
            },
            {
              id: makeId('sl'),
              order: 2,
              eyebrow: 'PASSO 01 • CONSCIÊNCIA',
              headline: 'Entenda a raiz antes de reagir',
              body: `Aplique a escuta ativa do Método ALMA para identificar a necessidade emocional por trás do comportamento.`,
              footer: 'Slide 2 de 3',
              template: 'verde_acolhimento',
            },
            {
              id: makeId('sl'),
              order: 3,
              eyebrow: 'PRÓXIMO PASSO',
              headline: 'Quer apoio personalizado para sua família?',
              body: 'Comente "ALMA" ou envie uma mensagem no Direct para conhecer a mentoria.',
              footer: `${input.brand.brandName} • ${input.brand.instagramHandle}`,
              template: 'ametista_editorial',
            },
          ]
        : [
            {
              id: makeId('sl'),
              order: 1,
              eyebrow: isVertical ? 'FORMATO VERTICAL 9:16' : 'MISSÃO EM FAMÍLIA',
              headline: topicClean,
              body: input.marketingObjective || 'Conteúdo criado sob medida para atrair e acolher famílias.',
              footer: `${input.brand.brandName} • ${input.brand.instagramHandle}`,
              imageUrl: baseImage,
              template: input.category === 'autoridade' ? 'metodo_alma_dourado' : 'retrato_destaque',
            },
          ];

    const reelsScript: ContentPost['reelsScript'] =
      input.format === 'reels'
        ? [
            {
              id: makeId('rs'),
              timeRange: '00:00 – 00:05',
              visualDirection: 'Jessica olhando para a câmera com expressão serena.',
              spokenLine: `Você já passou por isso com seus filhos? Vamos falar sobre ${topicClean.toLowerCase()}.`,
              onScreenText: topicClean,
            },
            {
              id: makeId('rs'),
              timeRange: '00:06 – 00:28',
              visualDirection: 'Explicação clara com legenda verde e roxa.',
              spokenLine:
                'No Método ALMA, unimos acolhimento emocional com limites objetivos para transformar a rotina sem gritos.',
              onScreenText: 'Acolhimento + Limite Claro = Cooperação',
            },
            {
              id: makeId('rs'),
              timeRange: '00:29 – 00:42',
              visualDirection: 'Convite final com assinatura JN.',
              spokenLine: 'Quer aplicar isso com acompanhamento na sua casa? Clique no link da bio.',
              onScreenText: 'Conheça a Mentoria Método ALMA • Link na bio',
            },
          ]
        : undefined;

    return {
      id: makeId('post-custom'),
      weekLabel: 'Planejamento ativo',
      dayOfWeek,
      title: topicClean,
      category: input.category,
      format: input.format,
      aspectRatio: formatSpec.aspectRatio,
      marketingObjective:
        input.marketingObjective.trim() ||
        'Gerar conexões reais com pais e conduzir famílias interessadas para o Direct.',
      conversionFocus: 'Convite direto para conversa de diagnóstico ou mentoria Método ALMA.',
      caption: `${topicClean}\n\nEducar com presença, limites claros e valores sólidos não precisa ser um caminho solitário. No Método ALMA, mostramos como transformar os desafios diários em oportunidades de maturidade e conexão.\n\n👉 Salve este conteúdo e comente "ALMA" se quiser receber orientação sobre a Mentoria Missão em Família.`,
      hashtags: [
        '#educacaoparental',
        '#metodoalma',
        '#missaoemfamilia',
        '#jessicanalin',
        '#familiasaudavel',
      ],
      cta: 'Comente "ALMA" ou clique no link da bio para agendar seu diagnóstico familiar.',
      recommendedDate: input.recommendedDate,
      recommendedTime: input.recommendedTime,
      status: 'aguardando_aprovacao',
      publishingState: 'bloqueado_sem_integracao',
      dataSource: 'demo',
      slides,
      reelsScript,
      auditLog: [],
      createdAt: now,
      updatedAt: now,
    };
  }
}

export function getGeminiMarketingService(): IGeminiMarketingService {
  // Etapa 1: usa sempre o gerador de demonstração para não incorrer em custos externos sem autorização.
  return new DemoGeminiMarketingService();
}
