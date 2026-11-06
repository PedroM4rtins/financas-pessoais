import { genericParser } from './generic';
import { interParser } from './inter';
import { itauParser } from './itau';
import { nubankParser } from './nubank';
import type { BankParser } from './types';

const PARSERS: BankParser[] = [interParser, nubankParser, itauParser];

export function detectParser(text: string): BankParser {
  return PARSERS.find((parser) => parser.detect(text)) ?? genericParser;
}
