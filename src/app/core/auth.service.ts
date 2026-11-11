
import { Injectable, computed, signal } from '@angular/core';

export interface User {
  name: string;
  email: string;
}

interface AuthResponse {
  token: string;
  user: User;
}

const API_URL = 'http://localhost:3000/api';
const USER_KEY = 'bloom:api:user';
const TOKEN_KEY = 'bloom:api:token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly user = signal<User | null>(this.restoreSession());
  readonly isLoggedIn = computed(() => this.user() !== null);

  async register(
    name: string,
    email: string,
    password: string
  ): Promise<string | null> {
    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password
        })
      });

      const result = await response.json();

      if (!response.ok) {
        return result.message || 'Não foi possível criar a conta.';
      }

      this.startSession(result, true);
      return null;
    } catch {
      return 'Não foi possível conectar ao servidor. Verifique se o back-end está funcionando.';
    }
  }

  async login(
    email: string,
    password: string,
    remember = true
  ): Promise<string | null> {
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password
        })
      });

      const result = await response.json();

      if (!response.ok) {
        return result.message || 'E-mail ou senha incorretos.';
      }

      this.startSession(result, remember);
      return null;
    } catch {
      return 'Não foi possível conectar ao servidor. Verifique se o back-end está funcionando.';
    }
  }

  /** Pede o código de recuperação. Devolve null se deu certo ou a mensagem de erro. */
  async requestPasswordReset(email: string): Promise<string | null> {
    try {
      const response = await fetch(`${API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() })
      });

      if (response.ok) {
        return null;
      }

      const result = await response.json();
      return result.message || 'Não foi possível enviar o código.';
    } catch {
      return 'Não foi possível conectar ao servidor. Verifique se o back-end está funcionando.';
    }
  }

  /** Troca a senha usando o código e já entra na conta. */
  async resetPassword(email: string, code: string, password: string): Promise<string | null> {
    try {
      const response = await fetch(`${API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), code: code.trim(), password })
      });

      const result = await response.json();

      if (!response.ok) {
        return result.message || 'Não foi possível trocar a senha.';
      }

      this.startSession(result, true);
      return null;
    } catch {
      return 'Não foi possível conectar ao servidor. Verifique se o back-end está funcionando.';
    }
  }

  logout(): void {
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    this.user.set(null);
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY)
      || sessionStorage.getItem(TOKEN_KEY);
  }

  private startSession(
    result: AuthResponse,
    remember = true
  ): void {
    this.logout();

    const storage = remember ? localStorage : sessionStorage;

    storage.setItem(USER_KEY, JSON.stringify(result.user));
    storage.setItem(TOKEN_KEY, result.token);
    this.user.set(result.user);
  }

  private restoreSession(): User | null {
    for (const storage of [localStorage, sessionStorage]) {
      try {
        const rawUser = storage.getItem(USER_KEY);
        const token = storage.getItem(TOKEN_KEY);

        if (rawUser && token) {
          const user = JSON.parse(rawUser) as User;

          if (user.name && user.email) {
            return user;
          }
        }
      } catch {
        storage.removeItem(USER_KEY);
        storage.removeItem(TOKEN_KEY);
      }
    }

    return null;
  }
}
