export interface Token {
  text: string;
  color?: string;
  italic?: boolean;
}

// Material Palenight–inspired palette (from Stitch design)
const C = {
  keyword:  '#c792ea', // import, export, class, const, if, return, async, await, etc.
  type:     '#ffcb6b', // Capitalized identifiers: Redis, Promise, Error, etc.
  string:   '#c3e88d', // 'string', "string", `template`
  comment:  '#546e7a', // // comments
  property: '#f07178', // object properties, this.field
  func:     '#82aaff', // function calls: foo(
  punct:    '#89ddff', // => {} () [] ; , . :
  number:   '#f78c6c', // numeric literals
  default:  '#a0a0b0',
};

const KEYWORDS = new Set([
  'import', 'export', 'from', 'default', 'as',
  'const', 'let', 'var', 'function', 'class', 'extends', 'implements',
  'return', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue',
  'new', 'throw', 'try', 'catch', 'finally', 'typeof', 'instanceof', 'in', 'of',
  'async', 'await', 'yield',
  'this', 'super',
  'true', 'false', 'null', 'undefined', 'void',
  'private', 'public', 'protected', 'static', 'readonly', 'abstract',
  'interface', 'type', 'enum', 'namespace', 'module', 'declare',
]);

// Order matters — first match wins
const RULES: [RegExp, (match: RegExpExecArray) => Token[]][] = [
  // Line comments
  [/^\/\/.*/, (m) => [{ text: m[0], color: C.comment, italic: true }]],

  // Strings: single-quoted, double-quoted, backtick (handles simple template literals)
  [/^('[^'\\]*(?:\\.[^'\\]*)*')/, (m) => [{ text: m[0], color: C.string }]],
  [/^("[^"\\]*(?:\\.[^"\\]*)*")/, (m) => [{ text: m[0], color: C.string }]],
  [/^(`[^`\\]*(?:\\.[^`\\]*)*`)/, (m) => [{ text: m[0], color: C.string }]],

  // Decorators: @word
  [/^@\w+/, (m) => [{ text: m[0], color: C.keyword }]],

  // Numbers
  [/^(?:0[xXbBoO])?[\d][\d_]*(?:\.[\d_]+)?(?:[eE][+-]?\d+)?n?/, (m) => [{ text: m[0], color: C.number }]],

  // Identifiers and keywords
  [/^[a-zA-Z_$][\w$]*/, (m) => {
    const word = m[0];
    if (KEYWORDS.has(word)) return [{ text: word, color: C.keyword }];
    if (/^[A-Z]/.test(word)) return [{ text: word, color: C.type }];
    return [{ text: word, color: C.default }];
  }],

  // Arrow =>
  [/^=>/, (m) => [{ text: m[0], color: C.punct }]],

  // Punctuation
  [/^[{}()\[\];,.:?!<>=+\-*/%&|^~@#]/, (m) => [{ text: m[0], color: C.punct }]],

  // Whitespace
  [/^\s+/, (m) => [{ text: m[0] }]],
];

export function tokenizeLine(line: string): Token[] {
  const tokens: Token[] = [];
  let pos = 0;

  while (pos < line.length) {
    let matched = false;
    const remaining = line.slice(pos);

    for (const [re, handler] of RULES) {
      const match = re.exec(remaining);
      if (match) {
        tokens.push(...handler(match));
        pos += match[0].length;
        matched = true;
        break;
      }
    }

    if (!matched) {
      // Consume one character as default
      tokens.push({ text: line[pos], color: C.default });
      pos++;
    }
  }

  // Post-process: color identifiers followed by '(' as function calls
  for (let i = 0; i < tokens.length - 1; i++) {
    const t = tokens[i];
    if (t.color === C.default && /^[a-z_$][\w$]*$/i.test(t.text)) {
      // Look ahead past whitespace for '('
      let j = i + 1;
      while (j < tokens.length && tokens[j].text.trim() === '') j++;
      if (j < tokens.length && tokens[j].text === '(') {
        t.color = C.func;
      }
    }
  }

  // Post-process: color identifiers after '.' as properties
  for (let i = 1; i < tokens.length; i++) {
    if (tokens[i - 1].text === '.' && tokens[i].color === C.default) {
      tokens[i].color = C.property;
    }
  }

  return tokens;
}
