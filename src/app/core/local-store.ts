// Acesso ao localStorage protegido contra erros (modo privado, armazenamento bloqueado etc.).
export const localStore = {
  get<T>(key: string): T | null {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  },
  /** Devolve false se não conseguiu gravar (armazenamento cheio ou bloqueado). */
  set(key: string, value: unknown): boolean {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  },
  remove(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch {
      // ignora
    }
  },
};
