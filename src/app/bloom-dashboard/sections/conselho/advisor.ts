import { BloomStateService, parseMoney } from '../../state/bloom-state.service';

/**
 * "Assistente" do Conselho, sem IA: reconhece perguntas por palavras-chave e responde
 * usando os dados do usuário. Para ensinar uma pergunta nova, adicione uma regra em RULES.
 */

interface Rule {
  /** Testa a pergunta já em minúsculas e sem acentos. */
  match: (q: string) => boolean;
  reply: (s: BloomStateService, q: string) => string;
  /** Responde sem depender dos dados do usuário (funciona mesmo sem salário informado). */
  general?: boolean;
}

const has = (...words: string[]) => (q: string) => words.some((w) => new RegExp(`\\b${w}`).test(q));

/** Palavras que o usuário pode usar para cada categoria de gasto. */
const CATEGORY_WORDS: Record<string, string[]> = {
  Alimentação: ['alimentacao', 'comida', 'mercado', 'restaurante', 'lanche', 'ifood', 'almoco', 'janta'],
  Transporte: ['transporte', 'onibus', 'uber', 'gasolina', 'combustivel', 'metro', 'bilhete'],
  Moradia: ['moradia', 'aluguel', 'casa', 'condominio', 'luz', 'energia', 'agua'],
  Saúde: ['saude', 'farmacia', 'remedio', 'medico', 'consulta'],
  Educação: ['educacao', 'curso', 'faculdade', 'livro', 'escola'],
  Celular: ['celular', 'recarga', 'telefone'],
  Assinaturas: ['assinatura', 'streaming', 'netflix', 'spotify'],
  Lazer: ['lazer', 'cinema', 'festa', 'role', 'bar', 'jogo'],
  Compras: ['compras', 'roupa', 'shopping'],
};

const GREETINGS: [RegExp, string][] = [
  [/^bom dia\b/, 'Bom dia'],
  [/^boa tarde\b/, 'Boa tarde'],
  [/^boa noite\b/, 'Boa noite'],
  [/^(oi+|ola|opa|e ai|eai|hey|salve)\b/, 'Oi'],
];

/** Verbos de "como adiciono...", usados nas perguntas sobre o app. */
const ADD_VERB = '(adicion|cadastr|registr|lanc|coloc|anot|crio|criar|inclu|ponho)\\w*';

const RULES: Rule[] = [
  // ----- conversa -----
  {
    match: has('obrigad', 'valeu', 'brigad', 'agradeco'),
    general: true,
    reply: () => 'De nada! Sempre que quiser, é só perguntar. 🌸',
  },
  {
    match: has('tchau', 'ate mais', 'ate logo', 'falou'),
    general: true,
    reply: () => 'Até mais! Continue registrando seus gastos para eu te ajudar cada vez melhor.',
  },
  {
    match: (q) => /tudo bem|como (voce )?(esta|vai)|beleza\??$/.test(q) && !/\b(meu|minha|mes)\b/.test(q),
    general: true,
    reply: () => 'Tudo ótimo por aqui, obrigado por perguntar! E as suas finanças, como posso ajudar hoje?',
  },
  {
    match: (q) => /quem e voce|o que (voce )?(faz|sabe)|como (voce )?funciona|^ajuda$|me ajuda$/.test(q),
    general: true,
    reply: () =>
      'Sou o Conselho do Bloom. Olho seus dados do mês e respondo dúvidas como: "como está meu mês?", "quanto gastei com comida?", "posso comprar algo de R$ 200?", "qual dívida pago primeiro?" ou "como sair do vermelho?".',
  },

  {
    match: (q) => /o que (eu )?posso perguntar|o que (voce )?(responde|entende)|exemplos? de pergunta|^perguntas$|^comandos$/.test(q),
    general: true,
    reply: () =>
      'Você pode perguntar sobre: seu mês ("quanto posso gastar por dia?"), gastos ("qual meu maior gasto?"), dívidas ("quanto devo no total?"), parcelas ("à vista ou parcelado?"), contas ("o que vence essa semana?"), sonhos ("quando realizo meu sonho?"), como usar o app ("como cadastro uma dívida?") e termos como Selic, CDI, score e FGTS.',
  },
  {
    match: (q) => /voce e (um |uma )?(robo|ia|humano|pessoa|real|inteligencia)|e uma ia|e um robo/.test(q),
    general: true,
    reply: () => 'Sou um assistente simples do Bloom: não sou uma pessoa nem uma IA. Respondo a partir de regras prontas e dos dados que você cadastrou.',
  },
  {
    match: (q) => /qual (e )?(o )?seu nome|como (voce )?se chama/.test(q),
    general: true,
    reply: () => 'Eu sou o Conselho, o cantinho de orientação financeira do Bloom. 🌸',
  },
  {
    match: (q) => /voce e (legal|bom|boa|otimo|otima|incrivel|demais)|gostei|muito bom|parabens/.test(q),
    general: true,
    reply: () => 'Fico feliz em ajudar! Seu dinheiro merece florescer no seu ritmo. 🌸',
  },
  {
    match: (q) => /^(ok|okay|certo|entendi|blz|show|ta bom|tabom|legal|sim|nao|claro|hum+)$/.test(q),
    general: true,
    reply: () => 'Certo! Se tiver outra dúvida, é só perguntar. Quer ver como está o seu mês? Pergunte "como está meu mês?".',
  },
  {
    match: (q) => /^(k{2,}|(ha){2,}|rs+)$/.test(q),
    general: true,
    reply: () => 'Rir é ótimo, e de graça! 😄 Posso ajudar com alguma coisa do seu dinheiro?',
  },
  {
    match: (q) => /que dia e hoje|qual (e )?a data de hoje/.test(q),
    general: true,
    reply: () => `Hoje é ${new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}. Faltam ${daysLeftInMonth() - 1} dia(s) para o mês acabar.`,
  },
  {
    match: (q) => /ansios|angustiad|preocupad|triste|desesperad|com medo|estressad|nao aguento|sem saida|perdid[oa]\b/.test(q),
    general: true,
    reply: () =>
      'Sinto muito que esteja assim. Dinheiro pesa mesmo, e você não precisa resolver tudo hoje. Comece por uma coisa só: anotar o que entra e o que sai, ou ver o que vence primeiro. Se o peso estiver grande demais, falar com alguém ajuda; o CVV atende 24 horas, de graça, pelo 188.',
  },

  // ----- como usar o app -----
  {
    match: (q) => new RegExp(`${ADD_VERB}.*(despesa|conta|gasto)s? fixos?|${ADD_VERB}.*(despesa|conta)s? fixas?`).test(q),
    general: true,
    reply: () => 'Vá em Finanças, na parte "Despesas fixas", preencha descrição e valor e clique em Adicionar.',
  },
  {
    match: (q) => new RegExp(`${ADD_VERB}.*(gasto|despesa|lancamento)`).test(q),
    general: true,
    reply: () => 'Clique em "Novo gasto", no topo da tela, e informe descrição, valor, data e categoria. Ele aparece no Histórico.',
  },
  {
    match: (q) => /(apag|exclu|remov|edit|corrij|corrig|alter)\w*.*(gasto|lancamento)/.test(q),
    general: true,
    reply: () => 'No Histórico, cada gasto tem um lápis para editar e uma lixeira para excluir.',
  },
  {
    match: (q) => /(como|onde).*(mud|atualiz|alter|troc|inform|coloc)\w*.*salario/.test(q),
    general: true,
    reply: () => 'Na tela Início, o primeiro campo é o do salário. Também dá para mudar em Finanças.',
  },
  {
    match: (q) => new RegExp(`${ADD_VERB}.*divida`).test(q),
    general: true,
    reply: () => 'Vá em Dívidas e clique em "Nova dívida". Informe credor, valor total, juros, pagamento mensal e dia de vencimento: o Bloom monta o ranking de prioridade.',
  },
  {
    match: (q) => new RegExp(`${ADD_VERB}.*sonho`).test(q),
    general: true,
    reply: () => 'Vá em Sonhos e clique em "Novo sonho". Depois, em cada sonho, use Guardar para registrar o que você juntou.',
  },
  {
    match: (q) => new RegExp(`${ADD_VERB}.*(lembrete|boleto)`).test(q),
    general: true,
    reply: () => 'Vá em Lembretes e clique em "Novo lembrete". Informe descrição, valor, dia de vencimento e categoria.',
  },
  {
    match: (q) => new RegExp(`${ADD_VERB}.*parcela|como.*calculadora|simular.*parcel`).test(q),
    general: true,
    reply: () => 'Na aba Parcelas, informe valor total, número de parcelas e juros ao mês. O Bloom mostra a parcela, o total pago e o quanto pesa no salário. Se decidir comprar, clique em "Registrar esta compra".',
  },
  {
    match: (q) => /(mud|troc|alter)\w*.*(tema|cor\b|foto|banner|icone|aparencia|nome do app)|modo (escuro|claro)/.test(q),
    general: true,
    reply: () => 'Em "Temas e preferências", no fim do menu, você muda foto, nomes, cores, modo claro ou escuro, banner do topo e estilo dos ícones.',
  },
  {
    match: (q) => /(mud|troc|recuper|redefin)\w*.*senha|esqueci.*senha/.test(q),
    general: true,
    reply: () => 'Na tela de login, clique em "Esqueceu sua senha?" e informe seu e-mail. Enviamos um código de 6 dígitos, válido por 15 minutos, para você criar uma nova senha.',
  },
  {
    match: (q) => /export|relatorio|\bpdf\b|\bcsv\b|planilha/.test(q),
    general: true,
    reply: () => 'Exportar relatórios ainda não está disponível. Por enquanto, o Histórico mostra todos os seus gastos, com filtro por categoria.',
  },
  {
    match: (q) => /(o que|como funciona|pra que serve|para que serve).*(modo )?emergencia|ativar.*(modo )?emergencia/.test(q),
    general: true,
    reply: (s) =>
      `O Modo Emergência monta um plano separando seus gastos em cortar, reduzir e manter, e sugere um fundo de reserva. Ele fica na aba Emergência e ${s.emergencyMode() ? 'já está ativo.' : s.overBudget() ? 'é recomendado agora, porque seus gastos passaram do salário.' : 'você pode ativar quando quiser.'}`,
  },

  // ----- conceitos financeiros -----
  {
    match: (q) => /juros? compostos?/.test(q),
    general: true,
    reply: () => 'Juros compostos são juros sobre juros: a cada período, a taxa incide também sobre o que já rendeu. Trabalham a seu favor ao investir e contra você nas dívidas. R$ 1.000 a 10% ao mês viram cerca de R$ 3.138 em um ano.',
  },
  {
    match: (q) => /juros? simples/.test(q),
    general: true,
    reply: () => 'Nos juros simples, a taxa incide sempre sobre o valor inicial. R$ 1.000 a 10% ao mês rendem R$ 100 todo mês, sem acumular juros sobre juros.',
  },
  {
    match: (q) => /selic/.test(q) && !/tesouro/.test(q),
    general: true,
    reply: () => 'A Selic é a taxa básica de juros do Brasil, definida pelo Copom, do Banco Central. Quando ela sobe, empréstimos ficam mais caros e a renda fixa costuma render mais.',
  },
  {
    match: has('cdi'),
    general: true,
    reply: () => 'O CDI é uma taxa usada entre bancos e fica muito perto da Selic. Quando um investimento paga "100% do CDI", ele acompanha essa taxa.',
  },
  {
    match: has('lci', 'lca'),
    general: true,
    reply: () => 'LCI e LCA são títulos de bancos ligados aos setores imobiliário e agrícola. Costumam ter isenção de imposto de renda para pessoa física e proteção do FGC, mas muitas têm prazo de carência. Confira as regras atuais antes.',
  },
  {
    match: has('fgc'),
    general: true,
    reply: () => 'O FGC é um fundo que devolve até R$ 250 mil por CPF e por instituição se um banco quebrar. Cobre CDB, LCI, LCA e poupança, por exemplo.',
  },
  {
    match: (q) => /fundos? imobiliarios?|\bfiis?\b/.test(q),
    general: true,
    reply: () => 'Fundos imobiliários juntam dinheiro de vários investidores para aplicar em imóveis e pagam rendimentos. As cotas variam de preço na bolsa, então há risco de perda.',
  },
  {
    match: (q) => /renda fixa/.test(q),
    general: true,
    reply: () => 'Na renda fixa, as regras de rendimento são definidas na hora da aplicação. Exemplos: Tesouro Direto, CDB, LCI e LCA. Costuma ser o ponto de partida para quem está começando.',
  },
  {
    match: (q) => /renda variavel/.test(q),
    general: true,
    reply: () => 'Na renda variável, como ações, o retorno não é conhecido antes e pode haver perda. O indicado é só entrar nela depois de ter reserva de emergência, e com dinheiro que não vai fazer falta.',
  },
  {
    match: has('liquidez'),
    general: true,
    reply: () => 'Liquidez é a facilidade de transformar um investimento em dinheiro. Liquidez diária significa que você pode resgatar em qualquer dia útil, o que é o ideal para a reserva de emergência.',
  },
  {
    match: (q) => /\bscore\b|pontuacao de credito/.test(q),
    general: true,
    reply: () => 'O score é uma nota de 0 a 1000 que indica a chance de você pagar as contas em dia. Para melhorar: pague em dia, negocie dívidas atrasadas, mantenha o CPF atualizado e evite pedir crédito em vários lugares ao mesmo tempo.',
  },
  {
    match: has('fgts'),
    general: true,
    reply: () => 'O FGTS é um depósito mensal de 8% do salário feito pelo empregador, em uma conta no seu nome, para quem trabalha com carteira assinada. Antes de aderir ao saque-aniversário, lembre que ele limita o saque em caso de demissão.',
  },
  {
    match: (q) => /\b13.{0,2}salario|decimo terceiro/.test(q),
    general: true,
    reply: () => 'Uma boa ordem para usar o 13º: primeiro quitar dívidas caras, depois reforçar a reserva de emergência e, por fim, realizar um sonho. Se puder, separe uma parte para as despesas de começo de ano.',
  },
  {
    match: (q) => /imposto de renda|\birpf\b|declarar/.test(q),
    general: true,
    reply: () => 'As regras de quem precisa declarar o Imposto de Renda mudam todo ano. Confira no site da Receita Federal e guarde os comprovantes de renda, saúde e educação.',
  },
  {
    match: (q) => /\bmei\b|microempreendedor/.test(q),
    general: true,
    reply: () => 'O MEI é um jeito simplificado de formalizar o trabalho por conta própria, com CNPJ, emissão de nota e contribuição mensal ao INSS. O limite de faturamento e as regras estão no Portal do Empreendedor, do governo.',
  },
  {
    match: (q) => /aposentadoria|previdencia|\binss\b/.test(q),
    general: true,
    reply: () => 'Quanto antes começar, menos precisa guardar por mês, graças aos juros compostos. Primeiro monte sua reserva de emergência. Autônomos podem contribuir com o INSS para ter direito à aposentadoria e a benefícios.',
  },
  {
    match: (q) => /\bpix\b/.test(q),
    general: true,
    reply: () => 'O Pix é instantâneo e costuma ser gratuito para pessoa física. Confira sempre nome e valor antes de confirmar, e desconfie de urgência: Pix enviado é difícil de recuperar.',
  },
  {
    match: (q) => /golpe|fraude|clonaram|clonado/.test(q),
    general: true,
    reply: () => 'Se suspeitar de golpe: fale com seu banco pelo canal oficial na hora, troque senhas, peça o bloqueio e registre um boletim de ocorrência. No caso de Pix, peça ao banco o Mecanismo Especial de Devolução. Nunca passe senha ou código por mensagem.',
  },
  {
    match: (q) => /\b(apostas?|apostar|bets?|tigrinho|cassino)\b/.test(q),
    general: true,
    reply: () => 'Aposta não é renda nem investimento: a tendência, no longo prazo, é perder dinheiro. Se estiver difícil parar, busque ajuda; o CAPS do SUS atende esse tipo de situação. Nunca aposte com dinheiro de contas ou de empréstimo.',
  },
  {
    match: (q) => /bola de neve|avalanche|metodo.*divida/.test(q),
    general: true,
    reply: () => 'Avalanche: pague primeiro a dívida de maior juros, o que sai mais barato. Bola de neve: pague primeiro a menor, o que dá motivação rápida. O ranking do Bloom usa a avalanche.',
  },
  {
    match: (q) => /nome sujo|serasa|\bspc\b|limpar (o |meu )?nome|nome negativado|caduc/.test(q),
    general: true,
    reply: () => 'Consulte seu CPF em serviços como o Serasa e procure as ofertas de acordo do próprio credor. A negativação sai do cadastro em até 5 anos, mas a dívida não some sozinha. Depois de pagar, o nome deve ser limpo em até 5 dias úteis.',
  },
  {
    match: (q) => /renegoci|negociar|fazer (um )?acordo/.test(q),
    general: true,
    reply: () => 'Antes de negociar, veja quanto cabe no seu mês. Peça a redução dos juros, compare à vista e parcelado, e só aceite uma parcela que consiga pagar até o fim. Exija o acordo por escrito. O Procon pode ajudar se houver abuso.',
  },
  {
    match: (q) => /rotativo|pagamento minimo|minimo da fatura/.test(q),
    general: true,
    reply: () => 'O rotativo é o crédito que entra quando você não paga a fatura inteira, e está entre os juros mais caros do país. Se não der para pagar tudo, compare com o parcelamento da fatura ou um empréstimo mais barato.',
  },
  {
    match: (q) => /cheque especial/.test(q),
    general: true,
    reply: () => 'O cheque especial é um crédito de emergência com juros muito altos. Se entrou nele, tente sair o quanto antes, trocando por um empréstimo pessoal mais barato, se for o caso.',
  },
  {
    match: (q) => /consignado/.test(q),
    general: true,
    reply: () => 'No consignado, a parcela é descontada direto do salário ou benefício, e por isso os juros costumam ser menores. O cuidado é que seu salário líquido diminui durante todo o contrato.',
  },
  {
    match: (q) => /(vale a pena|devo|posso|fazer|pegar).*emprestimo/.test(q),
    reply: (s) =>
      `Só compensa pegar empréstimo para trocar uma dívida mais cara por uma mais barata, ou em uma necessidade real. Compare o custo total, não só a parcela. Hoje suas dívidas e parcelas já pesam ${s.percentOfSalary(s.debtsMonthlyTotal() + s.installmentsTotalMonthly())}% da sua renda; o recomendado é ficar abaixo de 30%.`,
  },
  {
    match: (q) => /a vista|parcelado ou|parcelar ou|parcelo ou/.test(q),
    general: true,
    reply: () => 'À vista costuma ser melhor quando há desconto e o dinheiro não faz falta. Parcelar sem juros pode valer a pena se a parcela couber no mês. Com juros, compare o total pago: a calculadora da aba Parcelas faz isso.',
  },
  {
    match: (q) => /debito ou credito|credito ou debito/.test(q),
    general: true,
    reply: () => 'No débito o dinheiro sai na hora, o que ajuda a controlar. No crédito você ganha prazo, mas precisa pagar a fatura inteira. Se costuma perder o controle, prefira o débito.',
  },
  {
    match: (q) => /limite (do |de )?cartao|aumentar (o )?limite/.test(q),
    general: true,
    reply: () => 'Limite maior não é dinheiro a mais. Uma boa referência é manter a fatura abaixo de 30% da sua renda, para ela não comprometer as contas do mês seguinte.',
  },

  // ----- perfis e hábitos -----
  {
    match: (q) => /por onde comec|primeiro (emprego|salario)|nunca (guardei|me organizei|organizei)|comecar a me organizar/.test(q),
    general: true,
    reply: () => 'Comece simples: 1) informe o salário; 2) cadastre as contas fixas; 3) anote todo gasto por um mês; 4) separe um valor para guardar assim que o dinheiro cair, mesmo que pequeno. O hábito importa mais do que o valor.',
  },
  {
    match: (q) => /autonomo|freela|\bbico\b|ganho varia|renda (irregular|muda|instavel)|nao tenho salario fixo/.test(q),
    general: true,
    reply: () => 'Com renda variável, faça o orçamento com base nos meses mais fracos. Nos meses bons, guarde a diferença para cobrir os ruins. Atualize o salário do mês na tela Início para ver na hora quanto pode gastar.',
  },
  {
    match: (q) => /renda extra|ganhar mais|ganhar dinheiro/.test(q),
    general: true,
    reply: () => 'Ideias simples: vender o que não usa, prestar serviços do que você já sabe fazer, dar aulas particulares ou fazer entregas. Desconfie de promessas de dinheiro fácil, que costumam ser golpe.',
  },
  {
    match: (q) => /ganho pouco|salario baixo|salario pequeno|pouco dinheiro|nao sobra nada/.test(q),
    reply: (s) =>
      `Com pouco, cada real conta. Priorize moradia, comida e contas essenciais, renegocie o que estiver caro e tente guardar nem que seja 1% (${m(s, s.salary() * 0.01)}). Hoje você tem ${m(s, s.available())} livres neste mês.`,
  },
  {
    match: (q) => /impulso|compulsiv|nao consigo (parar|guardar|economizar|juntar)/.test(q),
    general: true,
    reply: () => 'Tente a regra das 24 horas: viu, quis, espere um dia. Tire cartões salvos dos apps, desative notificações de promoção e separe o dinheiro de guardar assim que o salário cair, para não precisar de força de vontade.',
  },
  {
    match: (q) => /(economizar|gastar menos|reduzir|diminuir|baixar).*(mercado|comida|alimentacao)/.test(q),
    general: true,
    reply: () => 'No mercado: faça lista, não vá com fome, compare o preço por quilo, experimente marcas próprias e planeje as refeições da semana. Pedir comida por aplicativo costuma ser o que mais pesa.',
  },
  {
    match: (q) => /(economizar|gastar menos|reduzir|diminuir|baixar).*(luz|energia)/.test(q),
    general: true,
    reply: () => 'Para a conta de luz: encurte o banho, tire aparelhos da tomada, troque por lâmpadas de LED e junte roupa antes de ligar a máquina. Verifique também se tem direito à Tarifa Social.',
  },
  {
    match: (q) => /(economizar|gastar menos|reduzir|diminuir|baixar).*(transporte|gasolina|uber|combustivel)/.test(q),
    general: true,
    reply: () => 'No transporte: compare o preço por aplicativo e transporte público, combine caronas, calibre os pneus e junte vários compromissos em uma viagem só.',
  },
  {
    match: (q) => /nao (consigo|vou conseguir|da pra) pagar|atrasei|estou atrasad|conta atrasada/.test(q),
    reply: (s) => {
      const first = s.debtRanking()[0];
      return `Priorize o essencial: moradia, luz, água e comida. Depois, fale com o credor antes que a dívida cresça.${first ? ` Das suas dívidas, a que mais encarece é "${first.creditor}".` : ''} Se ficou no vermelho, veja o plano na aba Emergência.`;
    },
  },

  // ----- dados do mês -----
  {
    match: (q) => /quanto (eu )?(posso|consigo|da pra) gastar.*(dia|hoje)|limite (por dia|diario)/.test(q),
    reply: (s) => {
      if (s.available() <= 0) return 'Neste mês não sobra valor livre para gastar. Veja na aba Emergência o que dá para cortar.';
      return `Faltam ${daysLeftInMonth()} dia(s) para o mês acabar. Dá para gastar cerca de ${m(s, s.available() / daysLeftInMonth())} por dia e fechar sem ficar no vermelho.`;
    },
  },
  {
    match: (q) => /quanto (eu )?(gasto|gastei).*(por dia|cada dia)|media.*(gasto|dia)/.test(q),
    reply: (s) => `Até hoje, seus gastos avulsos dão uma média de ${m(s, s.variableTotal() / new Date().getDate())} por dia neste mês.`,
  },
  {
    match: (q) => /quantos dias|fim do mes|falta pr[oa]s? (o )?(mes|acabar)/.test(q),
    reply: (s) => `Faltam ${daysLeftInMonth() - 1} dia(s) para o mês acabar, e você tem ${m(s, s.available())} livres.`,
  },
  {
    match: (q) => /(estou|to|tou|vou|estamos) (bem|mal|indo)|como (eu )?(estou|to)\b/.test(q),
    reply: (s) => {
      if (s.overBudget()) return `Atenção: seus gastos passaram do salário em ${m(s, -s.available())}. A aba Emergência mostra o que cortar.`;
      if (s.freePercent() < 10) return `Está apertado: só ${s.freePercent()}% do salário continua livre (${m(s, s.available())}). Vá com calma até o fim do mês.`;
      if (s.freePercent() < 25) return `Está razoável: ${s.freePercent()}% do salário continua livre (${m(s, s.available())}).`;
      return `Você está indo bem! ${s.freePercent()}% do salário continua livre (${m(s, s.available())}). 🌸`;
    },
  },
  {
    match: (q) => /compromet|peso.*renda|porcentagem|percentual/.test(q),
    reply: (s) =>
      `Contas fixas, parcelas e dívidas comprometem ${s.percentOfSalary(s.committedTotal())}% da sua renda (${m(s, s.committedTotal())}). Somando os gastos avulsos, são ${s.percentOfSalary(s.totalSpent())}%.`,
  },
  {
    match: (q) => /(despesas?|contas?|gastos?) fix[oa]s?/.test(q),
    reply: (s) => {
      const list = s.fixedExpenses();
      if (!list.length) return 'Você ainda não cadastrou despesas fixas. Elas ficam na aba Finanças.';
      return `Suas despesas fixas somam ${m(s, s.fixedTotal())}: ${list.map((f) => `${f.name} (${m(s, f.amount)})`).join(', ')}.`;
    },
  },
  {
    match: (q) => /gastei hoje|gasto de hoje|gastos de hoje/.test(q),
    reply: (s) => {
      const today = new Date();
      const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      const items = s.expenses().filter((e) => String(e.date) === iso);
      return items.length ? `Hoje você registrou ${items.length} gasto(s), somando ${m(s, sumOf(items))}.` : 'Você não registrou nenhum gasto hoje.';
    },
  },
  {
    match: (q) => /(nessa|esta|essa|na|ultima) semana/.test(q) && /gast/.test(q),
    reply: (s) => {
      const limit = new Date();
      limit.setDate(limit.getDate() - 6);
      limit.setHours(0, 0, 0, 0);
      const items = s.expenses().filter((e) => new Date(`${e.date}T00:00:00`) >= limit);
      return items.length ? `Nos últimos 7 dias você registrou ${items.length} gasto(s), somando ${m(s, sumOf(items))}.` : 'Você não registrou gastos nos últimos 7 dias.';
    },
  },
  {
    match: (q) => /ultimo gasto|ultima despesa/.test(q),
    reply: (s) => {
      const last = s.sortedExpenses()[0];
      return last ? `Seu último gasto foi "${last.description}": ${m(s, last.amount)}, em ${last.category}.` : 'Você ainda não registrou nenhum gasto.';
    },
  },
  {
    match: (q) => /quantos (gastos|lancamentos)/.test(q),
    reply: (s) => `Você tem ${s.monthExpenses().length} gasto(s) registrado(s) neste mês e ${s.expenses().length} no total.`,
  },
  {
    match: (q) => /(vou|consigo|bati|batendo|atingi|cheguei).*meta|falta.*meta|minha meta/.test(q),
    reply: (s) => {
      if (s.savingsGoal() <= 0) return 'Você ainda não definiu uma meta de poupança. Dá para definir na aba Finanças.';
      if (s.saved() >= s.savingsGoal()) return `Sim! Sobram ${m(s, s.saved())} e sua meta é de ${m(s, s.savingsGoal())}. 🎉`;
      return `Sua meta é de ${m(s, s.savingsGoal())} e hoje sobram ${m(s, s.saved())}. Faltam ${m(s, s.savingsGoal() - s.saved())}, então segure os gastos avulsos até o fim do mês.`;
    },
  },

  // ----- dívidas, parcelas, contas e sonhos -----
  {
    match: (q) => /quanto (eu )?devo( no total| ao todo| de| em)?$|quanto (eu )?devo (no|ao|de|em)\b|total.*divida|quantas dividas|saldo devedor/.test(q),
    reply: (s) => {
      const open = s.debtRanking();
      if (!open.length) return 'Você não tem dívidas em aberto cadastradas. 🎉';
      return `Você tem ${open.length} dívida(s) em aberto, somando ${m(s, s.debtsTotalRemaining())}. Por mês, elas pesam ${m(s, s.debtsMonthlyTotal())}.`;
    },
  },
  {
    match: (q) => /(quando|quanto tempo|quantos meses).*(quit|acab|termin|pagar).*divida|divida.*(quando|quanto tempo)/.test(q),
    reply: (s) => {
      const open = s.debtRanking();
      if (!open.length) return 'Você não tem dívidas em aberto cadastradas. 🎉';
      const months = Math.max(...open.map((d) => (d.monthlyPayment > 0 ? Math.ceil((d.totalAmount - d.paidAmount) / d.monthlyPayment) : 0)));
      return `Pagando o valor mensal atual, leva cerca de ${months} mês(es) para quitar tudo. Essa conta é aproximada e não considera os juros futuros.`;
    },
  },
  {
    match: (q) => /quantas parcelas|parcelas? (em aberto|ativas?|que faltam)|o que (eu )?(estou|to) parcelando|minhas parcelas/.test(q),
    reply: (s) => {
      const open = s.installments().filter((i) => i.paidCount < i.totalCount);
      if (!open.length) return 'Você não tem parcelas em andamento.';
      return `Parcelas em andamento: ${open.map((i) => `${i.description} (faltam ${i.totalCount - i.paidCount} de ${m(s, i.installmentAmount)})`).join(', ')}.`;
    },
  },
  {
    match: (q) => /o que vence|contas? d?[ae]ssa semana|contas? desta semana|vence (hoje|amanha)|proxim[oa]s? (contas?|vencimentos?)/.test(q),
    reply: (s) => {
      const next = s.upcomingReminders().filter((r) => s.daysUntil(r.dueDay) <= 7);
      if (!next.length) return 'Nenhuma conta dos seus Lembretes vence nos próximos 7 dias.';
      return `Nos próximos 7 dias: ${next.map((r) => `${r.name} (${m(s, r.amount)}, ${s.daysUntil(r.dueDay) === 0 ? 'hoje' : `em ${s.daysUntil(r.dueDay)} dia(s)`})`).join(', ')}.`;
    },
  },
  {
    match: (q) => /contas? (pendentes?|em aberto)|quantas contas|contas? a pagar/.test(q),
    reply: (s) => {
      const open = s.pendingReminders();
      if (!open.length) return 'Você não tem contas pendentes nos Lembretes. 🎉';
      return `Você tem ${open.length} conta(s) pendente(s), somando ${m(s, sumOf(open))}.`;
    },
  },
  {
    match: (q) => /(quando|quanto tempo).*(realiz|consig|alcanc|junt|sonho)|sonho mais (perto|proximo)/.test(q),
    reply: (s) => {
      const open = s.dreams().filter((d) => d.savedAmount < d.targetAmount).sort((a, b) => a.targetAmount - a.savedAmount - (b.targetAmount - b.savedAmount));
      if (!open.length) return 'Você não tem sonhos em andamento. Que tal criar um na aba Sonhos?';
      const near = open[0];
      const left = near.targetAmount - near.savedAmount;
      if (s.saved() <= 0) return `Seu sonho mais perto é "${near.name}": faltam ${m(s, left)}. Neste mês não está sobrando dinheiro para guardar.`;
      return `Seu sonho mais perto é "${near.name}": faltam ${m(s, left)}. Guardando ${m(s, s.saved())} por mês, o que sobra hoje, leva cerca de ${Math.ceil(left / s.saved())} mês(es).`;
    },
  },

  // ----- situação do mês -----
  {
    match: (q) => /sair do vermelho|no vermelho|negativ|gastei mais do que|nao (esta )?sobrando|dinheiro (nao da|acab)/.test(q),
    reply: (s) => {
      if (!s.overBudget()) {
        return `Boa notícia: você não está no vermelho. Ainda sobram ${m(s, s.available())} neste mês. Para não chegar lá, evite novas parcelas e acompanhe os gastos avulsos.`;
      }
      const cut = s.emergencyPlan().cut.reduce((t, i) => t + i.amount, 0);
      return `Você está ${m(s, -s.available())} no vermelho. Passos: 1) corte gastos que podem esperar (${m(s, cut)} em lazer/assinaturas/compras este mês); 2) não faça novas compras parceladas; 3) pague primeiro as contas fixas e o mínimo das dívidas. O Modo Emergência mostra o plano completo.`;
    },
  },
  {
    match: (q) => /como (esta|ta|anda|vai) (o )?(meu|minha)|meu mes|resumo|situacao|minhas financas/.test(q),
    reply: (s) =>
      `Neste mês: salário de ${m(s, s.salary())}, ${m(s, s.committedTotal())} em contas fixas, parcelas e dívidas, e ${m(s, s.variableTotal())} em gastos avulsos. Sobram ${m(s, s.available())} (${s.freePercent()}% do salário). ${s.overBudget() ? 'Atenção: você passou do salário.' : s.saved() >= s.savingsGoal() && s.savingsGoal() > 0 ? 'Você está dentro da meta de poupança. 🎉' : 'Ainda dá para melhorar até o fim do mês.'}`,
  },
  {
    match: (q) => /quanto (eu )?(ganho|recebo)|meu salario/.test(q),
    reply: (s) => `Seu salário cadastrado é ${m(s, s.salary())}. Se mudou este mês, atualize na tela Início.`,
  },
  {
    match: (q) => /quanto (me )?(sobra|resta|tenho)|livre|disponivel|saldo/.test(q),
    reply: (s) => `Você tem ${m(s, s.available())} livres neste mês, o que é ${s.freePercent()}% do salário.`,
  },

  // ----- gastos -----
  {
    match: (q) => /(quanto|qual).*(gast|gaste)/.test(q) && Object.values(CATEGORY_WORDS).some((ws) => ws.some((w) => q.includes(w))),
    reply: (s, q) => {
      const category = Object.entries(CATEGORY_WORDS).find(([, ws]) => ws.some((w) => q.includes(w)))![0];
      const items = s.monthExpenses().filter((e) => e.category === category);
      const total = items.reduce((t, e) => t + e.amount, 0);
      if (!items.length) return `Você não registrou gastos de ${category} este mês.`;
      return `Este mês você gastou ${m(s, total)} com ${category}, em ${items.length} lançamento(s). Isso é ${s.percentOfSalary(total)}% do salário.`;
    },
  },
  {
    match: (q) => /maior gasto|onde (mais )?(gasto|gastei)|com o que (mais )?(gasto|gastei)/.test(q),
    reply: (s) => {
      const byCat = new Map<string, number>();
      for (const e of s.monthExpenses()) byCat.set(e.category, (byCat.get(e.category) ?? 0) + e.amount);
      const top = [...byCat].sort((a, b) => b[1] - a[1])[0];
      return top
        ? `Sua categoria com mais gastos avulsos este mês é ${top[0]}: ${m(s, top[1])}. Contas fixas somam mais ${m(s, s.fixedTotal())}.`
        : 'Você ainda não registrou gastos avulsos este mês.';
    },
  },
  {
    match: (q) => /quanto (eu )?(ja )?gastei|meus gastos|total de gastos/.test(q),
    reply: (s) => `Este mês você gastou ${m(s, s.totalSpent())} no total: ${m(s, s.committedTotal())} em compromissos fixos e ${m(s, s.variableTotal())} em gastos avulsos.`,
  },

  // ----- decisões de compra -----
  {
    match: (q) => /(posso|consigo|devo|da pra|vale a pena) (comprar|gastar|pagar)/.test(q),
    reply: (s, q) => {
      const value = parseMoney(q.match(/\d[\d.,]*/)?.[0]);
      if (!isFinite(value)) {
        return `Hoje você tem ${m(s, s.available())} livres no mês. Me diga o valor (ex.: "posso comprar algo de R$ 200?") que eu comparo com o seu orçamento.`;
      }
      const left = s.available() - value;
      if (left < 0) return `Não é um bom momento: essa compra deixaria seu mês ${m(s, -left)} no vermelho. Se for essencial, simule um parcelamento na tela Parcelas.`;
      if (left < s.savingsGoal()) return `Dá para pagar, mas sobrariam ${m(s, left)}, abaixo da sua meta de poupança de ${m(s, s.savingsGoal())}. Se puder esperar, espere.`;
      return `Cabe no orçamento: depois da compra ainda sobrariam ${m(s, left)} e sua meta de ${m(s, s.savingsGoal())} continua garantida.`;
    },
  },
  {
    match: has('cartao de credito', 'cartao'),
    reply: (s) => {
      const card = s.debtRanking().find((d) => /cart/i.test(d.creditor));
      const tip = 'O cartão é útil para concentrar gastos e ganhar prazo, desde que você pague a fatura inteira. Evite o rotativo e o pagamento mínimo: os juros passam de 10% ao mês.';
      return card ? `${tip} Você tem "${card.creditor}" com ${m(s, card.totalAmount - card.paidAmount)} em aberto: priorize quitar.` : tip;
    },
  },
  {
    match: has('divida', 'devendo', 'emprestimo', 'juros', 'quitar'),
    reply: (s) => {
      const first = s.debtRanking()[0];
      if (!first) return 'Você não tem dívidas em aberto cadastradas. Ótimo! Mantenha os lembretes em dia para continuar assim.';
      return `Priorize "${first.creditor}", que cobra ${first.interestRate.toLocaleString('pt-BR')}% ao mês — é a que mais encarece com o tempo. Pague o mínimo nas outras e coloque o extra nela. Suas dívidas somam ${m(s, s.debtsMonthlyTotal())} por mês (${s.percentOfSalary(s.debtsMonthlyTotal())}% da renda).`;
    },
  },
  {
    match: has('parcel'),
    reply: (s) =>
      `Hoje suas parcelas somam ${m(s, s.installmentsTotalMonthly())} por mês. Uma regra segura é não passar de 30% da renda com parcelas e dívidas juntas (${m(s, s.salary() * 0.3)} no seu caso). Use a calculadora em Parcelas antes de decidir.`,
  },

  // ----- poupar e planejar -----
  {
    match: has('reserva', 'emergencia', 'imprevisto'),
    reply: (s) =>
      `O ideal é ter entre ${m(s, s.emergencyFundMin())} (3 salários) e ${m(s, s.emergencyFundIdeal())} (6 salários) guardados. Comece criando um Sonho chamado "Reserva de emergência" e guarde um pouco todo mês.`,
  },
  {
    match: (q) => /economizar|gastar menos|cortar|reduzir|dica/.test(q),
    reply: (s) => {
      const cut = s.emergencyPlan().cut;
      const extra = cut.length ? ` Este mês, ${cut.map((c) => `${c.name} (${m(s, c.amount)})`).join(', ')} são os gastos mais fáceis de cortar.` : '';
      return `Algumas ideias: revise assinaturas que você pouco usa, faça lista antes do mercado, compare preços e espere 24 h antes de compras por impulso.${extra}`;
    },
  },
  {
    match: (q) => /guardar|poupar|meta|juntar dinheiro/.test(q),
    reply: (s) =>
      `Uma boa referência é guardar de 10% a 20% da renda: entre ${m(s, s.salary() * 0.1)} e ${m(s, s.salary() * 0.2)} por mês. Sua meta atual é ${m(s, s.savingsGoal())} e, até agora, sobram ${m(s, s.saved())} neste mês.`,
  },
  {
    match: has('sonho'),
    reply: (s) => {
      const open = s.dreams().filter((d) => d.savedAmount < d.targetAmount);
      if (!open.length) return 'Você não tem sonhos em andamento. Que tal criar um na tela Sonhos?';
      return 'Seus sonhos: ' + open.map((d) => `${d.name} — faltam ${m(s, d.targetAmount - d.savedAmount)}`).join('; ') + '.';
    },
  },
  {
    match: (q) => /conta|vence|vencimento|boleto|lembrete/.test(q),
    reply: (s) => {
      const next = s.upcomingReminders()[0];
      if (!next) return 'Você não tem contas pendentes cadastradas nos Lembretes.';
      const days = s.daysUntil(next.dueDay);
      return `A próxima conta é ${next.name} (${m(s, next.amount)}), que vence ${days === 0 ? 'hoje' : `em ${days} dia(s)`}. Você tem ${s.pendingReminders().length} conta(s) pendente(s).`;
    },
  },
  {
    match: (q) => /50.?30.?20|regra do 50/.test(q),
    reply: (s) =>
      `A regra 50-30-20 divide a renda em: 50% para o essencial (${m(s, s.salary() * 0.5)}), 30% para desejos (${m(s, s.salary() * 0.3)}) e 20% para guardar ou quitar dívidas (${m(s, s.salary() * 0.2)}).`,
  },

  // ----- educação financeira básica -----
  {
    match: has('tesouro'),
    general: true,
    reply: () => 'O Tesouro Direto é um investimento em títulos do governo federal, considerado um dos mais seguros do Brasil. O Tesouro Selic é o mais indicado para reserva de emergência, porque dá para resgatar a qualquer momento.',
  },
  {
    match: has('cdb'),
    general: true,
    reply: () => 'CDB é um empréstimo que você faz ao banco em troca de juros. Muitos rendem mais que a poupança e têm proteção do FGC até R$ 250 mil por banco.',
  },
  {
    match: has('poupanca'),
    general: true,
    reply: () => 'A poupança é simples e sem imposto, mas costuma render menos que opções como Tesouro Selic ou CDB de liquidez diária. Serve para começar, mas vale comparar.',
  },
  {
    match: has('investir', 'investimento', 'acoes', 'bolsa', 'cripto', 'bitcoin'),
    general: true,
    reply: () => 'Não sou consultor de investimentos, mas uma regra geral de educação financeira é: primeiro quite dívidas caras e monte a reserva de emergência; só depois pense em investir.',
  },
  {
    match: has('inflacao'),
    general: true,
    reply: () => 'Inflação é o aumento geral dos preços: com o tempo, o mesmo dinheiro compra menos. Por isso vale deixar a reserva num lugar que renda pelo menos a inflação.',
  },
  {
    match: has('orcamento', 'organizar', 'controlar'),
    general: true,
    reply: () => 'Para organizar: 1) informe seu salário; 2) cadastre as contas fixas em Finanças; 3) registre todo gasto avulso no Histórico; 4) defina uma meta de poupança. O Bloom calcula o resto.',
  },
];

export function answerQuestion(question: string, s: BloomStateService): string {
  let q = question
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[!?.,;]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Cumprimento no começo: responde junto ("Bom dia! ...") ou sozinho.
  let greeting = '';
  for (const [re, word] of GREETINGS) {
    if (re.test(q)) {
      greeting = word;
      q = q.replace(re, '').replace(/^(bloom|tudo bem|tudo bom)\b/, '').trim();
      break;
    }
  }
  const name = s.preferences().displayName;
  if (greeting && !q) {
    return `${greeting}${name ? ', ' + name : ''}! 🌸 Como posso ajudar com suas finanças hoje? Você pode perguntar, por exemplo, "como está meu mês?".`;
  }

  const prefix = greeting ? `${greeting}! ` : '';
  const rule = RULES.find((r) => r.match(q));
  if (rule && !rule.general && s.salary() <= 0) {
    return prefix + 'Para eu te orientar melhor, primeiro informe seu salário na tela Início ou em Finanças.';
  }
  if (rule) return prefix + rule.reply(s, q);

  return (
    prefix +
    'Hmm, ainda não sei responder isso. 😅 Pergunte "o que posso perguntar?" para ver os assuntos que eu conheço, ou tente "como está meu mês?" e "quanto posso gastar por dia?".'
  );
}

/** Dias até o fim do mês, contando hoje. */
function daysLeftInMonth(): number {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate() + 1;
}

function sumOf(items: { amount: number }[]): number {
  return items.reduce((total, item) => total + item.amount, 0);
}

function m(s: BloomStateService, value: number): string {
  return s.formatMoney(value);
}
