import * as pdfjs from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { groupIntoLines, type PositionedText } from './lines';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

export class PdfPasswordError extends Error {
  constructor(public readonly incorrect: boolean) {
    super(incorrect ? 'Senha incorreta' : 'PDF protegido por senha');
  }
}

export class ScannedPdfError extends Error {
  constructor() {
    super('PDF escaneado, sem texto');
  }
}

export async function extractPdfText(data: ArrayBuffer, password?: string): Promise<string> {
  let document: pdfjs.PDFDocumentProxy;
  try {
    // O pdf.js transfere o buffer para o worker; a cópia preserva o original para nova senha.
    document = await pdfjs.getDocument({ data: new Uint8Array(data.slice(0)), password }).promise;
  } catch (error) {
    if (error instanceof Error && error.name === 'PasswordException') {
      throw new PdfPasswordError(password !== undefined);
    }
    throw error;
  }

  const pages: string[] = [];
  for (let number = 1; number <= document.numPages; number++) {
    const page = await document.getPage(number);
    const content = await page.getTextContent();
    const items: PositionedText[] = [];
    for (const item of content.items) {
      if ('str' in item && item.str.trim()) {
        items.push({
          text: item.str,
          x: item.transform[4],
          y: item.transform[5],
          width: item.width,
        });
      }
    }
    pages.push(groupIntoLines(items).join('\n'));
  }
  await document.destroy();

  const text = pages.join('\n');
  if (text.replace(/\s/g, '').length < 20) throw new ScannedPdfError();
  return text;
}

/** Os bancos exportam CSV em UTF-8 ou Windows-1252. */
export function decodeText(data: ArrayBuffer): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(data).replace(/^﻿/, '');
  } catch {
    return new TextDecoder('windows-1252').decode(data);
  }
}
