# Eras

Rhythm bullet hell de palco. Você controla o cursor/microfone de **Nara Lume**, uma artista pop
fictícia, durante um show de ~2 minutos dividido em três eras inventadas. Os projéteis de luz
chegam no ritmo da música: desvie das notas **vermelhas** e encoste nas **douradas** exatamente no
beat.

| Era | Nome               | Padrão de projéteis                                  | Som                                                      |
| --- | ------------------ | ---------------------------------------------------- | -------------------------------------------------------- |
| I   | Miragem Cromada    | leques radiais e anéis                               | disco: bumbo reto, baixo em oitavas, pad e lead quadrado |
| II  | Sereno de Vagalume | ondas senoidais lentas (laterais e cortinas do topo) | folk: dedilhado, baixo triangular, palmas no refrão      |
| III | Confete Supernova  | espirais e chuva densa                               | glitter-pop: sinos FM, hats em semicolcheia, supersaw    |

Cada era tem subida (rufar + ruído crescente) e um **drop** com flash de tela, tremor e confete. Na
troca de era a paleta faz fade de 600 ms, com flash e chuva de confete.

**GitHub Pages:** https://dunkelhai.github.io/eras/

## Controles

| Tecla            | Ação                                                              |
| ---------------- | ----------------------------------------------------------------- |
| Setas / WASD     | mover em 8 direções (diagonal normalizada)                        |
| X / Shift        | modo foco: lento e com a hitbox visível                           |
| Espaço           | começar (tela de título), continuar (pausa), tentar de novo (fim) |
| Esc              | pausa                                                             |
| R                | reiniciar                                                         |
| T (na pausa)     | reduzir tremor/flash                                              |
| M (na pausa/fim) | voltar ao título                                                  |

Z/Espaço não têm ação durante o show: pegar notas é só encostar nelas.

## Regras

- **Notas vermelhas** tiram 1 vida. São 3 vidas, com 2 s de invencibilidade (o cursor pisca) e as
  balas num raio de 200 px somem quando você leva dano.
- **Notas douradas**: um anel encolhe no alvo e a estrela voa até ele, chegando no beat. Encostar
  a até ±100 ms do beat é **Perfect** (300), até ±200 ms é **Good** (100). Depois disso é **Miss**:
  quebra o combo mas não tira vida. Se você já estiver encostando antes do beat, o toque "segura" e
  é julgado no beat.
- **Combo e multiplicador**: ×1 até 9 notas, ×2 a partir de 10, ×3 a partir de 25, ×4 a partir de 50.
- **Fim**: se a música chega ao fim, é vitória com nota. Se você perde as 3 vidas, a música para e é
  derrota.

### Nota final

Calculada sobre a pontuação máxima possível (todas as 127 douradas Perfect com combo contínuo:
126.900 pontos):

| Nota | % da pontuação máxima |
| ---- | --------------------- |
| S    | ≥ 85% (≥ 107.865)     |
| A    | ≥ 60% (≥ 76.140)      |
| B    | sobreviveu ao show    |

## Como rodar

```bash
npm install
npm run dev
```

Abra http://localhost:5173/eras/ (o `base` do Vite é `/eras/` por causa do GitHub Pages).

### Scripts

| Script                                                | O que faz                                       |
| ----------------------------------------------------- | ----------------------------------------------- |
| `npm run dev`                                         | servidor de desenvolvimento (Vite)              |
| `npm run build`                                       | `tsc --noEmit` + build de produção em `dist/`   |
| `npm run preview`                                     | serve o `dist/`                                 |
| `npm run lint`                                        | ESLint + Prettier (checagem)                    |
| `npm run format`                                      | Prettier (escreve)                              |
| `node tools/gen-beatmap.mjs`                          | regenera `src/config/beatmap.json`              |
| `node tools/sim-dodge.mjs [de] [até] [reação] [modo]` | bot de desvio simula o beatmap e conta os danos |

## Debug e QA

Com `?debug=1` na URL (ex.: http://localhost:5173/eras/?debug=1):

| Tecla | Ação                                                         |
| ----- | ------------------------------------------------------------ |
| F1    | vitória imediata                                             |
| F2    | derrota imediata                                             |
| F3    | pular para a próxima era (na última, pula para perto do fim) |
| F4    | mostrar fps                                                  |
| I     | alternar invencibilidade                                     |

No modo debug o HUD mostra beat atual e número de balas vivas. Sem `?debug=1`, nada disso fica
ativo.

Para inspeção: `window.__game` é o `Phaser.Game`. O estado da partida fica em
`__game.scene.getScene('Game').state` (pontos, combo, vidas, era, beat, Perfect/Good/Miss). Com
`?debug=1` também existe `window.__music` (`songSeconds`, `hasAudio`).

## Estrutura

```
src/
  main.ts                 espera as fontes e cria o Phaser.Game
  config/balance.ts       TODAS as constantes de balanceamento
  config/beatmap.json     mapa de beats { beat, type, pattern, params }
  style/palette.ts        paleta (cores de jogabilidade + 3 eras)
  scenes/                 Boot, Title, Game, Pause, Result
  entities/               Player, BulletPool, GoldNotes, Stage
  systems/                music (Tone.js), beatmap, patterns, scoring, textures, ui, settings
tools/gen-beatmap.mjs     gerador determinístico do beatmap
```

### Sincronização

O relógio do jogo é o relógio de áudio: `songSeconds = Tone.Transport.seconds − lookAhead`, ou seja,
o tempo que está saindo na caixa de som. Eventos do beatmap disparam quando o beat da música passa
por eles, e a posição das balas é calculada de forma analítica a partir do tempo da música
(`x0 + v·idade + onda`). Por isso um frame atrasado não desalinha nada. O delta do frame só move o
cursor do jogador.

## Créditos

- Código, arte vetorial e trilha: gerados por código neste repositório. A música é original,
  sintetizada em tempo real com [Tone.js](https://tonejs.github.io/) (MIT), com harmonias simples e
  melodia derivada de tons de acorde.
- Engine: [Phaser 3](https://phaser.io/) (MIT).
- Fontes: [Bungee](https://fonts.google.com/specimen/Bungee) e
  [Rajdhani](https://fonts.google.com/specimen/Rajdhani) (Google Fonts, SIL OFL).
- Nenhum asset externo de imagem ou áudio. Nara Lume e as eras são inventadas.

## Decisões

- **Duração e estrutura**: 120 bpm, contagem de 4 batidas e depois 240 batidas (3 eras × 80 batidas
  = 2 min). Cada era tem intro (16 batidas), verso (24), subida (8) e drop (32). Os marcos ficam no
  próprio `beatmap.json` (`eras[]`), e a música e o jogo leem dali.
- **Formato do beatmap**: além da lista `events` com `{ beat, type, pattern, params }`, o JSON tem
  metadados (`bpm`, `countInBeats`, `lengthBeats`, `tailBeats`, `eras`). Tipos: `bullet` (padrões
  `fan`, `ring`, `aimed`, `wave`, `spiral`, `rain`), `gold` (`star`) e `fx` (`era`, `build`, `drop`,
  `end`). O JSON é gerado por `tools/gen-beatmap.mjs` (seed fixa), para facilitar o balanceamento.
- **Douradas**: o anel de aviso aparece 2 batidas antes e a estrela voa da direção da artista
  durante a última batida. Quem já está encostando antes do beat "segura" o toque e recebe o
  julgamento no beat. Assim quem se antecipa tira Perfect em vez de levar Good por chegar cedo.
  Douradas só são pegáveis dentro da janela de ±200 ms.
- **Nota final**: S/A por % da pontuação máxima. Qualquer vitória vale no mínimo B, e sobreviver é o
  objetivo de quem joga pela primeira vez.
- **Corredores na Era II**: as ondas laterais usam 3 faixas a 160 px uma da outra, com amplitude de
  no máximo 45 px. Em cada bloco de 8 batidas, uma faixa fica livre. As ondas saem a cada 4 batidas
  (a cada 2 na subida). Na versão anterior, ~10 ondas lentas se sobrepunham perto do beat 125 e não
  sobrava corredor. A conferência é feita com `tools/sim-dodge.mjs`: entre os beats 110 e 140, o bot
  ingênuo (`naive`) leva 0 danos com qualquer tempo de reação entre 0,1 e 0,25 s, e o bot com
  previsão leva 0 danos no show inteiro. O pico de balas vivas na Era II caiu de 160 para 66. Os scripts de `tools/` rodam no Node, e o
  ESLint aplica os globais do Node só a essa pasta.
- **Balanceamento para vencer com B em 1–2 tentativas**: balas lentas (110–220 px/s), hitbox de 5 px,
  área de coleta de 28 px, 2 s de i-frames e limpeza de balas num raio de 200 px ao levar dano. Balas
  não nascem a menos de 90 px do jogador, e as que nascem nas bordas entram de fora da tela.
- **Relógio de reserva**: se o navegador não liberar o áudio em 1,2 s, o jogo roda com um relógio
  de `performance.now()`, sem som, para não travar na tela de título (útil em testes headless).
- **Bloom**: `postFX.addBloom` na câmera, com intensidade reduzida (0,55) porque o valor do guia
  (1,2) deixava a cena lavada. Se o fps médio ficar abaixo de 50 por 3 s, o bloom sai e entra um
  `addGlow` só no jogador, como o guia prevê. A vinheta é a textura radial barata (0,35).
- **F3**: o guia geral sugere F3 para mostrar fps, mas o pedido deste jogo reserva F3 para pular de
  era. O fps foi para F4.
- **Hit-flash do jogador**: como o cursor já é branco, o núcleo pisca em vermelho e o anel em branco
  por 80 ms.
- **Pausa automática** quando a aba fica oculta, para a música não seguir sozinha.
- **"Reduzir tremor/flash"** fica na pausa (tecla T): o tremor vai a zero e os flashes ficam com
  alpha de no máximo 0,25.
- **TypeScript 6.0**: o `typescript-eslint` ainda não aceita o TS 7, então o projeto fixa `~6.0`.

## Próximos passos

- Calibração de latência (offset de áudio ajustável pelo jogador).
- Mais padrões (lasers telegrafados, notas douradas em sequência "arrastada").
- Dificuldades (densidade/velocidade) e tabela de recordes local.
- Mãos do público seguindo o refrão com animação mais rica, e silhueta da artista com poses por era.
- Testes automatizados para `scoring.ts`, `patterns.ts` e o agendador do beatmap.
