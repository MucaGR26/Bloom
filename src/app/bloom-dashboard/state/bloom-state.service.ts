import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { applyTheme } from './theme';
import { AuthService } from '../../core/auth.service';
import { BloomRepository } from '../../core/bloom-repository';
import {
  BloomData,
  Debt,
  Dream,
  Expense,
  FixedExpense,
  Installment,
  Preferences,
  Reminder,
  Tip,
} from '../models/expense.model';

export interface PlanItem {
  name: string;
  amount: number;
  note: string;
}

/** Categorias de gasto avulso que dá pra cortar de imediato numa emergência. */
const CUTTABLE = ['Lazer', 'Assinaturas', 'Compras', 'Outros'];

export function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function emptyData(displayName = ''): BloomData {
  return {
    salary: 0,
    savingsGoal: 0,
    fixedExpenses: [],
    expenses: [],
    installments: [],
    debts: [],
    dreams: [],
    reminders: [],
    emergencyMode: false,
    preferences: { displayName, appName: 'Bloom', theme: 'rosa', mode: 'claro', customColor: '#e91e8c', photo: '', balanceImage: '', headerBanner: '', headerImage: '', iconTheme: 'padrao', secretAdventure: false, secretLogo: false, alarmSound: false },
  };
}

@Injectable({ providedIn: 'root' })
export class BloomStateService {
  private auth = inject(AuthService);
  private repo = inject(BloomRepository);

  readonly money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  readonly monthLabel = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date());

  // ----- layout -----
  menuOpen = signal(false);
  dialogOpen = signal(false);
  editingExpense = signal<Expense | null>(null);

  openMenu(): void {
    this.menuOpen.set(true);
  }
  closeMenu(): void {
    this.menuOpen.set(false);
  }
  openDialog(expense: Expense | null = null): void {
    this.editingExpense.set(expense);
    this.dialogOpen.set(true);
  }
  closeDialog(): void {
    this.dialogOpen.set(false);
    this.editingExpense.set(null);
  }

  // ----- dados do usuário -----
  private loadedFor = signal<string | null>(null);
  salary = signal(0);
  savingsGoal = signal(0);
  fixedExpenses = signal<FixedExpense[]>([]);
  expenses = signal<Expense[]>([]);
  installments = signal<Installment[]>([]);
  debts = signal<Debt[]>([]);
  dreams = signal<Dream[]>([]);
  reminders = signal<Reminder[]>([]);
  emergencyMode = signal(false);
  preferences = signal<Preferences>(emptyData().preferences);

  private snapshot = computed<BloomData>(() => ({
    salary: this.salary(),
    savingsGoal: this.savingsGoal(),
    fixedExpenses: this.fixedExpenses(),
    expenses: this.expenses(),
    installments: this.installments(),
    debts: this.debts(),
    dreams: this.dreams(),
    reminders: this.reminders(),
    emergencyMode: this.emergencyMode(),
    preferences: this.preferences(),
  }));

  constructor() {
    // Carrega os dados sempre que o usuário logado muda.
    effect(() => {
      const user = this.auth.user();
      untracked(() => {
        this.loadedFor.set(null);
        if (!user) {
          this.apply(emptyData());
          return;
        }
        this.repo.load(user.email).then(
          (data) => {
            if (this.auth.user()?.email !== user.email) return;
            this.apply(data ?? emptyData(user.name));
            this.loadedFor.set(user.email);
          },
          // loadedFor continua vazio: nada é salvo, para não sobrescrever os dados com uma conta em branco.
          () => alert('Não foi possível carregar seus dados. Verifique se o back-end está funcionando e recarregue a página.'),
        );
      });
    });

    // Salva a cada alteração (só depois de carregar, para não sobrescrever com dados vazios).
    effect(() => {
      const data = this.snapshot();
      const email = this.loadedFor();
      if (!email) return;
      this.repo.save(email, data).then((error) => {
        if (error) alert(`Não foi possível salvar: ${error}`);
      });
    });

    // Aplica tema e nome do app na página.
    effect(() => {
      const prefs = this.preferences();
      applyTheme(prefs);
      document.title = prefs.appName || 'Bloom';
    });
  }

  private apply(data: BloomData): void {
    const base = emptyData();
    this.salary.set(data.salary ?? 0);
    this.savingsGoal.set(data.savingsGoal ?? 0);
    this.fixedExpenses.set(data.fixedExpenses ?? []);
    this.expenses.set(data.expenses ?? []);
    this.installments.set(data.installments ?? []);
    this.debts.set(data.debts ?? []);
    this.dreams.set(data.dreams ?? []);
    this.reminders.set(data.reminders ?? []);
    this.emergencyMode.set(data.emergencyMode ?? false);
    const prefs = { ...base.preferences, ...data.preferences };
    // contas antigas tinham "dark" como cor; agora o escuro é um modo separado
    if (prefs.theme === 'dark') Object.assign(prefs, { theme: 'rosa', mode: 'escuro' });
    this.preferences.set(prefs);
  }

  // ----- painel de finanças -----
  private monthKey = todayIso().slice(0, 7);

  monthExpenses = computed(() => this.expenses().filter((e) => e.date.startsWith(this.monthKey)));
  fixedTotal = computed(() => sum(this.fixedExpenses().map((f) => f.amount)));
  variableTotal = computed(() => sum(this.monthExpenses().map((e) => e.amount)));
  installmentsTotalMonthly = computed(() =>
    sum(this.installments().map((i) => this.installmentCostThisMonth(i))),
  );
  debtsMonthlyTotal = computed(() =>
    sum(this.debts().map((d) => this.debtCostThisMonth(d))),
  );
  /** Gastos que se repetem todo mês: fixos + parcelas + dívidas. */
  committedTotal = computed(() => this.fixedTotal() + this.installmentsTotalMonthly() + this.debtsMonthlyTotal());
  totalSpent = computed(() => this.committedTotal() + this.variableTotal());
  available = computed(() => this.salary() - this.totalSpent());
  saved = computed(() => Math.max(0, this.available()));
  goalProgress = computed(() =>
    this.savingsGoal() > 0 ? Math.min(100, Math.round((this.saved() / this.savingsGoal()) * 100)) : 0,
  );
  freePercent = computed(() => (this.salary() > 0 ? Math.round((this.available() / this.salary()) * 100) : 0));
  overBudget = computed(() => this.salary() > 0 && this.totalSpent() > this.salary());
  recentExpenses = computed(() => this.sortedExpenses().slice(0, 4));
  sortedExpenses = computed(() =>
    [...this.expenses()].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id),
  );

  /**
   * O que a parcela pesa neste mês: uma parcela enquanto não acabar, ou mais se adiantou pagamentos.
   * A parcela quitada neste mês continua contando até o mês virar.
   */
  private installmentCostThisMonth(i: Installment): number {
    const paid = i.lastPaidMonth === this.monthKey ? (i.paidInLastMonth ?? 0) : 0;
    const count = i.paidCount < i.totalCount ? Math.max(1, paid) : paid;
    return i.installmentAmount * count;
  }

  /** Mesma ideia da parcela: o pagamento mensal, ou o que já foi pago neste mês se for mais. */
  private debtCostThisMonth(d: Debt): number {
    const paid = d.lastPaidMonth === this.monthKey ? (d.paidInLastMonth ?? 0) : 0;
    return d.paidAmount < d.totalAmount ? Math.max(d.monthlyPayment, paid) : paid;
  }

  percentOfSalary(value: number): number {
    return this.salary() > 0 ? Math.round((value / this.salary()) * 100) : 0;
  }

  setSalary(value: number): void {
    this.salary.set(value);
  }
  setSavingsGoal(value: number): void {
    this.savingsGoal.set(value);
  }

  addFixedExpense(name: string, amount: number): void {
    this.fixedExpenses.update((list) => [...list, { id: Date.now(), name, amount }]);
  }
  removeFixedExpense(id: number): void {
    this.fixedExpenses.update((list) => list.filter((f) => f.id !== id));
  }

  // ----- histórico de gastos (CRUD) -----
  addExpense(description: string, amount: number, category: string, date = todayIso()): void {
    this.expenses.update((list) => [{ id: Date.now(), description, category, amount, date }, ...list]);
  }
  updateExpense(expense: Expense): void {
    this.expenses.update((list) => list.map((e) => (e.id === expense.id ? expense : e)));
  }
  removeExpense(id: number): void {
    this.expenses.update((list) => list.filter((e) => e.id !== id));
  }

  // ----- parcelas -----
  addInstallment(description: string, installmentAmount: number, totalCount: number, dueDay: number | null = null): void {
    this.installments.update((list) => [
      ...list,
      { id: Date.now(), description, installmentAmount, totalCount, paidCount: 0, dueDay },
    ]);
  }
  setInstallmentDueDay(id: number, dueDay: number | null): void {
    this.installments.update((list) => list.map((i) => (i.id === id ? { ...i, dueDay } : i)));
  }
  setInstallmentColor(id: number, color: string | null): void {
    this.installments.update((list) => list.map((i) => (i.id === id ? { ...i, color } : i)));
  }

  /** Parcelas que vencem no mês informado (month de 0 a 11), contando só as que ainda faltam pagar. */
  installmentsDueIn(year: number, month: number): { day: number; description: string; amount: number; color: string | null }[] {
    const [currentYear, currentMonth] = this.monthKey.split('-').map(Number);
    const offset = (year - currentYear) * 12 + (month - (currentMonth - 1));
    const lastDay = new Date(year, month + 1, 0).getDate();
    return this.installments()
      .filter((i) => {
        if (!i.dueDay) return false;
        const first = i.lastPaidMonth === this.monthKey ? 1 : 0;
        return offset >= first && offset < first + (i.totalCount - i.paidCount);
      })
      .map((i) => ({
        day: Math.min(i.dueDay!, lastDay),
        description: i.description,
        amount: i.installmentAmount,
        color: i.color ?? null,
      }));
  }
  payInstallment(id: number): void {
    this.installments.update((list) =>
      list.map((i) => {
        if (i.id !== id || i.paidCount >= i.totalCount) return i;
        const before = i.lastPaidMonth === this.monthKey ? (i.paidInLastMonth ?? 0) : 0;
        return { ...i, paidCount: i.paidCount + 1, lastPaidMonth: this.monthKey, paidInLastMonth: before + 1 };
      }),
    );
  }
  removeInstallment(id: number): void {
    this.installments.update((list) => list.filter((i) => i.id !== id));
  }

  // ----- dívidas -----
  debtsTotalRemaining = computed(() => sum(this.debts().map((d) => Math.max(0, d.totalAmount - d.paidAmount))));

  /** Ranking simples: maior juros primeiro (método avalanche); empate → menor saldo. */
  debtRanking = computed(() =>
    this.debts()
      .filter((d) => d.paidAmount < d.totalAmount)
      .sort(
        (a, b) =>
          b.interestRate - a.interestRate || a.totalAmount - a.paidAmount - (b.totalAmount - b.paidAmount),
      ),
  );

  addDebt(debt: Omit<Debt, 'id' | 'paidAmount'>): void {
    this.debts.update((list) => [...list, { ...debt, id: Date.now(), paidAmount: 0 }]);
  }
  payDebt(id: number, amount: number): void {
    this.debts.update((list) =>
      list.map((d) => {
        if (d.id !== id) return d;
        const paidNow = Math.min(amount, d.totalAmount - d.paidAmount);
        if (paidNow <= 0) return d;
        const before = d.lastPaidMonth === this.monthKey ? (d.paidInLastMonth ?? 0) : 0;
        return { ...d, paidAmount: d.paidAmount + paidNow, lastPaidMonth: this.monthKey, paidInLastMonth: before + paidNow };
      }),
    );
  }
  removeDebt(id: number): void {
    this.debts.update((list) => list.filter((d) => d.id !== id));
  }

  // ----- sonhos -----
  addDream(name: string, targetAmount: number, targetDate: string): void {
    this.dreams.update((list) => [
      ...list,
      { id: Date.now(), name, icon: 'sparkles', targetAmount, savedAmount: 0, targetDate: targetDate || 'A definir' },
    ]);
  }
  depositDream(id: number, amount: number): void {
    this.dreams.update((list) =>
      list.map((d) => (d.id === id ? { ...d, savedAmount: Math.max(0, d.savedAmount + amount) } : d)),
    );
  }
  setDreamImage(id: number, image: string | null): void {
    this.dreams.update((list) => list.map((d) => (d.id === id ? { ...d, image } : d)));
  }
  removeDream(id: number): void {
    this.dreams.update((list) => list.filter((d) => d.id !== id));
  }

  // ----- lembretes -----
  pendingReminders = computed(() => this.reminders().filter((r) => !r.paid));
  /** Contas não pagas, da mais próxima para a mais distante a partir de hoje. */
  upcomingReminders = computed(() => {
    const today = new Date().getDate();
    const distance = (day: number) => (day - today + 31) % 31;
    return [...this.pendingReminders()].sort((a, b) => distance(a.dueDay) - distance(b.dueDay));
  });

  daysUntil(dueDay: number): number {
    const now = new Date();
    let due = new Date(now.getFullYear(), now.getMonth(), dueDay);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (due < today) due = new Date(now.getFullYear(), now.getMonth() + 1, dueDay);
    return Math.round((due.getTime() - today.getTime()) / 86_400_000);
  }

  addReminder(name: string, amount: number, dueDay: number, category: string): void {
    this.reminders.update((list) => [...list, { id: Date.now(), name, amount, dueDay, category, paid: false }]);
  }
  toggleReminder(id: number): void {
    this.reminders.update((list) => list.map((r) => (r.id === id ? { ...r, paid: !r.paid } : r)));
  }
  removeReminder(id: number): void {
    this.reminders.update((list) => list.filter((r) => r.id !== id));
  }

  // ----- modo emergência -----
  emergencyFundMin = computed(() => this.salary() * 3);
  emergencyFundIdeal = computed(() => this.salary() * 6);

  /** Plano de sobrevivência: o que cortar, reduzir e manter. */
  emergencyPlan = computed(() => {
    const cut: PlanItem[] = [];
    const reduce: PlanItem[] = [];
    const keep: PlanItem[] = [];
    const byCategory = new Map<string, number>();
    for (const e of this.monthExpenses()) byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + e.amount);
    for (const [category, amount] of byCategory) {
      if (CUTTABLE.includes(category)) cut.push({ name: category, amount, note: 'Gasto avulso que pode esperar' });
      else reduce.push({ name: category, amount, note: 'Essencial, mas dá para gastar menos' });
    }
    for (const f of this.fixedExpenses()) keep.push({ name: f.name, amount: f.amount, note: 'Conta fixa' });
    for (const d of this.debtRanking()) keep.push({ name: d.creditor, amount: d.monthlyPayment, note: 'Evita juros e multa' });
    for (const i of this.installments().filter((i) => i.paidCount < i.totalCount))
      keep.push({ name: i.description, amount: i.installmentAmount, note: 'Parcela em andamento' });
    return { cut, reduce, keep };
  });

  setEmergencyMode(on: boolean): void {
    this.emergencyMode.set(on);
  }

  // ----- personalização -----
  updatePreferences(prefs: Partial<Preferences>): void {
    this.preferences.update((p) => ({ ...p, ...prefs }));
  }

  /**
   * Chamado ao sair da conta: esconde de novo os segredos (tema "Aventura" e logo secreto);
   * é preciso fazer os 20 cliques outra vez. Salva na hora, antes do logout.
   */
  lockSecrets(): void {
    const p = this.preferences();
    this.preferences.set({ ...p, secretAdventure: false, secretLogo: false, iconTheme: p.iconTheme === 'aventura' ? 'padrao' : p.iconTheme });
    const email = this.loadedFor();
    if (email) this.repo.save(email, this.snapshot());
  }

  /** Preenche a conta com dados fictícios para apresentação. */
  loadSampleData(): void {
    const now = new Date();
    const today = now.getDate();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const monthPrefix = this.monthKey;
    /** Data deste mês, n dias atrás (sem sair do mês). */
    const daysAgo = (n: number) => `${monthPrefix}-${String(Math.max(1, today - n)).padStart(2, '0')}`;
    /** Dia do mês daqui a n dias (volta ao começo se passar do fim do mês). */
    const dayIn = (n: number) => ((today - 1 + n) % lastDay) + 1;
    /** Parcela que vence daqui a n dias; se o dia já passou neste mês, a deste mês fica como paga. */
    const dueIn = (n: number) =>
      today + n > lastDay ? { dueDay: dayIn(n), lastPaidMonth: monthPrefix, paidInLastMonth: 1 } : { dueDay: dayIn(n) };

    this.salary.set(2600);
    this.savingsGoal.set(350);
    this.fixedExpenses.set([
      { id: 1, name: 'Aluguel', amount: 780 },
      { id: 2, name: 'Energia', amount: 118.6 },
      { id: 3, name: 'Internet', amount: 89.9 },
    ]);
    this.expenses.set([
      { id: 1, description: 'Mercado do bairro', category: 'Alimentação', amount: 86.4, date: todayIso() },
      { id: 2, description: 'Recarga transporte', category: 'Transporte', amount: 40, date: daysAgo(1) },
      { id: 3, description: 'Streaming', category: 'Assinaturas', amount: 21.9, date: daysAgo(2) },
      { id: 4, description: 'Farmácia', category: 'Saúde', amount: 34.5, date: daysAgo(4) },
      { id: 5, description: 'Cinema', category: 'Lazer', amount: 52, date: daysAgo(6) },
    ]);
    // Parcelas com dia de pagamento e cor, para aparecerem no calendário do menu.
    this.installments.set([
      { id: 1, description: 'Notebook', installmentAmount: 189.9, paidCount: 4, totalCount: 10, color: '#7c5cff', ...dueIn(3) },
      { id: 2, description: 'Celular', installmentAmount: 120, paidCount: 2, totalCount: 12, color: '#22a06b', ...dueIn(8) },
      { id: 3, description: 'Curso de inglês', installmentAmount: 95, paidCount: 4, totalCount: 6, color: '#f59e0b', ...dueIn(15) },
    ]);
    this.debts.set([
      { id: 1, creditor: 'Cartão de crédito', totalAmount: 1450, paidAmount: 620, interestRate: 8.9, monthlyPayment: 240, dueDay: 3 },
      { id: 2, creditor: 'Empréstimo pessoal', totalAmount: 2800, paidAmount: 900, interestRate: 3.2, monthlyPayment: 310, dueDay: 15 },
    ]);
    this.dreams.set([
      { id: 1, name: 'Viagem para o litoral', icon: 'sparkles', targetAmount: 1500, savedAmount: 620, targetDate: 'Jan 2027' },
      { id: 2, name: 'Fundo de emergência', icon: 'flag', targetAmount: 2000, savedAmount: 300, targetDate: 'Dez 2027' },
    ]);
    // Dois lembretes vencem em até 7 dias (aba Importante) e dois depois (aba Pagamentos futuros).
    this.reminders.set([
      { id: 1, name: 'Água', amount: 64.3, dueDay: dayIn(2), category: 'Moradia', paid: false },
      { id: 2, name: 'Cartão de crédito', amount: 240, dueDay: dayIn(5), category: 'Dívida', paid: false },
      { id: 3, name: 'Internet', amount: 89.9, dueDay: dayIn(14), category: 'Assinaturas', paid: false },
      { id: 4, name: 'Energia', amount: 118.6, dueDay: dayIn(22), category: 'Moradia', paid: false },
      { id: 5, name: 'Academia', amount: 99.9, dueDay: dayIn(10), category: 'Saúde', paid: true },
    ]);
    this.emergencyMode.set(false);
  }

  // ----- conselho -----
  tips = computed<Tip[]>(() => {
    const list: Tip[] = [];
    if (this.salary() <= 0) {
      return [
        {
          id: 0,
          title: 'Comece informando seu salário',
          body: 'Com o salário e as despesas fixas o Bloom consegue calcular quanto sobra livre no mês.',
          icon: 'wallet',
          tone: 'primary',
        },
      ];
    }
    if (this.overBudget()) {
      list.push({
        id: 1,
        title: 'Os gastos passaram do salário',
        body: 'Este mês você gastou mais do que ganha. Vale ativar o Modo Emergência para ver o que cortar.',
        icon: 'alertTriangle',
        tone: 'secondary',
      });
    } else if (this.savingsGoal() > 0 && this.saved() < this.savingsGoal()) {
      list.push({
        id: 1,
        title: 'Seu saldo livre está abaixo da meta',
        body: 'Os gastos deste mês já comprometeram parte da meta de economia. Reveja categorias como lazer e assinaturas.',
        icon: 'alertTriangle',
        tone: 'secondary',
      });
    } else {
      list.push({
        id: 1,
        title: 'Você está dentro da meta do mês',
        body: 'Seu saldo livre ainda cobre a meta de economia. Bom momento para adiantar uma parcela ou reforçar um sonho.',
        icon: 'trendUp',
        tone: 'positive',
      });
    }
    if (this.debtsMonthlyTotal() > this.salary() * 0.3) {
      list.push({
        id: 2,
        title: 'Comprometimento alto com dívidas',
        body: 'O total mensal das suas dívidas passa de 30% da renda. Priorize a de maior juros para reduzir o custo total.',
        icon: 'trendDown',
        tone: 'secondary',
      });
    }
    list.push(
      {
        id: 3,
        title: 'Regra 50-30-20',
        body: 'Uma referência simples: 50% da renda para o essencial, 30% para desejos e 20% para guardar ou quitar dívidas.',
        icon: 'percent',
        tone: 'primary',
      },
      {
        id: 4,
        title: 'Pague-se primeiro',
        body: 'Assim que o salário cair, separe a meta de poupança antes de começar a gastar.',
        icon: 'target',
        tone: 'primary',
      },
    );
    return list;
  });

  formatMoney(value: number): string {
    return this.money.format(value);
  }
}

function sum(values: number[]): number {
  return values.reduce((s, v) => s + v, 0);
}

/** Converte "1.234,56" ou "1234.56" em número. Devolve NaN se inválido. */
export function parseMoney(raw: unknown): number {
  const text = String(raw ?? '').trim();
  if (!text) return NaN;
  const normalized = text.includes(',') ? text.replace(/\./g, '').replace(',', '.') : text;
  return Number(normalized);
}
