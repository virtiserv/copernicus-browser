import { AstNode, tryParseScript } from './esprimaHelpers';

// Recursively unwraps a single array element AST node to extract a band name.
// Handles:
//   MemberExpression       sample.B04 / samples.B04  → property name
//   CallExpression         visualizer.process(sample.B04) → recurse into first argument
//   BinaryExpression       2.5 * sample.B04 / factor * sample.B04 → recurse right then left
//   ConditionalExpression  cond ? sample.B04 : sample.B03 → recurse consequent then alternate
//   Identifier             resolved via `scope`: finds the last declaration or reassignment that
//                          initialises it (see `resolveIdentifierInit`) and recurses into its
//                          value; falls back to the identifier name itself when unresolved
//                          (old-format bare band names, e.g. `B04`).
//                          `seen` guards against circular declarations (e.g. `let a = b; let b = a;`)
function extractBandName(node: AstNode, scope: AstNode[] = [], seen: Set<string> = new Set()): string | null {
  if (!node) {
    return null;
  }
  if (node.type === 'MemberExpression') {
    return node.property.name ?? null;
  }
  if (node.type === 'Identifier') {
    if (seen.has(node.name)) {
      return null;
    }
    const init = resolveIdentifierInit(node.name, scope);
    if (init) {
      return extractBandName(init, scope, new Set(seen).add(node.name));
    }
    return node.name;
  }
  if (node.type === 'CallExpression') {
    return extractBandName(node.arguments[0], scope, seen);
  }
  if (node.type === 'BinaryExpression') {
    // Try right side first: for `factor * sample.B04` and `2.5 * sample.B04`,
    // the band MemberExpression is on the right. For `B04 * 2.5` (old format),
    // the Identifier is on the left — the right fallback then picks it up.
    return extractBandName(node.right, scope, seen) ?? extractBandName(node.left, scope, seen);
  }
  if (node.type === 'ConditionalExpression') {
    return extractBandName(node.consequent, scope, seen) ?? extractBandName(node.alternate, scope, seen);
  }
  return null;
}

// Finds the value that (re)initialises `name` in `scope`, scanning in program order so a later
// declaration or reassignment overrides an earlier one — e.g. `let r = a; r = b;` resolves to `b`.
function resolveIdentifierInit(name: string, scope: AstNode[]): AstNode | null {
  let init: AstNode | null = null;
  for (const stmt of scope) {
    if (stmt.type === 'VariableDeclaration') {
      const declarator = stmt.declarations.find((d: AstNode) => d.id.name === name);
      if (declarator?.init) {
        init = declarator.init;
      }
    } else if (
      stmt.type === 'ExpressionStatement' &&
      stmt.expression?.type === 'AssignmentExpression' &&
      stmt.expression.operator === '=' &&
      stmt.expression.left?.name === name
    ) {
      init = stmt.expression.right;
    }
  }
  return init;
}

// Flattens a statement list so declarations/assignments inside nested blocks, conditionals, loops,
// and switch cases are visible to `resolveIdentifierInit`. Does not descend into nested function
// bodies, since those introduce their own scope.
function flattenScope(statements: AstNode[]): AstNode[] {
  const flat: AstNode[] = [];
  for (const stmt of statements) {
    flat.push(stmt);
    if (stmt.type === 'BlockStatement') {
      flat.push(...flattenScope(stmt.body));
    } else if (stmt.type === 'IfStatement') {
      if (stmt.consequent) {
        flat.push(
          ...flattenScope(
            stmt.consequent.type === 'BlockStatement' ? stmt.consequent.body : [stmt.consequent],
          ),
        );
      }
      if (stmt.alternate) {
        flat.push(
          ...flattenScope(stmt.alternate.type === 'BlockStatement' ? stmt.alternate.body : [stmt.alternate]),
        );
      }
    } else if (
      stmt.type === 'ForStatement' ||
      stmt.type === 'WhileStatement' ||
      stmt.type === 'DoWhileStatement'
    ) {
      if (stmt.body) {
        flat.push(...flattenScope(stmt.body.type === 'BlockStatement' ? stmt.body.body : [stmt.body]));
      }
    } else if (stmt.type === 'SwitchStatement') {
      for (const switchCase of stmt.cases ?? []) {
        flat.push(...flattenScope(switchCase.consequent ?? []));
      }
    }
  }
  return flat;
}

// ─── //VERSION=3 format ────────────────────────────────────────────────────

function parseVersionedBands(evalscript: string): string[] {
  const ast = tryParseScript(evalscript);
  if (!ast) {
    return [];
  }

  const evalPixelFn = ast.body.find(
    (node: AstNode) => node.type === 'FunctionDeclaration' && node.id.name === 'evaluatePixel',
  );
  if (!evalPixelFn) {
    return [];
  }

  const fnBody: AstNode[] = evalPixelFn.body.body;
  const scope = flattenScope(fnBody);

  // Prefer a ReturnStatement whose argument is a plain ArrayExpression.
  const returnStmt = fnBody.find(
    (node: AstNode) => node.type === 'ReturnStatement' && node.argument?.type === 'ArrayExpression',
  );

  let elements: AstNode[] | null = null;
  if (returnStmt) {
    elements = returnStmt.argument.elements;
  } else {
    // Fall back to a VariableDeclaration whose first declarator init is an ArrayExpression.
    // Handles: let val = [samples.B04, samples.B03, ...] (Landsat reflectance evalscript).
    const varDecl = fnBody.find(
      (node: AstNode) =>
        node.type === 'VariableDeclaration' && node.declarations[0]?.init?.type === 'ArrayExpression',
    );
    if (varDecl) {
      elements = varDecl.declarations[0].init.elements;
    }
  }

  if (!elements) {
    return [];
  }

  return elements
    .map((el: AstNode) => extractBandName(el, scope))
    .filter((name): name is string => name !== null && name !== 'dataMask');
}

// ─── Old (pre-VERSION=3) format ────────────────────────────────────────────

function parseOldFormatBands(evalscript: string): string[] {
  // The old-format snippet has a top-level `return` statement which is a syntax error outside a
  // function body. Wrap it so esprima can parse it, then navigate into the function's body.
  const wrappedCode = `(function(){${evalscript}})`;
  const ast = tryParseScript(wrappedCode);
  if (!ast) {
    return [];
  }

  // Navigate: ExpressionStatement > FunctionExpression > body > body[]
  const stmts: AstNode[] = ast.body[0]?.expression?.body?.body;
  if (!Array.isArray(stmts)) {
    return [];
  }
  const scope = flattenScope(stmts);

  const returnStmt = stmts.find(
    (node: AstNode) => node.type === 'ReturnStatement' && node.argument?.type === 'ArrayExpression',
  );
  if (!returnStmt) {
    return [];
  }

  return returnStmt.argument.elements
    .map((el: AstNode) => extractBandName(el, scope))
    .filter((name): name is string => name !== null && name !== 'dataMask');
}

// ─── Public API ────────────────────────────────────────────────────────────

export function parseEvalscriptBands(evalscript: string): string[] {
  try {
    if (evalscript.startsWith('//VERSION=3')) {
      return parseVersionedBands(evalscript);
    }
    return parseOldFormatBands(evalscript);
  } catch {
    return [];
  }
}
