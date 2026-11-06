export function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim();
}

const CNPJ = /\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/;
const CPF = /(?<![\d.])\d{3}\.\d{3}\.\d{3}-\d{2}\b/;
const MASKED_CPF = /[*•X]{3}\.?(\d{3})\.?(\d{3})-?[*•X]{2}/;

const PREFIXES = [
  /^PIX (ENVIADO|RECEBIDO)( DEVOLVIDO)?:?/,
  /^PIX\b:?/,
  /^TRANSFERENCIA (ENVIADA|RECEBIDA):?/,
  /^COMPRA NO (DEBITO|CREDITO):?/,
  /^PAGAMENTO EFETUADO:?/,
  /^ESTORNO:?/,
  /^RESGATE:?/,
  /^(ESTORNO )?NO ESTABELECIMENTO\b/,
  /^CARTAO\b/,
  /^PAG ?\*/,
  /^PG ?\*/,
  /^MP ?\*/,
  /^IFD ?\*/,
  /^EC ?\*/,
  /^STAFE BANK ?\*/,
  // Código do banco de destino no Pix e na transferência: "CP :12345678-NOME".
  /^CP ?: ?\d+-/,
  /^\d{3,5} (\d{2} )?\d{6,} /,
];

/** Descrições com código único por transação: sem isso, cada uma vira um grupo na Revisão. */
const ALIASES: [RegExp, string][] = [
  [/^SITPASS\b/, 'SITPASS'],
  [/^UBER UBER ?\*/, 'UBER TRIP'],
  [/^DL ?\* ?UBER ?RIDES/, 'UBER TRIP'],
  [/^PAGAMENTO (TOTAL\/PARCIAL )?FATURA\b/, 'PAGAMENTO FATURA'],
  [/^RECARGA\b/, 'RECARGA'],
];

const UF = 'AC|AL|AM|AP|BA|CE|DF|ES|GO|MA|MG|MS|MT|PA|PB|PE|PI|PR|RJ|RN|RO|RR|RS|SC|SE|SP|TO';
const CITIES =
  'APARECIDA DE GOIANIA|SAO PAULO|RIO DE JANEIRO|BELO HORIZONTE|BRASILIA|CURITIBA|PORTO ALEGRE|SALVADOR|RECIFE|FORTALEZA|CAMPINAS|OSASCO|BARUERI|GOIANIA|ANAPOLIS';
const CITY_SUFFIX = new RegExp(`\\s+(${CITIES})(\\s+(${UF}))?(\\s+BRA?)?$`);
const UF_COUNTRY_SUFFIX = new RegExp(`\\s+(${UF})\\s+BRA?$`);
// No débito e na fatura, "BRA" fecha o padrão "ESTABELECIMENTO CIDADE BRA".
const UNKNOWN_CITY_SUFFIX = /(?<=\S)\s+\S+\s+BRA$/;

export type NormalizedDescription = {
  name: string;
  document?: string;
  installment?: { current: number; total: number };
};

function extractDocument(text: string): { document?: string; rest: string } {
  const cnpj = text.match(CNPJ);
  if (cnpj) return { document: cnpj[0].replace(/\D/g, ''), rest: text.replace(cnpj[0], ' ') };
  const cpf = text.match(CPF);
  if (cpf) return { document: cpf[0].replace(/\D/g, ''), rest: text.replace(cpf[0], ' ') };
  const masked = text.match(MASKED_CPF);
  if (masked) return { document: `${masked[1]}${masked[2]}`, rest: text.replace(masked[0], ' ') };
  return { rest: text };
}

function extractInstallment(text: string): {
  installment?: { current: number; total: number };
  rest: string;
} {
  const labelled = text.match(/\bPARC(?:ELA)?\.?\s*(\d{1,2})\s*(?:\/|DE)\s*(\d{1,2})\b/);
  const match = labelled ?? text.match(/\s(\d{1,2})\/(\d{1,2})$/);
  if (!match) return { rest: text };
  const current = Number(match[1]);
  const total = Number(match[2]);
  // Sem a palavra PARC, "12/03" pode ser data; só vale se fizer sentido como parcela.
  if (current < 1 || total < 2 || current > total) return { rest: text };
  return { installment: { current, total }, rest: text.replace(match[0], ' ') };
}

function stripPrefixes(text: string): string {
  let current = text;
  for (let changed = true; changed; ) {
    changed = false;
    for (const prefix of PREFIXES) {
      const next = current.replace(prefix, '').trim();
      if (next && next !== current) {
        current = next;
        changed = true;
      }
    }
  }
  return current;
}

function stripLocation(text: string): string {
  const known = text.replace(CITY_SUFFIX, '').replace(UF_COUNTRY_SUFFIX, '');
  if (known !== text) return known;
  return text.replace(UNKNOWN_CITY_SUFFIX, '').replace(/\s+BRA$/, '');
}

export function normalizeDescription(raw: string): NormalizedDescription {
  const text = normalizeText(raw.replace(/"/g, ' '));
  const { document, rest } = extractDocument(text);
  const { installment, rest: withoutInstallment } = extractInstallment(normalizeText(rest));
  const stripped = stripPrefixes(normalizeText(withoutInstallment));
  const alias = ALIASES.find(([pattern]) => pattern.test(stripped))?.[1];
  return {
    name: alias ?? (stripLocation(stripped).trim() || stripped),
    ...(document ? { document } : {}),
    ...(installment ? { installment } : {}),
  };
}
