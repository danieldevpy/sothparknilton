// Atraso de interpolação adaptativo. Pela internet as mensagens não chegam em
// intervalos certinhos (jitter): com atraso fixo pequeno o buffer esvazia e o boneco
// "trava e pula". Aqui medimos a irregularidade das chegadas e aumentamos o atraso
// só o necessário (sobe rápido quando a rede piora, desce devagar quando melhora).

export class AdaptiveDelay {
  /**
   * @param interval intervalo esperado entre mensagens (ms)
   * @param min      atraso mínimo (rede boa / localhost)
   * @param max      atraso máximo (rede muito ruim)
   */
  constructor({ interval, min, max }) {
    this.interval = interval;
    this.min = min;
    this.max = max;
    this.jitter = 0;
    this.last = 0;
    this.value = min;
  }

  arrive(now) {
    if (this.last) {
      // aba em segundo plano/pausas longas não contam como jitter
      const dev = Math.min(250, Math.abs(now - this.last - this.interval));
      this.jitter += (dev - this.jitter) * (dev > this.jitter ? 0.2 : 0.02);
    }
    this.last = now;
    const target = Math.max(this.min, Math.min(this.max, this.interval * 1.5 + this.jitter * 2.5));
    this.value += (target - this.value) * 0.15;
  }

  get() {
    return this.value;
  }

  reset() {
    this.last = 0;
  }
}
