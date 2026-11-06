export type RawTransaction = {
  date: string;
  description: string;
  /** Em centavos: negativo = saída, positivo = entrada. */
  amount: number;
};

export type BankParser = {
  id: string;
  name: string;
  detect(text: string): boolean;
  parse(text: string): RawTransaction[];
};
