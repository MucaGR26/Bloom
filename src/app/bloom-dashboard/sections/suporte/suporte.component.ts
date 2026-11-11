import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../icon/icon.component';

const WHATSAPP_NUMBER = '5511948879114';
const WHATSAPP_MESSAGE = 'Olá! Preciso de ajuda com o Bloom.';

@Component({
  selector: 'app-suporte',
  standalone: true,
  imports: [RouterLink, IconComponent],
  templateUrl: './suporte.component.html',
})
export class SuporteComponent {
  readonly whatsappLink = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;

  readonly FAQ = [
    {
      question: 'Como registro um gasto?',
      answer: 'Clique em "Novo gasto", no topo da tela, e informe descrição, valor, data e categoria. Para editar ou excluir, use o lápis e a lixeira no Histórico.',
    },
    {
      question: 'Como o "Livre para usar" é calculado?',
      answer: 'É o salário menos as despesas fixas, as parcelas, as dívidas e os gastos avulsos do mês.',
    },
    {
      question: 'Paguei uma parcela e o valor livre não mudou. Por quê?',
      answer: 'A parcela do mês já estava descontada do seu saldo. O valor só diminui se você adiantar mais parcelas no mesmo mês.',
    },
    {
      question: 'Como faço uma parcela aparecer no calendário?',
      answer: 'Em Parcelas, preencha "Dia do pagamento" ao registrar a compra ou "Paga no dia" no cartão da parcela. Ali você também escolhe a cor dela no calendário.',
    },
    {
      question: 'O que é o Modo Emergência?',
      answer: 'É um plano que separa seus gastos em cortar, reduzir e manter. Quando os gastos passam do salário, a aba Emergência pisca em vermelho até você ativar o modo.',
    },
    {
      question: 'Como ligo ou desligo a sirene?',
      answer: 'Em "Temas e preferências", na opção "Som da sirene". Ela vem desligada.',
    },
    {
      question: 'Como mudo minha foto, as cores ou o nome do app?',
      answer: 'Tudo isso fica em "Temas e preferências", no fim do menu.',
    },
    {
      question: 'Esqueci minha senha. E agora?',
      answer: 'Na tela de login, clique em "Esqueceu sua senha?" e informe seu e-mail. Enviamos um código de 6 dígitos, válido por 15 minutos, para você criar uma nova senha.',
    },
    {
      question: 'As notícias da aba Lembretes são reais?',
      answer: 'Não. Elas são fictícias e servem só para demonstração. Não use essas informações para decidir investimentos.',
    },
  ];
}
