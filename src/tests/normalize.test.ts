import { describe, expect, it } from 'vitest';
import { normalizeDescription, normalizeText } from '../features/classify/normalize';

describe('normalizeText', () => {
  it('deixa em maiúsculas, sem acento e com espaços colapsados', () => {
    expect(normalizeText('  Pão   de Açúcar ')).toBe('PAO DE ACUCAR');
  });
});

describe('normalizeDescription', () => {
  it.each([
    ['PIX ENVIADO JORGE DA SILVA', 'JORGE DA SILVA'],
    ['PIX RECEBIDO MARIA', 'MARIA'],
    ['TRANSFERENCIA ENVIADA JOAO', 'JOAO'],
    ['PAG*MARIAOLIVEIRA', 'MARIAOLIVEIRA'],
    ['PG *LOJA', 'LOJA'],
    ['MP*LOJADOZE', 'LOJADOZE'],
    ['IFD*BURGER KING', 'BURGER KING'],
    ['EC *BARDOZE', 'BARDOZE'],
    ['COMPRA NO DEBITO PADARIA', 'PADARIA'],
  ])('remove o meio de pagamento de %s', (raw, name) => {
    expect(normalizeDescription(raw).name).toBe(name);
  });

  it.each([
    ['UBER TRIP SAO PAULO BR', 'UBER TRIP'],
    ['AutoPostoLider SAO PAULO BRA', 'AUTOPOSTOLIDER'],
    ['KI PAO GOIANIA BRA', 'KI PAO'],
    ['POSTOS FICTICIOS LTDA JARAGUA BRA', 'POSTOS FICTICIOS LTDA'],
    ['LOJA BARCARENA BRA', 'LOJA'],
  ])('remove cidade e país de %s', (raw, name) => {
    expect(normalizeDescription(raw).name).toBe(name);
  });

  it.each([
    ['Pix enviado: "Cp :18236120-Jorge da Silva"', 'JORGE DA SILVA'],
    ['Pix enviado: "00019 96292997 JORGE SILVA"', 'JORGE SILVA'],
    ['Pix enviado devolvido: "Cp :08561701-Jorge da Silva"', 'JORGE DA SILVA'],
    ['Compra no debito: "No estabelecimento MP *LOJA BARCARENA BRA"', 'LOJA'],
    ['Transferencia recebida: "001 86 000000000 UNIVERSIDADE X"', 'UNIVERSIDADE X'],
    ['Estorno: "Estorno no estabelecimento DROGASIL 1592"', 'DROGASIL 1592'],
  ])('entende o formato do Inter: %s', (raw, name) => {
    expect(normalizeDescription(raw).name).toBe(name);
  });

  it.each([
    ['Compra no debito: "No estabelecimento Sitpass*1T260810-JD60 GOIANIA BRA"', 'SITPASS'],
    ['Compra no débito Sitpass*1t260820-w5rw', 'SITPASS'],
    ['Compra no debito: "No estabelecimento Uber UBER *TRIP HELP.U"', 'UBER TRIP'],
    ['Compra no débito Dl          *uberrides', 'UBER TRIP'],
    ['Pagamento efetuado Pagamento Fatura - FULANO', 'PAGAMENTO FATURA'],
    ['Pagamento total/parcial fatura em atraso: "Pagamento fatura"', 'PAGAMENTO FATURA'],
    ['Recarga: "478bca88-0000-0000-0000-7487a83e0b0b"', 'RECARGA'],
    ['Recarga TIM', 'RECARGA'],
  ])('junta descrições com código único: %s', (raw, name) => {
    expect(normalizeDescription(raw).name).toBe(name);
  });

  it('guarda a parcela e tira do nome', () => {
    expect(normalizeDescription('AMAZON BR PARC 02/10')).toMatchObject({
      name: 'AMAZON BR',
      installment: { current: 2, total: 10 },
    });
    expect(normalizeDescription('LOJA X 3/12').installment).toEqual({ current: 3, total: 12 });
  });

  it('não confunde número comum com parcela', () => {
    const result = normalizeDescription('LOJA 12/03');
    expect(result.installment).toBeUndefined();
    expect(result.name).toBe('LOJA 12/03');
  });

  it('extrai CNPJ só com dígitos', () => {
    expect(normalizeDescription('ASSAI 08.965.639/0001-13')).toEqual({
      name: 'ASSAI',
      document: '08965639000113',
    });
  });

  it('extrai CPF mascarado', () => {
    expect(normalizeDescription('PIX ENVIADO JORGE ***.482.117-**')).toEqual({
      name: 'JORGE',
      document: '482117',
    });
  });
});
