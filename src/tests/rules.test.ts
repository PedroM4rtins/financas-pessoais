import { describe, expect, it } from 'vitest';
import type { Rule, Transaction } from '../db/types';
import {
  classify,
  matchKeyword,
  reclassify,
  ruleMatches,
  sortRules,
} from '../features/classify/rules';

const rule = (overrides: Partial<Rule>): Rule => ({
  id: 'r',
  field: 'name',
  operator: 'contains',
  value: 'JORGE',
  categoryId: 'lazer',
  priority: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

const tx = (overrides: Partial<Transaction> = {}): Transaction => ({
  id: 't',
  fingerprint: 'f',
  date: '2026-11-01',
  rawDescription: 'PIX ENVIADO JORGE DA SILVA',
  name: 'JORGE DA SILVA',
  amount: -1000,
  kind: 'pix_enviado',
  categoryId: null,
  classifiedBy: null,
  sourceFileId: 'a',
  bank: 'Inter',
  ...overrides,
});

describe('classify', () => {
  it('nunca sobrescreve classificação manual', () => {
    const manual = tx({ categoryId: 'saude', classifiedBy: 'manual' });
    expect(classify(manual, [rule({})])).toEqual({ categoryId: 'saude', classifiedBy: 'manual' });
  });

  it('CNPJ vence nome, mesmo com prioridade menor', () => {
    const rules = sortRules([
      rule({ id: 'nome', categoryId: 'lazer', priority: 99 }),
      rule({ id: 'doc', field: 'document', operator: 'equals', value: '123', categoryId: 'saude' }),
    ]);
    expect(classify(tx({ document: '123' }), rules)).toMatchObject({
      categoryId: 'saude',
      ruleId: 'doc',
    });
  });

  it('regra do usuário vence palavra-chave', () => {
    const uber = tx({ name: 'UBER TRIP', rawDescription: 'UBER TRIP' });
    expect(classify(uber, [rule({ value: 'UBER', categoryId: 'lazer' })])).toMatchObject({
      categoryId: 'lazer',
      classifiedBy: 'regra_usuario',
    });
  });

  it('respeita a prioridade entre regras do mesmo campo', () => {
    const rules = sortRules([
      rule({ id: 'baixa', priority: 1, categoryId: 'lazer' }),
      rule({ id: 'alta', priority: 5, categoryId: 'saude' }),
    ]);
    expect(classify(tx(), rules).ruleId).toBe('alta');
  });

  it('usa palavra-chave e deixa null quando nada casa', () => {
    expect(classify(tx({ name: 'IFOOD', rawDescription: 'IFOOD' }), [])).toEqual({
      categoryId: 'alimentacao',
      classifiedBy: 'palavra_chave',
    });
    expect(classify(tx(), [])).toEqual({ categoryId: null, classifiedBy: null });
  });

  it('recupera a pista IFD* da descrição original', () => {
    const sushi = tx({ name: 'SUSHI LEGAL', rawDescription: 'IFD*SUSHI LEGAL' });
    expect(classify(sushi, []).categoryId).toBe('alimentacao');
  });
});

describe('matchKeyword', () => {
  it.each([
    ['BARBEARIA DO ZE', null],
    ['TIMBER LOJA', null],
    ['BAR DO ZE', 'lazer'],
    ['DROGARIA SAO PAULO', 'saude'],
    ['RAIA DROGASIL SA', 'saude'],
    ['MERCADOLIVRE', 'compras'],
    ['MERCADO LIVRE', 'compras'],
    ['MERCADO DA ESQUINA', 'alimentacao'],
    ['MERCADO PAGO ZE', null],
    ['AMAZON PRIME', 'assinaturas'],
    ['AMAZON BR', 'compras'],
    ['99 CORRIDA', 'transporte'],
    ['LOJA 99', null],
    ['IFOODCOM AGENCIA DE RESTAURANTES ONLINE SA', 'alimentacao'],
    ['AUTOPOSTOLIDER', 'transporte'],
    ['POSTOS WK LTDA', 'transporte'],
    ['SITPASS', 'transporte'],
    ['UBER TRIP', 'transporte'],
    ['UBERLANDIA MOVEIS', null],
    ['RECARGA', 'moradia'],
  ])('%s → %s', (text, expected) => {
    expect(matchKeyword(text)).toBe(expected);
  });
});

describe('ruleMatches', () => {
  it('aplica cada operador', () => {
    const target = { name: 'JORGE DA SILVA' };
    expect(ruleMatches(rule({ operator: 'equals', value: 'JORGE DA SILVA' }), target)).toBe(true);
    expect(ruleMatches(rule({ operator: 'equals', value: 'JORGE' }), target)).toBe(false);
    expect(ruleMatches(rule({ operator: 'startsWith', value: 'JORGE' }), target)).toBe(true);
    expect(ruleMatches(rule({ operator: 'regex', value: 'silva$' }), target)).toBe(true);
  });

  it('regex inválida não quebra', () => {
    expect(ruleMatches(rule({ operator: 'regex', value: '(' }), { name: 'X' })).toBe(false);
  });
});

describe('reclassify', () => {
  it('atualiza antigas, preserva manuais e limpa regra excluída', () => {
    const antiga = tx({ id: 'antiga' });
    const manual = tx({ id: 'manual', categoryId: 'saude', classifiedBy: 'manual' });
    const changed = reclassify([antiga, manual], [rule({ id: 'r1' })]);
    expect(changed.map((item) => item.id)).toEqual(['antiga']);
    expect(changed[0]).toMatchObject({ categoryId: 'lazer', ruleId: 'r1' });

    const [cleared] = reclassify(changed, []);
    expect(cleared).toMatchObject({ categoryId: null, classifiedBy: null });
    expect(cleared?.ruleId).toBeUndefined();
  });
});
