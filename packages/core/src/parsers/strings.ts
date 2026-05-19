import type { StringEntry } from '../types.js';

interface Cursor {
  source: string;
  pos: number;
  line: number;
  col: number;
}

class ParseError extends Error {
  constructor(message: string, public line: number, public col: number) {
    super(`${message} at line ${line}, col ${col}`);
  }
}

function advance(c: Cursor, n = 1): void {
  for (let i = 0; i < n; i++) {
    if (c.pos >= c.source.length) return;
    if (c.source[c.pos] === '\n') {
      c.line++;
      c.col = 1;
    } else {
      c.col++;
    }
    c.pos++;
  }
}

function peek(c: Cursor, offset = 0): string {
  return c.source[c.pos + offset] ?? '';
}

function skipTrivia(c: Cursor): void {
  while (c.pos < c.source.length) {
    const ch = peek(c);
    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
      advance(c);
      continue;
    }
    if (ch === '/' && peek(c, 1) === '/') {
      while (c.pos < c.source.length && peek(c) !== '\n') advance(c);
      continue;
    }
    if (ch === '/' && peek(c, 1) === '*') {
      advance(c, 2);
      while (c.pos < c.source.length && !(peek(c) === '*' && peek(c, 1) === '/')) {
        advance(c);
      }
      if (c.pos < c.source.length) advance(c, 2);
      continue;
    }
    return;
  }
}

function expect(c: Cursor, ch: string): void {
  if (peek(c) !== ch) {
    throw new ParseError(`Expected '${ch}', got '${peek(c) || '<eof>'}'`, c.line, c.col);
  }
  advance(c);
}

interface LiteralResult {
  value: string;
  startLine: number;
  startCol: number;
  charLines: number[];
  charCols: number[];
}

function readStringLiteral(c: Cursor): LiteralResult {
  expect(c, '"');
  const chars: string[] = [];
  const charLines: number[] = [];
  const charCols: number[] = [];
  const startLine = c.line;
  const startCol = c.col;
  while (c.pos < c.source.length) {
    const ch = peek(c);
    if (ch === '"') {
      advance(c);
      return { value: chars.join(''), startLine, startCol, charLines, charCols };
    }
    if (ch === '\\') {
      const escLine = c.line;
      const escCol = c.col;
      advance(c);
      const esc = peek(c);
      let decoded: string;
      switch (esc) {
        case 'n':
          decoded = '\n';
          advance(c);
          break;
        case 't':
          decoded = '\t';
          advance(c);
          break;
        case 'r':
          decoded = '\r';
          advance(c);
          break;
        case '"':
          decoded = '"';
          advance(c);
          break;
        case '\\':
          decoded = '\\';
          advance(c);
          break;
        case "'":
          decoded = "'";
          advance(c);
          break;
        case '0':
          decoded = '\0';
          advance(c);
          break;
        case 'U':
        case 'u': {
          advance(c);
          let hex = '';
          while (hex.length < 4 && /[0-9a-fA-F]/.test(peek(c))) {
            hex += peek(c);
            advance(c);
          }
          if (hex.length === 0) {
            throw new ParseError('Invalid \\u escape', escLine, escCol);
          }
          decoded = String.fromCodePoint(parseInt(hex, 16));
          break;
        }
        default:
          decoded = esc;
          advance(c);
      }
      for (const codePoint of decoded) {
        chars.push(codePoint);
        charLines.push(escLine);
        charCols.push(escCol);
      }
      continue;
    }
    const charLine = c.line;
    const charCol = c.col;
    if (ch >= '\uD800' && ch <= '\uDBFF' && c.pos + 1 < c.source.length) {
      const next = peek(c, 1);
      if (next >= '\uDC00' && next <= '\uDFFF') {
        chars.push(ch + next);
        charLines.push(charLine);
        charCols.push(charCol);
        advance(c, 2);
        continue;
      }
    }
    chars.push(ch);
    charLines.push(charLine);
    charCols.push(charCol);
    advance(c);
  }
  throw new ParseError('Unterminated string literal', startLine, startCol);
}

export interface ParsedStringEntry extends StringEntry {
  valueChars: string[];
  charLines: number[];
  charCols: number[];
}

export function parseStrings(source: string): ParsedStringEntry[] {
  const c: Cursor = { source, pos: 0, line: 1, col: 1 };
  if (source.charCodeAt(0) === 0xfeff) {
    advance(c);
  }
  const entries: ParsedStringEntry[] = [];
  while (true) {
    skipTrivia(c);
    if (c.pos >= c.source.length) break;
    const key = readStringLiteral(c);
    skipTrivia(c);
    expect(c, '=');
    skipTrivia(c);
    const valueResult = readStringLiteral(c);
    skipTrivia(c);
    expect(c, ';');
    const valueChars: string[] = [];
    for (const cp of valueResult.value) valueChars.push(cp);
    entries.push({
      key: key.value,
      value: valueResult.value,
      valueLine: valueResult.startLine,
      valueCol: valueResult.startCol,
      valueChars,
      charLines: valueResult.charLines,
      charCols: valueResult.charCols,
    });
  }
  return entries;
}

export function decodeStringsBuffer(buf: Buffer): string {
  if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) {
    return buf.toString('utf16le', 2);
  }
  if (buf.length >= 2 && buf[0] === 0xfe && buf[1] === 0xff) {
    const swapped = Buffer.alloc(buf.length - 2);
    for (let i = 2; i + 1 < buf.length; i += 2) {
      swapped[i - 2] = buf[i + 1]!;
      swapped[i - 1] = buf[i]!;
    }
    return swapped.toString('utf16le');
  }
  if (buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
    return buf.toString('utf8', 3);
  }
  return buf.toString('utf8');
}
