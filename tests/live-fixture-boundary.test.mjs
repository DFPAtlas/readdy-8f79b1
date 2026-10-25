import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
// Mixed legacy modules retain demo fixtures for the isolated demo. Only these
// static labels, navigation definitions, types and helpers may enter live views.
const allowed = new Set(['deadlineTypeMeta','deadlineTypeOptions','deadlineStatusMeta','computeStatus','plans','faqs','comparisonCategories','variationRequestedByOptions','variationSourceOptions','SNAG_TRADES','getSnagSeverityColor','HAZARD_CATEGORIES','jobCategories','primaryTrades','pricingTypes','vatTreatments','paymentSchedules','priorityOptions','workingDaysOptions','defaultComplianceChecklist','confidenceLabel','mobileNavItems','getNotificationCategoryIcon','getNotificationCategoryColor','formatTimestamp','sidebarNavItems']);
const root = path.resolve(new URL('..', import.meta.url).pathname);
function resolve(source, base) {
 const target = source.startsWith('@/') ? path.join(root,'src',source.slice(2)) : source.startsWith('.') ? path.resolve(path.dirname(base),source) : null;
 if (!target) return null;
 return [target,`${target}.tsx`,`${target}.ts`,`${target}/index.tsx`,`${target}/index.ts`].find(candidate => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
}
test('live application graph cannot import fictional customer records; demo fixtures stay available', () => {
 const pending = [path.join(root,'src/App.tsx')], seen = new Set();
 while (pending.length) {
  const file = pending.pop(); if (seen.has(file)) continue; seen.add(file);
  const source = ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true);
  for (const node of source.statements) {
   if (!ts.isImportDeclaration(node) && !ts.isExportDeclaration(node)) continue;
   const specifier = node.moduleSpecifier;
   if (!specifier || !ts.isStringLiteral(specifier)) continue;
   const resolved = resolve(specifier.text,file); if (resolved) pending.push(resolved);
   if (specifier.text.startsWith('@/mocks/') && ts.isImportDeclaration(node) && !node.importClause?.isTypeOnly) {
    assert.equal(node.importClause?.name, undefined,'default fixture imports need review');
    const binding = node.importClause?.namedBindings;
    assert.ok(binding && ts.isNamedImports(binding),'namespace fixture imports need review');
    for (const name of binding.elements.filter(element => !element.isTypeOnly)) assert.ok(allowed.has((name.propertyName ?? name.name).text),`Unexpected live fixture import ${name.getText()} in ${file}`);
   }
  }
 }
 assert.ok(!seen.has(path.join(root,'src/pages/jobs/detail/job-detail.demo.ts')),'demo jobs must never replace live job lookups');
 for (const fixture of ['jobs','dashboard','field','platform-admin','evidence']) assert.ok(fs.existsSync(path.join(root,`src/mocks/${fixture}.ts`)),'isolated demo fixture retained');
});
