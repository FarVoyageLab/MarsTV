import { createHash, randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

function commandJson(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? process.cwd(),
    encoding: "utf8",
    env: process.env,
    maxBuffer: 64 * 1024 * 1024
  });
  if (result.status !== 0) {
    process.stderr.write(result.stderr);
    process.exit(result.status ?? 1);
  }
  return JSON.parse(result.stdout);
}

function packageJson(directory) {
  return JSON.parse(readFileSync(join(directory, "package.json"), "utf8"));
}

function npmPurl(name, version) {
  if (name.startsWith("@")) {
    const [scope, packageName] = name.split("/");
    return `pkg:npm/${encodeURIComponent(scope)}/${encodeURIComponent(packageName)}@${encodeURIComponent(version)}`;
  }
  return `pkg:npm/${encodeURIComponent(name)}@${encodeURIComponent(version)}`;
}

function licenseChoice(value) {
  if (!value || typeof value !== "string") return undefined;
  return { expression: value };
}

const components = new Map();
const relationships = new Map();

function relationship(parent, child) {
  if (!relationships.has(parent)) relationships.set(parent, new Set());
  relationships.get(parent).add(child);
}

function addNpmDependency(name, dependency) {
  let version = dependency.version;
  let manifest = null;
  if (dependency.path) {
    try {
      manifest = packageJson(dependency.path);
      if (version?.startsWith("link:")) version = manifest.version;
    } catch {
      manifest = null;
    }
  }
  if (!version || version.startsWith("link:")) version = "0.0.0";
  const ref = npmPurl(name, version);
  if (!components.has(ref)) {
    const license = licenseChoice(manifest?.license);
    const component = {
      type: name.startsWith("@marstv/") ? "application" : "library",
      "bom-ref": ref,
      group: name.startsWith("@") ? name.split("/")[0].slice(1) : undefined,
      name: name.startsWith("@") ? name.split("/")[1] : name,
      version,
      purl: ref,
      licenses: license ? [license] : undefined,
      externalReferences: dependency.resolved
        ? [{ type: "distribution", url: dependency.resolved }]
        : undefined
    };
    components.set(ref, Object.fromEntries(Object.entries(component).filter(([, value]) => value !== undefined)));
  }
  const children = dependency.dependencies ?? {};
  for (const [childName, child] of Object.entries(children)) {
    const childRef = addNpmDependency(childName, child);
    relationship(ref, childRef);
  }
  return ref;
}

mkdirSync("artifacts", { recursive: true });

const workspaces = commandJson("corepack", ["pnpm", "-r", "list", "--json", "--depth", "Infinity", "--prod"]);
const rootRef = "pkg:generic/marstv@1.0.0";
components.set(rootRef, {
  type: "application",
  "bom-ref": rootRef,
  name: "MarsTV",
  version: "1.0.0"
});

for (const workspace of workspaces) {
  if (!workspace.name || workspace.name === "marstv") continue;
  const workspaceRef = npmPurl(workspace.name, workspace.version ?? "1.0.0");
  components.set(workspaceRef, {
    type: "application",
    "bom-ref": workspaceRef,
    group: workspace.name.startsWith("@") ? workspace.name.split("/")[0].slice(1) : undefined,
    name: workspace.name.startsWith("@") ? workspace.name.split("/")[1] : workspace.name,
    version: workspace.version ?? "1.0.0",
    purl: workspaceRef
  });
  relationship(rootRef, workspaceRef);
  for (const [name, dependency] of Object.entries(workspace.dependencies ?? {})) {
    relationship(workspaceRef, addNpmDependency(name, dependency));
  }
}

const cargoPackages = readFileSync("apps/desktop/src-tauri/Cargo.lock", "utf8")
  .split("[[package]]")
  .slice(1)
  .map((block) => {
    const name = block.match(/^name = "([^"]+)"/mu)?.[1];
    const version = block.match(/^version = "([^"]+)"/mu)?.[1];
    const source = block.match(/^source = "([^"]+)"/mu)?.[1] ?? null;
    const checksum = block.match(/^checksum = "([^"]+)"/mu)?.[1] ?? null;
    const dependencyBlock = block.match(/^dependencies = \[\n([\s\S]*?)^\]/mu)?.[1] ?? "";
    const dependencies = [...dependencyBlock.matchAll(/^\s*"([^"]+)",?$/gmu)].map((match) => match[1]);
    return name && version ? { name, version, source, checksum, dependencies } : null;
  })
  .filter(Boolean);
const cargoRefsByKey = new Map();
const cargoRefsByName = new Map();
for (const pkg of cargoPackages) {
  const ref = `pkg:cargo/${encodeURIComponent(pkg.name)}@${encodeURIComponent(pkg.version)}`;
  cargoRefsByKey.set(`${pkg.name}@${pkg.version}`, ref);
  if (!cargoRefsByName.has(pkg.name)) cargoRefsByName.set(pkg.name, []);
  cargoRefsByName.get(pkg.name).push(ref);
  const component = {
    type: pkg.name === "marstv-desktop" ? "application" : "library",
    "bom-ref": ref,
    name: pkg.name,
    version: pkg.version,
    purl: ref,
    hashes: pkg.checksum ? [{ alg: "SHA-256", content: pkg.checksum }] : undefined,
    externalReferences: pkg.source
      ? [{ type: "distribution", url: `https://crates.io/api/v1/crates/${encodeURIComponent(pkg.name)}/${encodeURIComponent(pkg.version)}/download` }]
      : undefined
  };
  components.set(ref, Object.fromEntries(Object.entries(component).filter(([, value]) => value !== undefined)));
  if (pkg.name === "marstv-desktop") relationship(rootRef, ref);
}
for (const pkg of cargoPackages) {
  const parent = cargoRefsByKey.get(`${pkg.name}@${pkg.version}`);
  for (const dependency of pkg.dependencies) {
    const match = dependency.match(/^(\S+)(?:\s+(\d+\.\d+\.\d+))?/u);
    if (!match) continue;
    const exact = match[2] ? cargoRefsByKey.get(`${match[1]}@${match[2]}`) : null;
    const children = exact ? [exact] : cargoRefsByName.get(match[1]) ?? [];
    for (const child of children) {
      if (parent) relationship(parent, child);
    }
  }
}

const dependencyGraph = [...components.keys()]
  .sort()
  .map((ref) => ({
    ref,
    dependsOn: [...(relationships.get(ref) ?? [])].sort()
  }));
const serial = `urn:uuid:${randomUUID()}`;
const sbom = {
  bomFormat: "CycloneDX",
  specVersion: "1.6",
  serialNumber: serial,
  version: 1,
  metadata: {
    timestamp: new Date().toISOString(),
    tools: {
      components: [{
        type: "application",
        name: "MarsTV release metadata generator",
        version: "1.0.0"
      }]
    },
    component: components.get(rootRef),
    properties: [{
      name: "marstv:lockfile:sha256",
      value: createHash("sha256").update(readFileSync("pnpm-lock.yaml")).digest("hex")
    }]
  },
  components: [...components.values()]
    .filter((component) => component["bom-ref"] !== rootRef)
    .sort((left, right) => left["bom-ref"].localeCompare(right["bom-ref"])),
  dependencies: dependencyGraph
};
writeFileSync("artifacts/sbom.cdx.json", `${JSON.stringify(sbom, null, 2)}\n`, "utf8");

const pnpmLicenses = [...components.values()]
  .filter((component) => component.purl?.startsWith("pkg:npm/"))
  .map((component) => ({
    name: component.group ? `@${component.group}/${component.name}` : component.name,
    version: component.version,
    license: component.licenses?.[0]?.expression ?? null,
    purl: component.purl,
    note: component.licenses?.length
      ? null
      : "No SPDX license field was present in the installed package manifest; verify before release."
  }))
  .sort((left, right) => left.name.localeCompare(right.name) || left.version.localeCompare(right.version));
writeFileSync("artifacts/licenses.pnpm.json", `${JSON.stringify(pnpmLicenses, null, 2)}\n`, "utf8");
writeFileSync(
  "artifacts/licenses.cargo.json",
  `${JSON.stringify(cargoPackages.map((pkg) => ({
    name: pkg.name,
    version: pkg.version,
    license: null,
    source: pkg.source,
    note: "Cargo.lock does not carry SPDX license data; verify this component against its crate metadata before release."
  })).sort((left, right) => left.name.localeCompare(right.name)), null, 2)}\n`,
  "utf8"
);

const reparsed = JSON.parse(readFileSync("artifacts/sbom.cdx.json", "utf8"));
if (reparsed.bomFormat !== "CycloneDX" || reparsed.specVersion !== "1.6") {
  throw new Error("Generated SBOM failed structural validation.");
}
if (new Set(reparsed.components.map((component) => component["bom-ref"])).size !== reparsed.components.length) {
  throw new Error("Generated SBOM contains duplicate component references.");
}

console.log(JSON.stringify({
  event: "release.metadata.generated",
  serial,
  components: reparsed.components.length,
  dependencies: reparsed.dependencies.length
}));
