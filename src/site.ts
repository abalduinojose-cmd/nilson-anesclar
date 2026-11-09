/*
 * Nilson Anesclar · motor de animação do site
 * Escrito em TypeScript e compilado para js/site.js:
 *   npx -p typescript tsc src/site.ts --target ES2020 --lib ES2020,DOM,DOM.Iterable --strict --noUnusedLocals --outDir js
 *
 * Doutrina (skill movimento-premium): entrada em "out", saída em "in", cascatas com vãos que
 * encolhem ×0,84, nada começa em t = 0, estado contínuo como função pura do tempo e laços que
 * param fora da tela. Com "reduzir movimento" ligado a coreografia roda contida (amplitude × 0,5).
 */

type Curva = 'expo' | 'p4' | 'p3' | 'mola' | 'in3' | 'linear';

const CURVA: Record<Curva, string> = {
  expo: 'cubic-bezier(.16,1,.3,1)',
  p4: 'cubic-bezier(.22,1,.36,1)',
  p3: 'cubic-bezier(.215,.61,.355,1)',
  mola: 'cubic-bezier(.34,1.42,.64,1)',
  in3: 'cubic-bezier(.55,.055,.675,.19)',
  linear: 'linear',
};

/** Um vídeo que pode abrir no player em tela cheia. */
interface Video {
  id: string;
  video: string;
  poster: string;
  logo: string;
  ico: string;
  marca: string;
  nicho: string;
  post: string;
  gancho: string;
  views: string;
  top: string;
}

interface OpcoesAnima {
  duracao: number;
  atraso?: number;
  curva?: Curva;
}

const d = document;
const html = d.documentElement;
(window as unknown as { __ok: boolean }).__ok = true;

const contido = html.classList.contains('rm');
const K = contido ? 0.5 : 1;
const desk = matchMedia('(min-width:1000px)');

/* ---------------------------------------------------------------- utilidades */

function $<T extends Element = HTMLElement>(sel: string, raiz: ParentNode = d): T {
  const el = raiz.querySelector<T>(sel);
  if (!el) throw new Error('Elemento não encontrado: ' + sel);
  return el;
}
function $$<T extends Element = HTMLElement>(sel: string, raiz: ParentNode = d): T[] {
  return Array.from(raiz.querySelectorAll<T>(sel));
}
function talvez<T extends Element = HTMLElement>(sel: string): T | null {
  return d.querySelector<T>(sel);
}
function anima(el: Element, quadros: Keyframe[], o: OpcoesAnima): Animation {
  return el.animate(quadros, { duration: o.duracao, delay: o.atraso ?? 0, easing: CURVA[o.curva ?? 'p4'], fill: 'both' });
}
/** Chegada com opacidade binária: invisível até o instante da entrada, depois só o movimento. */
function chega(de: string, para: string): Keyframe[] {
  return [{ opacity: 0, transform: de }, { opacity: 1, transform: de, offset: 0.001 }, { opacity: 1, transform: para }];
}
/** Cascata: cada item começa antes do anterior assentar; os vãos encolhem. */
function cascata<T extends Element>(els: T[], inicio: number, vao: number, fn: (el: T, atraso: number, i: number) => void, fator = 0.84): void {
  let t = inicio;
  let v = vao;
  els.forEach((el, i) => {
    fn(el, t, i);
    t += v;
    v *= fator;
  });
}
function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
}
const pad2 = (n: number): string => String(n).padStart(2, '0');

function aoVer(el: Element, fn: (visivel: boolean) => void, opcoes: IntersectionObserverInit = {}): void {
  new IntersectionObserver(([e]) => fn(e.isIntersecting), opcoes).observe(el);
}
function umaVez(el: Element, fn: () => void, opcoes: IntersectionObserverInit = { rootMargin: '0px 0px -12% 0px' }): void {
  const io = new IntersectionObserver(([e]) => {
    if (!e.isIntersecting) return;
    io.disconnect();
    fn();
  }, opcoes);
  io.observe(el);
}
/** Conta até o alvo e para nele (nunca passa do valor). */
function contaAte(el: HTMLElement, alvo: number, casas: number, duracao: number, atraso: number): void {
  const fmt = (n: number): string => n.toFixed(casas).replace('.', ',');
  el.textContent = fmt(0);
  window.setTimeout(() => {
    let inicio: number | null = null;
    const passo = (agora: number): void => {
      if (inicio === null) inicio = agora;
      const p = Math.min(1, (agora - inicio) / duracao);
      el.textContent = fmt(alvo * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(passo);
      else el.textContent = fmt(alvo);
    };
    requestAnimationFrame(passo);
  }, atraso);
}
function lerVideo(el: HTMLElement, id = ''): Video {
  const ds = el.dataset;
  return {
    id: ds.id ?? id, video: ds.video ?? '', poster: ds.poster ?? '', logo: ds.logo ?? '', ico: ds.ico ?? 'i-play',
    marca: ds.marca ?? '', nicho: ds.nicho ?? '', post: ds.post ?? '', gancho: ds.gancho ?? '', views: ds.views ?? '', top: ds.top ?? '',
  };
}

/* ---------------------------------------------------------------- contato */

/** Preencha com 55 + DDD + número e todos os botões de orçamento passam a abrir o WhatsApp. */
const CONTATO = { whatsapp: '' };
const MENSAGEM: Record<string, string> = {
  publi: 'Olá, Nilson! Vim pelo seu site e quero uma publi de humor para a minha empresa.',
  show: 'Olá, Nilson! Vim pelo seu site e quero levar o seu stand up para o meu evento.',
};
if (CONTATO.whatsapp) {
  $$<HTMLAnchorElement>('[data-contato]').forEach((a) => {
    const tipo = a.dataset.contato ?? 'publi';
    a.href = 'https://wa.me/' + CONTATO.whatsapp + '?text=' + encodeURIComponent(MENSAGEM[tipo] ?? MENSAGEM.publi);
    $$('use', a).slice(-1)[0]?.setAttribute('href', '#i-wa');
  });
}

// o show sai do ar sozinho depois da data
$$('[data-ate]').forEach((el) => {
  if (Date.now() > Date.parse(el.dataset.ate ?? '')) el.remove();
});

/* ---------------------------------------------------------------- player em tela cheia */

class Player {
  private dlg = $<HTMLDialogElement>('#lb');
  private caixa = $('.lb-caixa', this.dlg);
  private video = $<HTMLVideoElement>('#lbVideo');
  private prog = $('#lbProg');
  private som = $<HTMLButtonElement>('#lbSom');
  private lista: Video[] = [];
  private i = 0;
  private raf = 0;

  constructor() {
    $('#lbFechar').addEventListener('click', () => this.fechar());
    $('#lbAnt').addEventListener('click', () => this.navegar(-1));
    $('#lbProx').addEventListener('click', () => this.navegar(1));
    this.dlg.addEventListener('close', () => this.limpar());
    this.dlg.addEventListener('click', (e) => {
      if (e.target === this.dlg || e.target === this.caixa) this.fechar();
    });
    this.video.addEventListener('click', () => (this.video.paused ? void this.video.play() : this.video.pause()));
    this.video.addEventListener('ended', () => (this.lista.length > 1 ? this.navegar(1) : this.fechar()));
    this.som.addEventListener('click', () => {
      this.video.muted = !this.video.muted;
      this.iconeSom();
    });
    d.addEventListener('keydown', (e) => {
      if (!this.dlg.open) return;
      if (e.key === 'ArrowRight') this.navegar(1);
      if (e.key === 'ArrowLeft') this.navegar(-1);
    });
  }

  get aberto(): boolean {
    return this.dlg.open;
  }

  abrir(v: Video, lista: Video[] = []): void {
    this.lista = lista;
    this.i = Math.max(0, lista.indexOf(v));
    $$('.lb-nav', this.dlg).forEach((b) => (b.style.visibility = lista.length > 1 ? 'visible' : 'hidden'));
    d.dispatchEvent(new CustomEvent<boolean>('player', { detail: true }));
    $$<HTMLVideoElement>('video').forEach((x) => x !== this.video && x.pause());
    if (!this.dlg.open) this.dlg.showModal();
    anima(this.caixa, [{ opacity: 0, transform: 'scale(.94) translateY(16px)' }, { opacity: 1, transform: 'scale(1) translateY(0)' }], { duracao: 520, curva: 'expo' });
    this.carregar(v);
    cancelAnimationFrame(this.raf);
    const passo = (): void => {
      if (this.video.duration) this.prog.style.transform = 'scaleX(' + (this.video.currentTime / this.video.duration).toFixed(4) + ')';
      this.raf = requestAnimationFrame(passo);
    };
    this.raf = requestAnimationFrame(passo);
  }

  private iconeSom(): void {
    this.som.querySelector('use')?.setAttribute('href', this.video.muted ? '#i-mudo' : '#i-som');
  }

  private carregar(v: Video): void {
    $<HTMLImageElement>('#lbLogo').src = v.logo || 'img/nilson.webp';
    $('#lbMarca').textContent = v.marca;
    $('#lbNicho').textContent = v.nicho;
    $<HTMLAnchorElement>('#lbPost').href = v.post;
    this.video.poster = v.poster;
    this.video.src = v.video;
    this.video.muted = false;
    this.iconeSom();
    void this.video.play().catch(() => {
      this.video.muted = true;
      this.iconeSom();
      void this.video.play().catch(() => undefined);
    });
  }

  navegar(delta: number): void {
    if (this.lista.length < 2) return;
    this.i = (this.i + delta + this.lista.length) % this.lista.length;
    anima($('.lb-tela', this.dlg), [{ opacity: 0, transform: 'translateX(' + delta * 40 + 'px)' }, { opacity: 1, transform: 'translateX(0)' }], { duracao: 420, curva: 'expo' });
    this.carregar(this.lista[this.i]);
  }

  fechar(): void {
    if (this.dlg.open) this.dlg.close();
  }

  private limpar(): void {
    cancelAnimationFrame(this.raf);
    this.video.pause();
    this.video.removeAttribute('src');
    this.video.load();
    d.dispatchEvent(new CustomEvent<boolean>('player', { detail: false }));
  }
}
const player = new Player();
let playerAberto = false;
d.addEventListener('player', (e) => (playerAberto = (e as CustomEvent<boolean>).detail));

/* ---------------------------------------------------------------- abertura */

/** Quebra um parágrafo em palavras (o <em> vira uma palavra só, para a frase dele chegar junta). */
function palavras(el: HTMLElement): void {
  const frag = d.createDocumentFragment();
  Array.from(el.childNodes).forEach((n) => {
    if (n.nodeType === Node.TEXT_NODE) {
      (n.textContent ?? '').split(/(\s+)/).forEach((p) => {
        if (!p) return;
        if (/^\s+$/.test(p)) return void frag.appendChild(d.createTextNode(p));
        const s = d.createElement('span');
        s.className = 'w';
        s.textContent = p;
        frag.appendChild(s);
      });
    } else {
      const s = d.createElement('span');
      s.className = 'w';
      s.appendChild(n.cloneNode(true));
      frag.appendChild(s);
    }
  });
  el.textContent = '';
  el.appendChild(frag);
}

/*
 * Linha do tempo da abertura (ms):
 *  140  muro: 5 filas entram de lados alternados, já rolando por dentro
 *  420  foto sobe do pé do quadro saindo do desfoque (rack focus)
 *  520  nome sobe da máscara; 700 papéis colam; 800 bio sai do desfoque palavra a palavra
 * 1000  números; 1100 os dois vídeos chegam voando em 3D e passam a flutuar
 * 1150  chamada principal; 1300 Instagram; 1380 YouTube e TikTok; 1500 atalhos
 */
function abertura(): void {
  cascata($$('.fila-h'), 140, 90, (f, t, i) => {
    const lado = (i % 2 ? 1 : -1) * 45 * K;
    anima(f, chega('translateX(' + lado + '%)', 'translateX(0)'), { duracao: 1300, atraso: t, curva: 'expo' });
  });
  anima($('#foto'), [
    { opacity: 1, transform: 'translateY(' + 9 * K + '%) scale(1.04)', filter: 'blur(14px)' },
    { opacity: 1, transform: 'translateY(0) scale(1)', filter: 'blur(0px)' },
  ], { duracao: 1100, atraso: 420, curva: 'expo' });
  $$('.voa .entra').forEach((el, i) => {
    anima(el, [
      { opacity: 0, transform: 'translateY(' + 60 * K + 'px) scale(.86)', filter: 'blur(12px)' },
      { opacity: 1, transform: 'translateY(' + 60 * K + 'px) scale(.86)', filter: 'blur(12px)', offset: 0.001 },
      { opacity: 1, transform: 'translateY(0) scale(1)', filter: 'blur(0px)' },
    ], { duracao: 1150, atraso: 1050 + i * 200, curva: 'expo' });
  });

  $$('.nome .lt').forEach((l, i) => anima(l, [{ transform: 'translateY(105%)' }, { transform: 'translateY(0)' }], { duracao: 820, atraso: 520 + i * 110, curva: 'expo' }));
  cascata($$('.papel li'), 700, 70, (el, t) => anima(el, chega('scale(.7)', 'scale(1)'), { duracao: 560, atraso: t, curva: 'mola' }));
  cascata($$('#bio .w'), 800, 34, (w, t) => anima(w, [
    { opacity: 0, transform: 'translateY(.35em)', filter: 'blur(8px)' },
    { opacity: 1, transform: 'translateY(0)', filter: 'blur(0px)' },
  ], { duracao: 620, atraso: t, curva: 'p4' }), 0.97);
  cascata($$('.numeros li'), 1000, 90, (li, t) => anima(li, chega('translateY(' + 18 * K + 'px)', 'translateY(0)'), { duracao: 640, atraso: t, curva: 'p4' }));
  contaAte($('#cont'), 138, 0, 1300, 1050);
  contaAte($('#contViews'), 6.7, 1, 1400, 1150);

  anima($('.cta'), chega('translateY(' + 30 * K + 'px) scale(.95)', 'translateY(0) scale(1)'), { duracao: 820, atraso: 1150, curva: 'expo' });
  cascata($$('.cta-logos img'), 1450, 70, (img, t) => anima(img, chega('translateX(-10px) scale(.4)', 'translateX(0) scale(1)'), { duracao: 520, atraso: t, curva: 'mola' }));
  anima($('.igc'), chega('translateY(' + 30 * K + 'px)', 'translateY(0)'), { duracao: 760, atraso: 1300, curva: 'expo' });
  cascata($$('.igc-grade span'), 1500, 60, (s, t) => anima(s, [{ clipPath: 'inset(100% 0 0 0)' }, { clipPath: 'inset(0 0 0 0)' }], { duracao: 700, atraso: t, curva: 'expo' }));
  cascata($$('.soc'), 1380, 90, (el, t, i) => anima(el, chega('translateY(' + 34 * K + 'px) rotate(' + (i ? 5 : -5) + 'deg)', 'translateY(0) rotate(0deg)'), { duracao: 760, atraso: t, curva: 'mola' }));
  cascata($$('.at'), 1520, 70, (el, t) => anima(el, chega('translateY(' + 24 * K + 'px)', 'translateY(0)'), { duracao: 700, atraso: t, curva: 'p4' }));
}

palavras($('#bio'));
void Promise.race([d.fonts.ready, new Promise((r) => setTimeout(r, 1200))]).then(() => setTimeout(abertura, 0));

/* ---------------------------------------------------------------- hero: motor contínuo */

const hero = $('#hero');
const muro = $('#muro');
const foto = $('#foto');
const voas = $$('.voa');
const partes = voas.map((v) => ({ barra: $('.prog i', v), video: $<HTMLVideoElement>('video', v) }));

let heroVisivel = true;
let alvoX = 0;
let alvoY = 0;
let ponteiroX = 0;
let ponteiroY = 0;
let heroAltura = hero.offsetHeight;
addEventListener('resize', () => (heroAltura = hero.offsetHeight), { passive: true });
hero.addEventListener('pointermove', (e) => {
  if (!desk.matches) return;
  const r = hero.getBoundingClientRect();
  alvoX = (e.clientX - r.left) / r.width - 0.5;
  alvoY = (e.clientY - r.top) / r.height - 0.5;
});
hero.addEventListener('pointerleave', () => {
  alvoX = 0;
  alvoY = 0;
});

/** Cada quadro é função do tempo: os vídeos flutuam devagar, em fases diferentes, e seguem a rolagem e o ponteiro. */
function quadroHero(agora: number): void {
  const s = agora / 1000;
  ponteiroX += (alvoX - ponteiroX) * 0.07;
  ponteiroY += (alvoY - ponteiroY) * 0.07;
  const rolagem = desk.matches ? 0 : Math.min(scrollY, heroAltura);
  voas.forEach((v, i) => {
    const fase = Number(v.dataset.fase ?? 0);
    const y = Math.sin(s * (0.9 + i * 0.15) + fase) * 9 * K - rolagem * (0.22 + i * 0.1) * K + ponteiroY * (16 + i * 8);
    const x = ponteiroX * (24 + i * 14);
    v.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0)';
    const p = partes[i];
    if (p.video.duration) p.barra.style.transform = 'scaleX(' + (p.video.currentTime / p.video.duration).toFixed(4) + ')';
  });
  muro.style.translate = (ponteiroX * -20).toFixed(1) + 'px calc(-50% + ' + (ponteiroY * -14 + rolagem * 0.4 * K).toFixed(1) + 'px)';
  foto.style.translate = (ponteiroX * 9).toFixed(1) + 'px ' + (rolagem * 0.12 * K).toFixed(1) + 'px';
  if (heroVisivel) requestAnimationFrame(quadroHero);
}
requestAnimationFrame(quadroHero);

/* ---------------------------------------------------------------- laços param fora da tela */

const pausaveis = [hero, talvez('.igc'), talvez('.show'), talvez('.serie'), talvez('#final')].filter((x): x is HTMLElement => !!x);
const ioParado = new IntersectionObserver((es) => {
  es.forEach((e) => {
    const el = e.target as HTMLElement;
    el.classList.toggle('parado', !e.isIntersecting);
    if (el === hero) {
      const era = heroVisivel;
      heroVisivel = e.isIntersecting;
      if (heroVisivel && !era) requestAnimationFrame(quadroHero);
      partes.forEach((p) => (e.isIntersecting && !playerAberto ? void p.video.play().catch(() => undefined) : p.video.pause()));
    }
  });
});
pausaveis.forEach((el) => ioParado.observe(el));

/* ---------------------------------------------------------------- títulos */

$$('.titulo').forEach((t) =>
  umaVez(t, () => cascata($$('.w > span', t), 0, 90, (s, a) => anima(s, [{ transform: 'translateY(105%)' }, { transform: 'translateY(0)' }], { duracao: 800, atraso: a, curva: 'expo' })))
);

/* ---------------------------------------------------------------- copiar e-mail e "faltam X dias" */

const copiar = talvez<HTMLButtonElement>('#copiar');
copiar?.addEventListener('click', () => {
  const email = copiar.dataset.email ?? '';
  const pronto = (): void => {
    copiar.textContent = 'Copiado';
    copiar.classList.add('ok');
    anima(copiar, [{ transform: 'scale(.9)' }, { transform: 'scale(1)' }], { duracao: 420, curva: 'mola' });
    setTimeout(() => {
      copiar.textContent = 'Copiar';
      copiar.classList.remove('ok');
    }, 2200);
  };
  if (navigator.clipboard) void navigator.clipboard.writeText(email).then(pronto).catch(() => (location.href = 'mailto:' + email));
  else location.href = 'mailto:' + email;
});

const show = talvez('.show');
const faltam = talvez('#faltam');
if (faltam && show) {
  const dias = Math.ceil((Date.parse(show.dataset.inicio ?? '') - Date.now()) / 864e5);
  faltam.textContent = dias > 1 ? 'em ' + dias + ' dias' : dias === 1 ? 'é amanhã' : 'é hoje';
}

/* ---------------------------------------------------------------- vitrine de marcas */

const MARCAS: Video[] = [
  { id: 'hyundai', marca: 'Hyundai Via Imperial', nicho: 'Concessionária', logo: 'img/logos/hyundai.webp', video: 'img/p-hyundai.mp4', poster: 'img/p-hyundai.jpg', post: 'https://www.instagram.com/p/DekKb9xPAzN/' },
  { id: 'megabeef', marca: 'Mega Beef', nicho: 'Açougue', logo: 'img/logos/megabeef.webp', video: 'img/p-megabeef.mp4', poster: 'img/p-megabeef.jpg', post: 'https://www.instagram.com/p/DdRTOTfRXFm/' },
  { id: 'viverbem', marca: 'Drogaria Viver Bem', nicho: 'Farmácia', logo: 'img/logos/viverbem.webp', video: 'img/p-viverbem1.mp4', poster: 'img/p-viverbem1.jpg', post: 'https://www.instagram.com/p/DeB50D0xWVZ/' },
  { id: 'finafauna', marca: 'Fina Fauna Rações', nicho: 'Pet shop', logo: 'img/logos/finafauna.webp', video: 'img/p-finafauna.mp4', poster: 'img/p-finafauna.jpg', post: 'https://www.instagram.com/p/DdmZVV3xzqn/' },
  { id: 'eletromoveis', marca: 'Eletromóveis Arealense', nicho: 'Loja de móveis', logo: 'img/logos/eletromoveis.webp', video: 'img/eletromoveis.mp4', poster: 'img/eletromoveis.jpg', post: 'https://www.instagram.com/p/DfSeb-txMZL/' },
  { id: 'lutti', marca: 'Lutti Autopeças', nicho: 'Autopeças', logo: 'img/logos/lutti.webp', video: 'img/lutti.mp4', poster: 'img/lutti.jpg', post: 'https://www.instagram.com/p/Dfhf2pfxng-/' },
  { id: 'antenor', marca: 'Antenor & Filhos', nicho: 'Boutique e delicatessen', logo: 'img/logos/antenor.webp', video: 'img/antenor.mp4', poster: 'img/antenor.jpg', post: 'https://www.instagram.com/p/DfZ5vexRnM7/' },
  { id: 'nilmar', marca: 'Lojas Nilmar', nicho: 'Calçados e roupas', logo: 'img/logos/nilmar.webp', video: 'img/nilmar.mp4', poster: 'img/nilmar.jpg', post: 'https://www.instagram.com/p/DfahaakRDkv/' },
  { id: 'surikata', marca: 'Surikata 10', nicho: 'Loja de variedades', logo: 'img/logos/surikata.webp', video: 'img/surikata.mp4', poster: 'img/surikata.jpg', post: 'https://www.instagram.com/p/DchIO1PhGp6/' },
  { id: 'serralink', marca: 'SerraLink', nicho: 'Internet', logo: 'img/logos/serralink.webp', video: 'img/serralink.mp4', poster: 'img/serralink.jpg', post: 'https://www.instagram.com/p/Dcoh_l3R9RK/' },
  { id: 'joha', marca: 'Johá Rações', nicho: 'Rações e agro', logo: 'img/logos/joha.webp', video: 'img/joha.mp4', poster: 'img/joha.jpg', post: 'https://www.instagram.com/p/DcRr-wahVH-/' },
].map((m) => ({ ico: 'i-play', gancho: '', views: '', top: '', ...m }));

function tileMarca(m: Video): string {
  return '<li><button class="gm" type="button" data-alvo="' + esc(m.id) + '" aria-label="Assistir à publi da ' + esc(m.marca) + '">' +
    '<span class="gm-play"><svg><use href="#i-play"/></svg></span>' +
    '<img src="' + esc(m.logo) + '" alt="" width="240" height="240" loading="lazy">' +
    '<span><b>' + esc(m.marca) + '</b><small>' + esc(m.nicho) + '</small></span></button></li>';
}
const grade = talvez('#gradeMarcas');
if (grade) {
  const link = $<HTMLAnchorElement>('.cta').href;
  grade.innerHTML = MARCAS.map(tileMarca).join('') +
    '<li><a class="gm voce" data-contato="publi" href="' + esc(link) + '" target="_blank" rel="noopener"><span class="mais-m">+</span><span><b>Sua marca aqui</b><small>Pedir orçamento</small></span></a></li>';
  grade.addEventListener('click', (e) => {
    const b = (e.target as Element).closest<HTMLElement>('[data-alvo]');
    const m = b ? MARCAS.find((x) => x.id === b.dataset.alvo) : undefined;
    if (m) player.abrir(m, MARCAS);
  });
  umaVez(grade, () => cascata($$('.gm', grade), 60, 70, (el, t) => anima(el, chega('translateY(' + 22 * K + 'px) scale(.92)', 'translateY(0) scale(1)'), { duracao: 700, atraso: t, curva: 'mola' }), 0.9), { threshold: 0.15 });
}

/* ---------------------------------------------------------------- publis que viralizaram */

class Feed {
  private posts: HTMLButtonElement[];
  private dados: Video[];
  private vis = new Map<HTMLButtonElement, number>();

  constructor(lista: HTMLElement) {
    this.posts = $$<HTMLButtonElement>('.post', lista);
    this.dados = this.posts.map((p, i) => lerVideo(p, 'publi-' + i));
    this.posts.forEach((el, i) => this.montar(el, this.dados[i]));
    const io = new IntersectionObserver((es) => {
      es.forEach((e) => this.vis.set(e.target as HTMLButtonElement, e.isIntersecting ? e.intersectionRatio : 0));
      this.sincroniza();
    }, { threshold: [0, 0.35, 0.6, 0.85, 1] });
    this.posts.forEach((p) => io.observe(p));
    d.addEventListener('player', () => this.sincroniza());

    umaVez(lista, () => this.revelar(this.posts.filter((p) => !p.closest('.extra'))), { threshold: 0.12 });
    const mais = talvez<HTMLButtonElement>('#mais');
    mais?.addEventListener('click', () => {
      const abrir = !lista.classList.contains('aberto');
      lista.classList.toggle('aberto', abrir);
      mais.setAttribute('aria-expanded', String(abrir));
      mais.firstChild!.textContent = abrir ? 'Mostrar menos ' : 'Ver mais 4 publis ';
      if (abrir) this.revelar(this.posts.filter((p) => p.closest('.extra')));
      else lista.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    const placar = talvez('#placar');
    if (placar) umaVez(placar, () => contaAte(placar, 6.7, 1, 1600, 100));
  }

  private montar(el: HTMLButtonElement, v: Video): void {
    el.setAttribute('aria-label', 'Assistir: ' + v.gancho + ' · ' + v.marca + ' · ' + v.views + ' de views');
    const quem = v.logo
      ? '<img src="' + esc(v.logo) + '" alt="" width="240" height="240">'
      : '<span class="nicho-ico"><svg><use href="#' + esc(v.ico) + '"/></svg></span>';
    el.innerHTML =
      '<img class="cap" src="' + esc(v.poster) + '" alt="" width="540" height="960" loading="lazy">' +
      '<video muted playsinline loop preload="none" src="' + esc(v.video) + '"></video>' +
      '<span class="views"><svg><use href="#i-play"/></svg>' + esc(v.views) + '</span>' +
      (v.top ? '<span class="top">TOP ' + esc(v.top) + '</span>' : '') +
      '<span class="post-base"><q>' + esc(v.gancho) + '</q><span class="quem">' + quem + '<small>' + esc(v.marca) + '</small></span></span>';
    el.addEventListener('click', () => player.abrir(v, this.dados));
  }

  /** Chegada em cortina: cada card abre de baixo para cima, em cascata. */
  private revelar(els: HTMLButtonElement[]): void {
    cascata(els, 60, 90, (el, t, i) => {
      anima(el, [
        { opacity: 0, clipPath: 'inset(100% 0 0 0 round 20px)', transform: 'translateY(' + 30 * K + 'px)' },
        { opacity: 1, clipPath: 'inset(100% 0 0 0 round 20px)', transform: 'translateY(' + 30 * K + 'px)', offset: 0.001 },
        { opacity: 1, clipPath: 'inset(0 0 0 0 round 20px)', transform: 'translateY(0)' },
      ], { duracao: 900, atraso: t + (i % 2) * 40, curva: 'expo' });
    }, 0.86);
  }

  /** Só as duas prévias mais visíveis rodam (mudas); o resto fica parado. */
  private sincroniza(): void {
    const melhores = [...this.vis.entries()].filter(([, r]) => r >= 0.6).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([el]) => el);
    this.posts.forEach((el) => {
      const v = $<HTMLVideoElement>('video', el);
      if (!playerAberto && melhores.includes(el)) void v.play().then(() => el.classList.add('rodando')).catch(() => undefined);
      else v.pause();
    });
  }
}
const feed = talvez('#feed');
if (feed) new Feed(feed);

/* ---------------------------------------------------------------- palco */

if (show) {
  umaVez($('#elenco'), () => {
    cascata($$('.ator', show), 0, 140, (a, t, i) => {
      const conv = a.classList.contains('conv');
      anima(a, chega(conv ? 'translateY(30px) scale(.94)' : 'translateY(24px)', 'translateY(0) scale(1)'), { duracao: conv ? 900 : 700, atraso: t + (conv ? 220 : 0), curva: conv ? 'mola' : 'expo' });
      anima($('.rosto img', a), [{ transform: 'scale(1.35)', filter: 'grayscale(1)' }, { transform: 'scale(1)', filter: 'grayscale(0)' }], { duracao: 1200, atraso: t + (conv ? 220 : 0), curva: 'expo' });
      if (i === 2) anima($('.fita-conv', a), chega('rotate(-14deg) scale(1.6)', 'rotate(-3deg) scale(1)'), { duracao: 420, atraso: t + 700, curva: 'in3' });
    });
  }, { threshold: 0.3 });

  // contagem regressiva: cada dígito que muda rola para cima
  const alvo = Date.parse(show.dataset.inicio ?? '');
  const caixas: Record<string, HTMLElement> = {};
  $$('[data-u]', show).forEach((b) => (caixas[b.dataset.u ?? ''] = b));
  const valores: Record<string, string> = {};
  const rolar = (u: string, novo: string, animar: boolean): void => {
    if (valores[u] === novo) return;
    valores[u] = novo;
    const caixa = caixas[u];
    const velho = caixa.firstElementChild as HTMLElement | null;
    const span = d.createElement('span');
    span.textContent = novo;
    if (!animar || !velho) return void caixa.replaceChildren(span);
    caixa.appendChild(span);
    anima(velho, [{ transform: 'translateY(0)' }, { transform: 'translateY(-100%)' }], { duracao: 360, curva: 'in3' }).finished.then(() => velho.remove());
    anima(span, [{ transform: 'translateY(0)' }, { transform: 'translateY(-100%)' }], { duracao: 520, atraso: 80, curva: 'expo' }).finished.then((a) => a.cancel());
  };
  const tique = (animar: boolean): void => {
    let ms = Math.max(0, alvo - Date.now());
    const dd = Math.floor(ms / 864e5);
    ms -= dd * 864e5;
    const hh = Math.floor(ms / 36e5);
    ms -= hh * 36e5;
    const mm = Math.floor(ms / 6e4);
    ms -= mm * 6e4;
    rolar('d', pad2(dd), animar);
    rolar('h', pad2(hh), animar);
    rolar('m', pad2(mm), animar);
    rolar('s', pad2(Math.floor(ms / 1e3)), animar);
  };
  tique(false);
  setInterval(() => {
    if (!show.classList.contains('parado') && !d.hidden) tique(true);
  }, 1000);
}

const serie = talvez('.serie');
if (serie) {
  const eps = $$<HTMLButtonElement>('.ep', serie);
  const dadosEps = eps.map((e, i) => lerVideo(e, 'ep-' + i));
  eps.forEach((e, i) => e.addEventListener('click', () => player.abrir(dadosEps[i], dadosEps)));
  aoVer(serie, (v) => eps.forEach((e) => {
    const vid = $<HTMLVideoElement>('video', e);
    if (v && !playerAberto) void vid.play().then(() => e.classList.add('rodando')).catch(() => undefined);
    else vid.pause();
  }), { threshold: 0.4 });
  umaVez(serie, () => cascata(eps, 100, 140, (e, t, i) => anima(e, chega('translateY(40px) rotate(' + (i ? 4 : -4) + 'deg)', 'translateY(0) rotate(0deg)'), { duracao: 900, atraso: t, curva: 'mola' })));
}

/* ---------------------------------------------------------------- chamada final */

const final = talvez('#final');
if (final) {
  umaVez(final, () => {
    anima($('#finalFoto img'), chega('translateY(' + 26 * K + '%)', 'translateY(0)'), { duracao: 1200, atraso: 150, curva: 'expo' });
    anima($('#balao'), chega('scale(.3) rotate(-20deg)', 'scale(1) rotate(0deg)'), { duracao: 640, atraso: 950, curva: 'mola' });
  }, { threshold: 0.3 });
}

/* ---------------------------------------------------------------- botão flutuante (celular) */

const flutuante = $<HTMLAnchorElement>('#flutuante');
let passou = false;
let noFim = false;
const atualiza = (): void => {
  const on = passou && !noFim;
  flutuante.classList.toggle('on', on);
  flutuante.setAttribute('aria-hidden', String(!on));
  flutuante.tabIndex = on ? 0 : -1;
};
new IntersectionObserver(([e]) => {
  passou = !e.isIntersecting && e.boundingClientRect.top < 0;
  atualiza();
}).observe($('.cta'));
const fimVisivel = new Map<Element, boolean>();
const ioFim = new IntersectionObserver((es) => {
  es.forEach((e) => fimVisivel.set(e.target, e.isIntersecting));
  noFim = [...fimVisivel.values()].some(Boolean);
  atualiza();
});
[talvez('#final'), talvez('#rodape')].forEach((el) => el && ioFim.observe(el));
