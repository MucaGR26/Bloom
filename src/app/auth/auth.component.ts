import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { IconComponent } from '../bloom-dashboard/icon/icon.component';
import { AnimatedLogoComponent } from './animated-logo.component';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [RouterLink, IconComponent, AnimatedLogoComponent],
  templateUrl: './auth.component.html',
  styleUrl: './auth.component.css',
})
export class AuthComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  readonly mode: 'login' | 'register' | 'recover' = inject(ActivatedRoute).snapshot.data['mode'];
  readonly title = { login: 'Login', register: 'Criar conta', recover: 'Recuperar senha' }[this.mode];
  readonly year = new Date().getFullYear();
  error = signal('');
  info = signal('');
  busy = signal(false);
  /** Recuperação de senha: depois de pedir o código, guarda o e-mail e mostra o segundo passo. */
  recoverEmail = signal('');

  async sendRecoveryCode(email: string): Promise<void> {
    this.error.set('');
    this.info.set('');
    this.busy.set(true);
    const err = await this.auth.requestPasswordReset(email);
    this.busy.set(false);
    if (err) return this.error.set(err);
    this.recoverEmail.set(email);
    this.info.set('Se o e-mail tiver conta no Bloom, enviamos um código de 6 dígitos. Ele vale por 15 minutos.');
  }

  useAnotherEmail(): void {
    this.recoverEmail.set('');
    this.error.set('');
    this.info.set('');
  }

  private async submitRecover(fd: FormData): Promise<void> {
    if (!this.recoverEmail()) {
      const email = String(fd.get('email') ?? '').trim();
      if (!/^\S+@\S+\.\S+$/.test(email)) return this.error.set('Informe um e-mail válido.');
      return this.sendRecoveryCode(email);
    }
    const code = String(fd.get('code') ?? '').trim();
    const password = String(fd.get('password') ?? '');
    if (!/^\d{6}$/.test(code)) return this.error.set('Informe o código de 6 dígitos.');
    if (password.length < 6) return this.error.set('A senha precisa ter pelo menos 6 caracteres.');
    if (password !== String(fd.get('confirm') ?? '')) return this.error.set('As senhas não são iguais.');

    this.error.set('');
    this.busy.set(true);
    const err = await this.auth.resetPassword(this.recoverEmail(), code, password);
    this.busy.set(false);
    if (err) return this.error.set(err);
    this.router.navigateByUrl('/');
  }

  async submit(form: HTMLFormElement): Promise<void> {
    this.info.set('');
    const fd = new FormData(form);
    if (this.mode === 'recover') return this.submitRecover(fd);
    const name = String(fd.get('name') ?? '').trim();
    const email = String(fd.get('email') ?? '').trim();
    const password = String(fd.get('password') ?? '');
    const remember = fd.get('remember') !== null;

    if (this.mode === 'register' && !name) return this.error.set('Informe seu nome.');
    if (!/^\S+@\S+\.\S+$/.test(email)) return this.error.set('Informe um e-mail válido.');
    if (password.length < 6) return this.error.set('A senha precisa ter pelo menos 6 caracteres.');

    this.busy.set(true);
    const err =
      this.mode === 'register' ? await this.auth.register(name, email, password) : await this.auth.login(email, password, remember);
    this.busy.set(false);
    if (err) return this.error.set(err);
    this.router.navigateByUrl('/');
  }
}
