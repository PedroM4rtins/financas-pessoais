// Ficam fora de pdfText.ts para quem só trata o erro não carregar o pdf.js inteiro.

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

/** Os bancos exportam CSV em UTF-8 ou Windows-1252. */
export function decodeText(data: ArrayBuffer): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(data).replace(/^\ufeff/, '');
  } catch {
    return new TextDecoder('windows-1252').decode(data);
  }
}
