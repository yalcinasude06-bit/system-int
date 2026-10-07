import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";

const projectRoot = process.cwd();
const sourceRoot = path.join(projectRoot, "src");
const dictionariesPath = path.join(sourceRoot, "lib/i18n/dictionaries.ts");
const turkishCharacters = /[ÇĞİÖŞÜçğıöşü]/;

function sourceFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(target);
    return /\.(?:ts|tsx)$/.test(entry.name) && target !== dictionariesPath ? [target] : [];
  });
}

function loadDictionaryKeys() {
  const source = fs.readFileSync(dictionariesPath, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const auditedModule = { exports: {} };
  vm.runInNewContext(compiled, { module: auditedModule, exports: auditedModule.exports, console });
  return new Set(Object.keys(auditedModule.exports.dictionaries.en));
}

function propertyName(property) {
  return property.name && (ts.isIdentifier(property.name) || ts.isStringLiteral(property.name)) ? property.name.text : "";
}

function isLocalizedContent(node) {
  for (let current = node.parent; current; current = current.parent) {
    if (ts.isCallExpression(current) && current.arguments.length >= 2) {
      const callee = current.expression;
      if (ts.isIdentifier(callee) && ["t", "text", "node"].includes(callee.text)) return true;
    }
    if (ts.isConditionalExpression(current) && (ts.isStringLiteral(current.whenTrue) || ts.isNoSubstitutionTemplateLiteral(current.whenTrue)) && (ts.isStringLiteral(current.whenFalse) || ts.isNoSubstitutionTemplateLiteral(current.whenFalse))) {
      return true;
    }
    if (ts.isPropertyAssignment(current) && propertyName(current) === "tr" && ts.isObjectLiteralExpression(current.parent)) {
      const keys = new Set(current.parent.properties.filter(ts.isPropertyAssignment).map(propertyName));
      if (keys.has("en")) return true;
    }
  }
  return false;
}

function auditSourceFile(filePath, dictionaryKeys) {
  const source = fs.readFileSync(filePath, "utf8");
  const sourceFile = ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true, filePath.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const missing = [];
  const inspect = (node) => {
    const literal = ((ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) ? node.text : ts.isJsxText(node) ? node.text.trim() : "").replaceAll("&amp;", "&");
    if (literal && turkishCharacters.test(literal) && !isLocalizedContent(node) && !dictionaryKeys.has(literal)) {
      const position = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
      missing.push(`${path.relative(projectRoot, filePath)}:${position.line + 1} → ${literal}`);
    }
    ts.forEachChild(node, inspect);
  };
  inspect(sourceFile);
  return missing;
}

const dictionaryKeys = loadDictionaryKeys();
const missing = sourceFiles(sourceRoot).flatMap((filePath) => auditSourceFile(filePath, dictionaryKeys));

if (missing.length) {
  console.error("Missing English dictionary entries for user-visible Turkish literals:\n" + missing.join("\n"));
  process.exit(1);
}

console.log("i18n audit passed");
