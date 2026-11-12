export type TransactionKind =
  'compra' | 'pix_enviado' | 'pix_recebido' | 'estorno' | 'tarifa' | 'pagamento_fatura' | 'outro';

export type ClassifiedBy = 'regra_usuario' | 'palavra_chave' | 'manual' | null;

export type Transaction = {
  id: string;
  /** Identifica a mesma transação vinda de arquivos diferentes, mesmo em PDF e CSV. */
  fingerprint: string;
  date: string;
  rawDescription: string;
  name: string;
  document?: string;
  /** Em centavos: negativo = saída, positivo = entrada. */
  amount: number;
  kind: TransactionKind;
  installment?: { current: number; total: number };
  categoryId: string | null;
  classifiedBy: ClassifiedBy;
  ruleId?: string;
  /** Marcada como "Ignorar" na Revisão. */
  reviewIgnored?: boolean;
  sourceFileId: string;
  bank: string;
};

export type RuleField = 'name' | 'document';
export type RuleOperator = 'equals' | 'contains' | 'startsWith' | 'regex';

export type Rule = {
  id: string;
  field: RuleField;
  operator: RuleOperator;
  value: string;
  categoryId: string;
  priority: number;
  createdAt: string;
};

export type Category = {
  id: string;
  name: string;
  color: string;
  icon: string;
  /** Orçamento mensal em centavos. */
  budget?: number;
};

export type NoteKind = 'geral' | 'lembrete' | 'meta' | 'conta' | 'ideia';

export type Note = {
  id: string;
  kind: NoteKind;
  title: string;
  body: string;
  /** Data a que a anotação se refere (yyyy-mm-dd), escolhida pela pessoa. */
  date: string;
  /** Fixadas aparecem antes das outras. */
  pinned?: boolean;
  /** Quando avisar no WhatsApp, no fuso de quem usa: yyyy-mm-ddThh:mm. */
  remindAt?: string;
  /** Quando o lembrete saiu (ISO). Sem isto e com remindAt no passado, está pendente. */
  remindedAt?: string;
  /** Motivo da última falha de envio; some quando o envio dá certo. */
  reminderError?: string;
  createdAt: string;
  updatedAt: string;
};

export type ImportedFile = {
  id: string;
  fileName: string;
  bank: string;
  period: string;
  importedAt: string;
  count: number;
};

/**
 * Pagar a fatura não é gasto novo: as compras já contam na própria fatura.
 * Estornos e Pix recebidos têm valor positivo e ficam em Entradas.
 */
export const isExpense = (tx: Transaction): boolean =>
  tx.amount < 0 && tx.kind !== 'pagamento_fatura';

export const isIncome = (tx: Transaction): boolean => tx.amount > 0;

export const needsReview = (tx: Transaction): boolean =>
  isExpense(tx) && tx.categoryId === null && !tx.reviewIgnored;
