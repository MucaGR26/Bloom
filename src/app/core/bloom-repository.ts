
import { Injectable } from '@angular/core';
import { BloomData } from '../bloom-dashboard/models/expense.model';
import { AuthService } from './auth.service';

const API_URL = 'http://localhost:3000/api';

@Injectable({ providedIn: 'root' })
export class BloomRepository {
  constructor(private authService: AuthService) {}

  /**
   * Devolve null quando a conta ainda não tem dados.
   * Falha lança erro: o app não pode tratar "servidor fora do ar" como conta vazia.
   */
  async load(userEmail: string): Promise<BloomData | null> {
    const token = this.authService.getToken();

    if (!token || this.authService.user()?.email !== userEmail) {
      return null;
    }

    const response = await fetch(`${API_URL}/data`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (response.status === 401) {
      this.authService.logout();
      return null;
    }

    if (!response.ok) {
      throw new Error(`Falha ao carregar os dados (${response.status}).`);
    }

    return await response.json() as BloomData | null;
  }

  /** Devolve null se salvou, ou a mensagem de erro para mostrar ao usuário. */
  async save(userEmail: string, data: BloomData): Promise<string | null> {
    const token = this.authService.getToken();

    if (!token || this.authService.user()?.email !== userEmail) {
      return 'Sua sessão expirou. Entre novamente.';
    }

    try {
      const response = await fetch(`${API_URL}/data`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });

      if (response.ok) {
        return null;
      }

      const result = await response.json().catch(() => null);
      return result?.message || 'Não foi possível salvar os dados.';
    } catch {
      return 'Não foi possível conectar ao servidor. Verifique se o back-end está funcionando.';
    }
  }
}
