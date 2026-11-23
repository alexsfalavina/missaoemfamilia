import type {
  BrandProfile,
  ContentCategory,
  ContentFormat,
  ContentPost,
  ContentToneProfile,
  DataSourceMode,
  DesignTemplateId,
  MediaAsset,
  ReelsProductionWorkflow,
  StoryExecutionMode,
  StrategicObjective,
} from '@/types/marketing';
import { FORMAT_META, getWeekdayNameFromDate } from '@/lib/constants/labels';

export interface GeminiServerConfig {
  configured: boolean;
  model: string;
}

export interface GenerateWeeklyPlanInput {
  brand: BrandProfile;
  batchId: string;
  weekStartDate: string; // YYYY-MM-DD (Segunda-feira)
  focusTheme?: string;
  mediaLibrary?: MediaAsset[];
  existingTitles?: string[];
}

export interface GenerateSingleContentInput {
  brand: BrandProfile;
  batchId: string;
  topic: string;
  category: ContentCategory;
  strategicObjective?: StrategicObjective;
  format: ContentFormat;
  storyExecutionMode?: StoryExecutionMode;
  marketingObjective: string;
  recommendedDate: string;
  recommendedTime: string;
  mediaLibrary?: MediaAsset[];
}

export interface RegeneratePostInput {
  post: ContentPost;
  brand: BrandProfile;
  mode: 'completo' | 'outro_tom' | 'outro_visual';
  requestedTone?: ContentToneProfile;
  visualInstruction?: string;
  mediaLibrary?: MediaAsset[];
  existingTitles?: string[];
}

export interface IGeminiMarketingService {
  getMode(): DataSourceMode;
  generateWeeklyPlan(input: GenerateWeeklyPlanInput): Promise<ContentPost[]>;
  generateSingleContent(input: GenerateSingleContentInput): Promise<ContentPost>;
  regeneratePost(input: RegeneratePostInput): Promise<ContentPost>;
  buildReelsProductionFromScript(
    post: ContentPost,
    videoAsset?: { id: string; url: string; name: string }
  ): ReelsProductionWorkflow;
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
 * Seleciona fotografia autêntica de Jessica na Biblioteca de Mídia quando disponível.
 * REGRA: Imagens geradas por IA nunca são apresentadas como fotografias reais de Jessica.
 */
function pickPreferredAuthenticPhoto(
  mediaLibrary: MediaAsset[] | undefined,
  prioritizeAuthority: boolean,
  variantIndex = 0
): { url?: string; authenticity?: MediaAsset['authenticity'] } {
  const list = mediaLibrary ?? [];
  const authenticPhotos = list.filter(
    (m) =>
      m.authenticity === 'autentico_jessica' &&
      (m.category === 'foto_profissional' || m.category === 'foto_pessoal')
  );

  if (authenticPhotos.length > 0) {
    const chosen = authenticPhotos[variantIndex % authenticPhotos.length];
    return { url: chosen.url, authenticity: 'autentico_jessica' };
  }

  // Sem foto real enviada: em posts de autoridade usamos layout editorial limpo (sem foto de IA como se fosse Jessica)
  if (prioritizeAuthority) {
    return { url: undefined, authenticity: undefined };
  }

  const neutralDemo = list.filter(
    (m) => m.authenticity === 'ilustracao_demo' && !m.url.includes('jessica-portrait')
  );
  if (neutralDemo.length > 0) {
    const chosen = neutralDemo[variantIndex % neutralDemo.length];
    return { url: chosen.url, authenticity: 'ilustracao_demo' };
  }

  return { url: undefined, authenticity: undefined };
}

function buildVerifiedServiceLine(brand: BrandProfile): string {
  const primaryService = brand.servicesOffered[0] || 'Mentoria Familiar — Método ALMA';
  const enrollment =
    brand.verifiedCommercialInfo?.enrollmentProcess ||
    `Os interessados podem conversar pelo Direct (${brand.instagramHandle}) para receber informações sobre formato e disponibilidade atual.`;
  return `${primaryService}. ${enrollment}`;
}

interface CredibleTopicSeed {
  title: string;
  category: ContentCategory;
  strategicObjective: StrategicObjective;
  format: ContentFormat;
  toneProfile: ContentToneProfile;
  storyExecutionMode?: StoryExecutionMode;
  storyManualInstructions?: string;
  definedAudience: string;
  openingHook: string;
  educationalValue: string;
  marketingObjective: string;
  conversionFocus: string;
  serviceConnection?: string;
  captionBody: string;
  cta: string;
  hashtags: string[];
  slideDeck: Array<{ eyebrow: string; headline: string; body: string; template: DesignTemplateId }>;
  reelsScenes?: Array<{
    timeRange: string;
    visualDirection: string;
    spokenLine: string;
    onScreenText: string;
  }>;
}

function getCredibleTopicBank(brand: BrandProfile, themeSuffix: string): CredibleTopicSeed[] {
  const verifiedService = buildVerifiedServiceLine(brand);
  const consultationFormat =
    brand.verifiedCommercialInfo?.consultationFormat ||
    'Acompanhamento online estruturado nos pilares do Método ALMA e PNL aplicada à parentalidade.';

  return [
    {
      title: `Transição de telas sem disputa de poder: como preparar o cérebro infantil para encerrar uma atividade${themeSuffix}`,
      category: 'educativo',
      strategicObjective: 'crescimento_audiencia',
      format: 'carrossel',
      toneProfile: 'firme_pratico',
      definedAudience: 'Pais de crianças de 3 a 10 anos que enfrentam choro ou resistência ao encerrar desenhos e jogos.',
      openingHook: 'Desligar a tela de surpresa costuma gerar resistência intensa — não por falta de educação, mas porque o cérebro infantil precisa de previsibilidade na transição.',
      educationalValue: 'Ensina a técnica de ponte de atenção (entrar no universo da criança por alguns segundos + combinado prévio visual + escolha limitada) baseada em desenvolvimento infantil e PNL.',
      marketingObjective: 'Alcançar novas famílias com orientação prática e realista que gera salvamentos e compartilhamentos.',
      conversionFocus: 'Estimular comentários sobre desafios reais de rotina para construir relacionamento qualificado.',
      serviceConnection: 'Pilar Limites do Método ALMA.',
      captionBody:
        'Quando uma criança está absorvida por um estímulo visual intenso, interromper abruptamente gera frustração imediata.\n\nNa PNL aplicada à parentalidade, usamos a transição guiada:\n1. Combine o tempo antes de ligar (usando referência concreta, como "um episódio" em vez de "daqui a pouco").\n2. Aproxime-se e demonstre interesse por alguns segundos no que ela está vendo antes do aviso final.\n3. Ofereça uma transição clara para a próxima atividade.\n\nEsse processo exige constância ao longo dos dias — mas reduz gradualmente a guerra diária e fortalece a cooperação.',
      cta: 'Salve para testar esta semana e conte nos comentários qual horário das telas é mais desafiador aí em casa.',
      hashtags: ['#educacaoparental', '#desenvolvimentoinfantil', '#pnlparapais', '#limitescomrespeito', '#metodoalma'],
      slideDeck: [
        { eyebrow: 'EDUCAÇÃO PARENTAL • TRANSIÇÃO DE TELAS', headline: `Como desligar as telas sem transformar a sala em campo de batalha${themeSuffix}`, body: 'Previsibilidade e ponte de atenção aplicadas ao desenvolvimento infantil.', template: 'ametista_editorial' },
        { eyebrow: '01 • POR QUE A RESISTÊNCIA ACONTECE', headline: 'Cortes bruscos sobrecarregam a autorregulação', body: 'A criança pequena ainda está desenvolvendo a capacidade de encerrar estímulos de alta dopamina sozinha.', template: 'verde_acolhimento' },
        { eyebrow: '02 • PNL NA PRÁTICA', headline: 'Conecte antes de redirecionar', body: 'Sente-se ao lado por 15 segundos, comente o que ela assiste e só então lembre o combinado de encerramento.', template: 'metodo_alma_dourado' },
        { eyebrow: '03 • CONSTÂNCIA', headline: 'Combinado claro vence ameaça repetida', body: 'A previsibilidade construída dia após dia traz segurança emocional para pais e filhos.', template: 'ametista_editorial' },
      ],
    },
    {
      title: `O que diferencia acolhimento emocional de permissividade na educação dos filhos${themeSuffix}`,
      category: 'autoridade',
      strategicObjective: 'autoridade_profissional',
      format: 'reels',
      toneProfile: 'tecnico_acessivel',
      definedAudience: 'Pais que querem praticar parentalidade positiva, mas têm medo de perder autoridade ou criar filhos sem limites.',
      openingHook: 'Um dos maiores receios de quem busca educar com respeito é confundir acolhimento com falta de limite — mas os dois caminham juntos.',
      educationalValue: 'Esclarece o equilíbrio entre firmeza e respeito (pilares Limites e Acolhimento do Método ALMA) com exemplos concretos de fala.',
      marketingObjective: 'Consolidar autoridade profissional de Jessica Nalin desfazendo mitos sobre parentalidade positiva.',
      conversionFocus: 'Apresentar naturalmente a Mentoria Familiar para pais que desejam aplicar esse equilíbrio em casa.',
      serviceConnection: 'Mentoria Familiar — Método ALMA.',
      captionBody:
        'Acolher a emoção de uma criança nunca significa liberar todo comportamento.\n\nNa parentalidade positiva com base sólida:\n• A emoção é legítima (a criança pode ficar triste ou frustrada com um "não").\n• O limite continua firme e previsível (bater, xingar ou descumprir o combinado não passa a ser permitido).\n\nQuando o adulto sustenta o "não" sem humilhar e sem ceder por cansaço, a criança aprende duas lições essenciais ao mesmo tempo: respeito às regras e segurança emocional.',
      cta: 'Se você deseja estruturar limites firmes e respeitosos na sua casa, envie uma mensagem no Direct para conhecer a Mentoria Familiar.',
      hashtags: ['#parentalidadepositiva', '#limites', '#regulacaoemocional', '#metodoalma', '#mentoriafamiliar'],
      slideDeck: [
        { eyebrow: 'REELS • AUTORIDADE PROFISSIONAL', headline: 'Acolher a emoção não é abrir mão do limite', body: 'Como sustentar firmeza respeitosa na rotina familiar.', template: 'ametista_editorial' },
      ],
      reelsScenes: [
        { timeRange: '00:00 – 00:06', visualDirection: 'Jessica em plano médio, iluminação natural e postura tranquila.', spokenLine: 'Muita gente acha que educar com respeito significa dizer sim para tudo — e é justamente aí que nasce a insegurança dos pais.', onScreenText: 'Parentalidade positiva NÃO é permissividade' },
        { timeRange: '00:07 – 00:24', visualDirection: 'Explicação pausada com palavras-chave sutis na tela.', spokenLine: 'No Método ALMA, separamos emoção de comportamento. Seu filho tem direito de ficar frustrado com um limite, mas o limite continua valendo.', onScreenText: 'Emoção acolhida + Regra mantida' },
        { timeRange: '00:25 – 00:40', visualDirection: 'Exemplo prático olhando diretamente para a câmera.', spokenLine: 'Você pode dizer: "Eu entendo que você queria ficar mais tempo, mas agora é hora do banho." Firme no combinado, sereno no tom.', onScreenText: 'Firme no combinado, sereno no tom' },
        { timeRange: '00:41 – 00:50', visualDirection: 'Encerramento natural com identidade @eujessynalin.', spokenLine: 'Na Mentoria Familiar ajudamos pais a aplicarem essa postura nas situações reais de cada fase. Se quiser saber como funciona, me chame no Direct.', onScreenText: 'Mentoria Familiar • @eujessynalin' },
      ],
    },
    {
      title: `Linguagem que constrói cooperação: trocas simples da PNL para o diálogo diário${themeSuffix}`,
      category: 'educativo',
      strategicObjective: 'crescimento_audiencia',
      format: 'stories',
      toneProfile: 'firme_pratico',
      storyExecutionMode: 'publicacao_automatica',
      definedAudience: 'Pais que percebem que frases no negativo ("não corra", "não grite") parecem aumentar o comportamento indesejado.',
      openingHook: 'O cérebro processa primeiro a ação concreta mencionada na frase — por isso orientar o que fazer funciona melhor do que apenas proibir.',
      educationalValue: 'Apresenta 3 reformulações práticas de comunicação positiva com base em PNL aplicada à parentalidade.',
      marketingObjective: 'Sequência de Stories informativos (aptos para publicação automática na Etapa 2) de alto valor prático.',
      conversionFocus: 'Aumentar retenção e compartilhamento dos Stories educativos.',
      captionBody:
        'Sequência de 3 telas educativas prontas para publicação automática (sem adesivos interativos), mostrando trocas diretas de linguagem que facilitam a compreensão infantil.',
      cta: 'Experimente uma dessas trocas hoje e observe como seu filho responde à direção clara.',
      hashtags: ['#pnlparapais', '#comunicacaofamiliar', '#educacaoparental'],
      slideDeck: [
        { eyebrow: 'STORY 1 • PNL PARENTAL (AUTOMÁTICO)', headline: 'Por que "não faça isso" muitas vezes falha com crianças pequenas?', body: 'Quando dizemos apenas o que não fazer, a criança ainda precisa descobrir qual comportamento esperamos dela.', template: 'verde_acolhimento' },
        { eyebrow: 'STORY 2 • TROCAS PRÁTICAS', headline: 'Indique a ação desejada com clareza', body: '• "Não corre!" → "Ande devagar aqui na sala."\n• "Não grita!" → "Use sua voz baixa para eu te entender."', template: 'ametista_editorial' },
        { eyebrow: 'STORY 3 • PRÁTICA DIÁRIA', headline: 'Direção clara reduz desgaste repetitivo', body: 'Pequenos ajustes na linguagem constroem um ambiente familiar mais previsível.', template: 'metodo_alma_dourado' },
      ],
    },
    {
      title: `Pergunta aberta nos Stories: qual situação de regulação emocional você gostaria de ver explicada aqui?`,
      category: 'engajamento',
      strategicObjective: 'captacao_clientes',
      format: 'stories',
      toneProfile: 'acolhedor_sereno',
      storyExecutionMode: 'acao_manual_instagram',
      storyManualInstructions:
        'Ação manual no Instagram: adicionar adesivo de ENQUETE na Tela 1 (Regulação emocional / Limites sem gritos / Ciúmes entre irmãos / Rotina escolar) e CAIXINHA DE PERGUNTAS na Tela 2.',
      definedAudience: 'Famílias que acompanham @eujessynalin e possuem dúvidas específicas sobre o comportamento dos filhos.',
      openingHook: 'Trazer suas dúvidas reais da semana ajuda a transformar este espaço em orientação verdadeiramente útil para sua casa.',
      educationalValue: 'Abre espaço qualificado de escuta para responder dúvidas reais com responsabilidade técnica.',
      marketingObjective: 'Mapear interesses reais em Avaliação Familiar e Mentoria sem forçar venda.',
      conversionFocus: 'Iniciar diálogos individuais no Direct quando a família solicitar orientação aprofundada.',
      serviceConnection: 'Avaliação e Diagnóstico de Rotina Familiar.',
      captionBody:
        'Sequência interativa de Stories (requer adesivos manuais de enquete e caixinha dentro do Instagram) para coletar dúvidas reais sobre regulação emocional e rotina familiar.',
      cta: 'Vote na enquete e envie sua pergunta na caixinha dos Stories.',
      hashtags: ['#educacaoparental', '#regulacaoemocional', '#mentoriafamiliar'],
      slideDeck: [
        { eyebrow: 'STORY 1 • INSERIR ENQUETE MANUAL', headline: 'Qual tema ajudaria mais a sua família nesta semana?', body: '[Adesivo Enquete no Instagram]\n• Regulação emocional\n• Limites sem gritos\n• Conflitos entre irmãos\n• Rotina escolar', template: 'verde_acolhimento' },
        { eyebrow: 'STORY 2 • INSERIR CAIXINHA MANUAL', headline: 'Deixe sua dúvida real na caixinha abaixo', body: '[Adesivo Caixinha de Perguntas]\nResponderei com orientação prática e respeitosa.', template: 'ametista_editorial' },
      ],
    },
    {
      title: `Avaliação e Mentoria Familiar: quando o acompanhamento individual faz diferença para pais e filhos`,
      category: 'comercial',
      strategicObjective: 'captacao_clientes',
      format: 'carrossel',
      toneProfile: 'tecnico_acessivel',
      definedAudience: 'Pais que reconhecem padrões repetitivos de desgaste em casa e desejam um plano acompanhado com seriedade.',
      openingHook: 'Nem toda dificuldade familiar se resolve com dicas genéricas — às vezes o que traz clareza é olhar com método para a dinâmica única da sua casa.',
      educationalValue: 'Explica quando buscar avaliação familiar, quais aspectos são analisados (rotina, comunicação, estágio de desenvolvimento, pilares ALMA) e como funciona o contato inicial.',
      marketingObjective: 'Gerar pedidos qualificados de informação sobre Mentoria e Avaliação Familiar usando somente dados verificados do perfil.',
      conversionFocus: 'Convidar interessados a solicitarem informações reais no Direct ou link da bio.',
      serviceConnection: verifiedService,
      captionBody: `Quando uma família tenta vários ajustes isolados e sente que o desgaste sempre retorna, olhar o cenário completo com acompanhamento profissional traz direção e leveza.\n\n${consultationFormat}\n\nNo processo, analisamos:\n• A fase de desenvolvimento de cada filho.\n• Os momentos críticos da rotina.\n• A comunicação entre os adultos e com as crianças.\n• Um plano prático apoiado no Método ALMA (Autonomia, Limites, Maturidade e Acolhimento).\n\n${verifiedService}`,
      cta: `Envie uma mensagem no Direct (${brand.instagramHandle}) para receber as informações detalhadas sobre a Mentoria e a Avaliação Familiar.`,
      hashtags: ['#mentoriafamiliar', '#avaliacaofamiliar', '#metodoalma', '#educacaoparental', '#pnlparapais'],
      slideDeck: [
        { eyebrow: 'SERVIÇOS VERIFICADOS • MÉTODO ALMA', headline: 'Quando buscar uma Avaliação ou Mentoria Familiar?', body: 'Entenda como funciona o acompanhamento estruturado para pais e famílias.', template: 'metodo_alma_dourado' },
        { eyebrow: '01 • OLHAR PERSONALIZADO', headline: 'Cada família tem idades, rotinas e valores próprios', body: 'O acompanhamento adapta as ferramentas de educação parental à realidade da sua casa.', template: 'ametista_editorial' },
        { eyebrow: '02 • PILARES DO PROCESSO', headline: 'Autonomia, Limites, Maturidade e Acolhimento', body: 'Baseado em desenvolvimento infantil, regulação emocional e PNL aplicada à parentalidade.', template: 'verde_acolhimento' },
        { eyebrow: 'COMO INICIAR', headline: 'Solicite informações pelo Direct', body: 'Conversamos para entender o momento da sua família e explicar formato e disponibilidade atual.', template: 'metodo_alma_dourado' },
      ],
    },
    {
      title: `Conflitos entre irmãos: como mediar sem assumir o papel de juiz`,
      category: 'autoridade',
      strategicObjective: 'autoridade_profissional',
      format: 'carrossel',
      toneProfile: 'firme_pratico',
      definedAudience: 'Pais de dois ou mais filhos desgastados com brigas frequentes e pedidos constantes para descobrir "quem começou".',
      openingHook: 'Quando os pais entram na briga tentando descobrir quem é o culpado, quase sempre reforçam a disputa por atenção entre os irmãos.',
      educationalValue: 'Ensina mediação parental respeitosa: garantir segurança física, descrever o conflito sem rotular e orientar a busca de solução.',
      marketingObjective: 'Demonstrar autoridade em relacionamentos familiares e resolução construtiva de conflitos.',
      conversionFocus: 'Alto compartilhamento entre mães e pais com mais de um filho.',
      serviceConnection: 'Relacionamentos familiares e Método ALMA.',
      captionBody:
        'Mediar brigas entre irmãos é uma das situações que mais drenam a energia dos pais no fim de semana.\n\nTentar agir como juiz ("quem bateu primeiro?") costuma transformar o conflito em disputa pela validação do adulto.\n\nUma postura mediadora envolve:\n1. Interromper qualquer agressão física com firmeza imediata.\n2. Ouvir brevemente cada lado sem rotular um como "vítima" e outro como "culpado".\n3. Conduzir os dois a encontrarem um combinado viável para retomar a convivência.\n\nCom prática, os irmãos desenvolvem habilidades reais de negociação e empatia.',
      cta: 'Salve este passo a passo e compartilhe com quem também media conflitos entre irmãos em casa.',
      hashtags: ['#relacionamentosfamiliares', '#irmaos', '#educacaoparental', '#parentalidadepositiva', '#metodoalma'],
      slideDeck: [
        { eyebrow: 'RELACIONAMENTOS FAMILIARES', headline: 'Como mediar brigas entre irmãos sem virar juiz', body: 'Postura prática para ensinar negociação e respeito dentro de casa.', template: 'verde_acolhimento' },
        { eyebrow: 'PASSO 01 • SEGURANÇA', headline: 'Interrompa a agressão com calma firme', body: 'Limite físico claro antes de qualquer conversa: "Não permito machucar. Vamos pausar."', template: 'ametista_editorial' },
        { eyebrow: 'PASSO 02 • MEDIAÇÃO', headline: 'Troque "quem começou?" por "como resolvemos?"', body: 'Descreva o problema em voz neutra e convide ambos a propor uma saída justa.', template: 'metodo_alma_dourado' },
      ],
    },
    {
      title: `O exemplo emocional dos adultos: o que as crianças absorvem da forma como lidamos com o próprio estresse`,
      category: 'emocional',
      strategicObjective: 'autoridade_profissional',
      format: 'post_unico',
      toneProfile: 'reflexivo_profundo',
      definedAudience: 'Pais que desejam filhos emocionalmente maduros, mas vivem rotinas aceleradas e sobrecarga diária.',
      openingHook: 'Antes de aprenderem pelas nossas explicações, as crianças aprendem observando como regulamos nossa própria frustração nos dias difíceis.',
      educationalValue: 'Aborda modelagem emocional no desenvolvimento infantil e o pilar Maturidade do Método ALMA de forma realista e sem culpa.',
      marketingObjective: 'Fortalecer conexão madura e credibilidade profissional no encerramento da semana.',
      conversionFocus: 'Reforçar confiança na abordagem séria e acolhedora de Jessica Nalin.',
      serviceConnection: 'Pilar Maturidade do Método ALMA.',
      captionBody:
        'Não é possível exigir equilíbrio emocional constante de uma criança em um ambiente em que os adultos vivem no limite do esgotamento sem espaço de pausa.\n\nNa educação parental consciente, cuidar da própria regulação emocional não é egoísmo — é ferramenta educativa.\n\nQuando seu filho vê você respirar fundo, nomear que está cansada e escolher falar com respeito mesmo diante de um imprevisto, ele aprende na prática como um adulto lida com emoções difíceis.\n\nQual pequena pausa realista você pode proteger na sua agenda nesta semana?',
      cta: 'Salve esta reflexão e envie para alguém que divide com você o cuidado da família.',
      hashtags: ['#regulacaoemocional', '#maturidadeemocional', '#educacaoparental', '#metodoalma', '#relacionamentosfamiliares'],
      slideDeck: [
        { eyebrow: 'PILAR MATURIDADE • MÉTODO ALMA', headline: 'As crianças aprendem regulação emocional observando como lidamos com a nossa própria frustração.', body: 'Cuidar do equilíbrio dos pais é parte essencial da educação dos filhos.', template: 'metodo_alma_dourado' },
      ],
    },
  ];
}

function adaptCaptionByTone(post: ContentPost, tone: ContentToneProfile, brand: BrandProfile): {
  caption: string;
  openingHook: string;
} {
  const cleanBody = post.caption
    .replace(/^\[(Tom[^\]]+)\]\s*/i, '')
    .trim();

  if (tone === 'acolhedor_sereno') {
    const openingHook = `Educar exige presença real — e entender ${post.title.toLowerCase()} traz mais leveza para o dia a dia da família.`;
    return {
      openingHook,
      caption: `${openingHook}\n\n${cleanBody}`,
    };
  }
  if (tone === 'tecnico_acessivel') {
    const openingHook = `Sob a ótica do desenvolvimento infantil e da PNL aplicada à parentalidade, compreender ${post.title.toLowerCase()} ajuda pais a agirem com mais segurança.`;
    return {
      openingHook,
      caption: `${openingHook}\n\n${cleanBody}`,
    };
  }
  if (tone === 'firme_pratico') {
    const openingHook = `Na prática da rotina familiar, clareza e constância em torno de "${post.title}" reduzem desgastes repetitivos.`;
    return {
      openingHook,
      caption: `${openingHook}\n\n${cleanBody}`,
    };
  }
  const openingHook = `Mais do que corrigir comportamentos pontuais, refletir sobre "${post.title}" fortalece os vínculos e a maturidade da família (${brand.instagramHandle}).`;
  return {
    openingHook,
    caption: `${openingHook}\n\n${cleanBody}`,
  };
}

/**
 * Implementação determinística de demonstração (custo zero) com alta credibilidade editorial.
 * Quando GEMINI_API_KEY for autorizada na Etapa 2, esta interface recebe o adaptador oficial server-side.
 */
class DemoGeminiMarketingService implements IGeminiMarketingService {
  getMode(): DataSourceMode {
    return 'demo';
  }

  buildReelsProductionFromScript(
    post: ContentPost,
    videoAsset?: { id: string; url: string; name: string }
  ): ReelsProductionWorkflow {
    const scenes = post.reelsScript ?? [];
    const subtitles =
      scenes.length > 0
        ? scenes.map((sc, idx) => {
            const parts = sc.timeRange.split(/[–-]/).map((s) => s.trim());
            return {
              id: makeId(`sub-${idx + 1}`),
              startTime: parts[0] || `00:${String(idx * 10).padStart(2, '0')}`,
              endTime: parts[1] || `00:${String((idx + 1) * 10).padStart(2, '0')}`,
              text: sc.spokenLine,
            };
          })
        : [
            {
              id: makeId('sub-1'),
              startTime: '00:00',
              endTime: '00:10',
              text: post.openingHook || post.title,
            },
            {
              id: makeId('sub-2'),
              startTime: '00:11',
              endTime: '00:35',
              text: post.educationalValue || post.marketingObjective,
            },
          ];

    return {
      stage: videoAsset ? 'edicao_preparada' : 'roteiro_pronto',
      uploadedVideoAssetId: videoAsset?.id ?? post.reelsProduction?.uploadedVideoAssetId,
      uploadedVideoUrl: videoAsset?.url ?? post.reelsProduction?.uploadedVideoUrl,
      uploadedVideoName: videoAsset?.name ?? post.reelsProduction?.uploadedVideoName,
      subtitles,
      editingSuggestions: [
        'Remover silêncios iniciais para que o gancho de abertura comece no primeiro segundo.',
        'Inserir corte sutil de enquadramento (zoom 105%) na transição entre a explicação e o exemplo prático.',
        'Posicionar legendas acima da barra inferior do Instagram (zona segura) destacando termos-chave do Método ALMA.',
        'Usar exclusivamente vídeo real gravado por Jessica — nunca utilizar avatares ou filmagens artificiais.',
      ],
      coverReady: post.slides.length > 0,
      updatedAt: new Date().toISOString(),
    };
  }

  async generateWeeklyPlan(input: GenerateWeeklyPlanInput): Promise<ContentPost[]> {
    const { brand, weekStartDate, focusTheme, mediaLibrary } = input;
    const themeSuffix = focusTheme?.trim() ? ` — ${focusTheme.trim()}` : '';
    const endIso = addDays(weekStartDate, 6);
    const weekLabel = `Semana de ${weekStartDate.slice(8, 10)}/${weekStartDate.slice(5, 7)} a ${endIso.slice(8, 10)}/${endIso.slice(5, 7)}`;
    const now = new Date().toISOString();

    const bank = getCredibleTopicBank(brand, themeSuffix);
    const times = ['19:00', '18:30', '15:30', '10:30', '19:00', '09:30', '18:00'];

    return bank.map((item, idx) => {
      const dateStr = addDays(weekStartDate, idx);
      const formatSpec = FORMAT_META[item.format];
      const isAuthority = item.strategicObjective === 'autoridade_profissional';
      const preferredMedia = pickPreferredAuthenticPhoto(mediaLibrary, isAuthority, idx);

      const slides = item.slideDeck.map((sl, sIdx) => ({
        id: makeId(`sl-${idx + 1}-${sIdx + 1}`),
        order: sIdx + 1,
        eyebrow: sl.eyebrow,
        headline: sl.headline,
        body: sl.body,
        footer:
          sIdx === item.slideDeck.length - 1 || item.slideDeck.length === 1
            ? `${brand.brandName} • ${brand.instagramHandle}`
            : `Slide ${sIdx + 1} de ${item.slideDeck.length}`,
        imageUrl: sIdx === 0 ? preferredMedia.url : undefined,
        imageAuthenticity: sIdx === 0 ? preferredMedia.authenticity : undefined,
        template:
          sIdx === 0 && preferredMedia.url
            ? 'retrato_destaque'
            : sl.template,
      }));

      const reelsScript = item.reelsScenes?.map((sc, rIdx) => ({
        id: makeId(`rs-${idx + 1}-${rIdx + 1}`),
        ...sc,
      }));

      const postBase: ContentPost = {
        id: makeId(`post-w-${idx + 1}`),
        batchId: input.batchId,
        weekLabel,
        dayOfWeek: getWeekdayNameFromDate(dateStr),
        title: item.title,
        category: item.category,
        strategicObjective: item.strategicObjective,
        toneProfile: item.toneProfile,
        format: item.format,
        aspectRatio: formatSpec.aspectRatio,
        definedAudience: item.definedAudience,
        openingHook: item.openingHook,
        educationalValue: item.educationalValue,
        marketingObjective: item.marketingObjective,
        conversionFocus: item.conversionFocus,
        serviceConnection: item.serviceConnection,
        caption: `${item.captionBody}\n\n${item.cta}`,
        hashtags: item.hashtags,
        cta: item.cta,
        recommendedDate: dateStr,
        recommendedTime: times[idx] ?? '19:00',
        status: 'aguardando_aprovacao',
        publishingState: 'bloqueado_sem_integracao',
        dataSource: 'demo',
        storyExecutionMode: item.storyExecutionMode,
        storyManualInstructions: item.storyManualInstructions,
        slides,
        reelsScript,
        auditLog: [],
        createdAt: now,
        updatedAt: now,
      };

      if (item.format === 'reels') {
        postBase.reelsProduction = this.buildReelsProductionFromScript(postBase);
      }

      return postBase;
    });
  }

  async generateSingleContent(input: GenerateSingleContentInput): Promise<ContentPost> {
    const now = new Date().toISOString();
    const formatSpec = FORMAT_META[input.format];
    const topicClean =
      input.topic.trim() || 'Comunicação respeitosa e limites claros na rotina familiar';
    const dayOfWeek = getWeekdayNameFromDate(input.recommendedDate);
    const strategicObjective: StrategicObjective =
      input.strategicObjective ??
      (input.category === 'comercial' || input.category === 'engajamento'
        ? 'captacao_clientes'
        : input.category === 'autoridade'
          ? 'autoridade_profissional'
          : 'crescimento_audiencia');

    const isAuthority = strategicObjective === 'autoridade_profissional';
    const preferredMedia = pickPreferredAuthenticPhoto(input.mediaLibrary, isAuthority, 0);
    const storyMode =
      input.format === 'stories'
        ? input.storyExecutionMode ?? 'publicacao_automatica'
        : undefined;

    const slides: ContentPost['slides'] =
      input.format === 'carrossel'
        ? [
            {
              id: makeId('sl'),
              order: 1,
              eyebrow: 'EDUCAÇÃO PARENTAL • MÉTODO ALMA',
              headline: topicClean,
              body: 'Orientações práticas baseadas em desenvolvimento infantil, regulação emocional e PNL.',
              footer: input.brand.instagramHandle,
              imageUrl: preferredMedia.url,
              imageAuthenticity: preferredMedia.authenticity,
              template: preferredMedia.url ? 'retrato_destaque' : 'ametista_editorial',
            },
            {
              id: makeId('sl'),
              order: 2,
              eyebrow: '01 • COMPREENSÃO',
              headline: 'Entenda o que está por trás do comportamento',
              body: 'Olhar para a fase de desenvolvimento e para a necessidade emocional evita reações impulsivas.',
              footer: 'Slide 2 de 3',
              template: 'verde_acolhimento',
            },
            {
              id: makeId('sl'),
              order: 3,
              eyebrow: '02 • APLICAÇÃO NA ROTINA',
              headline: 'Limite claro sustentado com calma e constância',
              body: `Para aprofundar esse tema na realidade da sua família, converse conosco no Direct (${input.brand.instagramHandle}).`,
              footer: `${input.brand.brandName} • ${input.brand.instagramHandle}`,
              template: 'metodo_alma_dourado',
            },
          ]
        : [
            {
              id: makeId('sl'),
              order: 1,
              eyebrow:
                input.format === 'stories'
                  ? storyMode === 'acao_manual_instagram'
                    ? 'STORY INTERATIVO • AÇÃO MANUAL'
                    : 'STORY INFORMATIVO • AUTOMÁTICO'
                  : 'EDUCAÇÃO PARENTAL • MÉTODO ALMA',
              headline: topicClean,
              body:
                input.marketingObjective ||
                'Conteúdo estruturado com clareza, credibilidade e respeito à realidade das famílias.',
              footer: `${input.brand.brandName} • ${input.brand.instagramHandle}`,
              imageUrl: preferredMedia.url,
              imageAuthenticity: preferredMedia.authenticity,
              template: preferredMedia.url ? 'retrato_destaque' : 'metodo_alma_dourado',
            },
          ];

    const reelsScript: ContentPost['reelsScript'] =
      input.format === 'reels'
        ? [
            {
              id: makeId('rs'),
              timeRange: '00:00 – 00:06',
              visualDirection: 'Jessica gravando em ambiente claro e natural.',
              spokenLine: `Vamos olhar com clareza e base prática para um desafio frequente nas famílias: ${topicClean.toLowerCase()}.`,
              onScreenText: topicClean,
            },
            {
              id: makeId('rs'),
              timeRange: '00:07 – 00:28',
              visualDirection: 'Explicação calma destacando os pilares do Método ALMA.',
              spokenLine:
                'Quando unimos regulação emocional do adulto, linguagem objetiva da PNL e limites consistentes, a criança desenvolve segurança e cooperação de forma gradual.',
              onScreenText: 'Regulação emocional + Limites consistentes',
            },
            {
              id: makeId('rs'),
              timeRange: '00:29 – 00:45',
              visualDirection: 'Encerramento sereno com assinatura da marca.',
              spokenLine:
                'Se quiser conhecer como a Mentoria Familiar adapta essas ferramentas à rotina da sua casa, envie uma mensagem no Direct.',
              onScreenText: `Mentoria Familiar • ${input.brand.instagramHandle}`,
            },
          ]
        : undefined;

    const post: ContentPost = {
      id: makeId('post-custom'),
      batchId: input.batchId,
      weekLabel: 'Planejamento semanal ativo',
      dayOfWeek,
      title: topicClean,
      category: input.category,
      strategicObjective,
      toneProfile: 'tecnico_acessivel',
      format: input.format,
      aspectRatio: formatSpec.aspectRatio,
      definedAudience: input.brand.targetAudience,
      openingHook: `Entender ${topicClean.toLowerCase()} com base no desenvolvimento infantil ajuda os pais a responderem com mais segurança e menos desgaste.`,
      educationalValue:
        'Orienta pais com ferramentas reais de parentalidade positiva, regulação emocional e PNL aplicada à rotina.',
      marketingObjective:
        input.marketingObjective.trim() ||
        'Oferecer valor educativo concreto e abrir conversas qualificadas com famílias.',
      conversionFocus:
        input.category === 'comercial'
          ? buildVerifiedServiceLine(input.brand)
          : 'Convidar naturalmente famílias interessadas a enviarem dúvidas no Direct.',
      serviceConnection: input.brand.servicesOffered[0],
      caption: `${topicClean}\n\nNa educação parental estruturada pelo Método ALMA, buscamos equilíbrio entre acolhimento emocional e limites claros — sempre respeitando a fase de desenvolvimento de cada criança.\n\nNão existem atalhos mágicos, mas ajustes consistentes na comunicação e na rotina transformam o ambiente familiar ao longo do tempo.\n\nSe quiser saber mais sobre o acompanhamento da Mentoria Familiar, envie uma mensagem no Direct.`,
      hashtags: [
        '#educacaoparental',
        '#desenvolvimentoinfantil',
        '#regulacaoemocional',
        '#metodoalma',
        '#parentalidadepositiva',
      ],
      cta: `Salve este conteúdo ou envie uma mensagem no Direct (${input.brand.instagramHandle}) se desejar informações sobre a Mentoria Familiar.`,
      recommendedDate: input.recommendedDate,
      recommendedTime: input.recommendedTime,
      status: 'aguardando_aprovacao',
      publishingState: 'bloqueado_sem_integracao',
      dataSource: 'demo',
      storyExecutionMode: storyMode,
      storyManualInstructions:
        storyMode === 'acao_manual_instagram'
          ? 'Inserir manualmente o adesivo interativo (enquete ou caixinha de perguntas) no aplicativo do Instagram antes da publicação.'
          : undefined,
      slides,
      reelsScript,
      auditLog: [],
      createdAt: now,
      updatedAt: now,
    };

    if (input.format === 'reels') {
      post.reelsProduction = this.buildReelsProductionFromScript(post);
    }

    return post;
  }

  async regeneratePost(input: RegeneratePostInput): Promise<ContentPost> {
    const { post, brand, mode, requestedTone, visualInstruction, mediaLibrary, existingTitles } =
      input;
    const now = new Date().toISOString();

    if (mode === 'outro_tom') {
      const nextTone: ContentToneProfile =
        requestedTone ??
        (post.toneProfile === 'acolhedor_sereno'
          ? 'tecnico_acessivel'
          : post.toneProfile === 'tecnico_acessivel'
            ? 'firme_pratico'
            : post.toneProfile === 'firme_pratico'
              ? 'reflexivo_profundo'
              : 'acolhedor_sereno');

      const adapted = adaptCaptionByTone(post, nextTone, brand);
      return {
        ...post,
        toneProfile: nextTone,
        openingHook: adapted.openingHook,
        caption: adapted.caption,
        status: 'aguardando_aprovacao',
        updatedAt: now,
      };
    }

    if (mode === 'outro_visual') {
      const templateCycle: DesignTemplateId[] = [
        'ametista_editorial',
        'verde_acolhimento',
        'metodo_alma_dourado',
        'retrato_destaque',
      ];
      const currentTpl = post.slides[0]?.template ?? 'ametista_editorial';
      const nextIdx = (templateCycle.indexOf(currentTpl) + 1) % templateCycle.length;
      const nextTpl = templateCycle[nextIdx];
      const isAuthority = post.strategicObjective === 'autoridade_profissional';
      const preferredMedia = pickPreferredAuthenticPhoto(
        mediaLibrary,
        isAuthority,
        nextIdx + 1
      );

      const updatedSlides = post.slides.map((sl, idx) => {
        if (idx === 0) {
          const usePhoto = nextTpl === 'retrato_destaque' && Boolean(preferredMedia.url);
          const resolvedTemplate: DesignTemplateId = usePhoto
            ? 'retrato_destaque'
            : nextTpl === 'retrato_destaque'
              ? 'metodo_alma_dourado'
              : nextTpl;
          return {
            ...sl,
            template: resolvedTemplate,
            imageUrl: usePhoto ? preferredMedia.url : undefined,
            imageAuthenticity: usePhoto ? preferredMedia.authenticity : undefined,
            footer: visualInstruction?.trim()
              ? `${brand.instagramHandle} • Visual revisado`
              : sl.footer || brand.instagramHandle,
          };
        }
        return {
          ...sl,
          template: templateCycle[(nextIdx + idx) % 3],
        };
      });

      return {
        ...post,
        slides: updatedSlides,
        status: 'aguardando_aprovacao',
        updatedAt: now,
      };
    }

    // mode === 'completo': gera um ângulo inédito evitando repetir títulos já presentes na semana
    const used = new Set((existingTitles ?? []).map((t) => t.toLowerCase()));
    const bank = getCredibleTopicBank(brand, '');
    const candidate =
      bank.find(
        (b) =>
          b.strategicObjective === post.strategicObjective &&
          !used.has(b.title.toLowerCase()) &&
          b.title.toLowerCase() !== post.title.toLowerCase()
      ) ??
      bank.find(
        (b) =>
          !used.has(b.title.toLowerCase()) &&
          b.title.toLowerCase() !== post.title.toLowerCase()
      ) ??
      bank[0];

    const isAuthority = candidate.strategicObjective === 'autoridade_profissional';
    const preferredMedia = pickPreferredAuthenticPhoto(mediaLibrary, isAuthority, 2);

    const freshSlides = candidate.slideDeck.map((sl, sIdx) => ({
      id: makeId(`sl-reg-${sIdx + 1}`),
      order: sIdx + 1,
      eyebrow: sl.eyebrow,
      headline: sl.headline,
      body: sl.body,
      footer:
        sIdx === candidate.slideDeck.length - 1 || candidate.slideDeck.length === 1
          ? `${brand.brandName} • ${brand.instagramHandle}`
          : `Slide ${sIdx + 1} de ${candidate.slideDeck.length}`,
      imageUrl: sIdx === 0 ? preferredMedia.url : undefined,
      imageAuthenticity: sIdx === 0 ? preferredMedia.authenticity : undefined,
      template: sIdx === 0 && preferredMedia.url ? 'retrato_destaque' : sl.template,
    }));

    const regenerated: ContentPost = {
      ...post,
      title: candidate.title,
      category: candidate.category,
      strategicObjective: candidate.strategicObjective,
      toneProfile: candidate.toneProfile,
      definedAudience: candidate.definedAudience,
      openingHook: candidate.openingHook,
      educationalValue: candidate.educationalValue,
      marketingObjective: candidate.marketingObjective,
      conversionFocus: candidate.conversionFocus,
      serviceConnection: candidate.serviceConnection,
      caption: `${candidate.captionBody}\n\n${candidate.cta}`,
      hashtags: candidate.hashtags,
      cta: candidate.cta,
      storyExecutionMode:
        post.format === 'stories'
          ? candidate.storyExecutionMode ?? post.storyExecutionMode ?? 'publicacao_automatica'
          : undefined,
      storyManualInstructions:
        post.format === 'stories'
          ? candidate.storyManualInstructions ?? post.storyManualInstructions
          : undefined,
      slides: freshSlides,
      reelsScript:
        post.format === 'reels' && candidate.reelsScenes
          ? candidate.reelsScenes.map((sc, i) => ({ id: makeId(`rs-reg-${i}`), ...sc }))
          : post.reelsScript,
      status: 'aguardando_aprovacao',
      approvalFeedback: undefined,
      approvedAt: undefined,
      approvedBy: undefined,
      updatedAt: now,
    };

    if (regenerated.format === 'reels') {
      regenerated.reelsProduction = this.buildReelsProductionFromScript(regenerated);
    }

    return regenerated;
  }
}

export function getGeminiMarketingService(): IGeminiMarketingService {
  // Etapa 1/1.5: motor de inteligência local sem consumo de APIs pagas sem autorização explícita.
  return new DemoGeminiMarketingService();
}
