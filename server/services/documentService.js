import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';

/**
 * Extracts text from a file buffer based on mimetype
 */
export async function extractTextFromBuffer(buffer, filename, mimetype) {
  try {
    let text = '';
    const name = filename.toLowerCase();

    if (mimetype === 'application/pdf' || name.endsWith('.pdf')) {
      const data = await pdfParse(buffer);
      text = data.text;
    } 
    else if (
      mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
      name.endsWith('.docx')
    ) {
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
    } 
    else if (mimetype === 'text/plain' || name.endsWith('.txt') || name.endsWith('.md')) {
      text = buffer.toString('utf8');
    } 
    else {
      throw new Error(`Unsupported file type: ${mimetype}`);
    }

    // Clean text: remove null characters, fix excessive newlines
    text = text.replace(/\x00/g, '').replace(/\n{3,}/g, '\n\n').trim();

    return text;
  } catch (error) {
    console.error('Extraction error:', error);
    throw new Error('Failed to extract text from document: ' + error.message);
  }
}

/**
 * Semantic chunking for large documents to avoid token limits
 * Splits by paragraphs or sentences aiming for maxChars per chunk.
 */
export function chunkText(text, maxChars = 12000) {
  if (!text) return [];
  if (text.length <= maxChars) return [text];

  const chunks = [];
  const paragraphs = text.split(/\n\s*\n/);
  
  let currentChunk = '';

  for (const paragraph of paragraphs) {
    if ((currentChunk.length + paragraph.length) > maxChars && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = '';
    }
    
    // If a single paragraph is incredibly long, we just have to split it by character
    if (paragraph.length > maxChars) {
      if (currentChunk) chunks.push(currentChunk.trim());
      
      let p = paragraph;
      while (p.length > maxChars) {
        chunks.push(p.substring(0, maxChars).trim());
        p = p.substring(maxChars);
      }
      currentChunk = p;
    } else {
      currentChunk += paragraph + '\n\n';
    }
  }

  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}
