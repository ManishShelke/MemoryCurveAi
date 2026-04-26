// ─────────────────────────────────────────────────────────────
// File Parser — PDF, DOCX, TXT extraction
// ─────────────────────────────────────────────────────────────

import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';

// Set the worker source robustly via CDN to bypass Vite's dynamic module block mechanisms
pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

/**
 * Extract text from a PDF file.
 */
export async function parsePDF(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map((item) => item.str).join(' ');
    fullText += pageText + '\n\n';
  }

  return fullText.trim();
}

/**
 * Extract text from a DOCX file.
 */
export async function parseDOCX(file) {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value.trim();
}

/**
 * Read a plain text file.
 */
export async function parseTextFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = (e) => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

/**
 * Auto-detect file type and extract text.
 * @param {File} file
 * @returns {Promise<{text: string, type: string, name: string}>}
 */
export async function parseFile(file) {
  const name = file.name.toLowerCase();
  let text = '';
  let type = '';

  if (name.endsWith('.pdf')) {
    text = await parsePDF(file);
    type = 'pdf';
  } else if (name.endsWith('.docx') || name.endsWith('.doc')) {
    text = await parseDOCX(file);
    type = 'docx';
  } else if (name.endsWith('.txt') || name.endsWith('.md')) {
    text = await parseTextFile(file);
    type = 'text';
  } else {
    throw new Error(`Unsupported file type: ${name.split('.').pop()}`);
  }

  if (!text || text.trim().length < 10) {
    throw new Error('File appears to be empty or could not be read.');
  }

  return { text, type, name: file.name };
}

/**
 * Get file type icon and label.
 */
export function getFileInfo(fileName) {
  const ext = fileName.split('.').pop().toLowerCase();
  const types = {
    pdf: { label: 'PDF Document', icon: '📄' },
    docx: { label: 'Word Document', icon: '📝' },
    doc: { label: 'Word Document', icon: '📝' },
    txt: { label: 'Text File', icon: '📃' },
    md: { label: 'Markdown File', icon: '📋' },
  };
  return types[ext] || { label: 'File', icon: '📎' };
}

/**
 * Supported file extensions.
 */
export const SUPPORTED_EXTENSIONS = ['.pdf', '.docx', '.doc', '.txt', '.md'];
export const SUPPORTED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'text/plain',
  'text/markdown',
];
