/**
 * Conselho IA — Main Application Logic
 *
 * A chat with AI marketing advisors ("conselheiros") whose behaviour the member
 * tunes on a literal mixing board (vertical faders). v1 ships ONE channel:
 * "O Arquiteto de Ofertas" — an advisor that reasons through the PUBLISHED
 * frameworks of Alex Hormozi ($100M Offers / $100M Leads). ARCHÉTYPE + attribution
 * framing: the advisor applies the frameworks with factual credit; it never claims
 * to BE Hormozi and speaks in its own voice (educational, not affiliated/endorsed).
 *
 * BYOK: every AI call runs on the member's OWN OpenRouter key (localStorage only).
 * No company key. The only backend is the n8n membership webhook (handled by the
 * shared gate) — this file never touches Supabase.
 */
(function () {
  'use strict';

  // ==========================================================================
  // 1. EXPERTS REGISTRY  (multi-expert architecture; v1 = one channel)
  // ==========================================================================

  // Shared behavioural spine given to every advisor (applied on top of each
  // expert's own knowledge base + the live fader state).
  var COMMON_SPINE = [
    'Você é um conselheiro de marketing dentro do "Conselho IA", uma ferramenta educacional da comunidade Maestros da IA.',
    'Responda SEMPRE em português do Brasil, com clareza e densidade — nada de encher linguiça.',
    'Você conversa com donos de negócio, criadores de conteúdo, coaches e infoprodutores brasileiros. Adapte exemplos a essa realidade (WhatsApp, Instagram, Hotmart/Kiwify, PIX, tráfego pago em Meta/Google).',
    'Quando o membro te der pouca informação, faça 1–3 perguntas objetivas para conseguir aplicar o framework ao caso real dele — mas se já der pra agir, aja.',
    'Use formatação Markdown (títulos ##, negrito, listas, tabelas, blockquote) para deixar a resposta escaneável e pronta pra usar.',
    'Você é uma IA aplicando frameworks públicos — nunca finja ser a pessoa real que os criou, nunca invente que ela endossa isto, e não reproduza trechos literais de livros. Explique os conceitos com suas próprias palavras.'
  ].join('\n');

  var EXPERTS = {
    'arquiteto-ofertas': {
      name: 'O Arquiteto de Ofertas',
      motor: 'motor: frameworks de Alex Hormozi',
      avatar: 'AO',
      tagline: 'Transforma qualquer produto numa oferta que faz o cliente se sentir burro de dizer não.',
      disclaimer: 'Aplica os conceitos de Alex Hormozi ($100M Offers / $100M Leads). Ferramenta educacional — não afiliada nem endossada por Alex Hormozi.',
      starters: [
        'Tenho um produto e quero transformar numa oferta irresistível',
        'Minha oferta não está convertendo — o que está errado?',
        'Como eu cobro mais caro sem perder cliente?',
        'Quais bônus eu adiciono pra destravar a venda?'
      ],
      // ---- Knowledge base (synthesised; no verbatim book text) ----
      kb: [
        'PAPEL: Você é "O Arquiteto de Ofertas". Sua obsessão é construir OFERTAS irresistíveis e sistemas de aquisição de clientes, raciocinando pelos frameworks que Alex Hormozi popularizou nos livros $100M Offers e $100M Leads. Cite a origem quando fizer sentido ("na lógica do $100M Offers…"), mas fale com a sua própria voz.',
        '',
        'FRAMEWORK 1 — A EQUAÇÃO DE VALOR. Valor percebido = (Resultado dos Sonhos × Probabilidade Percebida de Sucesso) ÷ (Tempo até o Resultado × Esforço e Sacrifício). Para aumentar o valor: MAXIMIZE o resultado dos sonhos e a percepção de que vai dar certo; MINIMIZE o tempo de espera e o esforço/sacrifício do cliente. Sempre que o membro trouxer uma oferta, avalie os 4 componentes e ataque o mais fraco primeiro (geralmente "probabilidade percebida" e "tempo").',
        '',
        'FRAMEWORK 2 — GRAND SLAM OFFER (oferta imbatível). Uma oferta tão boa que a pessoa se sente burra recusando. Processo: (1) identifique o Resultado dos Sonhos do cliente; (2) liste TODOS os problemas/obstáculos entre ele e esse resultado (seja exaustivo — cada passo tem um obstáculo); (3) transforme cada problema em uma SOLUÇÃO (o que você entrega para removê-lo); (4) escolha os VEÍCULOS de entrega de cada solução (curso, template, call 1:1, comunidade, software, done-for-you, done-with-you…); (5) faça o "trim & stack": corte o que é caro pra você e de baixo valor pro cliente, mantenha o que é barato pra você e de alto valor percebido, e EMPILHE. O preço deve parecer ridículo perto do valor entregue.',
        '',
        'FRAMEWORK 3 — PRECIFICAÇÃO. Preço não é custo, é posicionamento. Cobrar barato mata a percepção de valor, atrai o pior cliente e te deixa sem margem pra entregar bem. Prefira o "ciclo virtuoso do preço premium": cobra mais → tem margem pra entregar mais → cliente tem mais resultado → gera prova → justifica cobrar mais. Nunca compita por preço; compita por valor. A diferença entre o valor percebido e o preço é o "negócio" que o cliente enxerga — aumente essa distância.',
        '',
        'FRAMEWORK 4 — OS 4 AMPLIFICADORES DE OFERTA. (a) ESCASSEZ (quantidade limitada: vagas, unidades, turmas) — mexe com o medo de perder; (b) URGÊNCIA (prazo/deadline, turmas com data, bônus que expira) — força a decisão agora; (c) BÔNUS (empilhe: cada bônus resolve UMA objeção específica e tem valor percebido nomeado; a soma dos bônus deve superar o valor do core); (d) GARANTIAS (reversão de risco). Use com honestidade — escassez/urgência FALSAS destroem confiança.',
        '',
        'FRAMEWORK 5 — GARANTIAS. Reverter o risco derruba a maior objeção ("e se não funcionar?"). Tipos: incondicional ("devolvo 100% sem perguntar"), condicional ("faça X, Y, Z e se não tiver resultado eu devolvo / trabalho de graça"), anti-garantia (para ofertas caras/definitivas: "todas as vendas são finais" — posiciona seriedade), e garantia implícita (performance/parceria). Quanto mais audaciosa e específica a garantia, maior a conversão — desde que você consiga honrá-la.',
        '',
        'FRAMEWORK 6 — NAMING (fórmula M-A-G-I-C). Um bom nome de oferta multiplica a atenção. Componentes que você pode combinar: (M) motivo magnético / gancho ("Como…"), (A) avatar (para quem é), (G) meta/resultado, (I) intervalo de tempo ou container ("em 21 dias", "sem X"), (C) palavra-container (Desafio, Masterclass, Intensivo, Método, Blueprint, Aceleradora). Gere 3–5 opções de nome quando pedir.',
        '',
        'FRAMEWORK 7 — AQUISIÇÃO ($100M Leads). Leads vêm dos "Core Four": (1) fazer conteúdo gratuito para audiência quente (postar); (2) contatar quente 1:1 (warm outreach); (3) contatar frio (cold outreach); (4) anúncios pagos. Escale um canal antes de abrir outro. LEAD MAGNET: ofereça de graça algo que resolve um problema REAL e estreito, que naturalmente leva ao produto pago (revela o problema, dá uma amostra da solução). Princípio: "dê valor até eles pedirem pra comprar". Regra do engajamento: quanto mais quente o público, mais direto pode ser o pedido.',
        '',
        'FRAMEWORK 8 — ECONOMIA DA AQUISIÇÃO. Pense sempre em LTV (valor no tempo de vida do cliente) vs CAC (custo de aquisição). Você "ganha" quando LTV > 3× CAC, e ganha MUITO quando recupera o CAC na primeira transação (money model / oferta de entrada que se paga). Ofertas de upsell, downsell, continuidade (assinatura) e bumps aumentam o LTV e liberam você pra gastar mais em tráfego do que o concorrente.',
        '',
        'MODELOS MENTAIS DO ARQUITETO: "o mercado é o juiz final — teste, não discuta"; "volume vence" (mais tentativas, mais ofertas, mais criativos); "o que precisaria ser verdade pra isso funcionar?"; priorização brutal (foque no gargalo, não no que é confortável); "não conserte o degrau errado do funil" (diagnostique tráfego → oferta → conversão → entrega antes de mudar coisa). Seja específico e acionável: números, exemplos, próximos passos.'
      ].join('\n'),
      // Quick-action deliverable prompts (produce ready-to-use artifacts)
      quick: {
        grandslam: 'Monte uma **Grand Slam Offer** completa para o meu negócio. Se você ainda não tem os dados do meu produto/público/preço, me faça as perguntas essenciais primeiro. Quando tiver, entregue um DOCUMENTO estruturado em Markdown com: (1) Resultado dos Sonhos, (2) Lista de problemas→soluções, (3) Value Stack (itens da oferta com valor percebido de cada um e valor total empilhado), (4) 3–5 nomes de oferta (fórmula MAGIC), (5) Precificação com ancoragem, (6) Garantia, (7) Escassez e Urgência. Deixe pronto pra colar numa página de vendas.',
        diagnose: 'Faça um **diagnóstico da minha oferta atual** pela Equação de Valor. Se precisar, pergunte qual é a oferta hoje. Depois entregue: nota de 0–10 em cada componente (Resultado dos Sonhos, Probabilidade Percebida, Tempo, Esforço/Sacrifício), o gargalo nº1, e as 3 mudanças de maior impacto — em ordem de prioridade, com o "porquê".',
        bonus: 'Crie um **stack de bônus** para destravar a venda da minha oferta. Pergunte quais são as principais objeções/dúvidas dos meus clientes se eu não tiver dito. Depois entregue uma tabela com 5–8 bônus: nome do bônus | objeção que ele mata | valor percebido (R$) | formato de entrega. Some o valor total dos bônus e mostre como ele supera o preço do core.',
        guarantee: 'Crie **3 opções de garantia irresistível** para a minha oferta (uma incondicional, uma condicional baseada em ação, e uma de performance/parceria). Para cada uma: o texto pronto pra usar na página, o risco que ela reverte, e quando faz sentido usá-la. Aponte qual você recomenda pro meu caso e por quê.',
        rewrite: 'Reescreva a minha oferta no formato **ANTES × DEPOIS**. Pergunte qual é a oferta/headline atual se eu não colei. Entregue: (a) a versão atual, (b) a versão reescrita aplicando a Equação de Valor + naming MAGIC + reversão de risco, e (c) um bullet explicando cada mudança e o princípio por trás.',
        price: 'Me ajude a **ancorar preço e valor** da minha oferta. Pergunte o preço atual e o que está incluso se eu não disser. Depois entregue: o value stack com valor percebido item a item, o "preço âncora" (soma), o preço real recomendado, a lógica de ancoragem pra apresentar na página/call, e 2–3 formas de parcelamento/estrutura de pagamento que aumentam a conversão sem baixar o valor.'
      }
    }
    // Future channels plug in here: 'estrategista-funis', 'copywriter-resposta-direta', …
  };

  var LOCKED_EXPERTS = [
    { name: 'O Estrategista de Funis', soon: true },
    { name: 'O Copywriter de Resposta Direta', soon: true }
  ];

  // ==========================================================================
  // 2. FADERS  (the mixing board)
  // ==========================================================================
  var FADERS = [
    {
      id: 'honestidade', name: 'Honestidade', low: 'diplomático', high: 'brutal', def: 70,
      band: function (v) {
        if (v >= 67) return 'Seja BRUTALMENTE honesto: aponte fraquezas e furos da oferta sem suavizar, mesmo que incomode. Prefira a verdade útil ao elogio.';
        if (v <= 33) return 'Seja diplomático e encorajador: aponte melhorias com tato, começando pelo que já está bom.';
        return 'Seja honesto e direto, mas equilibrado: reconheça o que funciona e aponte o que precisa melhorar.';
      }
    },
    {
      id: 'formalidade', name: 'Formalidade', low: 'casual', high: 'executivo', def: 35,
      band: function (v) {
        if (v >= 67) return 'Tom executivo e formal: linguagem profissional, estruturada, sem gírias.';
        if (v <= 33) return 'Tom casual e próximo: fale como um sócio experiente num papo de mesa de bar, pode usar gírias e "você".';
        return 'Tom profissional porém acessível: nem engessado, nem íntimo demais.';
      }
    },
    {
      id: 'estrategico', name: 'Estratégia', low: 'tático', high: 'visionário', def: 55,
      band: function (v) {
        if (v >= 67) return 'Pense de forma visionária e sistêmica: conecte a oferta à estratégia de longo prazo, escala, LTV, posicionamento de mercado e o "jogo" dos próximos anos.';
        if (v <= 33) return 'Fique no tático e imediato: entregue o próximo passo concreto que dá pra executar essa semana.';
        return 'Equilibre visão e tática: dê a direção estratégica E o próximo passo prático.';
      }
    },
    {
      id: 'profundidade', name: 'Profundidade', low: 'objetivo', high: 'deep-dive', def: 55,
      band: function (v) {
        if (v >= 67) return 'Vá fundo: respostas detalhadas, com exemplos, números e o raciocínio completo por trás de cada recomendação.';
        if (v <= 33) return 'Seja enxuto: respostas curtas e direto ao ponto, sem rodeios. Bullets > parágrafos.';
        return 'Profundidade média: explique o essencial com 1–2 exemplos, sem alongar demais.';
      }
    },
    {
      id: 'ousadia', name: 'Ousadia', low: 'conservador', high: 'agressivo', def: 55,
      band: function (v) {
        if (v >= 67) return 'Seja ousado e contrarian: proponha apostas agressivas, preços premium e movimentos que a maioria tem medo de fazer — justificando o risco.';
        if (v <= 33) return 'Seja conservador: recomende movimentos de baixo risco, testados e seguros antes de qualquer aposta grande.';
        return 'Equilibre ousadia e segurança: proponha um movimento ambicioso e uma alternativa mais segura.';
      }
    },
    {
      id: 'didatica', name: 'Didática', low: 'direto', high: 'professor', def: 45,
      band: function (v) {
        if (v >= 67) return 'Seja professoral: explique o PORQUÊ de cada recomendação passo a passo, ensinando o conceito por trás para o membro aprender a pescar.';
        if (v <= 33) return 'Vá direto à resposta assumindo que o membro já conhece o básico — sem aula.';
        return 'Explique o suficiente para o membro entender o porquê, sem virar aula longa.';
      }
    }
  ];

  var PRESETS = {
    mentor:     { honestidade: 65, formalidade: 40, estrategico: 60, profundidade: 60, ousadia: 55, didatica: 60 },
    brutal:     { honestidade: 100, formalidade: 25, estrategico: 55, profundidade: 55, ousadia: 80, didatica: 30 },
    executivo:  { honestidade: 70, formalidade: 90, estrategico: 75, profundidade: 65, ousadia: 45, didatica: 40 },
    professor:  { honestidade: 60, formalidade: 45, estrategico: 55, profundidade: 80, ousadia: 40, didatica: 95 },
    visionario: { honestidade: 65, formalidade: 40, estrategico: 100, profundidade: 70, ousadia: 90, didatica: 55 }
  };

  // ==========================================================================
  // 3. STATE + persistence
  // ==========================================================================
  var BOARD_STORE = 'conselho-ia_board_v1';
  var CHAT_STORE = 'conselho-ia_chat_v1';
  var EXPERT_STORE = 'conselho-ia_expert_v1';

  var state = {
    expertId: 'arquiteto-ofertas',
    faders: {},
    messages: [] // {role:'user'|'assistant', content:string}
  };
  var busy = false;
  var vuTimer = null;

  function loadState() {
    try {
      var f = JSON.parse(localStorage.getItem(BOARD_STORE) || '{}');
      FADERS.forEach(function (fd) { state.faders[fd.id] = typeof f[fd.id] === 'number' ? f[fd.id] : fd.def; });
    } catch (e) { FADERS.forEach(function (fd) { state.faders[fd.id] = fd.def; }); }
    try {
      var ex = localStorage.getItem(EXPERT_STORE);
      if (ex && EXPERTS[ex]) state.expertId = ex;
    } catch (e) {}
    try {
      var m = JSON.parse(localStorage.getItem(CHAT_STORE) || '[]');
      if (Array.isArray(m)) state.messages = m.filter(function (x) { return x && (x.role === 'user' || x.role === 'assistant') && typeof x.content === 'string'; });
    } catch (e) { state.messages = []; }
  }
  function saveBoard() { try { localStorage.setItem(BOARD_STORE, JSON.stringify(state.faders)); } catch (e) {} }
  function saveChat() { try { localStorage.setItem(CHAT_STORE, JSON.stringify(state.messages.slice(-40))); } catch (e) {} }
  function saveExpert() { try { localStorage.setItem(EXPERT_STORE, state.expertId); } catch (e) {} }

  function currentExpert() { return EXPERTS[state.expertId]; }

  // ==========================================================================
  // 4. FADER → PROMPT
  // ==========================================================================
  function buildPersonaDirectives() {
    var lines = ['AJUSTES DA MESA (o membro regulou o seu comportamento — respeite à risca):'];
    FADERS.forEach(function (fd) {
      var v = state.faders[fd.id];
      lines.push('- ' + fd.name + ' (' + v + '/100): ' + fd.band(v));
    });
    return lines.join('\n');
  }

  function buildSystemPrompt() {
    var ex = currentExpert();
    return COMMON_SPINE + '\n\n' + ex.kb + '\n\n' + buildPersonaDirectives();
  }

  // ==========================================================================
  // 5. Safe Markdown renderer  (escape first, then transform)
  // ==========================================================================
  function escapeHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function renderInline(s) {
    // s is already HTML-escaped
    // code spans first (protect their content)
    var codes = [];
    s = s.replace(/`([^`]+)`/g, function (_, c) { codes.push(c); return '@@C' + (codes.length - 1) + '@@'; });
    // links [text](url) — only http/https/mailto
    s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (m, txt, url) {
      if (/^(https?:\/\/|mailto:)/i.test(url)) return '<a href="' + url + '" target="_blank" rel="noopener noreferrer">' + txt + '</a>';
      return m;
    });
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
    s = s.replace(/~~([^~]+)~~/g, '<del>$1</del>');
    s = s.replace(/@@C(\d+)@@/g, function (_, i) { return '<code>' + codes[+i] + '</code>'; });
    return s;
  }
  function renderMarkdown(src) {
    var text = escapeHtml(src);
    // fenced code blocks
    var blocks = [];
    text = text.replace(/```([\s\S]*?)```/g, function (_, code) { blocks.push(code.replace(/^\n/, '')); return '@@B' + (blocks.length - 1) + '@@'; });

    var lines = text.split('\n');
    var html = '', i = 0;
    function isTableSep(l) { return /^\s*\|?[\s:|-]+\|[\s:|-]*$/.test(l) && l.indexOf('-') > -1; }
    while (i < lines.length) {
      var line = lines[i];
      if (/^@@B\d+@@$/.test(line.trim())) { var bi = +line.trim().replace(/@@B|@@/g, ''); html += '<pre><code>' + blocks[bi] + '</code></pre>'; i++; continue; }
      if (/^\s*(#{1,3})\s+/.test(line)) {
        var h = line.match(/^\s*(#{1,3})\s+(.*)$/); var lvl = h[1].length;
        html += '<h' + lvl + '>' + renderInline(h[2]) + '</h' + lvl + '>'; i++; continue;
      }
      if (/^\s*([-*_])\1{2,}\s*$/.test(line)) { html += '<hr>'; i++; continue; }
      if (/^\s*&gt;\s?/.test(line)) { // '>' was HTML-escaped to '&gt;' by escapeHtml
        var q = [];
        while (i < lines.length && /^\s*&gt;\s?/.test(lines[i])) { q.push(renderInline(lines[i].replace(/^\s*&gt;\s?/, ''))); i++; }
        html += '<blockquote>' + q.join('<br>') + '</blockquote>'; continue;
      }
      // table
      if (line.indexOf('|') > -1 && i + 1 < lines.length && isTableSep(lines[i + 1])) {
        var head = line.split('|').map(function (c) { return c.trim(); }).filter(function (c, idx, arr) { return !(c === '' && (idx === 0 || idx === arr.length - 1)); });
        i += 2; var rows = [];
        while (i < lines.length && lines[i].indexOf('|') > -1 && lines[i].trim() !== '') {
          rows.push(lines[i].split('|').map(function (c) { return c.trim(); }).filter(function (c, idx, arr) { return !(c === '' && (idx === 0 || idx === arr.length - 1)); }));
          i++;
        }
        var t = '<table><thead><tr>' + head.map(function (c) { return '<th>' + renderInline(c) + '</th>'; }).join('') + '</tr></thead><tbody>';
        rows.forEach(function (r) { t += '<tr>' + head.map(function (_, ci) { return '<td>' + renderInline(r[ci] || '') + '</td>'; }).join('') + '</tr>'; });
        t += '</tbody></table>'; html += t; continue;
      }
      // unordered list
      if (/^\s*[-*]\s+/.test(line)) {
        var ul = '';
        while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) { ul += '<li>' + renderInline(lines[i].replace(/^\s*[-*]\s+/, '')) + '</li>'; i++; }
        html += '<ul>' + ul + '</ul>'; continue;
      }
      // ordered list
      if (/^\s*\d+[.)]\s+/.test(line)) {
        var ol = '';
        while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) { ol += '<li>' + renderInline(lines[i].replace(/^\s*\d+[.)]\s+/, '')) + '</li>'; i++; }
        html += '<ol>' + ol + '</ol>'; continue;
      }
      if (line.trim() === '') { i++; continue; }
      // paragraph (gather consecutive non-empty, non-special lines)
      var para = [line]; i++;
      while (i < lines.length && lines[i].trim() !== '' && !/^\s*(#{1,3}\s|[-*]\s|\d+[.)]\s|&gt;\s?|```|@@B)/.test(lines[i]) && !/^\s*([-*_])\1{2,}\s*$/.test(lines[i])) { para.push(lines[i]); i++; }
      html += '<p>' + para.map(renderInline).join('<br>') + '</p>';
    }
    return html;
  }

  // ==========================================================================
  // 6. Rendering the chat
  // ==========================================================================
  var el = {};
  function $(id) { return document.getElementById(id); }

  function scrollLog() { if (el.log) el.log.scrollTop = el.log.scrollHeight; }

  function renderWelcome() {
    var ex = currentExpert();
    var bars = '';
    [40, 72, 54, 88, 62].forEach(function (h) { bars += '<i style="height:' + h + '%"></i>'; });
    var starters = ex.starters.map(function (s) {
      return '<button class="starter" type="button">' + escapeHtml(s) + '</button>';
    }).join('');
    el.log.innerHTML =
      '<div class="welcome-card">' +
        '<div class="welcome-glyph" aria-hidden="true">' + bars + '</div>' +
        '<h2>' + escapeHtml(ex.name) + '</h2>' +
        '<p>' + escapeHtml(ex.tagline) + ' Regule os faders da mesa à esquerda e mande sua primeira pergunta — ou comece por aqui:</p>' +
        '<div class="starters">' + starters + '</div>' +
      '</div>';
    Array.prototype.forEach.call(el.log.querySelectorAll('.starter'), function (b) {
      b.addEventListener('click', function () { el.input.value = b.textContent; autoGrow(); el.input.focus(); });
    });
  }

  function messageEl(role) {
    var ex = currentExpert();
    var wrap = document.createElement('div');
    wrap.className = 'msg ' + role;
    var who = role === 'assistant' ? ex.name : 'Você';
    var initials = role === 'assistant' ? ex.avatar : 'EU';
    wrap.innerHTML =
      '<div class="msg-avatar">' + escapeHtml(initials) + '</div>' +
      '<div class="msg-body"><div class="msg-who">' + escapeHtml(who) + '</div>' +
      '<div class="msg-bubble md"></div></div>';
    return wrap;
  }

  function addMessageDom(role, contentHtml) {
    var m = messageEl(role);
    m.querySelector('.msg-bubble').innerHTML = contentHtml;
    el.log.appendChild(m);
    return m;
  }

  function renderConversation() {
    if (!state.messages.length) { renderWelcome(); return; }
    el.log.innerHTML = '';
    state.messages.forEach(function (m) {
      var dom = addMessageDom(m.role, renderMarkdown(m.content));
      if (m.role === 'assistant') attachMsgTools(dom, m.content);
    });
    scrollLog();
  }

  function attachMsgTools(dom, content) {
    var body = dom.querySelector('.msg-body');
    if (body.querySelector('.msg-tools')) return;
    var tools = document.createElement('div');
    tools.className = 'msg-tools';
    var copy = document.createElement('button');
    copy.className = 'msg-tool'; copy.type = 'button'; copy.textContent = 'Copiar';
    copy.addEventListener('click', function () {
      navigator.clipboard.writeText(content).then(function () {
        copy.textContent = 'Copiado ✓';
        setTimeout(function () { copy.textContent = 'Copiar'; }, 1600);
      });
    });
    tools.appendChild(copy);
    body.appendChild(tools);
  }

  // ==========================================================================
  // 7. LLM call — streaming with resilient fallback (COR-034/035)
  // ==========================================================================
  function orHeaders(key) {
    return {
      'Authorization': 'Bearer ' + key,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://conselhoia.maestrosdaia.com',
      'X-Title': 'Conselho IA - Maestros da IA'
    };
  }

  function buildBody(model, stream, noReasoning) {
    var msgs = [{ role: 'system', content: buildSystemPrompt() }].concat(
      state.messages.map(function (m) { return { role: m.role, content: m.content }; })
    );
    var body = { model: model, messages: msgs, temperature: 0.6, max_tokens: 8000, stream: !!stream };
    var isDeepSeek = model.indexOf('deepseek/') === 0;
    if (!noReasoning && !isDeepSeek) body.reasoning = { effort: 'low' }; // COR-034/035
    return body;
  }

  // Streaming call. onToken(chunk) is called with incremental content.
  // Resolves with the full content string. Throws {emptyContent:true} if the
  // stream produced no visible content (answer stuck in reasoning channel).
  function streamCall(key, model, onToken, signal) {
    var body = buildBody(model, true, false);
    return fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST', headers: orHeaders(key), body: JSON.stringify(body), signal: signal
    }).then(function (r) {
      if (!r.ok) {
        return r.json().catch(function () { return {}; }).then(function (d) {
          var msg = (d && d.error && (d.error.message || d.error)) || ('HTTP ' + r.status);
          throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
        });
      }
      var reader = r.body.getReader();
      var decoder = new TextDecoder();
      var buffer = '', full = '';
      function pump() {
        return reader.read().then(function (res) {
          if (res.done) return full;
          buffer += decoder.decode(res.value, { stream: true });
          var parts = buffer.split('\n');
          buffer = parts.pop();
          for (var j = 0; j < parts.length; j++) {
            var line = parts[j].trim();
            if (!line || line[0] === ':') continue;         // keep-alive comment
            if (line.indexOf('data:') !== 0) continue;
            var data = line.slice(5).trim();
            if (data === '[DONE]') return full;
            try {
              var json = JSON.parse(data);
              var delta = json.choices && json.choices[0] && json.choices[0].delta;
              var piece = delta && delta.content;
              if (piece) { full += piece; onToken(full); }
            } catch (e) { /* partial json across chunks — ignore, buffer handles it */ }
          }
          return pump();
        });
      }
      return pump().then(function (content) {
        if (!content || !content.trim()) { var err = new Error('empty'); err.emptyContent = true; throw err; }
        return content;
      });
    });
  }

  // Non-streaming fallback (used when the stream yields no content).
  function plainCall(key, model, noReasoning) {
    var body = buildBody(model, false, noReasoning);
    return fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST', headers: orHeaders(key), body: JSON.stringify(body)
    }).then(function (r) {
      return r.json().then(function (d) {
        if (!r.ok) {
          var msg = (d && d.error && (d.error.message || d.error)) || ('HTTP ' + r.status);
          throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
        }
        var m = d.choices && d.choices[0] && d.choices[0].message;
        var content = m && m.content;
        if (!content || !content.trim()) { var err = new Error('Resposta vazia do modelo (verifique créditos/limite da sua chave).'); err.emptyContent = true; throw err; }
        return content;
      });
    });
  }

  function friendlyError(e) {
    var msg = (e && e.message) || 'Erro desconhecido';
    if (/401|invalid.*key|no auth|unauthor/i.test(msg)) return 'Chave da OpenRouter inválida ou sem autorização. Verifique em Gerenciar chave (ícone de chave no topo).';
    if (/402|insufficient|credit|quota|balance/i.test(msg)) return 'Sua chave da OpenRouter está sem créditos. Adicione créditos em openrouter.ai — ou escolha um modelo do grupo "Grátis" no MASTER da mesa para usar sem créditos.';
    if (/429|rate/i.test(msg)) return 'Muitas requisições no seu provedor agora. Aguarde alguns segundos e tente novamente.';
    if (/model|not found|404|no endpoints/i.test(msg)) return 'O modelo selecionado não está disponível na sua conta OpenRouter. Escolha outro modelo no MASTER da mesa.';
    return 'Não consegui gerar a resposta: ' + msg;
  }

  // ==========================================================================
  // 8. Send flow
  // ==========================================================================
  function setBusy(b) {
    busy = b;
    el.send.disabled = b;
    Array.prototype.forEach.call(document.querySelectorAll('.qa-btn'), function (btn) { btn.disabled = b; });
    if (b) startVU(); else stopVU();
  }

  function send(text) {
    if (busy) return;
    text = (text || '').trim();
    if (!text) return;

    var active = window.ApiKeyManager && ApiKeyManager.getActiveKey();
    if (!active || !active.key) {
      if (window.MembershipGate) MembershipGate.showScreen('key-screen');
      return;
    }

    // clear welcome
    if (!state.messages.length) el.log.innerHTML = '';

    state.messages.push({ role: 'user', content: text });
    addMessageDom('user', renderMarkdown(text));
    saveChat();
    el.input.value = ''; autoGrow(); scrollLog();

    // assistant placeholder with typing indicator
    var aDom = addMessageDom('assistant', '<span class="typing"><i></i><i></i><i></i></span>');
    var bubble = aDom.querySelector('.msg-bubble');
    scrollLog();
    setBusy(true);

    var model = ApiKeyManager.getModel();
    var streamedText = '';
    var gotToken = false;

    function onToken(fullSoFar) {
      gotToken = true;
      streamedText = fullSoFar;
      // plain text while streaming (fast); markdown reflow at the end
      bubble.textContent = fullSoFar;
      var caret = document.createElement('span'); caret.className = 'cursor-caret'; caret.innerHTML = '&nbsp;';
      bubble.appendChild(caret);
      scrollLog();
    }

    function finish(finalText) {
      state.messages.push({ role: 'assistant', content: finalText });
      saveChat();
      bubble.className = 'msg-bubble md';
      bubble.innerHTML = renderMarkdown(finalText);
      attachMsgTools(aDom, finalText);
      scrollLog();
      setBusy(false);
      el.input.focus();
    }

    function fail(e) {
      bubble.className = 'msg-bubble md';
      bubble.innerHTML = '<p style="color:#ff8a8a">' + escapeHtml(friendlyError(e)) + '</p>';
      // drop the failed user turn's assistant slot from history (keep user msg)
      setBusy(false);
    }

    // Rate-limited (Hard Rule #5). executeWithLimit returns null if throttled.
    RateLimiter.executeWithLimit('chat', function () {
      return streamCall(active.key, model, onToken)
        .then(finish)
        .catch(function (e) {
          if (e && e.name === 'AbortError') return;
          // empty stream (reasoning channel) → non-streaming retry WITHOUT reasoning (COR-035)
          if (e && e.emptyContent) {
            return plainCall(active.key, model, true).then(finish).catch(fail);
          }
          // streaming unsupported / transient network → one plain retry, then fail
          if (!gotToken) {
            return plainCall(active.key, model, false).then(finish).catch(function (e2) {
              if (e2 && e2.emptyContent) return plainCall(active.key, model, true).then(finish).catch(fail);
              fail(e2);
            });
          }
          fail(e);
        });
    }).then(function (res) {
      if (res === null) { // rate limited
        bubble.className = 'msg-bubble md';
        bubble.innerHTML = '<p style="color:#ffb84d">Você atingiu o limite de mensagens por minuto. Aguarde um instante e tente de novo.</p>';
        setBusy(false);
      }
    });
  }

  // ==========================================================================
  // 9. VU meter animation while responding
  // ==========================================================================
  function startVU() {
    if (!el.vu) return;
    var spans = el.vu.querySelectorAll('span');
    stopVU();
    vuTimer = setInterval(function () {
      var level = 4 + Math.floor(Math.random() * (spans.length - 3));
      for (var k = 0; k < spans.length; k++) {
        var on = k < level;
        spans[k].className = on ? ('on' + (k >= spans.length - 2 ? ' peak' : k >= spans.length - 5 ? ' mid' : '')) : '';
      }
    }, 110);
  }
  function stopVU() {
    if (vuTimer) { clearInterval(vuTimer); vuTimer = null; }
    if (el.vu) Array.prototype.forEach.call(el.vu.querySelectorAll('span'), function (s) { s.className = ''; });
  }

  // ==========================================================================
  // 10. Build the fader rack UI
  // ==========================================================================
  function ledCount(v) { return Math.max(0, Math.min(10, Math.round(v / 10))); }

  function buildFaders() {
    var rack = el.rack;
    rack.innerHTML = '';
    FADERS.forEach(function (fd) {
      var val = state.faders[fd.id];
      var cell = document.createElement('div');
      cell.className = 'fader';
      var leds = '';
      for (var k = 0; k < 10; k++) leds += '<i data-i="' + k + '"></i>';
      cell.innerHTML =
        '<div class="fader-name">' + fd.name + '</div>' +
        '<div class="fader-body">' +
          '<div class="led-ladder" aria-hidden="true">' + leds + '</div>' +
          '<div class="fader-slot"><input type="range" class="fader-input" min="0" max="100" step="1" value="' + val + '" ' +
            'aria-label="' + fd.name + '" data-fader="' + fd.id + '"></div>' +
        '</div>' +
        '<div class="fader-val" data-val="' + fd.id + '">' + val + '</div>' +
        '<div class="fader-band" data-band="' + fd.id + '">' + fd.low + ' · ' + fd.high + '</div>';
      rack.appendChild(cell);
      var input = cell.querySelector('input');
      updateLeds(cell, val);
      input.addEventListener('input', function () {
        var v = parseInt(input.value, 10) || 0;
        state.faders[fd.id] = v;
        cell.querySelector('[data-val="' + fd.id + '"]').textContent = v;
        updateLeds(cell, v);
        saveBoard();
      });
    });
  }
  function updateLeds(cell, v) {
    var n = ledCount(v);
    Array.prototype.forEach.call(cell.querySelectorAll('.led-ladder i'), function (led, idx) {
      var on = idx < n;
      led.className = on ? ('on' + (idx >= 7 ? ' hi' : '')) : '';
    });
  }
  function refreshFaderUI() {
    Array.prototype.forEach.call(el.rack.querySelectorAll('.fader'), function (cell) {
      var input = cell.querySelector('input'); var id = input.getAttribute('data-fader');
      var v = state.faders[id];
      input.value = v;
      cell.querySelector('[data-val="' + id + '"]').textContent = v;
      updateLeds(cell, v);
    });
  }

  // ==========================================================================
  // 11. Expert selector
  // ==========================================================================
  function buildExpertSelect() {
    var sel = el.expert;
    sel.innerHTML = '';
    Object.keys(EXPERTS).forEach(function (id) {
      var o = document.createElement('option'); o.value = id; o.textContent = EXPERTS[id].name; sel.appendChild(o);
    });
    LOCKED_EXPERTS.forEach(function (lk) {
      var o = document.createElement('option'); o.value = ''; o.disabled = true; o.textContent = lk.name + ' — em breve'; sel.appendChild(o);
    });
    sel.value = state.expertId;
    applyExpert();
    sel.addEventListener('change', function () {
      if (!sel.value || !EXPERTS[sel.value]) { sel.value = state.expertId; return; }
      state.expertId = sel.value; saveExpert(); applyExpert();
    });
  }
  function applyExpert() {
    var ex = currentExpert();
    if (el.expertTagline) el.expertTagline.innerHTML = escapeHtml(ex.tagline) + '<span class="disc">' + escapeHtml(ex.disclaimer) + '</span>';
    if (el.chatExpertName) el.chatExpertName.textContent = ex.name;
    if (el.chatMotor) el.chatMotor.textContent = ex.motor;
  }

  // ==========================================================================
  // 12. Export conversation
  // ==========================================================================
  function exportChat() {
    if (!state.messages.length) return;
    var ex = currentExpert();
    var out = '# Conselho IA — ' + ex.name + '\n\n';
    out += '_' + ex.disclaimer + '_\n\n';
    out += 'Ajustes da mesa: ' + FADERS.map(function (fd) { return fd.name + ' ' + state.faders[fd.id]; }).join(' · ') + '\n\n---\n\n';
    state.messages.forEach(function (m) {
      out += (m.role === 'user' ? '## Você\n\n' : '## ' + ex.name + '\n\n') + m.content + '\n\n';
    });
    var blob = new Blob([out], { type: 'text/markdown;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = 'conselho-ia-' + state.expertId + '.md';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
  }

  // ==========================================================================
  // 13. Textarea autogrow
  // ==========================================================================
  function autoGrow() {
    el.input.style.height = 'auto';
    el.input.style.height = Math.min(el.input.scrollHeight, 160) + 'px';
  }

  // ==========================================================================
  // 14. Wire up
  // ==========================================================================
  var wired = false;
  function wire() {
    if (wired) return; wired = true;
    el.log = $('chat-log');
    el.input = $('composer-input');
    el.send = $('send-btn');
    el.rack = $('fader-rack');
    el.expert = $('expert-select');
    el.expertTagline = $('expert-tagline');
    el.chatExpertName = $('chat-expert-name');
    el.chatMotor = $('chat-motor');
    el.vu = $('vu-meter');

    loadState();

    // Model pickers (Rule #19 / COR-041 — wire all three)
    if (window.ApiKeyManager) {
      ApiKeyManager.renderModelPicker('model-select');
      ApiKeyManager.renderModelPicker('key-model-select');
    }

    buildFaders();
    buildExpertSelect();
    renderConversation();

    // composer
    el.send.addEventListener('click', function () { send(el.input.value); });
    el.input.addEventListener('input', autoGrow);
    el.input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(el.input.value); }
    });

    // faders reset
    var reset = $('faders-reset');
    if (reset) reset.addEventListener('click', function () {
      FADERS.forEach(function (fd) { state.faders[fd.id] = fd.def; });
      saveBoard(); refreshFaderUI();
      if ($('preset-select')) $('preset-select').value = '';
    });

    // presets
    var preset = $('preset-select');
    if (preset) preset.addEventListener('change', function () {
      var p = PRESETS[preset.value];
      if (!p) return;
      FADERS.forEach(function (fd) { if (typeof p[fd.id] === 'number') state.faders[fd.id] = p[fd.id]; });
      saveBoard(); refreshFaderUI();
    });

    // quick actions
    Array.prototype.forEach.call(document.querySelectorAll('.qa-btn'), function (btn) {
      btn.addEventListener('click', function () {
        var ex = currentExpert();
        var prompt = ex.quick && ex.quick[btn.getAttribute('data-qa')];
        if (prompt) send(prompt);
        if (document.body.classList.contains('console-open')) toggleBoard(false);
      });
    });

    // export / clear
    var expBtn = $('export-btn'); if (expBtn) expBtn.addEventListener('click', exportChat);
    var clrBtn = $('clear-btn'); if (clrBtn) clrBtn.addEventListener('click', function () {
      if (!state.messages.length || confirm('Limpar toda a conversa? Isso não pode ser desfeito.')) {
        state.messages = []; saveChat(); renderWelcome();
      }
    });

    // mobile board drawer
    var toggle = $('board-toggle');
    if (toggle) toggle.addEventListener('click', function () { toggleBoard(); });
    var backdrop = document.createElement('div');
    backdrop.className = 'console-backdrop';
    backdrop.addEventListener('click', function () { toggleBoard(false); });
    document.body.appendChild(backdrop);

    autoGrow();
  }

  function toggleBoard(force) {
    var open = typeof force === 'boolean' ? force : !document.body.classList.contains('console-open');
    document.body.classList.toggle('console-open', open);
  }

  // Init when the gate reveals the app. Three independent triggers so wire() runs
  // no matter which path shows app-screen (wire() is idempotent via the `wired` flag):
  //  1) the COR-008 'maestria:app-ready' event (fired by the gate's own grant flow)
  //  2) a MutationObserver on #app-screen.class — catches the key-screen "Entrar no
  //     console" path where ApiKeyManager calls showScreen('app-screen') WITHOUT
  //     re-dispatching the ready event (the real gate does not fire it on that call)
  //  3) a DOMContentLoaded check for a returning member already on app-screen
  window.addEventListener('maestria:app-ready', wire);

  function watchAppScreen() {
    var app = document.getElementById('app-screen');
    if (!app) return;
    if (app.classList.contains('active')) { wire(); return; }
    try {
      var obs = new MutationObserver(function () {
        if (app.classList.contains('active')) wire();
      });
      obs.observe(app, { attributes: true, attributeFilter: ['class'] });
    } catch (e) { /* MutationObserver unavailable — event + fallback still cover it */ }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', watchAppScreen);
  } else {
    watchAppScreen();
  }
})();
