import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import * as p from '@clack/prompts';

// Publication d'une version de shikidown.
//
// Sans Changesets ici : le script bumpe lui-même la version de
// projects/shikidown/package.json (et la constante affichée par la démo),
// vérifie, commit, tag vX.Y.Z, publie dist/shikidown sur npmjs, puis crée la
// release GitHub. Chaque étape est idempotente : relancé après un échec, le
// script reprend la version courante et saute ce qui est déjà fait.
//
// Branches : `develop` porte la majeure courante, `N.x` les maintenances.
// Une version d'une majeure antérieure à `latest` est publiée sous le
// dist-tag `vN-lts`, sans quoi `npm install shikidown` reviendrait en arrière.

const LIB_PACKAGE = 'projects/shikidown/package.json';
const APP_VERSION = 'src/app/app-version.ts';
const LIB_README = 'projects/shikidown/README.md';
const DIST = 'dist/shikidown';
const RELEASE_BRANCH = /^(develop|\d+\.x)$/;

type Bump = 'patch' | 'minor' | 'major';

function run(cmd: string, cwd = process.cwd()): void {
  execSync(cmd, { stdio: 'inherit', cwd });
}

function capture(cmd: string): string {
  return execSync(cmd, { cwd: process.cwd(), stdio: ['ignore', 'pipe', 'pipe'] }).toString().trim();
}

function succeeds(cmd: string): boolean {
  try {
    capture(cmd);
    return true;
  } catch {
    return false;
  }
}

function libPackage(): { name: string; version: string } {
  return JSON.parse(readFileSync(LIB_PACKAGE, 'utf-8')) as { name: string; version: string };
}

function bump(version: string, kind: Bump): string {
  const [major, minor, patch] = version.split('.').map(Number);
  if (kind === 'major') return `${major + 1}.0.0`;
  if (kind === 'minor') return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;
}

/** Remplace la valeur sans reformater le fichier. */
function rewrite(file: string, pattern: RegExp, replacement: string): void {
  const source = readFileSync(file, 'utf-8');
  if (!pattern.test(source)) throw new Error(`Motif introuvable dans ${file} : ${pattern}`);
  writeFileSync(file, source.replace(pattern, replacement));
}

function publishedVersions(name: string): string[] {
  try {
    const parsed = JSON.parse(capture(`npm view ${name} versions --json`)) as string[] | string;
    // Une seule version publiée : npm renvoie une chaîne, pas un tableau.
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return [];
  }
}

/** `latest`, ou `vN-lts` pour une majeure antérieure à celle de `latest`. */
function distTag(name: string, version: string): string {
  let latest = '';
  try {
    latest = capture(`npm view ${name} dist-tags.latest`);
  } catch {
    // Paquet jamais publié : la première version est `latest`.
  }
  const major = Number(version.split('.')[0]);
  return latest && major < Number(latest.split('.')[0]) ? `v${major}-lts` : 'latest';
}

function fail(message: string): never {
  p.cancel(message);
  process.exit(1);
}

async function main(): Promise<void> {
  p.intro('shikidown — release');

  // ─── Pré-requis ────────────────────────────────────────────────────────────
  const branch = capture('git branch --show-current');
  if (!RELEASE_BRANCH.test(branch)) fail(`Branche « ${branch} » : publier depuis develop ou N.x.`);
  if (capture('git status --porcelain')) fail('Arbre de travail non propre.');
  run('git fetch -q origin');
  if (capture('git rev-parse HEAD') !== capture(`git rev-parse origin/${branch}`)) {
    fail(`${branch} n'est pas aligné sur origin/${branch} (pull ou push d'abord).`);
  }
  if (!succeeds('npm whoami')) fail('Non connecté à npm : lancer `npm login`.');
  if (!succeeds('gh auth status')) fail('Non connecté à GitHub : lancer `gh auth login`.');

  const { name, version: current } = libPackage();
  const published = publishedVersions(name);
  const currentPublished = published.includes(current);

  // ─── Version ───────────────────────────────────────────────────────────────
  const choice = await p.select<Bump | 'current'>({
    message: `${name}@${current} (branche ${branch}) — quelle version publier ?`,
    options: [
      ...(!currentPublished
        ? [{ value: 'current' as const, label: `${current}`, hint: 'reprendre : déjà bumpée, pas encore publiée' }]
        : []),
      { value: 'patch', label: bump(current, 'patch'), hint: 'patch' },
      { value: 'minor', label: bump(current, 'minor'), hint: 'minor' },
      { value: 'major', label: bump(current, 'major'), hint: 'major' },
    ],
  });
  if (p.isCancel(choice)) fail('Annulé.');

  const version = choice === 'current' ? current : bump(current, choice);
  const tag = `v${version}`;
  const npmTag = distTag(name, version);
  if (published.includes(version)) fail(`${name}@${version} est déjà publié.`);

  const ok = await p.confirm({
    message: `Publier ${name}@${version} (dist-tag « ${npmTag} »), tag ${tag}, release GitHub sur ${branch} ?`,
    initialValue: false,
  });
  if (p.isCancel(ok) || !ok) fail('Annulé.');

  // ─── Bump ──────────────────────────────────────────────────────────────────
  if (version !== current) {
    rewrite(LIB_PACKAGE, /"version": "[^"]+"/, `"version": "${version}"`);
    rewrite(APP_VERSION, /lib: '[^']+'/, `lib: '${version}'`);
    p.log.success(`Version ${current} → ${version}`);
  }

  // ─── Vérification ──────────────────────────────────────────────────────────
  p.log.step('Tests…');
  run('npx ng test --watch=false');
  p.log.step('Build de la lib…');
  run('npm run build:lib');

  // ─── Git ───────────────────────────────────────────────────────────────────
  if (version !== current) {
    // Le README du paquet est la copie que prebuild:lib vient de faire : il part
    // avec la release, comme il part sur npm.
    run(`git add ${LIB_PACKAGE} ${APP_VERSION} ${LIB_README}`);
    run(`git commit -q -m "chore(shikidown): release ${version}"`);
    run(`git push -q origin ${branch}`);
    p.log.success(`Commit de release poussé sur ${branch}.`);
  }
  if (succeeds(`git rev-parse -q --verify "refs/tags/${tag}"`)) {
    p.log.warn(`Tag ${tag} déjà existant — skip.`);
  } else {
    run(`git tag ${tag}`);
    run(`git push -q origin ${tag}`);
    p.log.success(`Tag ${tag} créé et poussé.`);
  }

  // ─── npm ───────────────────────────────────────────────────────────────────
  // Depuis la sortie de ng-packagr, jamais depuis projects/ : c'est dist/ qui
  // porte les bundles FESM et les déclarations.
  run(`npm publish --tag ${npmTag}`, DIST);
  p.log.success(`${name}@${version} publié (dist-tag ${npmTag}).`);

  // ─── Release GitHub ────────────────────────────────────────────────────────
  if (succeeds(`gh release view ${tag}`)) {
    p.log.warn(`Release GitHub ${tag} déjà existante — skip.`);
  } else {
    const latest = npmTag === 'latest' ? '--latest' : '--latest=false';
    run(`gh release create ${tag} --target ${branch} --title ${tag} --generate-notes ${latest}`);
    p.log.success(`Release GitHub ${tag} créée — compléter ses notes si besoin.`);
  }

  p.outro('Release terminée.');
}

main().catch((err: unknown) => fail(String(err)));
