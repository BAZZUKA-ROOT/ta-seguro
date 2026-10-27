// Motor de detecção de golpes do Tá Seguro?
// Roda 100% local (navegador ou Node). Nenhum texto sai do aparelho.

import { extrairLinks, analisarLink } from './links.js';

export { extrairLinks, analisarLink };

const LIMITE = 5000;

// Valor em dinheiro: "r$ 5.000", "700 reais", "2 mil", "50 conto".
const VAL = String.raw`(?:(?:r|us|u)\$ ?\d[\d.,]*(?: ?(?:mil|milhoes|milhao))?|[€£] ?\d[\d.,]*|\b\d[\d.,]* ?(?:mil|milhoes|milhao|reais|real|conto|contos|pila|pilas|dolares|euros)\b)`;
const re = (s) => new RegExp(s.replaceAll('VAL', VAL));

const PARENTES = String.raw`(?:chefe|patra|patroa|amig\w*|socio|socia|cunhad\w|colega|prim\w|sogr\w|namorad\w|esposa|marido|contador\w*|fornecedor\w*|vizinh\w|irma\w*|tio|tia|sobrinh\w|funcionari\w|dono|dona|parceir\w|conhecid\w|moco|moca)`;

const REGRAS = [
  {
    id: 'sequestro',
    peso: 80,
    titulo: 'Ameaça ou falso sequestro',
    explicacao: 'Golpistas ligam ou mandam mensagem dizendo que estão com alguém da família. Quase sempre é mentira.',
    padroes: [
      /\bsequestr/,
      /\b(estamos|to|tou|estou|tamo|ta|esta) com (o seu|a sua|seu|sua) (filh|net|marido|esposa|mae|pai|irma|sobrinh|menin)/,
      /\besta (aqui )?com a gente\b/,
      /\bse (chamar|avisar|ligar para|ligar pra|contar pra|falar com) (a )?policia\b/,
      /\bsem policia\b/,
      /\bquer (ver|ter) (ele|ela|seu filho|sua filha|seu neto|sua neta) (viv|de volta)/,
      /\b(eles|uns caras|os caras|bandidos) me (pegaram|levaram|prenderam)\b/,
      /\bse (desligar|voce desligar)\b.{0,40}\b(morre|mata|machuc|nunca mais)/,
      /\b(faz|faca|fazer) (tudo )?o que eles (mandarem|pedirem|querem)\b/,
      /\b(ele|ela) (morre|vai morrer|vai sofrer)\b/,
    ],
  },
  {
    id: 'sextorsao',
    peso: 70,
    titulo: 'Chantagem com fotos ou vídeos',
    explicacao: 'Dizem ter fotos ou vídeos seus para pedir dinheiro. Quase sempre é blefe. Não pague e não responda.',
    padroes: [
      /\b(tenho|temos|gravei|gravamos|consegui|conseguimos)\b.{0,30}\b(fotos?|videos?|gravac\w*|imagens?|prints?)\b.{0,40}\b(intim|nu|nua|pelad|sexo|adult|comprometedor|voce)/,
      /\b(hackeei|invadi|hackeamos|invadimos)\b.{0,30}\b(seu|sua|o seu|a sua|camera|celular|computador|conta)/,
      /\b(vou|vamos|irei|iremos) (divulgar|espalhar|mandar|enviar|publicar|vazar|postar)\b.{0,50}\b(familia|contatos|amigos|todo mundo|internet|redes|igreja|esposa|marido|filhos)/,
      /\bsites? (adulto|porno|de conteudo adulto)/,
      re(String.raw`(VAL|\bpix\b|\bpagar\b|\bdeposit\w*)[^\n]{0,30}\b(ou|senao|se nao|caso contrario)\b[^\n]{0,15}\b(mostro|conto|mando|espalho|divulgo|publico|vazo|entrego)\b`),
      /\b(mostro|conto|mando|espalho|divulgo|publico|vazo)\b[^\n]{0,40}\b(se nao|caso nao|senao)\b[^\n]{0,20}\b(pagar|mandar|pix|depositar|transferir)/,
      /\bsua familia (vai|ira) (sofrer|saber|ver)\b/,
    ],
  },
  {
    id: 'extorsao',
    peso: 20,
    titulo: 'Ameaça para pedir dinheiro',
    explicacao: 'Quem ameaça você ou sua família para pedir Pix é criminoso. Não pague, guarde a mensagem e ligue 190.',
    padroes: [
      /\b(eu |nos |a gente )?(sei|sabemos|conheco|conhecemos) onde (voce |seus filhos |sua familia |seu filho |sua filha )?(mora|moram|estuda|estudam|trabalha|trabalham)\b/,
      /\b(conheco|conhecemos|sei quem e|sabemos quem e) (a )?(sua familia|seus filhos|seu filho|sua filha|sua esposa|seu marido)\b/,
      /\bse (voce )?nao quiser (ter )?problema/,
      /\b(vamos|vou|iremos|a gente vai) (ai|na sua casa|ate voce|te) (cobrar|pegar|buscar|visitar|resolver)\b/,
      /\b(cobrar|resolver|acertar) pessoalmente\b/,
      /\b(faccao|comando|crime organizado|o crime|organizacao criminosa|milicia)\b.{0,60}\b(divida|conta|pagar|paga|cobrar|atrasad)/,
    ],
  },
  {
    id: 'codigo',
    peso: 60,
    nega: true,
    titulo: 'Pedido de código',
    explicacao: 'O código que chega por SMS é a chave do seu WhatsApp ou da sua conta. Quem pede esse código quer roubar sua conta.',
    padroes: [
      /\b(passa|passe|passar|manda|mande|mandar|envia|envie|enviar|informa|informe|informar|fala|fale|falar|diz|diga|dizer|confirma|confirme|confirmar|repassa|repasse|repassar|digita|digite|digitar|encaminha|encaminhe|me da|me de)\w* (pra mim |pra gente |para mim )?(o |esse |este |aquele |um |os |esses )?(numero do )?codigos?\b(?! (de rastreio|de barras|do boleto|de desconto|promocional|do cupom|do pedido|do produto|da reserva))/,
      /\bcodigos?\b(?! (de rastreio|de barras|do boleto|de desconto|promocional|do cupom|do pedido|do produto|da reserva))[^\n]{0,60}\b(me |nos |pra mim|para mim|pra gente)\s?(passa|manda|envia|informa|fala|diz|confirma|repassa|encaminha)?/,
      /\bcodigo (de )?(\d|seis|cinco|quatro|oito) (digitos|numeros)\b/,
      /\b(\d|seis|cinco|quatro) (digitos|numeros) (que|q) (chegou|chegaram|recebeu|vao chegar|chegar)/,
      /\b(\d|seis|cinco|quatro|uns|os|uns) (numeros|digitos)\b[\s\S]{0,60}\b(print|me (diz|diga|fala|fale|passa|passe|manda|mande|envia|envie|informa)|quais (sao|foram))\b/,
      /\b(cadastrei|coloquei|botei|usei) (o )?seu (numero|celular|telefone)\b/,
      /\bcodigo (que|q) (chegou|chegar|vai chegar|recebeu|voce recebeu|foi enviado|te enviaram|enviamos|mandamos|te mandaram|caiu)/,
      /\b(enviei|mandei|chegou|caiu|foi) (um |o |uma )?(codigo|sms|mensagem com (um )?codigo)\b.{0,40}\b(sem querer|por engano|errado|no seu numero|pro seu numero|pra voce|para voce|no seu celular)/,
      /\b(manda|mande|envia|envie|tira) (um )?print\b.{0,40}\b(codigo|sms|mensagem|tela)/,
      /\b(sms|mensagem)\b.{0,40}\b(numeros|digitos)\b[\s\S]{0,40}\b(me diz|me fala|me passa|me manda|quais|qual e|print)/,
      /\b(precisa|pode|consegue|poderia) me (passar|mandar|enviar|informar|falar|dizer|repassar) (o |esse )?codigo\b/,
      /\bcodigo (que )?(eu |nos |a gente )?(vou|vamos|vai|iremos|ira) (te )?(mandar|enviar|chegar|aparecer)\b/,
      /\bcodigo (que )?(vai|deve|ira) (chegar|aparecer|cair)\b/,
    ],
  },
  {
    id: 'acesso_remoto',
    peso: 60,
    nega: true,
    titulo: 'Pedido para instalar aplicativo de acesso',
    explicacao: 'Esses aplicativos deixam outra pessoa mexer no seu celular de longe e ver tudo, até o aplicativo do banco.',
    padroes: [
      /\b(anydesk|any desk|teamviewer|team viewer|rustdesk|quicksupport|quick support|airdroid|ammyy|ultraviewer|alpemix|supremo remote)\b/,
      /\b(compartilh|espelh|transmit)\w* (a |sua |de |da )?tela\b/,
      /\bacess\w* (o seu|seu|sua|o|a sua) (celular|computador|aparelho|telefone|pc|notebook) (remotamente|a distancia|de longe)/,
      /\b(acesso|controle) remoto\b/,
      /\beu (te )?(guio|oriento|vou te guiando|vou te orientando)\b/,
      /\bvou (te )?ditar\b/,
      /\bdeix\w* (a tela|o celular|o aparelho) (ligad|desbloquead|aberto)/,
    ],
  },
  {
    id: 'motoboy_cartao',
    peso: 60,
    nega: true,
    titulo: 'Querem buscar seu cartão',
    explicacao: 'Banco nunca manda ninguém buscar cartão na sua casa. Quem vai buscar é o golpista.',
    padroes: [
      /\b(motoboy|motoqueiro|portador|funcionario|representante|tecnico|courier|entregador|agente|mensageiro)\b.{0,60}\b(busc|recolh|retir|peg|colet)\w*\b.{0,30}\bcart(ao|oes)\b/,
      /\b(busc|recolh|retir|colet)\w* (o |seu |o seu |os |seus )?cart(ao|oes)\b.{0,40}\b(casa|residencia|endereco|ai|hoje)/,
      /\bcort\w*\b.{0,30}\bcartao\b.{0,50}\bchip\b/,
      /\b(coloc|guard|ponha|poe|bota)\w* (o )?(cartao )?(num|em um|no|dentro do|dentro de um) envelope/,
      /\bsenha (anotad|escrit|num papel|no papel)/,
      /\b(entregue|entregar|entrega) (o |seu |o seu )?cartao\b.{0,40}\b(motoboy|portador|funcionario|representante|ao nosso)/,
      /\b(motoboy|motoqueiro|portador|entregador|mensageiro|courier)\b.{0,50}\bsenha\b/,
      /\bsenha\b.{0,50}\b(ao|pro|para o|com o) (motoboy|motoqueiro|portador|entregador|mensageiro|funcionario)\b/,
      /\b(recolh|busc|retir|colet|peg)\w* (o |seu )?(cartao )?(antigo|velho|vencido|bloqueado)\b/,
    ],
  },
  {
    id: 'falso_parente',
    peso: 30,
    titulo: 'Alguém dizendo que trocou de número',
    explicacao: 'Golpistas fingem ser filho, neto ou amigo que "trocou de número" para depois pedir dinheiro. É o golpe mais comum no WhatsApp.',
    padroes: [
      /\b(troquei|mudei|tive que trocar|precisei trocar) (de |o meu |meu |o )?(numero|celular|telefone|chip|whatsapp)\b(?!.{0,40}\b(numero (e|eh|continua|ainda e) o mesmo|mesmo numero|numero continua))/,
      /\b(esse|este|esse aqui|este aqui) (e|eh|aqui e|agora e|vai ser) (o )?meu (novo )?(numero|contato|whatsapp)/,
      /\b(salva|salve|salvar|anota|anote|grava|grave|adiciona|adicione|atualiza|atualize) (ai )?(esse|este|o meu|meu|o|ele|a) (novo )?(numero|contato)/,
      /\b(numero|contato|whatsapp|chip) novo\b/,
      /\b(meu|um|o) novo (numero|contato|whatsapp|chip)\b/,
      /\b(apaga|apague|exclui|exclua|deleta) (o |meu )?(numero|contato) (antigo|velho)/,
      /\b(apaguei|desinstalei|perdi|reinstalei|bloquearam|bloqueou|clonaram|caiu) (o |meu |o meu )?(whatsapp|contatos)\b/,
      /\b(to|estou|tou|agora to|agora estou|ando) (com|usando) (outro|um outro|esse|este|um novo|o novo) (numero|chip|celular|whatsapp|telefone)\b/,
      /\b(esse|este) (e|eh|aqui e) o (novo|meu agora|novo numero)\b/,
      /\b(esse|este) (numero|chip) (agora|e o que to usando|que to usando)\b/,
      [/\b(me chama|me chame|me responde|me responda|fala comigo|me manda mensagem|chama) (aqui|por aqui|so aqui|nesse numero|neste numero|nesse|neste)\b/, 15],
    ],
  },
  {
    id: 'celular_outro',
    peso: 15,
    titulo: 'Diz que está sem o celular de sempre',
    explicacao: 'Dizer que o celular quebrou ou que está no celular de outra pessoa é o começo do golpe do falso parente.',
    padroes: [
      /\b(meu )?(celular|telefone|cel|aparelho)( antigo| velho| de sempre)? (caiu|quebrou|foi roubado|roubaram|molhou|deu problema|estragou|pifou|deu pau|deu defeito|caiu na agua)\b(?!.{0,30}\b(ja (arrumei|consertei|voltou)|consertado))/,
      /\b(perdi|roubaram|quebrei|derrubei|furtaram|levaram) (o |meu |o meu )?(celular|telefone|chip|cel|aparelho)\b/,
      /\b(to|estou|tou|ta|esta) (com|usando|no) (o )?(celular|telefone|numero|cel|whatsapp) d(e|a|o) (um |uma )?(amig|colega|vizinh|outra pessoa|trabalho|enfermeir|moco|moca)/,
      /\b(oi|ola|e ai|alo)?\s?(mae|mamae|pai|papai|tia|tio|vo|voa|vovo|madrinha|padrinho|amiga|amigo|filho|filha|sogra|sogro)\b.{0,15}\bsou eu\b/,
      /\badivinha quem (e|eh)\b/,
    ],
  },
  {
    id: 'emergencia',
    peso: 20,
    titulo: 'Emergência inventada',
    explicacao: 'Golpistas inventam prisão, acidente ou hospital para você mandar dinheiro sem pensar. Ligue para a pessoa antes.',
    padroes: [
      /\b(fui|foi|fomos|to|tou|estou|esta|ta) (pres|detid|abordad|assaltad|atropelad)/,
      /\bme (prenderam|detiveram|assaltaram|roubaram|pegaram na blitz)\b/,
      /\b(delegacia|fianca|advogado de plantao)\b/,
      /\b(sofri|sofreu|sofremos|tive|teve|tivemos) (um )?(acidente|batida)\b/,
      /\b(bati|batemos|bateu|capotei|capotou) (o |com o |no |o meu )?(carro|moto|caminhao)/,
      /\batropel(ei|ou|ado|ada)\b/,
      /\b(to|estou|tou|esta|ta|deu entrada|internad\w*|levaram (ele|ela|o|a) pr[oa]|levaram pro|foi levad\w* pro)\b.{0,15}\b(hospital|pronto.?socorro|upa|uti|santa casa)\b/,
      /\b(esta|ta|foi|ficou|estou|to) internad[oa]\b/,
      /\b(apos|depois de|num|em um|por causa de) (um )?(acidente|atropelamento|assalto)\b/,
      /\bacidente (grave|de carro|de moto|de transito)\b/,
      /\b(cirurgia|operacao|exame|remedio|tratamento) (de |com )?(urgencia|urgente|emergencia)\b/,
      /\b(resultado|exame|biopsia)\b.{0,30}\b(alterad|grave|preocupante|deu problema)/,
    ],
  },
  {
    id: 'pix_terceiro',
    peso: 25,
    nega: true,
    titulo: 'Pix para conta de outra pessoa',
    explicacao: 'Pedir Pix para conta no nome de outra pessoa ("do meu chefe", "do amigo") é sinal forte de golpe.',
    padroes: [
      re(String.raw`\b(no|em) nome (do|da|de) (meu |minha |um |uma )?${PARENTES}`),
      /\bconta (nao (esta|ta|e|eh)|que nao (esta|ta|e)) (no |em )?(meu|minha) nome\b/,
      /\bnao (esta|ta|e|eh|vai estar|vai aparecer) (no |em )?(meu|minha) nome\b/,
      re(String.raw`\b(chave|conta|pix)\b.{0,30}\b(e|eh|ta|esta|vai) (no nome )?(do|da) (meu |minha )?${PARENTES}`),
      /\bpix (em|no) nome de\b/,
      /\bvai aparecer (outro|o) nome\b/,
      /\b(numero|chave) (que|q) (e|eh) (dele|dela)\b/,
    ],
  },
  {
    id: 'dados',
    peso: 35,
    nega: true,
    titulo: 'Pedido de senha ou dados pessoais',
    explicacao: 'Nenhum banco, empresa ou órgão do governo pede sua senha, código ou dados do cartão por mensagem.',
    padroes: [
      /\b(informe|informar|informa|digite|digitar|digita|confirme|confirmar|confirma|passe|passar|passa|manda|mande|mandar|envie|enviar|envia|cadastre|cadastrar|atualize|atualizar|fala|falar|fale|responda|responder|forneca|fornecer|preciso d[ae]|precisamos d[ae]|necessito d[ae]|qual (e )?(a )?|me diz|me diga)\b.{0,50}\b(senha|cvv|token)\b(?! (do|da|de) (wi|wifi|portao|internet|rede|netflix|cadeado|alarme))/,
      [/\b(a |sua )senha (do|da|de) (seu |sua )?(meu inss|inss|gov\.?br|gov|aplicativo|app|internet banking|caixa tem)\b/, 45],
      [/\bfoto (do|de|da) (seu |sua |o |a )?cartao\b.{0,30}\b(frente e verso|dos dois lados|frente e tras)/, 45],
      /\b(senha|cvv)\b.{0,25}\b(informe|digite|confirme|passe|mande|envie|responda|para (confirmar|validar|desbloquear|liberar|continuar))\b/,
      /\bcvv\b/,
      /\b(informe|digite|confirme|mande|envie|passe|atualize|preencha|cadastre)\b.{0,20}\b(numero|dados|validade) do (seu )?cartao\b/,
      /\bcodigo de seguranca do cartao\b/,
      /\b(nome|cpf|rg|conta|agencia)\b.{0,25}\b(e|com|mais) (a )?senha\b(?! (do|da|de) (wi|wifi|portao|internet|rede|netflix))/,
      /\b(selfie|foto|video)\b.{0,30}\b(segurando|com) (o |seu |sua |a )?(rg|documento|cnh|identidade|cartao)/,
      /\b(envie|mande|manda|envia|tire|tira)\b.{0,20}\bfoto (do|da|de) (seu |sua |o |a )?(rg|cnh|documento|identidade|cartao|rosto)/,
      /\b(atualiz|confirm|valid|recadastr|regulariz|complet)\w* (de |dos |do |os |seus |sua |o |seu |a |suas )?(dados|cadastro|informacoes)( pessoais| bancarios| cadastrais)?\b/,
      /\b(atualizacao|recadastramento|validacao) cadastral\b/,
      [/\b(informe|informar|envie|enviar|mande|mandar|passe|passar)\b (os |seus |sua |o |seu )?(dados|dados pessoais|endereco completo)\b/, 20],
      /\b(cadastre|cadastrar|vincule|vincular|informe) (o |seu |um )?cartao\b/,
      /\bdados bancarios\b/,
    ],
  },
  {
    id: 'falsa_central',
    peso: 35,
    nega: true,
    titulo: 'Falsa central do banco',
    explicacao: 'O banco não manda mensagem pedindo para "confirmar uma compra" por link ou por telefone que eles mesmos passam.',
    padroes: [
      /\bcentral (de )?(seguranca|antifraude|anti fraude|fraude|fraudes|de protecao)\b/,
      /\b(departamento|setor|equipe|time) (de )?(fraude|fraudes|seguranca|antifraude|prevencao)/,
      /\bconta (de )?seguranca\b/,
      /\b(pix|transferencia|deposito) (de )?teste\b/,
      /\b(conta|cartao|whatsapp|chave pix) (foi |esta |ta )?(invadid|hackead|clonad|comprometid)/,
      /\balguem (esta )?(tent|tentou|usando|usou)\w*\b.{0,30}\b(cadastrar|acessar|usar|sua conta|seu cartao|sua chave|seu cpf)/,
      [/\b(nao reconhece|caso (nao (reconheca|tenha sido voce)|desconheca)|se nao (foi voce|reconhece|reconhecer|tiver sido voce))\b/, 10],
      [/\b(compra|transacao|movimentacao|transferencia|acesso|pix|emprestimo) (suspeit|nao (reconhecid|autorizad)|incomum|indevid)/, 15],
      [/\b(compra|transacao|pix|transferencia|saque)\b.{0,50}\b(aprovad|realizad|efetuad|utilizad)\w*/, 10],
      [/\b(cartao|conta)\b.{0,30}\b(foi )?utilizad\w* (em|para|numa|em uma)\b/, 10],
      [/\b(responda|digite|envie|mande)\b.{0,6}\b(sim|nao|s|n|1|2|9)\b.{0,30}\b(cancelar|bloquear|estornar|contestar|cancelamento|bloqueio)\b/, 25],
      [/\bvoce (reconhece|realizou|autorizou|fez|solicitou) (essa|esta|a|uma|um|o) (compra|transacao|transferencia|pix|emprestimo|cadastro)/, 15],
      [/\b(caso|se) (nao (reconheca|reconhece|tenha sido voce|foi voce|tiver sido voce)|desconheca|desconhece)\b.{0,40}\b(responda|ligue|digite|envie|clique|acesse|entre em contato|chame|retorne)\b/, 35],
      [/\b(compra|transferencia|pix|transacao|saque|emprestimo|pagamento)\b.{0,50}\b(pendente|aguardando|em analise) (de )?(confirmacao|aprovacao|autorizacao|liberacao)\b/, 15],
      [/\b(chamada|ligacao) de video\b.{0,60}\b(confirmar|validar|verificar|biometria|identidade|seguranca|cadastro|desbloque|bloqueio)/, 35],
      [/\b(confirmar|validar|verificar|atualizar) (a |sua )?(biometria|identidade|reconhecimento facial)\b.{0,40}\b(video|chamada|ligacao|link|selfie)/, 35],
    ],
  },
  {
    id: 'gerente',
    peso: 25,
    titulo: 'Diz ser gerente ou atendente',
    explicacao: 'Golpistas se passam por gerente ou atendente para ganhar sua confiança. Fale com seu banco por um número que você já tem.',
    padroes: [
      /\b(sou|aqui e|aqui eh|falo com voce como|quem fala e) (o |a )?(seu |sua )?(gerente|gestor|gestora|atendente|consultor|consultora|analista)\b/,
      /\b(gerente|atendente|consultor|consultora) (do|da) (seu |sua )?(banco|conta|agencia|cartao)/,
      /\b(sou eu|eu sou|aqui e|aqui quem fala e)[ ,]+(o |a )?(seu |sua )?(gerente|gestor|gestora|consultor|consultora)\b/,
      /\b(falo|falamos|aqui e|somos|sou|e) (do|da) (setor|departamento|area|central|administradora|operadora) (juridic\w*|financeir\w*|de cobranca|de seguranca|de atendimento|de credito|do (seu )?cartao|do (seu )?banco)\b/,
      /\b(setor|departamento) (juridico|financeiro|de cobranca|de credito)\b.{0,15}\b(do|da) (banco|caixa|itau|bradesco|santander|nubank|inter|c6|sicoob|sicredi|banco do brasil)\b/,
    ],
  },
  {
    id: 'instalar_app',
    peso: 20,
    nega: true,
    titulo: 'Pede para baixar aplicativo',
    explicacao: 'Aplicativo enviado por link pode ser um vírus que rouba senhas. Baixe aplicativos só pela loja oficial do celular.',
    padroes: [
      /\b(baix|instal|atualiz)\w* (?:(?:o|um|este|esse|nosso|novo|nova|seu|a nova versao do) ){0,2}(aplicativo|app|programa|arquivo|apk|modulo|plugin|extensao)\b(?![^\n]{0,25}\b(oficial|da loja|na loja|pela loja|play store|pela play|na play|app store|apple store)\b)/,
      /\.apk\b/,
      /\b(vou|vamos|irei) (te )?(passar|mandar|enviar) (um |o )?(programa|aplicativo|app|arquivo)\b/,
      [/\b(whatsapp|whats|zap|instagram) (gold|plus|pro|premium|azul|rosa|turbo)\b/, 40],
      [/\bquem (visitou|viu|olhou|espiou) (o )?seu perfil\b/, 30],
    ],
  },
  {
    id: 'taxa_antecipada',
    peso: 30,
    nega: true,
    titulo: 'Pede pagamento para liberar dinheiro',
    explicacao: 'Se precisa pagar uma taxa antes para receber dinheiro, prêmio, empréstimo ou emprego, é golpe.',
    padroes: [
      [re(String.raw`\b(para|pra|p|antes de) (a )?(receber|liberar|sacar|desbloquear|resgatar|ativar|expedir|emitir|reagendar|retirar|concluir|finalizar|efetivar|aprovar|agilizar|depositar|transferir|creditar|garantir|cair|liberacao|desbloqueio|resgate|recebimento|saque|emissao|aprovacao|efetivacao|contratacao)(?: (o |a |os |as |seu |sua |seus |suas |do |da )?\w+)?\b[\s\S]{0,60}\b(taxa|tarifa|custas|caucao|seguro|entrada|emolumentos|imposto|frete|guia|VAL)`), 45],
      [re(String.raw`\b(taxa|tarifa|custas|caucao|seguro|valor|boleto|guia|VAL)\b[\s\S]{0,40}\b(para|pra|p) (receber|liberar|sacar|desbloquear|resgatar|ativar|expedir|emitir|reagendar|retirar|concluir|finalizar|efetivar|aprovar|agilizar|creditar|garantir|cair|reservar)\b`), 40],
      [/\b(pague|pagar|paga|deposite|depositar|transfira|faca o pix|faz o pix|mande|manda)\b.{0,40}\b(para|pra) (garantir|liberar|receber|reservar|desbloquear|resgatar|confirmar a vaga)\b/, 40],
      [/\b(confirm|garant|reserv|liber|agend)\w*\b.{0,30}\b(com|mediante|apos) (o |um )?(pagamento|deposito|pix)\b/, 40],
      [/\b(paga|pague|pagar|pagamento|custo|comprar|compra)\b.{0,30}\b(uniforme|exame admissional|cracha|kit de trabalho|material de trabalho|curso obrigatorio|treinamento obrigatorio)\b/, 40],
      [re(String.raw`VAL (de|como|pra|para|para dar de|pra dar de) (garantia|caucao|entrada|sinal)\b`), 30],
      [re(String.raw`\b(para|pra) (o |a )?(treinamento|curso|admissao|contratacao|vaga|inscricao)\b.{0,40}\b(depositar|deposite|pagar|pague|pix|VAL)`), 40],
      [/\b(pix|pague|pagar|paga|deposit\w*|transfer\w*)\b.{0,50}\b(que|e|ai|dai) (eu |a gente )?(libero|liberamos|desbloqueio|desbloqueamos|solto|despacho)\b/, 40],
      [/\b(recolher|pagar|pague|recolhimento|pagamento) (a |da |de |uma |o )?(guia|custas|darf)\b/, 25],
      [/\b(pague|pagar|paga|pagamento d[ae]) (a |uma )?(taxa|tarifa)\b/, 15],
      [/\b(para|pra) (garantir|confirmar|segurar) (a |o |sua |seu )?(reserva|vaga|data|diaria|hospedagem|imovel|casa|chale|produto|pedido)\b.{0,50}\b(preciso|pague|pix|sinal|adiantad\w*|antecipad\w*|\d+ ?%|r\$)/, 30],
      [/\b((so|apenas) (paga|pagar|pague|precisa pagar)|(paga|pagar|pague|pagando) (so|apenas)) (o |a )?(frete|envio|taxa|entrada|sinal)\b/, 35],
      [/\b(adquir|compr|pag)\w*\b.{0,20}\b(kit (de )?(treinamento|inicial|trabalho|materiais|boas vindas|iniciante)|apostila|material didatico)\b/, 40],
      [/\b(transferencia|pix|deposito) de (validacao|verificacao|confirmacao|ativacao)\b/, 45],
      [re(String.raw`\b(sinal|entrada|adiantamento|caucao) de VAL`), 15],
      /\btaxa (de )?(liberacao|cadastro|emissao|visita|agendamento|desbloqueio|saque|seguro|abertura|adesao|administrativa|antecipada|servico|reativacao|resgate|ativacao|regularizacao|transferencia|antecipacao|analise|processamento|cartorio)\b/,
      /\bcustas (processuais|do processo|cartoriais|judiciais|de cartorio)\b/,
      /\b(caucao|anuidade antecipada|seguro prestamista|emolumentos)\b/,
      /\b(valor|taxa|deposito) (de )?(entrada|garantia|seguranca|abertura)\b/,
      /\b(pague|pagar|pagando|paga|pagamento|deposite|depositar|transfira) (primeiro|antes|adiantado|antecipado)\b/,
    ],
  },
  {
    id: 'pix_falso',
    peso: 55,
    nega: true,
    titulo: 'Comprovante ou Pix que pode ser falso',
    explicacao: 'Golpistas mostram Pix "agendado" ou comprovante falso e pedem para você devolver a diferença ou entregar o produto.',
    padroes: [
      /\b(devolv|retorn|estorn|reembols|manda|mande)\w* (a |o |essa |esse )?(diferenca|valor excedente|troco|que passou|excedente|valor a mais|que sobrou|que mandei a mais)\b/,
      /\b(paguei|transferi|mandei|fiz o pix|depositei|caiu)\b.{0,30}\b(a mais|valor maior|mais do que|duplicado|duas vezes|em dobro)\b/,
      [/\b(pix|transferencia|pagamento|deposito|comprovante)\b.{0,30}\b(agendad|agendament|programad)\w*\b[\s\S]{0,80}\b(manda|mande|envia|envie|entrega|libera|despach|produto|mercadoria|devolv)/, 50],
      [/\b(ja )?(agendei|programei) (o |um )?(pix|pagamento|transferencia)\b/, 30],
      [/\b(faco|vou fazer|posso fazer|mando|te mando|faco um) (um |o )?pix (agendad|programad)\w*/, 40],
      [/\b(motoboy|buscar|retirar|pegar)\b[\s\S]{0,60}\b(pix|pagamento) (agendad|programad)\w*/, 40],
    ],
  },
  {
    id: 'pix_engano',
    peso: 40,
    nega: true,
    titulo: 'Pix “por engano” pedindo devolução',
    explicacao: 'Golpistas dizem que mandaram Pix por engano e pedem devolução para outra conta. Veja no aplicativo do banco se o dinheiro caiu mesmo.',
    padroes: [
      /\b(engano|errado|errada|sem querer|por erro|equivoco|enganei|errei)\b[\s\S]{0,80}\b(devolv|estorn|retorn|reembols)(e|a|er|ar|esse|am|em|ucao)\b/,
      /\b(devolv|estorn|retorn|reembols)(e|a|er|ar|esse|am|em)\b[\s\S]{0,80}\b(engano|errad|sem querer|por erro|equivoco)/,
      /\b(caiu|mandei|transferi|enviei|fiz um pix|depositei)\b.{0,40}\b(na sua conta|pra voce|para voce|pra sua conta|na tua conta)\b[\s\S]{0,80}\b(era pra|era para|nao era|errad|engano|sem querer)/,
      [/\b(devolv|estorn)\w*\b.{0,20}\b(nessa|nesta|pra essa|para essa|nesse|neste|pra esse) (chave|conta|pix|numero)\b/, 25],
    ],
  },
  {
    id: 'romance',
    peso: 30,
    titulo: 'Romance pela internet com pedido estranho',
    explicacao: 'Pessoas que você só conhece pela internet e logo falam de amor e dinheiro costumam ser golpistas.',
    padroes: [
      /\b(militar|soldado|capitao|sargento|general|medico|engenheiro|piloto) (americano|americana|dos eua|da onu|ingles|em missao|na siria|no exterior)/,
      /\b(missao|base militar|plataforma de petroleo)\b.{0,20}\b(siria|afeganistao|iraque|onu|exterior|oriente|iemen|africa|alto mar)/,
      /\bme apaixonei\b/,
      /\b(caixa|pacote|encomenda|presente|mala)\b.{0,40}\b(dolares|joias|euros|ouro|libras)/,
      /\b(viuvo|viuva)\b.{0,40}\b(sozinh|filh|carente)/,
      /\bnumero errado\b.{0,80}\b(conversar|conhecer|amizade|simpatica|simpatico|linda|lindo)/,
      re(String.raw`\b(meu amor|minha querida|meu querido|amor da minha vida|te amo|minha linda|meu bem|querida)\b.{0,100}\b(pix|dinheiro|taxa|transfer\w*|deposit\w*|alfandega|passagem|VAL)`),
      /\b(alfandega|taxa alfandegaria)\b.{0,60}\b(presente|pacote|caixa)/,
      /\b(bloque|congel|ret)\w* (a )?(minha conta|meu cartao|meu dinheiro)\b.{0,40}\b(exterior|europa|eua|estados unidos|londres|inglaterra|portugal|siria|base|plataforma)\b/,
      /\b(minha conta|meu cartao|meu dinheiro|meus fundos)\b(?=.{0,80}\b(exterior|europa|eua|estados unidos|londres|inglaterra|portugal|siria|base|plataforma|alfandega)\b).{0,80}\b(bloquead|retid|congelad|pres[oa])/,
    ],
  },
  {
    id: 'judicial',
    peso: 25,
    titulo: 'Falso processo ou advogado',
    explicacao: 'Golpistas fingem ser advogado ou da Justiça dizendo que você tem dinheiro de processo para receber, mas pedem taxa antes.',
    padroes: [
      /\b(precatorio|alvara|rpv|acao trabalhista|acao judicial|acao coletiva|processo (judicial|trabalhista|administrativo|n|numero|de revisao)|causa ganha|ganhou (a|o) (acao|processo|causa))\b/,
      /\b(juiz|juiza|justica|tribunal|vara)\b.{0,30}\b(liberou|determinou|autorizou|bloqueou|expediu)/,
      /\b(escritorio de advocacia|advocacia|advogad\w|doutor\w*|dr|dra)\b.{0,60}\b(processo|acao|indenizacao|valor|causa|receber|precatorio)/,
      /\bvalores? (da|do) (acao|processo|causa|indenizacao)\b/,
    ],
  },
  {
    id: 'aluguel',
    peso: 25,
    nega: true,
    titulo: 'Aluguel ou venda sem poder visitar',
    explicacao: 'Dono que não pode mostrar o imóvel e pede sinal adiantado é golpe comum. Só pague depois de visitar e ver o contrato.',
    padroes: [
      /\b(moro|morando|estou|to|trabalho|trabalhando) (fora|no exterior|em outro estado|em outra cidade|em portugal|nos eua|na europa|viajando)\b.{0,80}\b(imovel|apartamento|casa|kitnet|chave|aluguel|visita|mostrar)/,
      /\bnao (consigo|posso|da pra|da para|vou poder|tenho como) (mostrar|te mostrar|ir ai|fazer a visita|marcar visita|abrir|encontrar)/,
      /\b(chave|chaves|contrato)\b.{0,20}\b(pelo|por|via) (correio|sedex|motoboy|transportadora)/,
      /\b(adiantad|antecipad|sinal|caucao|reserva|primeiro aluguel|deposito)\w*\b.{0,40}\b(aluguel|imovel|apartamento|casa|kitnet|quarto|reservar)/,
      /\b(aluguel|imovel|apartamento|casa|kitnet|quarto)\b.{0,60}\b(adiantad|sinal|caucao|reserva|antes da visita|sem visita)(?!\w* (so |apenas )?(depois|apos|na hora))/,
      /\boutros interessados\b/,
      /\b(para|pra) (visitar|fazer a visita|ver o imovel|conhecer o imovel|ver a casa|ver o apartamento|reservar o imovel)\b.{0,50}\b(pag|taxa|sinal|deposit|pix|transfer)/,
    ],
  },
  {
    id: 'leilao',
    peso: 20,
    titulo: 'Leilão com preço muito baixo',
    explicacao: 'Sites falsos de leilão anunciam carros e casas baratos e somem com o dinheiro.',
    padroes: [/\bleil(ao|oes|oeiro|oeira)\b/, /\barremat/, /\b(veiculo|carro|moto|imovel)s? (apreendid|retomad|de financeira|de banco)/],
  },
  {
    id: 'doacao',
    peso: 12,
    titulo: 'Pedido de doação',
    explicacao: 'Golpistas usam tragédias e crianças doentes para pedir Pix. Doe só para quem você conhece, pelo site oficial.',
    padroes: [
      /\b(doacao|doacoes|doe|doar|vaquinha|ajude|ajudem|contribua|contribuam|campanha)\b.{0,60}\b(crianca|vitimas|enchente|tragedia|tratamento|cirurgia|familia|desabrigad|cancer|hospital|animais|instituto|ong)/,
      /\b(vitimas|desabrigad\w*|enchentes?|tragedia|crianca doente|perderam tudo)\b[\s\S]{0,60}\b(pix|doe|doar|ajude|contribua)/,
      /\b(qualquer (ajuda|valor|quantia)|doe|ajude|ajudem|contribua)\b.{0,40}\bpix\b/,
      [/\b(vaquinha|quem puder (ajudar|contribuir))\b[\s\S]{0,100}\bpix\b/, 25],
      /\b(internad\w*|doente|remedio caro|tratamento caro|leite|fraldas?)\b[\s\S]{0,80}\b(qualquer ajuda|qualquer valor|doe|ajudem)\b/,
    ],
  },
  {
    id: 'chave_pessoal',
    peso: 30,
    titulo: 'Chave Pix de e-mail pessoal',
    explicacao: 'Empresa, banco ou governo não recebe pagamento em chave Pix de e-mail pessoal (Gmail, Hotmail).',
    padroes: [/\b(chave|pix|pagamento|deposito)\b.{0,40}@(gmail|hotmail|outlook|yahoo|bol|uol|live|icloud)\b/],
  },
  {
    id: 'aposta',
    peso: 40,
    titulo: 'Jogo de aposta com promessa de ganho',
    explicacao: 'Jogos como "tigrinho" e "plataformas pagando" são feitos para você perder dinheiro.',
    padroes: [
      /\b(tigrinho|fortune tiger|fortune ox|aviator|aviaozinho|jogo do aviao|jogo do bicho online|roletinha|cassino|bet|bets|blaze)\b/,
      /\b(plataforma|site|jogo)\b.{0,30}\b(pagando|paga muito|bugad|que paga|que mais paga|nova pagando)/,
      /\b(banca|deposito) (minimo|inicial)\b.{0,40}\b(ganh|sac|lucr)/,
    ],
  },
  {
    id: 'heranca',
    peso: 30,
    titulo: 'Herança ou bilhete premiado',
    explicacao: 'Ninguém aparece do nada com herança ou bilhete premiado para dividir com você. É golpe antigo.',
    padroes: [
      /\bheranca\b/,
      /\bbilhete (premiado|da loteria|ganhador)/,
      /\bparente distante\b/,
      /\b(herdeir\w*|espolio|testamento)\b/,
      /\b(falecid\w*|morreu)\b.{0,80}\b(mesmo sobrenome|seu sobrenome)\b/,
    ],
  },
  {
    id: 'consorcio',
    peso: 30,
    titulo: 'Consórcio ou crédito fácil demais',
    explicacao: 'Consórcio "já contemplado" ou crédito liberado sem análise, pedindo pagamento antes, é golpe.',
    padroes: [
      /\bconsorcio\b.{0,60}\b(contemplad|sem (sorteio|lance)|carta de credito|garantid)/,
      /\bcarta (de credito )?contemplada\b/,
      /\bsem sorteio (e )?sem lance\b/,
      /\b(emprestimo|credito|financiamento)\b.{0,40}\b(aprovado|liberado|pre aprovado|garantido)\b.{0,40}\b(sem consulta|negativad|nome sujo|sem analise|para negativados)/,
      /\b(sem consulta (ao )?(spc|serasa)|mesmo negativad\w*|para negativad\w*)\b/,
      [/\b(credito|emprestimo|financiamento|cartao de credito|limite)\b.{0,40}\b(foi |esta |ja esta )?(aprovad|liberad|pre aprovad)/, 15],
    ],
  },
  {
    id: 'cura',
    peso: 35,
    titulo: 'Remédio milagroso',
    explicacao: 'Remédio que "cura tudo" ou que "os médicos escondem" não existe. Converse com seu médico.',
    padroes: [
      /\b(cura|curar|curou|elimina|eliminar|acaba com|acabar com|reverte|reverter|fim d[ao])\b.{0,40}\b(diabetes|cancer|pressao alta|artrose|artrite|alzheimer|dor nas costas|varizes|catarata|surdez|impotencia|labirintite|colesterol|obesidade|zumbido)/,
      /\b(remedio|capsula|capsulas|formula|cha|oleo|gotas|suplemento|tratamento) (milagros|natural que (cura|acaba)|secret|proibid)/,
      /\bmedicos? (nao querem|odeiam|escondem|nao contam)/,
      /\b(anvisa|farmacias?|industria farmaceutica) (proibiu|nao quer|esconde)/,
    ],
  },
  {
    id: 'famoso',
    peso: 25,
    titulo: 'Famoso indicando ou dando dinheiro',
    explicacao: 'Golpistas usam vídeo falso de famoso (feito por computador) para vender, sortear ou pedir dinheiro.',
    padroes: [
      /\b(famos[oa]s?|global|apresentador\w*|ator|atriz|cantor\w*|bilionari\w|jornalista|doutor da tv|medico da tv|elon musk|silvio santos|luciano huck|faustao|drauzio|ana maria braga|neymar|roberto carlos|ratinho|xuxa|virginia|william bonner|lula|bolsonaro|galvao bueno|tiago leifert|marcos mion)\b.{0,60}\b(recomenda|revela|revelou|indica|indicou|esta (dando|doando|distribuindo|sorteando|pagando|liberando)|ensina|garante|aprovou|investe|lancou|liberou|liberando|sorteando|doando|dando)\b/,
      /\b(aqui e|sou|eu sou|quem fala e|oi,? aqui e) (o |a )?(elon musk|silvio santos|luciano huck|faustao|drauzio|ana maria braga|neymar|roberto carlos|ratinho|xuxa|virginia|william bonner|galvao bueno|tiago leifert|marcos mion|padre marcelo|padre fabio de melo)\b/,
    ],
  },
  {
    id: 'suporte',
    peso: 35,
    nega: true,
    titulo: 'Falso aviso de vírus ou suporte',
    explicacao: 'Avisos de vírus com número para ligar são falsos. Suporte de verdade não aparece do nada pedindo acesso.',
    padroes: [
      /\b(virus|malware|hacker|invasao|ameaca)s?\b.{0,40}\b(detectad|encontrad|identificad|no seu|em seu|instalad)/,
      /\bseu (computador|celular|aparelho|pc|notebook|windows|iphone|android) (esta |foi |pode estar )?(infectad|invadid|comprometid|hackead|bloquead|em risco)/,
      /\b(suporte|assistencia|tecnico) (tecnic\w* )?(da |do )?(microsoft|apple|google|windows|samsung|motorola)/,
      /\b(computador|celular|aparelho|pc|notebook|iphone|android|sistema)\b.{0,30}\b(esta |ta )?(apresentando|com|enviando) (erros?|falhas?|virus|problemas? de seguranca)\b/,
    ],
  },
  {
    id: 'corte',
    peso: 15,
    nega: true,
    titulo: 'Ameaça de corte de luz, água ou linha',
    explicacao: 'Empresas de luz e água avisam pela conta oficial. Confira no aplicativo ou telefone que está na sua conta.',
    padroes: [
      /\b(corte|desligamento|suspensao|interrupcao|bloqueio)\b.{0,30}\b(energia|luz|agua|fornecimento|gas|linha|internet|sinal)\b/,
      /\b(energia|luz|agua|fornecimento|linha|chip|numero|internet|tv|plano|servico|sinal)\b.{0,30}\b(sera|vai ser|serao|sera|podera ser) (cortad|suspens|desligad|interrompid|bloquead)/,
    ],
  },
  {
    id: 'direito_valor',
    peso: 25,
    titulo: 'Diz que você tem dinheiro para receber',
    explicacao: 'Golpistas dizem que você tem dinheiro esquecido, restituição ou indenização para receber. Confira só no site oficial.',
    padroes: [
      re(String.raw`\b(tem|possui|voce tem|vc tem|consta|existe|ha)\b.{0,20}\b(direito a|valores?|dinheiro|saldo|VAL)\b.{0,20}\b(receber|resgatar|sacar|disponivel|esquecid|retid|liberad)`),
      /\bvalores? (a receber|esquecid\w*|retid\w*|disponive\w* (para|pra) saque|para resgate|liberad\w*|pendente\w* de saque)/,
      /\b(restituicao|indenizacao|reembolso|estorno|abono|bonus|beneficio|saque|auxilio|credito)\b.{0,15}\b(liberad|disponivel|aprovad|esquecid)/,
      re(String.raw`\bdireito (a|de) (receber|VAL|revisao|restituicao|indenizacao|reembolso|devolucao|saque|valores|ressarcimento)`),
      /\b(valor|valores|dinheiro|parcelas?) (atrasad|retroativ)\w*/,
      /\b(14|decimo quarto|13 extra) salario\b/,
      /\b(desconto|cobranca|tarifa|descontos|cobrancas|tarifas) indevid\w*/,
      /\b(peca|solicite|receba|resgate|pedir|solicitar|receber|resgatar) (o |seu |sua |a )?(reembolso|ressarcimento|restituicao|estorno|devolucao)\b/,
      /\b(liberou|liberad\w*|disponivel|aprovad\w*|lancou) (o |um |uma |novo |nova |seu |sua )*(auxilio|beneficio|abono|vale gas|vale|bonus|saque|credito)\b/,
      /\b(governo|caixa|inss) (esta |ta |tao )?(dando|liberando|pagando|distribuindo)\b/,
      re(String.raw`\b(consta|existe|ha)\b.{0,40}\b(dinheiro|valores?|saldo|VAL)\b[\s\S]{0,60}\b(resgat|sac|receb)\w*`),
    ],
  },
  {
    id: 'boleto_trocado',
    peso: 35,
    nega: true,
    titulo: 'Troca de boleto ou de conta',
    explicacao: 'Golpistas mandam "boleto novo" ou "conta nova" para você pagar para eles. Confira no site ou aplicativo da empresa.',
    padroes: [
      /\b(boleto|fatura|cobranca|link|chave|conta|codigo de barras)\b.{0,30}\b(anterior|antigo|antiga|enviad\w* antes)\b.{0,40}\b(erro|errad|invalid|cancelad|com problema|nao vale)/,
      /\b(desconsidere|ignore|nao pague) (o |a )?(boleto|fatura|cobranca|chave|link|anterior)\b/,
      /\b(novo|nova) (boleto|chave|conta|dados bancarios|link de pagamento|codigo de barras)\b.{0,60}\b(pague|pagar|use|utilize|efetue|fazer|faca)/,
      /\b(mudamos|mudou|alteramos|alterou|trocamos|trocou|atualizamos) (de |a |o |nossa |nosso )?(banco|conta|chave|dados bancarios|conta bancaria|chave pix)/,
      /\bpague (esse|este|o) novo\b/,
      /\b(codigo de barras|linha digitavel|beneficiario|chave pix|dados bancarios)\b.{0,20}\b(foi |foram )?(atualizad|alterad|mudad|trocad)/,
      /\b(mudanca|troca|alteracao) (de|na|da|do) (administradora|banco|conta|chave|sindico|cobranca)\b/,
    ],
  },
  {
    id: 'marketplace',
    peso: 40,
    nega: true,
    titulo: 'Golpe na venda pela internet',
    explicacao: 'Para receber por uma venda você não precisa pagar nada nem clicar em link. Confira o pagamento só no aplicativo do site.',
    padroes: [
      /\b(ja )?(paguei|efetuei o pagamento|fiz o pagamento|comprei)\b.{0,40}\b(pela|pelo|via|no|na) (olx|mercado livre|shopee|marketplace|plataforma|enjoei|facebook|site)/,
      /\b(para|pra) (receber|liberar) (o |seu )?(dinheiro|pagamento|valor|saldo)\b.{0,60}\b(clique|acesse|informe|confirme|cadastre|link|pague|taxa)/,
      /\b(pagamento|valor|dinheiro) (esta |ta |fica |ficou )?(retido|bloqueado|pendente|aguardando)\b.{0,60}\b(liberar|liberacao|confirm|taxa|link|clique)/,
      /\bvenda (aprovada|confirmada|realizada)\b.{0,60}\b(link|clique|confirme|acesse)/,
      /\b(olx|mercado livre|shopee|enjoei)\b.{0,60}\b(link|clique|confirme seus dados|cadastre)/,
      /\b(vou|vamos|vou te|irei) (pagar|te pagar|fazer o pagamento) (pelo|pela|via|no|na|com) (mercado pago|olx pay|olxpay|pagamento seguro|entrega garantida|paypal|pagseguro|olx|plataforma)\b/,
      [/\bte (mando|envio|passo|mandar|enviar) (o |um )?link\b.{0,40}\b(confirmar|receber|liberar|cadastrar|resgatar)\b/, 50],
    ],
  },
  {
    id: 'so_pix',
    peso: 20,
    nega: true,
    titulo: 'Só aceita Pix e não deixa ver antes',
    explicacao: 'Loja ou vendedor que só aceita Pix, sem retirada e sem nota, é comum em golpe.',
    padroes: [
      /\b(so|somente|apenas|aceito so|pagamento so|pagamento somente|aceitamos so|aceitamos somente) (no |por |via |em |com )?pix\b/,
      /\b(nao (aceito|aceitamos|trabalho com|trabalhamos com)) (cartao|boleto)/,
      /\b(mando|envio|despacho|entrego) (depois|so depois|apos) (do|que|o) (pagamento|pix|pagar|deposito)/,
      [/\bsem (retirada|visita|nota fiscal)\b/, 15],
      [/\b(pix|pagamento|deposito) (antecipado|adiantado)\b/, 30],
      /\b(mando|envio|passo|transfiro) (o |os |a |as )?(qr ?code|ingressos?|bilhetes?|codigo|produto|voucher) (depois|so depois|apos|quando cair)\b/,
    ],
  },
  {
    id: 'investimento',
    peso: 40,
    titulo: 'Investimento milagroso',
    explicacao: 'Lucro garantido e dinheiro que dobra rápido não existem. É a isca mais antiga que há.',
    padroes: [
      /\b(rendimento|lucro|retorno|ganho|renda)s? (garantid|certo|fixo|diario|sem risco)/,
      /\b(retorno|rendimento|lucro|renda)\b.{0,40}\bgarantid/,
      /\b([5-9]|[1-9]\d)(,\d+)? ?% (ao|por|todo|a cada) mes\b/,
      /\b\d+[\d,]* ?% (ao|por|todo|de lucro ao) (dia|semana)\b/,
      re(String.raw`\b(invista|aplique|aplica|coloque|coloca|deposite|entra com|entre com)\b.{0,20}\d[^\n]{0,50}\b(saque|saca|receba|recebe|ganhe|ganha|lucro|retorno|tire|tira)\b.{0,20}(\d|VAL)`),
      [/\b(indicar|indicacao|indique|indicados)\b.{0,40}\b(\d+ ?%|comissao|bonus|ganha|ganhe|te da|recebe)/, 35],
      re(String.raw`\b(receba|ganhe|lucre|tire|fature|ganha|ganhar|lucrar|vira|virou|viram|volta|voltam|transforma|transforme|tirando|ganhando|lucrando|faturando|recebendo)\b.{0,40}VAL.{0,30}\b(em|por|ao|no|na) (so |apenas )?(\d+ )?(dia|dias|hora|horas|semana|semanas|minutos|mes)\b`),
      /\b(dobr|multiplic|triplic|quadruplic)\w* (o seu |seu |o |sua |a )?(dinheiro|investimento|valor|capital|banca)\b/,
      re(String.raw`\b(invista|investindo|aplique|aplica|coloque|coloca|deposite)\b.{0,15}VAL.{0,40}\b(receba|ganhe|lucro|retorno|volta|vira)`),
      [/\b(robo|bot) (de )?(investimento|trader|trade|que opera|de apostas|de ia)/, 25],
      [/\b(cripto|criptomoeda|criptomoedas|bitcoin|btc|usdt|forex|day trade|opcoes binarias|trader|trading|piramide)\b/, 25],
      [/\b(mentor|mentora|gestor|gestora|especialista)\b.{0,30}\b(investimento|financeir|trader|lucro|cripto)/, 25],
      [re(String.raw`\b(ganhei|lucrei|tirei|faturei)\b.{0,15}VAL`), 25],
      [/\bgrupo (vip|de sinais|de investimento|exclusivo)/, 25],
    ],
  },
  {
    id: 'emprego',
    peso: 45,
    titulo: 'Promessa de dinheiro fácil',
    explicacao: 'Ninguém paga para você "curtir vídeos" ou fazer "tarefas simples". No fim, pedem para você depositar dinheiro.',
    padroes: [
      /\b(ganh|receb|pagamos|paga|remuner|lucr)\w*\b.{0,40}\b(curtir|curtindo|curtid[oa]s?|avaliar|avaliando|assistir|assistindo|assistid[oa]s?|seguir|seguindo|comentar|comentando|digitar|digitando|tarefas?|missoes|likes?|curtidas?|avaliacoes)\b/,
      /\b(curt|avali|assist|segu|coment)\w* (videos|produtos|posts|perfis|hoteis|restaurantes|filmes|lojas)\b/,
      /\btarefas? (simples|faceis|rapidas|online|diarias)\b/,
      re(String.raw`VAL (por|ao|a|todo|cada|a cada|por cada) (dia|hora|tarefa|curtida|avaliacao|video|post|like|comentario|seguidor)\b`),
      re(String.raw`\bganh\w* (ate )?VAL\b.{0,20}\b(por|ao|no|todo) (dia|hora|semana)\b`),
      re(String.raw`VAL (diarios|diarias|por dia|semanais|por semana)\b`),
      [/\b(\d+ ?h|\d+ horas?|uma hora|duas horas|tres horas) (por|ao) dia\b/, 20],
      [/\bcurriculo (foi )?(aprovado|selecionado)\b/, 20],
      /\bganh\w* (dinheiro|uma renda|renda) (avaliando|curtindo|assistindo|seguindo|em casa|sem sair|pelo celular|no celular)/,
      [/\b(trabalh\w* (de|em) casa|renda extra|home office|vagas? (para|pra) (aposentad|idos|pessoas|maiores|todas)|sem experiencia|meio periodo|horario flexivel|recrutador\w*|recrutamento|vaga de emprego|processo seletivo|oportunidade de trabalho|trabalho simples|aprovad[oa] (no|na|para a) (processo|vaga|selecao|entrevista))\b/, 20],
    ],
  },
  {
    id: 'assinatura',
    peso: 25,
    nega: true,
    titulo: 'Problema falso com assinatura ou pagamento',
    explicacao: 'Mensagens dizendo que sua assinatura foi cancelada ou que o pagamento falhou levam para site falso que rouba o cartão.',
    padroes: [
      /\b(assinatura|plano|servico|conta netflix|conta do spotify|cadastro)\b.{0,30}\b(cancelad|suspens|expirad|bloquead|desativad|vencid|sera encerrad)/,
      /\b(problema|falha|erro|recusad\w*) (no|com o|com seu|com o seu|de|do) (pagamento|cartao|cobranca)/,
      /\batualiz\w* (seu |o |os |sua |a )?(cartao|forma de pagamento|dados de pagamento|metodo de pagamento|meio de pagamento)/,
    ],
  },
  {
    id: 'premio',
    peso: 25,
    titulo: 'Prêmio ou presente de graça',
    explicacao: 'Você não participou de sorteio nenhum. Prêmio que pede link, taxa ou dados é golpe.',
    padroes: [
      /\b(voce|vc|seu (cpf|numero|nome)) (foi |esta |e |acaba de ser )?(sortead|contemplad|selecionad|premiad|escolhid)/,
      [/\b(voce|vc) ganhou\b/, 15],
      /\bparabens\b.{0,60}\b(ganhou|premio|sortead|selecionad|contemplad|brinde|ganhador)/,
      /\bresgat\w* (o |seu |sua |os |seus |agora )?(premio|brinde|bonus|saldo|pontos|cashback|milhas|presente|recompensa)/,
      /\b(pontos|milhas|cashback|saldo de pontos)\b.{0,25}\b(vao|irao|estao para|vencem|expiram|expirar|vencer|perder)\b/,
      /\b(brinde|presente|kit|cesta|celular|iphone|produto)s?( [a-z]+){0,3} (gratis|gratuito|gratuitos|de graca)\b/,
      re(String.raw`\b(pontos|milhas|cashback)\b[\s\S]{0,60}\b(resgat|convert|troque|transform|virar|vira|viram)\w*.{0,30}(dinheiro|pix|VAL)`),
      /\b(gratis|gratuito|de graca)\b.{0,30}\b(por \d+ meses|para os primeiros|pros primeiros)\b/,
    ],
  },
  {
    id: 'encomenda',
    peso: 30,
    titulo: 'Encomenda presa ou taxa para liberar',
    explicacao: 'Os Correios não mandam mensagem com link pedindo para pagar taxa. Confira o rastreio só no site ou aplicativo oficial.',
    padroes: [
      /\b(encomenda|pacote|objeto|produto|pedido|remessa|mercadoria)(?: [a-z]+){0,3} (esta |foi |ficou |encontra se )?(retid|taxad|parad|bloquead|aguardando pagamento|apreendid|tributad|pendente)/,
      /\b(imposto|taxa|tributo)s? (de |da |do )?(importacao|alfandega|aduaneir\w*)\b/,
      /\b(fiscalizacao|receita) (aduaneira|alfandegaria)\b/,
      /\btaxa (de |da |do )?(importacao|alfandega|alfandegaria|liberacao|entrega|envio|reentrega|postagem|despacho|desembaraco)\b/,
      /\bcorreios\b.{0,80}\b(taxa|pagamento|pagar|retid|regularize|pendente)/,
      /\b(encomenda|pacote|objeto|entrega|pedido)\b.{0,30}\bnao (pode|pode ser|foi|conseguiu ser|conseguimos) (ser )?entreg/,
      /\b(atualiz|confirm|corrij)\w* (o |seu |o seu |sua )?endereco\b/,
      /\b(tentativa de entrega|reagend\w* (a |sua )?entrega|endereco (incorreto|incompleto|errado))/,
    ],
  },
  {
    id: 'pedido_dinheiro',
    peso: 12,
    nega: true,
    titulo: 'Pedido de dinheiro ou Pix',
    explicacao: 'A mensagem pede para você mandar dinheiro. Antes de qualquer Pix, confirme com a pessoa por ligação.',
    padroes: [
      /\b(faz|faca|fazer|manda|mande|mandar|envia|envie|enviar|transfere|transfira|transferir|passa|passe|deposita|deposite|depositar|joga|joga ai|libera|arruma|arrumar)\b.{0,25}\b(pix|dinheiro|transferencia|deposito|grana|ted)\b/,
      re(String.raw`\b(manda|mandar|mande|envia|enviar|empresta|emprestar|arruma|arrumar|transfere|transferir|deposita|depositar|faz|fazer|passa|adianta|adiantar|consegue)\b.{0,25}VAL`),
      /\bme empresta\w*\b.{0,20}\b(dinheiro|grana|reais|r\$|\d+|uns|um pix|uma ajuda)/,
      re(String.raw`\b(preciso|precisando|precisava|necessito|to precisando|estou precisando)\b.{0,25}\b(dinheiro|grana|pix|ajuda|emprestad|VAL)`),
      /\b(consegue|pode|poderia|da pra|tem como|teria como|conseguiria|daria pra)\b.{0,15}\b(me )?(mandar|transferir|emprestar|depositar|fazer um pix|fazer uma transferencia|adiantar|me ajudar com)\b/,
      /\bpix\b.{0,15}\b(pra mim|para mim|pra eu|nessa chave|nesta chave|pro meu|neste numero|nesse numero)\b/,
      /\bte (devolvo|pago|reembolso|passo de volta|devolvo tudo)\b/,
      /\b(pague|pagar|paga|pagamento) (com|via|no|pelo|por|em) pix\b/,
      /\b(pode|consegue|poderia|da pra) pagar (essa|esse|uma|um|minha|meu|pra mim|o|a) /,
      /\b(chave|pix)( pix)? ?:/,
      re(String.raw`(VAL|\btaxa\b|\bpagamento\b|\bpague\b|\bpagar\b).{0,30}\b(via|no|pelo|por) pix\b`),
      /\bte (mando|passo|envio) (o |a )?(pix|chave)\b/,
      /\b(pagamento|pagar|pague|deposito|dinheiro) (da |de |do |para |pra |pro )?(a |o )?(fianca|advogado|cirurgia|internacao|remedio|guincho|soltura|liberacao dele|liberacao dela)\b/,
      /\b(manda|mande|devolve|devolva|devolver|faz|faca|deposita|transfere)\b.{0,15}\b(nessa|nesta|neste|nesse) (chave|numero|conta|pix)\b/,
      /\bpix (cpf|celular|chave|\d)/,
      /\b(pague|pagar|pagamento|regularize|quite)\b.{0,20}\b(pelo|no|neste|nesse|via|do|deste) link\b/,
      /\b(segue|essa e|esta e|anota) (a )?(chave|conta)\b/,
    ],
  },
  {
    id: 'divida',
    peso: 20,
    titulo: 'Cobrança de dívida ou boleto',
    explicacao: 'Golpistas mandam boletos falsos e "acordos" de dívida. Confira sempre no aplicativo da empresa ou no Serasa oficial.',
    padroes: [
      /\b(boleto|fatura|divida|debito|multa|pendencia|imposto|ipva|iptu|licenciamento)\b.{0,40}\b(vencid|atrasad|pendente|em aberto|quitar|nao pag|em atraso)/,
      /\b(quite|quitar|limpe|limpar|regularize|regularizar) (a sua |o seu |sua |seu |suas |seus )?(divida|dividas|nome|cpf|debito|debitos|pendencia|pendencias|situacao)\b/,
      /\bnome (sujo|negativado|no spc|no serasa)\b/,
      /\b(acordo|desconto) (de |para )?(quitacao|quitar|divida)/,
      /\b(voce tem|voce possui|possui|consta|existe|ha) (uma |um )?(divida|debito|pendencia)s?\b/,
      re(String.raw`\bacordo\b.{0,40}\b(pix|VAL|a vista)`),
      /\b(fatura|boleto|conta|divida|parcela)\b.{0,30}\b(venceu|vencida)\b/,
    ],
  },
  {
    id: 'ameaca',
    peso: 20,
    titulo: 'Ameaça de bloqueio ou problema',
    explicacao: 'Dizer que algo vai ser bloqueado ou cancelado é um jeito de assustar e fazer você agir sem pensar.',
    padroes: [
      /\b(conta|cartao|cpf|whatsapp|beneficio|aposentadoria|titulo|cnh|chave pix|carteira|linha|chip|cadastro|bolsa familia|auxilio)\b.{0,30}\b(bloquead|suspens|cancelad|desativad|irregular|restrit|excluid|encerrad|apreendid|cassad|negativad)/,
      /\b(sera|vai ser|serao|sera|podera ser|pode ser) (bloquead|cancelad|suspens|encerrad|excluid|cortad|apreendid|desativad|negativad|protestad|apagad|cassad|devolvid)/,
      /\b(evite|para evitar|pra evitar|evitar) (o |a |seu |sua )?([a-z]+ e )?(bloqueio|cancelamento|suspensao|protesto|multa|negativacao|exclusao|corte|apreensao|perda|prisao)/,
      /\b(modulo|certificado|token|aplicativo|app|cadastro|senha|acesso|dispositivo)( de seguranca)? (expirou|expirad\w*|venceu|vencid\w*|desatualizad\w*)/,
      /\b(protesto|acao judicial|mandado de prisao|processo judicial|mandado de busca)\b/,
      /\b(arquivos|fotos|conversas|dados) (serao|vao ser|sera) (apagad|excluid|perdid)/,
    ],
  },
  {
    id: 'segredo',
    peso: 20,
    titulo: 'Pede segredo ou foge de ligação',
    explicacao: 'Golpista não quer que você confirme a história. Pessoa de verdade aceita uma ligação.',
    padroes: [
      /\b(nao|nem) (conta|fala|comenta|diga|conte|fale|comente|avisa|avise|contar|falar)\w* (nada )?(isso )?(para|pra|pro|com|a|ao) (ninguem|o pai|a mae|meu pai|minha mae|o meu pai|a minha mae|o vo|a vo|o banco|o gerente|ele|ela|seus filhos|sua familia|a familia|o moco)\b(?!.{0,20}\b(sua senha|seu codigo|a senha|o codigo))/,
      /\bnao (posso|consigo|da pra|da para|to podendo|estou podendo|vou poder) (falar|atender|ligar|fazer ligacao|receber ligacao|chamada)\b/,
      /\b(nao me liga|nao liga|nao precisa ligar|nao precisa confirmar|nao precisa ver|nao precisa olhar|nao precisa conferir)\b/,
      /\b(segredo|sigilo|sigiloso|entre nos|so entre a gente|so entre nos)\b/,
      /\bconfia em mim\b/,
      /\b(depois|amanha) (eu )?(te )?explico\b/,
    ],
  },
  {
    id: 'urgencia',
    peso: 15,
    titulo: 'Pressa e pressão',
    explicacao: 'O golpista quer que você faça tudo rápido, sem pensar e sem perguntar a ninguém.',
    padroes: [
      /\burgent/,
      /\burgencia\b/,
      /\bimediat/,
      /\bagora mesmo\b/,
      /\bainda hoje\b/,
      /\bso hoje\b/,
      /\bate (hoje|o fim do dia|meia noite)\b/,
      /\bultim(o|a|os|as) (dia|hora|chance|oportunidade|aviso|unidades|vagas)/,
      /\b(em|dentro de|prazo de) (ate )?\d+ ?(horas|h)\b/,
      /\bnao (pode|da para|da pra|consigo|podemos|posso|pode mais) (esperar|aguardar|demorar)\b/,
      /\b(promocao|oferta) relampago\b/,
      /\b(antes que|vai|vao|irao) (expir|venc)/,
      /\b(rapido|rapidinho|correndo|depressa|com pressa|o quanto antes|o mais rapido)\b/,
      /\bprazo (final|de \d+)/,
    ],
  },
  {
    id: 'ligar',
    peso: 10,
    nega: true,
    titulo: 'Pede para você ligar num número',
    explicacao: 'O número da mensagem pode ser do golpista. Ligue só para números que você já conhece, como o que está atrás do cartão.',
    padroes: [
      /\b(ligue|ligar|liga|ligando|entre em contato|contate|chame|chama|retorne|fale|responda|whatsapp|wpp|telefone|central)\b.{0,40}(\(?\d{2}\)?\s?9?\d{4}[\s.-]?\d{4}|0800[\s.-]?\d{3}[\s.-]?\d{4}|\b400[0-9][\s.-]?\d{4}\b|\b300[0-9][\s.-]?\d{4}\b)/,
      /\b(me ligue|me liga|me ligar|ligue|retorne|retornar) (nesse|neste|para esse|para este|pra esse|no) numero\b/,
      /\b(me chame|me chama|fale comigo|chama|chame|me procure)\b.{0,20}\b(no|pelo|via) (whatsapp|zap|privado|pv|direct|particular)\b/,
    ],
  },
  {
    id: 'intimacao',
    peso: 40,
    nega: true,
    titulo: 'Falsa polícia ou falsa intimação',
    explicacao: 'Polícia e Justiça não mandam mensagem ameaçando prender nem pedem dinheiro para "resolver" processo.',
    padroes: [
      /\b(denuncia|investigacao|inquerito|intimacao|mandado|boletim de ocorrencia)\b.{0,60}\b(seu (nome|numero|cpf)|contra voce|em seu nome|no seu nome|voce)\b/,
      /\b(envolvid|citad|investigad|acusad|denunciad|indiciad)\w*\b.{0,30}\b(crime|pedofilia|lavagem|trafico|fraude|estelionato|golpe|abuso)/,
      /\b(sera|vai ser|podera ser|pode ser) (pres|detid|conduzid|intimad|processad|indiciad)\w*/,
      /\b(mandado|ordem) de (prisao|conducao)\b/,
    ],
  },
  {
    id: 'limpa_nome',
    peso: 35,
    nega: true,
    titulo: 'Promete limpar seu nome',
    explicacao: 'Ninguém tira seu nome do SPC ou Serasa sem pagar a dívida. Negocie só pelo Serasa oficial ou com a empresa.',
    padroes: [
      /\b(tir|limp|remov|exclu|baix)\w* (o )?(seu )?nome (do|da|no|dos) (spc|serasa|scpc|boa vista|cadastros? de inadimplentes)/,
      /\bsem (pagar|precisar pagar|quitar|ter que pagar) a divida\b/,
      /\b(liminar|acao) (para|pra) (limpar|tirar) (o )?nome\b/,
    ],
  },
  {
    id: 'dobro',
    peso: 45,
    titulo: 'Promete devolver em dobro',
    explicacao: 'Ninguém devolve o dobro do que você manda. "Pix em dobro" é golpe: o dinheiro some.',
    padroes: [
      re(String.raw`\b(pague|deposite|mande|manda|faca um pix de|faz um pix de|transfira|envie)\b.{0,10}VAL.{0,40}\b(ganhe|receba|leve|volta|recebe)\b.{0,10}VAL`),
      /\b(recarga|pix|credito|dinheiro|saldo) em dobro\b/,
    ],
  },
  {
    id: 'desconto_conta',
    peso: 45,
    titulo: 'Paga sua conta com desconto',
    explicacao: 'Quem oferece pagar sua conta com desconto usa cartão roubado. Você perde o dinheiro e a conta continua aberta.',
    padroes: [
      [/\b(nos|eu|a gente) (pagamos|pago|paga|quitamos|quito|quita)\b.{0,40}\b(voce|vc)\b.{0,20}\b(transfere|paga|manda|deposita|faz o pix)\b.{0,20}\b(metade|parte|\d+ ?%)/, 60],
      /\b(pague|pagar|paga|quite)\b (sua |a |as |suas )?(conta|contas|fatura|faturas|boleto|boletos)\b.{0,40}\b([3-9]\d ?%|metade) (de )?desconto\b/,
    ],
  },
  {
    id: 'propina',
    peso: 50,
    titulo: 'Pede dinheiro "por fora" para resolver',
    explicacao: 'Fiscal ou agente que pede Pix para "resolver" está aplicando golpe ou pedindo propina. Não pague e denuncie.',
    padroes: [
      re(String.raw`\b(podemos|da pra|da para|a gente pode|posso|consigo|daria pra|tem como) (resolver|acertar|deixar passar|aliviar|liberar|arquivar|esquecer|dar um jeito)\b.{0,40}\b(pix|VAL|por fora|dinheiro|uma ajuda|cafezinho)`),
    ],
  },
  {
    id: 'falso_medico',
    peso: 15,
    titulo: 'Diz ser médico ou da clínica',
    explicacao: 'Golpistas fingem ser médico, enfermeira ou laboratório para pedir código, dados ou pagamento. Confirme na clínica.',
    padroes: [
      /\b(dr|dra|doutor|doutora|medico|medica|enfermeir\w*|do posto|da clinica|do laboratorio|do hospital)\b[\s\S]{0,80}\b(seu|sua) (exame|resultado|consulta|ressonancia|tomografia|cirurgia|biopsia)\b/,
    ],
  },
  {
    id: 'orgao',
    peso: 5,
    titulo: 'Usa nome de banco, governo ou empresa',
    explicacao: 'Golpistas usam nomes conhecidos para parecer sério. Isso sozinho não é golpe, mas pede atenção.',
    padroes: [
      /\b(inss|receita federal|fgts|valores a receber|restituicao|auxilio|bolsa familia|cadunico|detran|serasa|gov\.?br|meu inss|iptu|ipva|prefeitura|licenciamento|senatran|cnh|multa|infracao|pedagio|darf|irpf|contribuinte|defesa civil|ministerio|policia federal|justica|tribunal|caixa tem|pis|pasep)\b/,
      /\b(banco|nubank|itau|bradesco|caixa|santander|banco do brasil|picpay|mercado pago|banco inter|c6|correios|enel|cemig|sabesp|copel|netflix|disney|spotify|globoplay|uber|ifood|amazon|shein|olx|mercado livre|shopee|magalu|google|microsoft|apple|livelo|smiles|latam|whatsapp|facebook|instagram|sky|sem parar|conectcar|veloe)\b/,
      /(^|\n)(claro|vivo|tim|oi|light|azul|gol|sky) ?:|\b(operadora|cliente|chip|recarga|linha|plano|fatura|conta|app|aplicativo|loja|site|voo|empresa) (da |do |na |no )?(claro|vivo|tim|oi|light|azul|gol|sky)\b/,
    ],
  },
];

for (const r of REGRAS) {
  r.lista = r.padroes.map((p) => {
    const [rx, peso] = Array.isArray(p) ? p : [p, r.peso];
    return { rx: new RegExp(rx.source, rx.flags.includes('g') ? rx.flags : rx.flags + 'g'), peso };
  });
}

const GOVERNO =
  /\b(inss|receita federal|fgts|valores a receber|restituicao|auxilio|bolsa familia|cadunico|detran|gov\.?br|caixa tem|iptu|ipva|prefeitura|senatran|cnh|darf|irpf|pis|pasep|meu inss|prova de vida|aposentad\w*|vale gas|banco central|cadastro unico|tarifa social)\b/;

// Contexto de alerta ("isso é golpe", "o banco nunca pede"): texto que avisa, não que aplica o golpe.
const ALERTA =
  /\b((e|eh|isso e|isso eh|era|sao|parece|tipo de|cuidado com o|alerta de|atencao ao|caiu no|cair no|cai no) golpe|golpe (na praca|novo|circulando|do falso|da falsa|do motoboy|do pix)|(aplicando|aplicar|aplicam) (o )?golpe|cuidado com\b|cuidado ?:|desconfie|nao caia|nunca (pede|pedem|pedimos|liga|ligam|ligamos|manda|mandam|envia|enviam|solicita|solicitam|solicitamos|cobra|cobram|cobramos|busca|buscam)|nao (pede|pedem|pedimos|liga|ligam|ligamos|envia|enviamos|cobra|cobram|cobramos|solicita|solicitamos|manda) (nem|mensagens?|links?|sms|pedindo|por)\b|se alguem (pedir|mandar|ligar)|compartilhe com seus|avise seus pais)/;

// Palavras de isca no endereço do site ("premio", "rastreio") ou finais muito usados por golpe.
const SUSPEITO_HOST =
  /(premi|brinde|desconto|promo|oferta|gratis|resgat|beneficio|bonus|rastrei|objeto|encomenda|entrega|taxa|pagar|pagamento|boleto|fatura|segunda.?via|regulariz|liberar|desbloque|atualiz|modulo|seguranca|seguro|valida|verific|login|acesso|suporte|central|cliente|consulta|restitui|inss|gov|receita|cpf|detran|iptu|ipva|multa|correio|milhas|pontos|download|apk|gold|banco|pix)[a-z0-9-]*\.|\.(club|online|site|top|xyz|info|live|shop|store|vip|icu|buzz|click|link|fun|cc|ws|tk|ml|ga|cf|gq|monster|rest|sbs|cfd|lol)\b/i;

// Saúde pública e consulta: cobrar taxa aqui é golpe.
const SAUDE = /\b(posto de saude|ubs|sus|hospital|clinica|laboratorio|consulta|exame|cirurgia|vacina)\b/;

// Sinais de mensagem séria: manda usar o app ou o número do cartão, avisa para não compartilhar.
const OFICIAL =
  /\b((pelo|no|use o|usando o|acesse o|direto no|abra o|pelo nosso) (app|aplicativo|internet banking|caixa eletronico)|na (sua )?agencia|canais oficiais|numero (atras do|do seu) cartao|(nunca|nao) compartilhe|nao repasse|ignore (esta|essa) mensagem|casas lotericas|debito automatico|na recepcao|loja fisica|lojas fisicas|so no site oficial|nao cobra (nenhuma )?taxa|(numero|telefone) (que esta )?no verso do (seu )?cartao|(procure|va a|va ate) (a )?sua agencia)\b/;

const NEGA_ANTES =/\b(nao|nunca|jamais|nem)( [^\s,]+)? ?$/;

const CONFUNDE = {
  а: 'a', е: 'e', о: 'o', р: 'p', с: 'c', у: 'y', х: 'x', і: 'i', ј: 'j', ѕ: 's', ԁ: 'd', һ: 'h', ӏ: 'l',
  к: 'k', м: 'm', н: 'h', т: 't', в: 'b', ь: 'b', г: 'r', п: 'n', и: 'u', ԛ: 'q', ԝ: 'w',
  α: 'a', ο: 'o', ε: 'e', ι: 'i', κ: 'k', ν: 'v', ρ: 'p', τ: 't', υ: 'u', χ: 'x', β: 'b', γ: 'y', μ: 'u', η: 'n', ω: 'w', ς: 's', σ: 'o',
  ł: 'l', ø: 'o', đ: 'd', ı: 'i', ß: 'ss', æ: 'ae', œ: 'oe',
};
const RX_CONFUNDE = new RegExp('[' + Object.keys(CONFUNDE).join('') + ']', 'g');
const LEET = { 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 7: 't', '@': 'a', $: 's' };

const ABREV = {
  vc: 'voce', vcs: 'voces', voc: 'voce', pq: 'porque', q: 'que', tb: 'tambem', tbm: 'tambem', cel: 'celular',
  msg: 'mensagem', td: 'tudo', hj: 'hoje', amg: 'amigo', pfv: 'por favor', pf: 'por favor', pls: 'por favor',
  agr: 'agora', dps: 'depois', msm: 'mesmo', ngm: 'ninguem', nd: 'nada', mt: 'muito', mto: 'muito', obg: 'obrigado',
  zap: 'whatsapp', zapzap: 'whatsapp', wpp: 'whatsapp', whats: 'whatsapp', wts: 'whatsapp', wapp: 'whatsapp',
  blz: 'beleza', qnd: 'quando', qdo: 'quando', cmg: 'comigo', ctg: 'contigo',
  dnv: 'de novo', vlw: 'valeu', eh: 'e', aki: 'aqui', aq: 'aqui',
  codiguinho: 'codigo', codiguin: 'codigo', pixzinho: 'pix', pixinho: 'pix', dinheirinho: 'dinheiro', linkzinho: 'link',
  numerozinho: 'numero', cartaozinho: 'cartao', senhinha: 'senha',
};
const RX_ABREV = new RegExp('\\b(' + Object.keys(ABREV).join('|') + ')\\b', 'g');

function preparar(texto) {
  const pontos = Array.from(String(texto ?? ''));
  const truncado = pontos.length > LIMITE;
  const bruto = truncado ? pontos.slice(0, LIMITE).join('') : pontos.join('');
  return { bruto, truncado };
}

function limpar(bruto) {
  return bruto
    .normalize('NFKD')
    .replace(/[\p{M}\p{Cf}]/gu, '')
    .replace(/(\p{L})[\p{Extended_Pictographic}\u{1F3FB}-\u{1F3FF}⃣]+(?=\p{L})/gu, '$1')
    .replace(/[\p{Extended_Pictographic}\p{So}\u{1F3FB}-\u{1F3FF}]/gu, ' ')
    .toLowerCase()
    .replace(RX_CONFUNDE, (c) => CONFUNDE[c])
    .replace(/[*_~`]/g, '');
}

export function normalizar(texto) {
  let t = limpar(preparar(texto).bruto);
  // Número ou símbolo no meio da palavra ("n0vo", "c0digo", "p1x", "s@que").
  t = t.replace(/(?<=[a-z])(?:[013457$]|@(?![a-z0-9-]+\.[a-z]))(?=[a-z])/g, (c) => LEET[c]);
  t = t.replace(/(?<=\b[a-z]{2,})[0134](?=\s|$|[,!?;:])/g, (c) => LEET[c]);
  t = t
    .replace(RX_ABREV, (w) => ABREV[w])
    .replace(/(^|\s)p\/\s?/g, '$1pra ')
    .replace(/(^|\s)c\/\s?/g, '$1com ')
    .replace(/(^|\s)s\/\s?/g, '$1sem ')
    .replace(/(?<![\d.,] ?)\bn\b(?= [a-z])/g, 'nao')
    .replace(/\b(\d+)\s?k\b/g, '$1 mil')
    .replace(/(\d)(mil)\b/g, '$1 $2')
    .replace(/\b(\d+) (conto|pila)\b/g, '$1 reais')
    // Fim de frase vira quebra de linha: as regras olham uma frase por vez.
    .replace(/[.!?;…]+(?=\s|$)/g, '\n')
    .replace(/[^\S\n]+/g, ' ')
    .replace(/ ?\n[\s]*/g, '\n')
    .trim();
  return t;
}

const PT = new Set(
  ('nao voce voces seu sua seus suas meu minha meus minhas isso esse essa este esta estou to ta hoje amanha ontem mae pai ' +
    'obrigado obrigada tudo com um uma uns umas do da dos das pra pro para ja tem sou eu ele ela vou vai foi pode preciso ' +
    'dinheiro que no na nos e o os as mais muito bem bom boa dia noite tarde oi ola sim ok kkk kkkk kkkkk parabens amem valeu ' +
    'tchau beijo beijos abraco favor quando onde como porque aqui ai agora depois entao filho filha neto neta vo vovo tia tio ' +
    'casa conta pagar pix codigo senha voce gente ainda tambem nada ninguem tchau bjs vamos vem chego chegou fica ficou ' +
    'quero queria precisa sabe acho mesmo deus graças gracas obrigadao certo beleza blz top show legal lindo linda saudade ' +
    'cartao banco numero celular mensagem link clique acesse seu sua receber valor reais compra entrega pedido aviso atencao ' +
    'consulta medico remedio igreja culto missa reuniao amanha semana mes ano encomenda boleto fatura vencimento pague ' +
    'confirme informe atualize agradecemos sorteado ganhou premio parabens cadastro dados proximo hora horas oque cade ' +
    'tou estamos estao foram era sera seria tinha tenho temos vai vamos sim nao num ne neh')
    .split(' ')
);
const ES = new Set(
  ('hola el los las y es pero necesito gracias hoy ahora usted ustedes dinero muy mi yo soy tu tus del lo le les ' +
    'cuenta tiene puede hacer haga favor aqui enviar su sus estoy eres esta somos han hay mañana manana senor senora ' +
    'buenos buenas dias tarjeta clave pago recibir haz click enlace mensaje telefono numero urgente ayuda mama papa hijo').split(' ')
);
const EN = new Set(
  ('the you your is are to of and account click verify please here now has have been will we our this that for with on ' +
    'in it be from at by password code bank payment hello hi dear thanks thank my me i am was were not can could would ' +
    'should send get got just what when where how who why there their they them a an or if so no yes ok love baby honey').split(' ')
);
const SO_PT = new Set('nao voce voces seu sua meu minha isso esse essa hoje amanha mae pai obrigado obrigada tudo um uma pra pro ja tem sou eu vou vai foi preciso que no na nos com do da dos das tambem nada ninguem ainda'.split(' '));
const SO_FORA = new Set('hola los las y es pero necesito gracias hoy ahora usted dinero muy yo soy tu tus del lo le the you your is are to of and verify please now has have been will our this that with from my am was were'.split(' '));

function idiomaIndefinido(original, t) {
  const palavras = t.match(/[a-z]+/g) || [];
  if (!palavras.length) return true;
  let pt = /[ãõçâêô]/i.test(original) ? 2 : 0;
  let fora = /[ñ¿¡]/.test(original) ? 2 : 0;
  for (const p of palavras) {
    if (SO_PT.has(p)) pt += 2;
    else if (PT.has(p)) pt += 1;
    if (SO_FORA.has(p)) fora += 2;
    else if ((ES.has(p) || EN.has(p)) && !PT.has(p)) fora += 1;
  }
  if (pt === 0) return palavras.length <= 3 || fora >= 2;
  return fora >= 4 && fora > pt * 1.5;
}

function oQueFazer(nivel, ids, temLink) {
  const passos = [];
  const tem = (...x) => x.some((i) => ids.has(i));
  if (nivel === 'indefinido') {
    passos.push('Não toque em links e não responda.');
    passos.push('Mostre a mensagem para alguém de confiança antes de fazer qualquer coisa.');
    passos.push('Nunca passe senha ou código por mensagem.');
    return passos;
  }
  if (nivel === 'alto') {
    if (temLink) passos.push('Não clique no link.');
    passos.push('Não faça Pix e não pague nada.');
    passos.push('Não passe senha nem código para ninguém.');
  }
  if (tem('falso_parente', 'celular_outro') || (tem('segredo') && tem('pedido_dinheiro', 'pix_terceiro', 'emergencia')))
    passos.push('Ligue para o número ANTIGO da pessoa e pergunte se foi ela mesmo que mandou.');
  if (tem('pix_terceiro')) passos.push('Desconfie de Pix para conta no nome de outra pessoa.');
  if (tem('falsa_central', 'gerente', 'ligar'))
    passos.push('Ligue você mesmo para o número que está atrás do seu cartão. Não use o número da mensagem.');
  if (tem('motoboy_cartao')) passos.push('Banco nunca busca cartão em casa. Não entregue cartão nem senha a ninguém.');
  if (tem('codigo'))
    passos.push('Se já passou o código: no WhatsApp, vá em Configurações > Conta > Confirmação em duas etapas e ative.');
  if (tem('sms_codigo')) passos.push('Esse código é só seu. Se alguém pedir esse número por mensagem ou ligação, é golpe.');
  if (tem('emergencia', 'sequestro'))
    passos.push('Antes de qualquer coisa, ligue para a pessoa ou para alguém da família que esteja com ela.');
  if (tem('sequestro')) passos.push('Desligue e ligue direto para a pessoa. Se estiver em perigo, ligue 190.');
  if (tem('sextorsao')) passos.push('Não responda e não pague. Bloqueie o contato. Se quiser, registre na delegacia.');
  if (tem('acesso_remoto', 'instalar_app', 'suporte'))
    passos.push('Não instale nada. Se já instalou, apague o aplicativo e ligue para o seu banco.');
  if (tem('pix_falso', 'pix_engano'))
    passos.push('Abra o aplicativo do banco e veja se o dinheiro caiu mesmo. Comprovante pode ser falso.');
  if (tem('pix_engano')) passos.push('Se caiu mesmo, devolva só pelo botão "devolver" do Pix, no aplicativo do banco.');
  if (tem('taxa_antecipada', 'consorcio', 'heranca'))
    passos.push('Não pague taxa adiantada para receber dinheiro, prêmio, empréstimo ou emprego.');
  if (tem('judicial')) passos.push('Ligue para o seu advogado no número que você já tem antes de pagar qualquer coisa.');
  if (tem('romance')) passos.push('Nunca mande dinheiro para quem você só conhece pela internet.');
  if (tem('aluguel')) passos.push('Só pague aluguel ou sinal depois de visitar o imóvel e ver o contrato.');
  if (tem('leilao', 'so_pix', 'desconto'))
    passos.push('Antes de comprar, pesquise o nome da loja ou do leiloeiro no Reclame Aqui.');
  if (tem('investimento', 'aposta')) passos.push('Não coloque dinheiro em nada que promete lucro rápido ou garantido.');
  if (tem('emprego')) passos.push('Emprego de verdade não cobra nada para você começar.');
  if (tem('cura')) passos.push('Converse com seu médico antes de comprar qualquer remédio.');
  if (tem('famoso')) passos.push('Vídeo de famoso pode ser falso, feito por computador.');
  if (tem('doacao')) passos.push('Doe só para instituições que você conhece, pelo site delas.');
  if (tem('chave_pessoal')) passos.push('Empresa séria não recebe em chave Pix de e-mail pessoal.');
  if (tem('boleto_trocado')) passos.push('Antes de pagar, confira o boleto no aplicativo ou no site da empresa.');
  if (tem('marketplace')) passos.push('Veja se o pagamento caiu só no aplicativo do site de vendas. Não clique em link.');
  if (tem('corte', 'assinatura')) passos.push('Confira sua conta direto no aplicativo ou no telefone oficial da empresa.');
  if (ids.has('governo') && nivel !== 'baixo')
    passos.push('Serviços do governo só pelo site gov.br ou pelo aplicativo oficial (Meu INSS, Caixa Tem).');
  if (tem('direito_valor') && nivel !== 'baixo')
    passos.push('Dinheiro esquecido só se consulta no site oficial do Banco Central ou do governo.');
  if (tem('encomenda')) passos.push('Confira sua encomenda só no site correios.com.br ou no aplicativo dos Correios.');
  if (tem('extorsao')) passos.push('Não pague. Guarde a mensagem e ligue 190. Avise sua família.');
  if (tem('intimacao')) passos.push('Polícia não cobra por mensagem. Se tiver dúvida, vá pessoalmente a uma delegacia.');
  if (tem('limpa_nome')) passos.push('Consulte e negocie suas dívidas só no site ou aplicativo oficial do Serasa.');
  if (tem('dobro')) passos.push('Ninguém devolve o dobro. Não mande nada.');
  if (tem('desconto_conta')) passos.push('Pague suas contas só pelo aplicativo do banco ou na lotérica.');
  if (tem('propina')) passos.push('Não pague nada por fora. Denuncie no órgão oficial ou ligue 190.');
  if (tem('falso_medico')) passos.push('Ligue para a clínica ou o posto no número que você já tem antes de pagar ou passar código.');

  if (nivel === 'alto') passos.push('Bloqueie o contato e denuncie no próprio WhatsApp.');
  if (nivel === 'medio') {
    passos.unshift('Não faça nada com pressa.');
    if (temLink) passos.unshift('Não toque no link antes de confirmar.');
    passos.push('Confirme a história por outro caminho, com um número que você já conhece.');
    passos.push('Na dúvida, mostre para alguém de confiança antes de responder.');
  }
  if (nivel === 'baixo') {
    if (tem('pedido_dinheiro')) passos.push('Antes de mandar dinheiro, ligue para a pessoa e confirme.');
    passos.push('Mesmo assim: nunca passe senha ou código por mensagem.');
  }
  return [...new Set(passos)];
}

const TEXTOS = {
  alto: { titulo: 'Muito provável que seja GOLPE', resumo: 'Não responda, não clique e não pague nada.' },
  medio: { titulo: 'Cuidado! Tem sinais de golpe', resumo: 'Confirme com calma antes de fazer qualquer coisa.' },
  baixo: {
    titulo: 'Não encontrei sinais de golpe conhecidos',
    resumo:
      'Isso não garante que é seguro. Se pedirem dinheiro, senha, código ou para tocar em link, pergunte antes a alguém de confiança.',
  },
  indefinido: {
    titulo: 'Não consegui entender essa mensagem',
    resumo: 'Parece estar em outra língua ou tem pouco texto. Na dúvida, não toque em links e pergunte a alguém de confiança.',
  },
};

// Primeiro trecho da regra que casa e não está negado ("não precisa pagar nada").
function casar(regra, t) {
  let melhor = 0;
  for (const { rx, peso } of regra.lista) {
    if (peso <= melhor) continue;
    rx.lastIndex = 0;
    for (const m of t.matchAll(rx)) {
      if (regra.nega && NEGA_ANTES.test(t.slice(Math.max(0, m.index - 25), m.index))) continue;
      melhor = peso;
      break;
    }
  }
  return melhor;
}

function numero(s) {
  return Number(s.replace(/\./g, '').replace(',', '.'));
}

export function analisar(texto) {
  const entrada = String(texto ?? '');
  if (!entrada.trim()) return null;
  const { bruto, truncado } = preparar(entrada.trim());
  const t = normalizar(bruto);

  const motivos = [];
  const ids = new Set();
  let pontosTexto = 0;
  const marcar = (id, titulo, explicacao, peso) => {
    ids.add(id);
    pontosTexto += peso;
    motivos.push({ id, titulo, explicacao, peso });
  };

  for (const regra of REGRAS) {
    const peso = casar(regra, t);
    if (peso) marcar(regra.id, regra.titulo, regra.explicacao, peso);
  }

  if (GOVERNO.test(t)) ids.add('governo');
  // SMS legítimo de código ("seu código é 123456"): sem pontos, mas vale o aviso.
  if (!ids.has('codigo') && /\bcodigo\b.{0,40}\b\d{4,8}\b/.test(t)) ids.add('sms_codigo');

  const pct = t.match(/\b(\d{2,3}) ?% (de )?(desconto|off)\b/);
  const dePor = t.match(/\bde r\$ ?(\d[\d.]*)(,\d{2})?\b.{0,20}\bpor (apenas |so |somente )?r\$ ?(\d[\d.]*)(,\d{2})?/);
  const razao = dePor ? numero(dePor[4]) / numero(dePor[1]) : 1;
  if ((pct && Number(pct[1]) >= 70) || (razao > 0 && razao <= 0.3)) {
    const quanto = pct && Number(pct[1]) >= 70 ? `${pct[1]}% de desconto` : 'Um preço tão baixo';
    marcar('desconto', 'Desconto bom demais', `${quanto} é bom demais para ser verdade. Lojas falsas usam isso para pegar seu Pix.`, 25);
  }

  const links = extrairLinks(bruto).map(analisarLink);
  const ativos = links.filter((l) => l.tipo !== 'conversa');
  const imita = (l) => l.imitaMarca ?? l.problemas?.[0]?.startsWith('Finge ser') ?? false;
  const ruim = (l) => (l.problemas?.length ?? 0) > 0 || l.pontos > 0;
  const linkRuim = ativos.some(ruim);
  const linkFalsoMarca = ativos.some(imita);
  const temLink = links.some((l) => l.tipo === 'link');
  const naoOficial = ativos.filter((l) => l.tipo === 'link' && !l.oficialDe);
  const linkApk = naoOficial.some((l) => /\.apk\b/i.test(l.texto || ''));
  const linkEstranho = !linkApk && naoOficial.some((l) => SUSPEITO_HOST.test(l.host || l.texto || ''));

  const tem = (...x) => x.some((i) => ids.has(i));
  const pesoDe = (id) => motivos.find((m) => m.id === id)?.peso ?? 0;
  const valor = new RegExp(VAL).test(t);
  const alerta = ALERTA.test(t) && !linkRuim && !tem('sequestro', 'sextorsao');

  let pontos = alerta ? Math.round(pontosTexto * 0.3) : pontosTexto;

  let piorLink = 0;
  if (ativos.length) {
    piorLink = Math.max(...ativos.map((l) => l.pontos || 0));
    pontos += piorLink;
    if (linkRuim) {
      motivos.push({
        id: 'link',
        titulo: 'Link perigoso',
        explicacao: 'O link da mensagem tem sinais de site falso. Veja os detalhes abaixo.',
        peso: piorLink,
      });
    } else if (naoOficial.length) {
      pontos += 5;
    }
  }
  if (!linkRuim && (linkApk || linkEstranho)) {
    const peso = linkApk ? 30 : 15;
    pontos += peso;
    motivos.push({
      id: 'link',
      titulo: linkApk ? 'Link que baixa aplicativo' : 'Link com endereço estranho',
      explicacao: linkApk
        ? 'O link baixa um aplicativo de fora da loja oficial. Pode ser vírus que rouba suas senhas.'
        : 'O endereço do link não é o site oficial e usa palavras para parecer sério. Não toque nele.',
      peso,
    });
  }
  const linkSuspeito = linkRuim || linkApk || linkEstranho;

  // Combinações que, juntas, são típicas de golpe.
  if (!alerta) {
    const pagamento = tem('pedido_dinheiro', 'pix_terceiro', 'taxa_antecipada', 'chave_pessoal');
    const acao = pagamento || tem('dados', 'ameaca', 'urgencia', 'premio', 'encomenda', 'desconto', 'instalar_app', 'direito_valor',
      'falsa_central', 'assinatura', 'divida', 'corte', 'marketplace', 'boleto_trocado', 'codigo', 'investimento', 'aposta', 'emprego');
    const combos = [
      [tem('falso_parente', 'celular_outro') && tem('pedido_dinheiro', 'pix_terceiro', 'emergencia'), 30],
      [tem('falso_parente') && tem('segredo'), 10],
      [tem('celular_outro') && tem('segredo'), 10],
      [tem('emergencia') && (pagamento || valor || tem('segredo')), 25],
      [tem('pix_terceiro') && tem('falso_parente', 'celular_outro', 'emergencia', 'segredo'), 15],
      [tem('falsa_central', 'gerente') && tem('instalar_app', 'acesso_remoto'), 20],
      [tem('falsa_central') && (linkRuim || tem('ligar', 'dados', 'codigo', 'segredo')), 20],
      [tem('falsa_central') && tem('ligar'), 15],
      [tem('falsa_central', 'gerente') && pagamento, 15],
      [tem('emergencia') && tem('urgencia', 'ligar'), 10],
      [tem('gerente') && (pagamento || tem('dados', 'ligar', 'falsa_central', 'segredo')), 15],
      [tem('orgao') && (linkFalsoMarca || tem('dados', 'ameaca', 'chave_pessoal')), 15],
      [tem('urgencia') && (pagamento || linkRuim || tem('dados')), 10],
      [linkFalsoMarca && acao, 30],
      [!linkFalsoMarca && linkSuspeito && acao, 20],
      [ids.has('governo') && naoOficial.length > 0, 30],
      [tem('ameaca', 'corte', 'divida', 'judicial') && tem('ligar'), 15],
      [tem('taxa_antecipada') && valor, 10],
      [tem('taxa_antecipada') && SAUDE.test(t), 15],
      [tem('consorcio') && tem('taxa_antecipada'), 15],
      [pesoDe('emprego') >= 45 && (valor || tem('urgencia')), 15],
      [tem('so_pix') && /\b(ingressos?|passagens?|show|bilhetes?|camarote)\b/.test(t), 10],
      [tem('romance') && tem('encomenda', 'taxa_antecipada'), 20],
      [tem('instalar_app') && tem('ameaca', 'falsa_central', 'gerente', 'orgao'), 10],
      [tem('judicial', 'heranca', 'consorcio', 'romance', 'leilao', 'aluguel', 'emprego', 'doacao', 'aposta') && pagamento, 25],
      [tem('judicial', 'romance', 'aluguel', 'leilao') && (valor || tem('urgencia')), 10],
      [tem('chave_pessoal') && tem('orgao', 'judicial', 'leilao', 'doacao', 'taxa_antecipada'), 20],
      [tem('taxa_antecipada') && tem('direito_valor', 'premio', 'encomenda', 'consorcio', 'heranca', 'emprego', 'judicial'), 15],
      [tem('direito_valor') && tem('dados', 'urgencia', 'ameaca', 'orgao'), 15],
      [tem('so_pix') && tem('desconto', 'urgencia', 'leilao', 'aluguel'), 20],
      [tem('corte') && (pagamento || tem('ligar', 'urgencia') || valor), 25],
      [tem('divida') && (tem('desconto', 'urgencia', 'ameaca') || pagamento), 15],
      [tem('boleto_trocado') && (pagamento || valor), 20],
      [tem('suporte') && tem('ligar', 'acesso_remoto', 'instalar_app', 'urgencia'), 25],
      [tem('cura') && tem('famoso', 'urgencia', 'desconto') , 20],
      [tem('famoso') && (tem('investimento', 'aposta', 'premio', 'cura', 'direito_valor') || pagamento || temLink), 25],
      [tem('aposta', 'investimento') && (valor || temLink), 15],
      [tem('assinatura') && tem('urgencia', 'ameaca', 'dados'), 15],
      [tem('premio', 'encomenda') && tem('dados', 'urgencia', 'taxa_antecipada'), 10],
      [tem('pix_engano') && tem('pix_terceiro', 'pedido_dinheiro', 'urgencia', 'chave_pessoal'), 20],
      [tem('marketplace') && (temLink || tem('dados', 'taxa_antecipada')), 15],
      [tem('emprego') && tem('investimento', 'urgencia'), 10],
      [tem('falso_parente') && tem('urgencia'), 15],
      [tem('falsa_central') && tem('ameaca'), 15],
      [tem('gerente') && tem('urgencia', 'ameaca') && tem('ligar'), 10],
      [tem('direito_valor') && (linkSuspeito || tem('ligar')), 15],
      [tem('extorsao') && (valor || pagamento || tem('urgencia') || /\b(paga|pague|pagar|deposita|manda o dinheiro|pix|quero)\b/.test(t)), 40],
      [tem('intimacao') && (pagamento || valor || tem('ligar', 'urgencia', 'ameaca') || /\bregulariz/.test(t)), 20],
      [tem('limpa_nome') && (valor || pagamento), 20],
      [tem('falso_medico') && (pagamento || valor || tem('codigo', 'dados')), 30],
      [tem('propina') && (tem('orgao') || /\b(fiscal|policia\w*|guarda|agente|vigilancia|prefeitura|detran)\b/.test(t)), 15],
      [tem('so_pix') && /\b(lacrad\w*|motivo (de )?(viagem|mudanca)|abaixo do preco|preco de custo|queima de estoque)\b/.test(t), 15],
      [tem('corte') && /\b(regulariz\w*|falta de pagamento|em atraso|pendencia)\b/.test(t), 25],
      [tem('dobro') && (pagamento || temLink), 15],
      [tem('pix_engano') && /\b(chave|conta correta|conta certa)\b/.test(t), 15],
      [tem('premio') && /\b(taxa|frete)\b/.test(t) && valor, 15],
      [tem('investimento') && (temLink || /\b(vagas limitadas|exclusivo|so hoje)\b/.test(t)), 15],
    ];
    for (const [ok, bonus] of combos) if (ok) pontos += bonus;

    const forte = tem('pix_terceiro', 'chave_pessoal', 'codigo', 'acesso_remoto', 'motoboy_cartao', 'sequestro', 'sextorsao', 'ligar',
      'extorsao', 'dobro', 'desconto_conta', 'propina', 'limpa_nome');
    if (!linkSuspeito && !naoOficial.length && !forte) {
      if (OFICIAL.test(t)) pontos -= 20;
      if (ativos.length && ativos.every((l) => l.oficialDe)) pontos -= 15;
    }
  }

  pontos = Math.max(0, Math.min(100, pontos));
  let nivel = pontos >= 55 ? 'alto' : pontos >= 25 ? 'medio' : 'baixo';
  if (nivel === 'baixo' && linkRuim) nivel = 'medio';
  if (nivel !== 'alto' && !linkRuim && idiomaIndefinido(bruto, t)) nivel = 'indefinido';
  motivos.sort((a, b) => b.peso - a.peso);
  // Só citar o nome da empresa não é motivo para mostrar quando não há golpe.
  if (nivel === 'baixo') motivos.splice(0, motivos.length, ...motivos.filter((m) => m.id !== 'orgao'));

  return {
    nivel,
    pontos,
    titulo: TEXTOS[nivel].titulo,
    resumo: TEXTOS[nivel].resumo,
    motivos: motivos.map(({ peso, ...m }) => m),
    links,
    oQueFazer: oQueFazer(nivel, ids, temLink),
    truncado,
  };
}

export function textoParaFalar(r) {
  if (!r) return '';
  const partes = [r.titulo + '.', r.resumo];
  if (r.motivos.length) partes.push('Por quê: ' + r.motivos.map((m) => m.titulo).join('. ') + '.');
  partes.push('O que fazer: ' + r.oQueFazer.join(' '));
  return partes.join(' ');
}
