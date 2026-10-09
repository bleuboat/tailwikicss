const BACKSLASH = 0x5c;
const SLASH = 0x2f;
const DOUBLE_QUOTE = 0x22;
const SINGLE_QUOTE = 0x27;
const COLON = 0x3a;
const SEMICOLON = 0x3b;
const LINE_BREAK = 0x0a;
const CARRIAGE_RETURN = 0xd;
const SPACE = 0x20;
const TAB = 0x09;
const OPEN_CURLY = 0x7b;
const CLOSE_CURLY = 0x7d;
const OPEN_PAREN = 0x28;
const CLOSE_PAREN = 0x29;
const OPEN_BRACKET = 0x5b;
const CLOSE_BRACKET = 0x5d;
const DASH = 0x2d;
const AT_SIGN = 0x40;

type StyleRule = {
  kind: "rule";
  selector: string;
  nodes: AstNode[];

  src?: any;
  dst?: any;
};

type AtRule = {
  kind: "at-rule";
  name: string;
  params: string;
  nodes: AstNode[];

  src?: any;
  dst?: any;
};

type Declaration = {
  kind: "declaration";
  property: string;
  value: string | undefined;
  important: boolean;

  src?: any;
  dst?: any;
};

type Comment = {
  kind: "comment";
  value: string;

  src?: any;
  dst?: any;
};

type Context = {
  kind: "context";
  context: Record<string, string | boolean>;
  nodes: AstNode[];

  src?: any;
  dst?: any;
};

type AtRoot = {
  kind: "at-root";
  nodes: AstNode[];

  src?: any;
  dst?: any;
};

type Rule = StyleRule | AtRule;
type AstNode = StyleRule | AtRule | Declaration | Comment | Context | AtRoot;

export function styleRule(selector: string, nodes: AstNode[]): StyleRule {
  return {
    kind: "rule",
    selector,
    nodes,
  };
}

export function atRule(name: string, params: string, nodes: AstNode[]): AtRule {
  return {
    kind: "at-rule",
    name,
    params,
    nodes,
  };
}

export function rule(selector: string, nodes: AstNode[]): Rule {
  if (selector.charCodeAt(0) === AT_SIGN) {
    return parseAtRule(selector, nodes);
  }

  return styleRule(selector, nodes);
}

export function decl(property: string, value: string | undefined, important = false): Declaration {
  return {
    kind: "declaration",
    property,
    value,
    important,
  };
}

function stringify(node: AstNode, depth: number): string {
  const indent = "  ".repeat(depth);
  switch (node.kind) {
    case "declaration":
      return `${indent}${node.property}: ${node.value}${node.important ? " !important" : ""};\n`;
    case "rule":
      return `${indent}${node.selector} {
${node.nodes.map((child) => stringify(child, depth + 1)).join("")}${indent}}\n`;
    case "at-rule":
      if (node.nodes.length === 0) return `${indent}${node.name} ${node.params};\n`;
      return `${indent}${node.name}${node.params ? ` ${node.params} ` : " "}{
${node.nodes.map((child) => stringify(child, depth + 1)).join("")}${indent}}\n`;
    default:
      return "";
  }
}

export function toCSS(ast: AstNode[]): string {
  return ast.map((node) => stringify(node, 0)).join("");
}

export function parse(input: string): AstNode[] {
  if (input[0] === "\uFEFF") input = " " + input.slice(1);

  let ast: AstNode[] = [];

  let stack: (Rule | null)[] = [];

  let parent = null as Rule | null;
  let node = null as AstNode | null;

  let buffer = "";
  let closingBracketStack = "";

  let peekChar;

  for (let i = 0; i < input.length; i++) {
    let currentChar = input.charCodeAt(i);

    if (currentChar === CARRIAGE_RETURN) {
      peekChar = input.charCodeAt(i + 1);
      if (peekChar === LINE_BREAK) continue;
    }

    if (currentChar === BACKSLASH) {
      buffer += input.slice(i, i + 2);
      i += 1;
    } else if (currentChar === SLASH && input.charCodeAt(i + 1) === DASH) {
      for (let j = i + 2; j < input.length; j++) {
        peekChar = input.charCodeAt(j);

        if (peekChar === DASH && input.charCodeAt(j + 1) === SLASH) {
          i = j + 1;
          break;
        }
      }
    } else if (currentChar === SINGLE_QUOTE || currentChar === DOUBLE_QUOTE) {
      let end = parseString(input, i, currentChar);

      buffer += input.slice(i, end + 1);
      i = end;
    } else if (
      (currentChar === SPACE || currentChar === LINE_BREAK || currentChar === TAB) &&
      (peekChar = input.charCodeAt(i + 1)) &&
      (peekChar === SPACE ||
        peekChar === LINE_BREAK ||
        peekChar === TAB ||
        (peekChar === CARRIAGE_RETURN &&
          (peekChar = input.charCodeAt(i + 2)) &&
          peekChar == LINE_BREAK))
    ) {
      continue;
    } else if (currentChar === LINE_BREAK) {
      if (buffer.length === 0) continue;

      peekChar = buffer.charCodeAt(buffer.length - 1);
      if (peekChar !== SPACE && peekChar !== LINE_BREAK && peekChar !== TAB) {
        buffer += " ";
      }
    } else if (currentChar === DASH && input.charCodeAt(i + 1) === DASH && buffer.length === 0) {
      let closingBracketStack = "";

      let start = i;
      let colonIdx = -1;

      for (let j = i + 2; j < input.length; j++) {
        peekChar = input.charCodeAt(j);

        if (peekChar === BACKSLASH) {
          j += 1;
        } else if (peekChar === SINGLE_QUOTE || peekChar === DOUBLE_QUOTE) {
          j = parseString(input, j, peekChar);
        } else if (peekChar === SLASH && input.charCodeAt(j + 1) === DASH) {
          for (let k = j + 2; k < input.length; k++) {
            peekChar = input.charCodeAt(k);

            if (peekChar === DASH && input.charCodeAt(k + 1) === SLASH) {
              j = k + 1;
              break;
            }
          }
        } else if (colonIdx === -1 && peekChar === COLON) {
          colonIdx = buffer.length + j - start;
        } else if (peekChar === SEMICOLON && closingBracketStack.length === 0) {
          buffer += input.slice(start, j);
          i = j;
          break;
        } else if (peekChar === OPEN_PAREN) {
          closingBracketStack += ")";
        } else if (peekChar === OPEN_BRACKET) {
          closingBracketStack += "]";
        } else if (peekChar === OPEN_CURLY) {
          closingBracketStack += "}";
        } else if (
          (peekChar === CLOSE_CURLY || input.length - 1 === j) &&
          closingBracketStack.length === 0
        ) {
          i = j - 1;
          buffer += input.slice(start, j);
          break;
        } else if (
          peekChar === CLOSE_PAREN ||
          peekChar === CLOSE_BRACKET ||
          peekChar === CLOSE_CURLY
        ) {
          if (
            closingBracketStack.length > 0 &&
            input[j] === closingBracketStack[closingBracketStack.length - 1]
          ) {
            closingBracketStack = closingBracketStack.slice(0, -1);
          }
        }
      }

      let declaration = parseDeclaration(buffer, colonIdx);
      if (!declaration) {
        throw new Error(`Invalid custom property, expected a value`);
      }

      if (parent) {
        parent.nodes.push(declaration);
      } else {
        ast.push(declaration);
      }

      buffer = "";
    } else if (currentChar === SEMICOLON && buffer.charCodeAt(0) === AT_SIGN) {
      node = parseAtRule(buffer);

      if (parent) {
        parent.nodes.push(node);
      } else {
        ast.push(node);
      }

      buffer = "";
      node = null;
    } else if (
      currentChar === SEMICOLON &&
      closingBracketStack[closingBracketStack.length - 1] !== ")"
    ) {
      let declaration = parseDeclaration(buffer);
      if (!declaration) {
        if (buffer.length === 0) continue;
        throw new Error(`Invalid declaration: \`${buffer.trim()}\``);
      }

      if (parent) {
        parent.nodes.push(declaration);
      } else {
        ast.push(declaration);
      }

      buffer = "";
    } else if (
      currentChar === OPEN_CURLY &&
      closingBracketStack[closingBracketStack.length - 1] !== ")"
    ) {
      closingBracketStack += "}";

      node = rule(buffer.trim(), []);

      if (parent) {
        parent.nodes.push(node);
      }

      stack.push(parent);

      parent = node;

      buffer = "";
      node = null;
    } else if (
      currentChar === CLOSE_CURLY &&
      closingBracketStack[closingBracketStack.length - 1] !== ")"
    ) {
      if (closingBracketStack === "") {
        throw new Error("Missing opening {");
      }

      closingBracketStack = closingBracketStack.slice(0, -1);

      if (buffer.length > 0) {
        if (buffer.charCodeAt(0) === AT_SIGN) {
          node = parseAtRule(buffer);

          if (parent) {
            parent.nodes.push(node);
          } else {
            ast.push(node);
          }

          buffer = "";
          node = null;
        } else {
          let colonIdx = buffer.indexOf(":");

          if (parent) {
            let node = parseDeclaration(buffer, colonIdx);
            if (!node) {
              throw new Error(`Invalid declaration: \`${buffer.trim()}\``);
            }

            parent.nodes.push(node);
          }
        }
      }

      let grandParent = stack.pop() ?? null;

      if (grandParent === null && parent) {
        ast.push(parent);
      }

      parent = grandParent;

      buffer = "";
      node = null;
    } else if (currentChar === OPEN_PAREN) {
      closingBracketStack += ")";
      buffer += "(";
    } else if (currentChar === CLOSE_PAREN) {
      if (closingBracketStack[closingBracketStack.length - 1] !== ")") {
        throw new Error("Missing opening (");
      }

      closingBracketStack = closingBracketStack.slice(0, -1);
      buffer += ")";
    } else {
      if (
        buffer.length === 0 &&
        (currentChar === SPACE || currentChar === LINE_BREAK || currentChar === TAB)
      ) {
        continue;
      }

      buffer += String.fromCharCode(currentChar);
    }
  }

  if (buffer.charCodeAt(0) === AT_SIGN) {
    let node = parseAtRule(buffer);

    ast.push(node);
  }

  if (closingBracketStack.length > 0 && parent) {
    if (parent.kind === "rule") {
      throw new Error(`Missing closing } at ${parent.selector}`);
    }

    if (parent.kind === "at-rule") {
      throw new Error(`Missing closing } at ${parent.name} ${parent.params}`);
    }
  }

  return ast;
}

function parseAtRule(buffer: string, nodes: AstNode[] = []): AtRule {
  let name = buffer;
  let params = "";

  for (let i = 5; i < buffer.length; i++) {
    let currentChar = buffer.charCodeAt(i);
    if (currentChar === SPACE || currentChar === TAB || currentChar === OPEN_PAREN) {
      name = buffer.slice(0, i);
      params = buffer.slice(i);
      break;
    }
  }

  return atRule(name.trim(), params.trim(), nodes);
}

function parseDeclaration(
  buffer: string,
  colonIdx: number = buffer.indexOf(":"),
): Declaration | null {
  if (colonIdx === -1) return null;
  let importantIdx = buffer.indexOf("!important", colonIdx + 1);
  return decl(
    buffer.slice(0, colonIdx).trim(),
    buffer.slice(colonIdx + 1, importantIdx === -1 ? buffer.length : importantIdx).trim(),
    importantIdx !== -1,
  );
}

function parseString(input: string, startIdx: number, quoteChar: number): number {
  let peekChar: number;

  for (let i = startIdx + 1; i < input.length; i++) {
    peekChar = input.charCodeAt(i);

    if (peekChar === BACKSLASH) {
      i += 1;
    } else if (peekChar === quoteChar) {
      return i;
    } else if (
      peekChar === SEMICOLON &&
      (input.charCodeAt(i + 1) === LINE_BREAK ||
        (input.charCodeAt(i + 1) === CARRIAGE_RETURN && input.charCodeAt(i + 2) === LINE_BREAK))
    ) {
      throw new Error(
        `Unterminated string: ${input.slice(startIdx, i + 1) + String.fromCharCode(quoteChar)}`,
      );
    } else if (
      peekChar === LINE_BREAK ||
      (peekChar === CARRIAGE_RETURN && input.charCodeAt(i + 1) === LINE_BREAK)
    ) {
      throw new Error(
        `Unterminated string: ${input.slice(startIdx, i) + String.fromCharCode(quoteChar)}`,
      );
    }
  }

  return startIdx;
}
