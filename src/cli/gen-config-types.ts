#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync, writeFileSync, mkdirSync, watch as fsWatch } from 'fs';
import { dirname, join, parse, relative, sep } from 'path';

type Opts = { dir: string; out: string; watch?: boolean; symbol?: string };
function toPosix(p: string) { return p.split(sep).join('/'); }
function scan(dir: string, baseDir: string): { key: string; fullPath: string }[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const full = join(dir, d.name);
    if (d.isDirectory()) return scan(full, baseDir);
    if (d.name.startsWith('.') || !d.name.endsWith('.json')) return [];
    try { JSON.parse(readFileSync(full, 'utf8')); } catch { return []; }
    const rel = relative(baseDir, full);
    const key = parse(rel).dir.split(sep).concat(parse(rel).name).filter(Boolean).join('.');
    return [{ key, fullPath: full }];
  });
}
function isIdent(s: string) { return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(s); }
function toAliasFromKey(key: string) {
  const parts = key.split('.').filter(Boolean);
  const head = parts[0] || 'config';
  const tail = parts.slice(1).map(p => p.replace(/[^A-Za-z0-9_$]/g, '_').replace(/^[a-z]/, c => c.toUpperCase())).join('');
  const base = head.replace(/[^A-Za-z0-9_$]/g, '_') + tail;
  return base + 'Config';
}
function gen(outFile: string, entries: { key: string; fullPath: string }[]) {
  const outDir = dirname(outFile);
  mkdirSync(outDir, { recursive: true });
  const imports = entries.map(({ key, fullPath }) => {
    const relImportRaw = relative(outDir, fullPath);
    const specifier = toPosix(relImportRaw.startsWith('.') ? relImportRaw : './' + relImportRaw);
    const alias = toAliasFromKey(key);
    return `import * as ${alias} from '${specifier}';`;
  }).join('\n');
  const props = entries.map(({ key }) => {
    const alias = toAliasFromKey(key);
    const k = isIdent(key) ? key : `'${key}'`;
    return `    ${k}: typeof ${alias};`;
  }).join('\n');
  const content = `import '@longqi/nest-core-modules';\n\n${imports}\n\ndeclare module '@longqi/nest-core-modules' {\n  export interface ConfigRegistry {\n${props}\n  }\n}\n`;
  writeFileSync(outFile, content);
}
function run(opts: Opts) {
  const baseDir = join(process.cwd(), opts.dir);
  const defs = scan(baseDir, baseDir);
  gen(opts.out, defs);
  console.log(`Generated ${defs.length} config augmentations -> ${opts.out}`);
}
function parseArgs(argv: string[]): Opts {
  const dirIdx = argv.indexOf('--dir');
  const outIdx = argv.indexOf('--out');
  const watch = argv.includes('--watch');
  const dir = dirIdx >= 0 ? argv[dirIdx + 1] : 'config';
  const out = outIdx >= 0 ? argv[outIdx + 1] : 'src/types/nest-core-modules-config.d.ts';
  const symIdx = argv.indexOf('--symbol');
  const symbol = symIdx >= 0 ? argv[symIdx + 1] : 'NestCoreModulesConfig';
  return { dir, out, watch, symbol };
}
const opts = parseArgs(process.argv.slice(2));
run(opts);
if (opts.watch) {
  (async () => {
    try {
      const chokidar = await import('chokidar');
      const watcher = chokidar.watch(join(process.cwd(), opts.dir), { ignoreInitial: true });
      const rerun = () => run(opts);
      watcher.on('add', rerun).on('change', rerun).on('unlink', rerun).on('addDir', rerun).on('unlinkDir', rerun);
    } catch {
      const rerun = () => run(opts);
      fsWatch(join(process.cwd(), opts.dir), { recursive: true }, rerun);
    }
  })();
}