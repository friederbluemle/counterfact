import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import nodePath from "node:path";
import { once } from "node:events";

import chokidar from "chokidar";

import { ContextRegistry } from "./context-registry.js";

export class ModuleLoader extends EventTarget {
  basePath;

  registry;

  watcher;

  contextRegistry;

  constructor(basePath, registry, contextRegistry = new ContextRegistry()) {
    super();
    this.basePath = basePath;
    this.registry = registry;
    this.contextRegistry = contextRegistry;
  }

  async watch() {
    this.watcher = chokidar
      .watch(`${this.basePath}/**/*.{js,mjs,ts,mts}`)
      .on("all", (eventName, pathName) => {
        if (!["add", "change", "unlink"].includes(eventName)) {
          return;
        }

        const parts = nodePath.parse(pathName.replace(this.basePath, ""));
        const url = nodePath.normalize(
          `/${nodePath.join(parts.dir, parts.name)}`
        );

        if (eventName === "unlink") {
          this.registry.remove(url);
          this.dispatchEvent(new Event("remove"), pathName);
        }

        // eslint-disable-next-line node/no-unsupported-features/es-syntax, import/no-dynamic-require
        import(`${pathName}?cacheBust=${Date.now()}`)
          // eslint-disable-next-line promise/prefer-await-to-then
          .then((endpoint) => {
            this.dispatchEvent(new Event(eventName), pathName);

            if (pathName.includes("$.context")) {
              this.contextRegistry.update(parts.dir, endpoint.default);

              return "context";
            }

            this.registry.add(url, endpoint);

            return "path";
          })
          // eslint-disable-next-line promise/prefer-await-to-then
          .catch((error) => {
            process.stdout.write(`\nError loading ${pathName}:\n${error}\n`);
          });
      });
    await once(this.watcher, "ready");
  }

  async stopWatching() {
    await this.watcher?.close();
  }

  async load(directory = "") {
    if (!existsSync(nodePath.join(this.basePath, directory))) {
      throw new Error(`Directory does not exist ${this.basePath}`);
    }

    const files = await fs.readdir(nodePath.join(this.basePath, directory), {
      withFileTypes: true,
    });

    // eslint-disable-next-line max-statements
    const imports = files.flatMap(async (file) => {
      const extension = file.name.split(".").at(-1);

      if (file.isDirectory()) {
        await this.load(nodePath.join(directory, file.name));

        return;
      }

      if (!["js", "mjs", "ts", "mts"].includes(extension)) {
        return;
      }

      const fullPath = nodePath.join(this.basePath, directory, file.name);

      try {
        // eslint-disable-next-line node/no-unsupported-features/es-syntax, import/no-dynamic-require
        const endpoint = await import(fullPath);

        if (file.name.includes("$.context")) {
          this.contextRegistry.add(`/${directory}`, endpoint.default);
        } else {
          this.registry.add(
            `/${nodePath.join(directory, nodePath.parse(file.name).name)}`,
            endpoint
          );
        }
      } catch (error) {
        process.stdout.write(`\nError loading ${fullPath}:\n${error}\n`);
      }
    });

    await Promise.all(imports);
  }
}
