import { Component } from '@angular/core';

/**
 * Desenho do Bloom animado (camadas em public/logo-anim, todas do mesmo tamanho e empilhadas):
 * só o cifrão se mexe — brilha e "vem para frente". O resto fica parado.
 */
@Component({
  selector: 'app-animated-logo',
  standalone: true,
  template: `
    <div class="stage">
      <img src="logo-anim/dinheiro.png" alt="" class="layer">
      <img src="logo-anim/b.png" alt="" class="layer">
      <div class="layer dollar">
        <img src="logo-anim/cifrao.png" alt="" class="layer">
        <span class="layer shine"></span>
      </div>
      <img src="logo-anim/flor-cima.png" alt="" class="layer flower">
      <img src="logo-anim/flor-baixo.png" alt="" class="layer flower">
    </div>
  `,
  styles: `
    :host {
      display: block;
      --outline: rgb(243 77 126);
    }

    .stage {
      position: relative;
      width: 100%;
      aspect-ratio: 763 / 640;
    }

    .layer {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
    }

    /* contorno rosa, para as peças continuarem separadas quando se mexem por cima do B */
    .dollar,
    .flower {
      filter: drop-shadow(4px 0 0 var(--outline)) drop-shadow(-4px 0 0 var(--outline))
        drop-shadow(0 4px 0 var(--outline)) drop-shadow(0 -4px 0 var(--outline));
    }

    .dollar {
      transform-origin: 50% 46.8%;
      animation: pop 3.2s ease-in-out infinite;
    }

    /* faixa de brilho que passa por dentro do cifrão (recortada no formato dele) */
    .shine {
      background: linear-gradient(115deg, transparent 42%, rgb(255 255 255 / 0.95) 50%, transparent 58%) no-repeat;
      background-size: 250% 100%;
      -webkit-mask: url('/logo-anim/cifrao.png') center / 100% 100% no-repeat;
      mask: url('/logo-anim/cifrao.png') center / 100% 100% no-repeat;
      animation: shine 3.2s ease-in-out infinite;
    }

    @keyframes pop {
      0%, 55%, 100% { transform: scale(1); }
      70% { transform: scale(1.14); }
      85% { transform: scale(1.02); }
    }

    @keyframes shine {
      0%, 45% { background-position: 130% 0; }
      75%, 100% { background-position: -30% 0; }
    }
  `,
})
export class AnimatedLogoComponent {}
