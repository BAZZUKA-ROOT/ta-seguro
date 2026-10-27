# 🛡️ Tá Seguro?

**Recebeu uma mensagem estranha? Cole aqui e descubra se é golpe.**

Ferramenta gratuita, feita para **idosos e pessoas com pouca intimidade com o celular**, que analisa mensagens de WhatsApp, SMS e e-mail e explica em linguagem simples, com voz, se aquilo parece golpe e o que fazer.

> 🔒 **Sua mensagem não sai do seu celular.** A análise e a leitura de prints rodam 100% no aparelho. Funciona sem internet depois da primeira visita.

## Por que existe

Golpes como o do "filho que trocou de número", a falsa central do banco e a "taxa dos Correios" fazem milhares de vítimas por dia no Brasil, e os idosos são os mais atingidos. Quem cai geralmente não sabe a quem perguntar, ou tem vergonha de perguntar. O Tá Seguro? responde na hora, sem julgamento, e já oferece um botão para **pedir ajuda a alguém da família**.

## O que ele faz

| | |
|---|---|
| ✍️ **Cola ou digita** | Cola a mensagem com um toque |
| 🖼️ **Lê prints** | Lê o texto de um print da tela (OCR no próprio aparelho, com Tesseract.js guardado no próprio site) |
| 📤 **Recebe pelo Compartilhar** | Instalado no Android, aparece em *Compartilhar → Tá Seguro?* para texto, link ou print |
| 🚦 **Dá um veredito claro** | Vermelho (golpe), amarelo (cuidado) ou verde (sem sinais) |
| 🗣️ **Explica o porquê** | Em português simples, sem termos técnicos |
| 🔗 **Analisa links** | Detecta sites que imitam bancos, Correios e gov.br, links encurtados, endereços disfarçados com números (`nub4nk`), punycode, finais suspeitos (`.xyz`, `.online`…) |
| 📋 **Diz o que fazer** | Passos práticos de acordo com o tipo de golpe |
| 🔊 **Lê em voz alta** | Para quem tem dificuldade de leitura ou de visão |
| 👨‍👩‍👧 **Avisa a família** | Envia a mensagem pelo WhatsApp a alguém de confiança, com os links "desarmados" para ninguém clicar sem querer |
| 🔠 **Letra grande** | Fonte Atkinson Hyperlegible (criada para baixa visão), botões grandes, letra ajustável |
| 🆘 **"Já caí, e agora?"** | Orienta a ligar para o banco, pedir o MED do Pix e registrar boletim de ocorrência |

## Golpes que ele reconhece

Falso parente/troca de número · pedido de código do WhatsApp · falsa central do banco · taxa de encomenda (Correios) · prêmio/sorteio · INSS, FGTS, "valores a receber" · boleto e dívida falsos · emprego fácil/tarefas pagas · investimento milagroso · falso sequestro · acesso remoto (AnyDesk, TeamViewer) · APK por link · descontos absurdos · pressão, ameaça de bloqueio e pedido de segredo.

O motor combina **regras com peso** com **combinações típicas de golpe** (por exemplo: "troquei de número" + "faz um Pix" = alerta máximo).

## Funciona sem internet

Na primeira visita o app fica guardado no aparelho (service worker em `sw.js`). Depois disso ele abre na hora, mesmo sem rede ou com rede ruim.

- **App:** tudo é guardado de uma vez, numa versão só. **Mudou qualquer arquivo? Troque `VERSAO` em `sw.js`.** Na abertura seguinte o celular baixa a versão nova inteira; na outra, ela entra no ar e o cache velho é apagado.
- **Leitor de prints:** os arquivos do Tesseract (uns 5,4 MB) só são baixados na primeira vez que a pessoa usa um print, e ficam num cache separado que não é apagado a cada versão (só quando muda `TESSERACT` em `sw.js`).
- **Atalhos do ícone:** *Colar mensagem* (`?acao=colar`), *Ler um print* (`?acao=print`) e *Já caí no golpe* (`?acao=socorro`).

## Compartilhar para o app

Com o app instalado (Android, Chrome/Edge), o "Tá Seguro?" aparece na lista de **Compartilhar** do WhatsApp, da galeria e do SMS. O sistema manda um `POST` para `./compartilhar`; o `sw.js` guarda o texto (título + texto + link, sem repetir) e a imagem, se houver, no Cache Storage `ta-seguro-compartilhado` e abre `./?compartilhado=1`, onde o app pega e verifica. Nada disso passa pela rede.

## Privacidade

- Nenhum pedido a outro site em tempo de execução: sem CDN, sem Google Fonts, sem analytics. Fonte, ícones e o leitor de prints são servidos pelo próprio site.
- A página tem uma Content-Security-Policy que só permite o próprio site (`'wasm-unsafe-eval'` é necessário para o leitor de prints).
- A mensagem e o print ficam só no aparelho. O que é compartilhado para o app fica no cache do próprio navegador.

## Como rodar

Não tem dependências nem build.

```bash
npm run dev     # abre em http://localhost:5174
npm test        # testes do motor, dos links e da limpeza do texto lido de prints (node --test)
```

Ou publique a pasta direto no GitHub Pages (precisa de HTTPS para o service worker e o Compartilhar).

## Como testar

- `npm test` roda sem navegador (`test/*.test.js`).
- Offline: abra o app, feche, desligue a rede (DevTools → Network → Offline) e abra de novo. Para o leitor de prints, use um print uma vez com rede e depois teste sem rede.
- Compartilhar: no Android, instale o app e compartilhe um print ou um texto do WhatsApp para "Tá Seguro?". No computador dá para simular com um formulário `multipart/form-data` enviado por `POST` para `./compartilhar` (campos `title`, `text`, `url` e o arquivo `imagem`).

## Estrutura

```
js/motor.js       motor de detecção (puro, roda no navegador e no Node)
js/links.js       análise de links (marcas imitadas, encurtadores, wa.me...)
js/ocr.js         leitura de prints no aparelho + limpeza do texto lido
js/app.js         interface: colar, print, voz, compartilhar
css/estilo.css    visual acessível, com tema claro e escuro
sw.js             funciona offline + recebe o Compartilhar (PWA)
manifest.webmanifest  instalação, ícones, atalhos e share target
vendor/tesseract/ leitor de prints (Tesseract.js) guardado no próprio site
fontes/           Atkinson Hyperlegible (woff2)
icones/           ícones PNG do app e dos atalhos
test/             testes (node --test)
```

## Licenças de terceiros

| Componente | Versão | Licença | Arquivo |
|---|---|---|---|
| Tesseract.js | 5.1.1 | Apache-2.0 | `vendor/tesseract/LICENSE-tesseract.js.txt` |
| tesseract.js-core (motor Tesseract OCR em WebAssembly) | 5.1.1 | Apache-2.0 | `vendor/tesseract/core/LICENSE-tesseract.js-core.txt` |
| Dados do português (`por.traineddata`, tessdata best_int) | 4.0.0 | Apache-2.0 | `vendor/tesseract/ORIGEM.txt` |
| Atkinson Hyperlegible (Braille Institute, via @fontsource 5.3.0) | — | SIL OFL 1.1 | `fontes/OFL.txt` |

Origem e SHA-256 dos arquivos do leitor: `vendor/tesseract/ORIGEM.txt`.

## Próximos passos

- [ ] Bot de WhatsApp e Telegram usando o mesmo `motor.js`: a pessoa encaminha a mensagem e recebe a resposta em áudio
- [ ] Modo "familiar de confiança": avisa um parente quando um golpe grave é detectado
- [ ] Base de golpes reportados pela comunidade

## Aviso

O Tá Seguro? ajuda, mas não é infalível. Na dúvida, **ligue para quem você confia** no número que você já conhecia.

---

Feito por [BAZZUKA-ROOT](https://github.com/BAZZUKA-ROOT) · Licença MIT
