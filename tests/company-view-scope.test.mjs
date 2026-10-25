import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
let source = await fs.readFile(new URL('../src/pages/clients/LiveClientScope.tsx', import.meta.url), 'utf8');
source = source.replace("import { useAuth } from '@/contexts/AuthContext';", 'const useAuth = () => globalThis.__scopeAuth;').replace("import { useOrg } from '@/contexts/OrgContext';", 'const useOrg = () => globalThis.__scopeOrg;');
const compiled = ts.transpileModule(source, { compilerOptions: { jsx: ts.JsxEmit.React, module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
globalThis.__scopeReact = React;
const { default: Scope } = await import(`data:text/javascript;base64,${Buffer.from('const React = globalThis.__scopeReact;\n' + compiled).toString('base64')}`);
test('company view hides previous-account or previous-company contents during session switches', () => {
  const render = () => renderToStaticMarkup(React.createElement(Scope, { children: () => React.createElement('p', null, 'private-company-record') }));
  globalThis.__scopeAuth = { user: { id: 'current-user' }, loading: false };
  const ready = { organisation: { id: 'current-company' }, membership: { user_id: 'current-user', organisation_id: 'current-company', status: 'active' }, status: 'ready' };
  globalThis.__scopeOrg = ready; assert.match(render(), /private-company-record/);
  for (const altered of [{ user_id: 'previous-user' }, { organisation_id: 'previous-company' }, { status: 'removed' }]) {
    globalThis.__scopeOrg = { ...ready, membership: { ...ready.membership, ...altered } }; assert.ok(!render().includes('private-company-record'));
  }
  globalThis.__scopeOrg = { ...ready, status: 'loading' }; assert.ok(!render().includes('private-company-record'));
  globalThis.__scopeOrg = { ...ready, status: 'error' }; assert.ok(!render().includes('private-company-record'));
});
