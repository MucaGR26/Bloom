export interface Expense {
  id: number;
  description: string;
  category: string;
  amount: number;
  /** Data do gasto no formato ISO (AAAA-MM-DD). */
  date: string;
}

export interface FixedExpense {
  id: number;
  name: string;
  amount: number;
}

export interface NavItem {
  label: string;
  icon: string;
  path: string;
}

export interface Installment {
  id: number;
  description: string;
  installmentAmount: number;
  paidCount: number;
  totalCount: number;
  /** Último mês com pagamento (AAAA-MM). */
  lastPaidMonth?: string | null;
  /** Quantas parcelas foram pagas em lastPaidMonth. */
  paidInLastMonth?: number | null;
  /** Dia do mês do pagamento (1 a 31). Aparece no calendário do menu. */
  dueDay?: number | null;
  /** Cor no calendário (#rrggbb). Vazio = cor do tema. */
  color?: string | null;
}

export interface Debt {
  id: number;
  creditor: string;
  totalAmount: number;
  paidAmount: number;
  interestRate: number;
  monthlyPayment: number;
  dueDay: number;
  /** Último mês com pagamento (AAAA-MM). */
  lastPaidMonth?: string | null;
  /** Quanto foi pago em lastPaidMonth. */
  paidInLastMonth?: number | null;
}

export interface Dream {
  id: number;
  name: string;
  icon: string;
  targetAmount: number;
  savedAmount: number;
  targetDate: string;
  /** Foto do sonho (data URL). Vazio = sem foto. */
  image?: string | null;
}

export interface Reminder {
  id: number;
  name: string;
  amount: number;
  dueDay: number;
  category: string;
  paid: boolean;
}

export interface Tip {
  id: number;
  title: string;
  body: string;
  icon: string;
  tone: 'positive' | 'primary' | 'secondary';
}

/** Nome de uma cor de THEME_COLORS ou 'personalizada' (usa customColor). */
export type ThemeName = string;
export type ThemeMode = 'claro' | 'escuro';
export type IconTheme = 'padrao' | 'fino' | 'negrito' | 'colorido' | 'emoji' | 'aventura';

export interface Preferences {
  displayName: string;
  appName: string;
  theme: ThemeName;
  mode: ThemeMode;
  /** Cor escolhida no seletor livre (#rrggbb), usada quando theme = 'personalizada'. */
  customColor: string;
  /** Foto de perfil como data URL (já reduzida para 160×160). Vazio = mostra a inicial do nome. */
  photo: string;
  /** Imagem de fundo do card "Livre para usar" (data URL). Vazio = fundo padrão. */
  balanceImage: string;
  /** Id de um banner de HEADER_BANNERS, 'imagem' (headerImage) ou vazio = topo padrão. */
  headerBanner: string;
  /** Imagem/GIF enviada pelo usuário para o topo (usada quando headerBanner = 'imagem'). */
  headerImage: string;
  /** Estilo dos ícones do app. */
  iconTheme: IconTheme;
  /** Tema de ícones secreto "Aventura" já foi desbloqueado. */
  secretAdventure: boolean;
  /** Logo secreto (20 cliques no logo do menu) está ativo. */
  secretLogo: boolean;
  /** Sirene ao ficar no vermelho. Desligada por padrão: só true liga. */
  alarmSound?: boolean | null;
}

/** Tudo o que o Bloom guarda de um usuário. É o formato que o back-end deverá devolver. */
export interface BloomData {
  salary: number;
  savingsGoal: number;
  fixedExpenses: FixedExpense[];
  expenses: Expense[];
  installments: Installment[];
  debts: Debt[];
  dreams: Dream[];
  reminders: Reminder[];
  emergencyMode: boolean;
  preferences: Preferences;
}

export const EXPENSE_CATEGORIES = ['Alimentação', 'Transporte', 'Moradia', 'Saúde', 'Educação', 'Celular', 'Assinaturas', 'Lazer', 'Compras', 'Outros'];
