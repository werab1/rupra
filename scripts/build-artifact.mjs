// Sestaví ukázku (demo.html) a slije ji do jednoho HTML fragmentu pro artefakt.
// Použití: node scripts/build-artifact.mjs [výstupní-soubor]   (výchozí: dist-demo/rupra-demo.html)
import { execSync } from 'node:child_process';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

execSync('npx vite build --config vite.demo.config.ts', { stdio: 'inherit' });
const dir = 'dist-demo/assets';
const files = readdirSync(dir);
const js = files.filter((f) => f.endsWith('.js')).map((f) => readFileSync(join(dir, f), 'utf8'));
const css = files.filter((f) => f.endsWith('.css')).map((f) => readFileSync(join(dir, f), 'utf8'));
if (js.length !== 1) throw new Error(`Očekáván jeden JS soubor, nalezeno ${js.length}`);

const out = `<title>Rupra gama</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700;800&family=Inter:wght@400;500;600;700&display=swap">
<style>
${css.join('\n')}
</style>
<div id="root"></div>
<script type="module">
${js[0].replace(/<\/script/gi, '<\\/script')}
</script>
`;
const target = resolve(process.argv[2] ?? 'dist-demo/rupra-demo.html');
writeFileSync(target, out);
console.log(`Artefakt: ${target} (${(out.length / 1024).toFixed(0)} kB)`);
