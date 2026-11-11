import { Component, inject, signal } from '@angular/core';
import { IconComponent } from '../../icon/icon.component';
import { BloomStateService } from '../../state/bloom-state.service';
import { answerQuestion } from './advisor';

interface Message {
  from: 'user' | 'bloom';
  text: string;
}

@Component({
  selector: 'app-conselho',
  standalone: true,
  imports: [IconComponent],
  templateUrl: './conselho.component.html',
})
export class ConselhoComponent {
  state = inject(BloomStateService);
  messages = signal<Message[]>([]);

  readonly SUGGESTIONS = [
    'O que posso perguntar?',
    'Como está meu mês?',
    'Quanto posso gastar por dia?',
    'Quanto gastei com comida?',
    'Como sair do vermelho?',
    'Posso comprar algo de R$ 300?',
    'Qual dívida pago primeiro?',
    'O que vence essa semana?',
    'Quando realizo meu sonho?',
    'O que é Selic?',
  ];

  /**
   * As respostas vêm de regras locais (advisor.ts), usando os dados do usuário.
   * Não há IA: para uma pergunta nova, adicione uma regra lá.
   */
  ask(input: HTMLInputElement | string): void {
    const question = (typeof input === 'string' ? input : input.value).trim();
    if (!question) return;
    if (typeof input !== 'string') input.value = '';
    this.messages.update((list) => [
      ...list,
      { from: 'user', text: question },
      { from: 'bloom', text: answerQuestion(question, this.state) },
    ]);
  }
}
