import * as pdfjs from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { groupIntoLines, type PositionedText } from './lines';
import { PdfPasswordError, ScannedPdfError } from './readErrors';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

export async function extractPdfText(data: ArrayBuffer, password?: string): Promise<string> {
  // O pdf.js transfere o buffer para o worker; a cópia preserva o original para nova senha.
  const task = pdfjs.getDocument({ data: new Uint8Array(data.slice(0)), password });
  let document: pdfjs.PDFDocumentProxy;
  try {
    document = await task.promise;
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
  await task.destroy();

  const text = pages.join('\n');
  if (text.replace(/\s/g, '').length < 20) throw new ScannedPdfError();
  return text;
}
