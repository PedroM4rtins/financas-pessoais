import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { isExpense, needsReview } from '../db/types';
import { buildTransactions } from '../features/import/buildTransactions';
import { groupIntoLines } from '../features/import/lines';
import { detectParser } from '../features/import/parsers';
import { genericParser } from '../features/import/parsers/generic';
import { interParser } from '../features/import/parsers/inter';
import { nubankParser } from '../features/import/parsers/nubank';

const fixture = (name: string) =>
  readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');

describe('parser genérico', () => {
  const rows = genericParser.parse(fixture('generico.txt'));

  it('lê só as linhas de transação', () => {
    expect(rows.map((row) => row.description)).toEqual([
      'PIX ENVIADO JORGE DA SILVA',
      'COMPRA NO DEBITO PADARIA BELLA VISTA',
      'PIX RECEBIDO MARIA OLIVEIRA',
      'TARIFA PACOTE SERVICOS',
      'COMPRA ANO ANTERIOR',
    ]);
  });

  it('usa o primeiro valor da linha, não o saldo', () => {
    expect(rows.map((row) => row.amount)).toEqual([-1000, -1950, 25000, -123456, -500]);
  });

  it('deduz o ano, inclusive na virada', () => {
    expect(rows[0]?.date).toBe('2026-11-01');
    expect(rows[4]?.date).toBe('2025-12-31');
  });
});

describe('parser Nubank', () => {
  const text = fixture('nubank.txt');

  it('é detectado pelo texto', () => {
    expect(detectParser(text).id).toBe('nubank');
    expect(detectParser('qualquer coisa').id).toBe('generico');
  });

  it('lê compras como saída e estorno como entrada', () => {
    expect(nubankParser.parse(text).map((row) => [row.date, row.amount])).toEqual([
      ['2026-10-05', -5240],
      ['2026-10-12', -12980],
      ['2026-10-20', 1550],
      ['2026-11-04', -4490],
    ]);
  });
});

describe('parser Inter (PDF)', () => {
  const text = fixture('inter.txt');
  const rows = interParser.parse(text);
  const txs = buildTransactions(rows, 'arquivo', 'Inter');

  it('é detectado pelo texto', () => {
    expect(detectParser(text).id).toBe('inter');
  });

  it('usa o valor, não o saldo, e ignora cabeçalho e rodapé', () => {
    expect(rows.map((row) => row.amount)).toEqual([
      -7000, -1560, -430, -782, 782, 90000, 4400, 2593, -2593, -2000,
    ]);
  });

  it('herda a data do cabeçalho do dia, mesmo depois do rodapé da página', () => {
    expect(rows[0]?.date).toBe('2026-08-09');
    expect(rows[4]?.date).toBe('2026-08-09');
    expect(rows[5]?.date).toBe('2026-08-10');
    expect(rows[9]?.date).toBe('2027-03-01');
  });

  it('detecta tipos e nomes', () => {
    expect(txs.map((item) => [item.kind, item.name])).toEqual([
      ['pix_enviado', 'JORGE DA SILVA'],
      ['compra', 'POSTOS FICTICIOS LTDA'],
      ['compra', 'SITPASS'],
      ['pagamento_fatura', 'PAGAMENTO FATURA'],
      ['outro', 'CDB CREDITO BANCO INTER S A'],
      ['outro', 'UNIVERSIDADE FICTICIA'],
      ['estorno', 'JORGE DA SILVA'],
      ['estorno', 'UBER TRIP'],
      ['compra', 'UBER TRIP'],
      ['compra', 'RECARGA'],
    ]);
  });

  it('deixa pagamento de fatura fora dos gastos e da Revisão', () => {
    const payment = txs[3];
    expect(payment && isExpense(payment)).toBe(false);
    expect(payment && needsReview(payment)).toBe(false);
  });
});

describe('parser Inter (CSV)', () => {
  const text = fixture('inter.csv');
  const rows = interParser.parse(text);
  const txs = buildTransactions(rows, 'arquivo', 'Inter');

  it('é detectado pelo cabeçalho', () => {
    expect(detectParser(text).id).toBe('inter');
  });

  it('lê todas as linhas com data ISO e centavos', () => {
    expect(rows).toHaveLength(9);
    expect(rows[0]).toMatchObject({ date: '2026-11-05', amount: -1794 });
    expect(rows[2]?.amount).toBe(104000);
  });

  it('separa o estabelecimento da cidade grudada', () => {
    expect(txs.map((item) => item.name)).toEqual([
      'UBER TRIP',
      'UBER TRIP',
      'MARIA OLIVEIRA',
      'JORGE DA SILVA',
      'PAGAMENTO FATURA',
      'RECARGA',
      'MSO COMERCIO ATACADIST',
      'COMPRA NO DEBITO',
      'SITPASS',
    ]);
  });
});

describe('buildTransactions', () => {
  it('detecta tipo, parcela e nome', () => {
    const [estorno, parcela] = buildTransactions(
      [
        { date: '2026-11-01', description: 'ESTORNO LOJA', amount: 1550 },
        { date: '2026-11-02', description: 'AMAZON BR PARC 02/05', amount: -12980 },
      ],
      'arquivo',
      'Nubank',
    );
    expect(estorno?.kind).toBe('estorno');
    expect(parcela).toMatchObject({
      kind: 'compra',
      name: 'AMAZON BR',
      installment: { current: 2, total: 5 },
    });
  });

  it('mantém compras iguais no mesmo dia como transações distintas', () => {
    const row = { date: '2026-11-01', description: 'CAFE', amount: -500 };
    const [a, b] = buildTransactions([row, row], 'arquivo', 'Nubank');
    expect(a?.id).not.toBe(b?.id);
    expect(a?.fingerprint).not.toBe(b?.fingerprint);
  });

  it('reconhece a mesma transação em PDF e CSV, com descrições diferentes', () => {
    const base = { date: '2026-11-01', amount: -500 };
    const [pdf] = buildTransactions([{ ...base, description: 'Pix: "Cp :1-X"' }], 'a', 'Inter');
    const [csv] = buildTransactions([{ ...base, description: 'Pix enviado X' }], 'b', 'Inter');
    expect(pdf?.fingerprint).toBe(csv?.fingerprint);
  });
});

describe('groupIntoLines', () => {
  it('agrupa por Y e ordena por X', () => {
    expect(
      groupIntoLines([
        { text: '10,00', x: 300, y: 500, width: 30 },
        { text: '01/11', x: 10, y: 501, width: 30 },
        { text: 'PADARIA', x: 60, y: 499, width: 50 },
        { text: 'Rodapé', x: 10, y: 100, width: 40 },
      ]),
    ).toEqual(['01/11 PADARIA 10,00', 'Rodapé']);
  });

  it('não parte uma palavra dividida em pedaços', () => {
    expect(
      groupIntoLines([
        { text: 'Ste', x: 10, y: 500, width: 15 },
        { text: 'ff', x: 25, y: 500, width: 6 },
        { text: 'ane', x: 31, y: 500, width: 15 },
        { text: 'Nunes', x: 50, y: 500, width: 25 },
      ]),
    ).toEqual(['Steffane Nunes']);
  });
});
