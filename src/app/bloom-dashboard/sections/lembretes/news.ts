export interface NewsItem {
  category: 'Bolsa de valores' | 'Seu dinheiro';
  title: string;
  summary: string;
}

/** Notícias de demonstração: as empresas, os índices e os números são todos inventados. */
export const FICTIONAL_NEWS: NewsItem[] = [
  {
    category: 'Bolsa de valores',
    title: 'Índice Flor-50 sobe 1,2% com otimismo no setor de energia',
    summary: 'As ações da Girassol Energia lideraram os ganhos do dia depois do anúncio de uma nova usina solar.',
  },
  {
    category: 'Seu dinheiro',
    title: 'Pague-se primeiro: separar a poupança no dia do salário ajuda a guardar mais',
    summary: 'Em vez de guardar o que sobra, a dica é tirar a meta logo que o dinheiro cai e viver com o restante.',
  },
  {
    category: 'Bolsa de valores',
    title: 'Banco Semente anuncia lucro acima do esperado no trimestre',
    summary: 'A instituição atribuiu o resultado ao crescimento das contas digitais. Os papéis fecharam em alta de 2,4%.',
  },
  {
    category: 'Seu dinheiro',
    title: 'Regra das 24 horas reduz compras por impulso',
    summary: 'Esperar um dia antes de finalizar uma compra ajuda a separar o que você quer agora do que realmente precisa.',
  },
  {
    category: 'Bolsa de valores',
    title: 'Lótus Varejo recua 3% após vendas fracas no fim de semana',
    summary: 'Analistas fictícios da corretora Jardim Invest apontam a queda no consumo de eletrônicos como principal motivo.',
  },
  {
    category: 'Seu dinheiro',
    title: 'Reserva de emergência: comece pequeno e mantenha o hábito',
    summary: 'Guardar um valor baixo todo mês costuma funcionar melhor do que esperar sobrar uma quantia grande.',
  },
  {
    category: 'Bolsa de valores',
    title: 'Pequenos investidores chegam a recorde na Bolsa das Flores',
    summary: 'O número de contas abertas cresceu pelo terceiro mês seguido, puxado por jovens em busca do primeiro investimento.',
  },
  {
    category: 'Seu dinheiro',
    title: 'Revisar assinaturas pode liberar dinheiro sem cortar o essencial',
    summary: 'Olhar a fatura uma vez por mês ajuda a encontrar serviços que você paga e quase não usa.',
  },
];
