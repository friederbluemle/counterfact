#!/usr/bin/env node

import nodePath from "node:path";

import { program } from "commander";
import createDebug from "debug";
import open from "open";

import { migrate } from "../dist/migrations/0.27.js";
import { counterfact } from "../dist/server/app.js";

const DEFAULT_PORT = 3100;

const debug = createDebug("counterfact:bin:counterfact");

debug("running ./bin/counterfact.js");

// eslint-disable-next-line max-statements
async function main(source, destination) {
  debug("executing the main function");

  const options = program.opts();

  const destinationPath = nodePath
    .join(process.cwd(), destination)
    .replaceAll("\\", "/");

  debug("migrating code from before 0.27.0");
  migrate(destinationPath);
  debug("done with migration");

  const basePath = nodePath.resolve(destinationPath).replaceAll("\\", "/");

  debug("options: %o", options);
  debug("source: %s", source);
  debug("destination: %s", destination);

  const openBrowser = options.open;

  const url = `http://localhost:${options.port}`;

  const guiUrl = `${url}/counterfact/`;

  const config = {
    basePath,
    includeSwaggerUi: true,
    openApiPath: source,
    port: options.port,
    proxyEnabled: Boolean(options.proxyUrl),
    proxyUrl: options.proxyUrl,
    routePrefix: options.prefix,
  };

  debug("loading counterfact (%o)", config);

  const { start } = await counterfact(config);

  debug("loaded counterfact", config);

  const introduction = [
    "____ ____ _  _ _ _ ___ ____ ____ ____ ____ ____ ___",
    "|___ [__] |__| |\\|  |  |=== |--< |--- |--| |___  | ",
    "       High code, low effort mock REST APIs",
    "",
    `| API Base URL  ==> ${url}`,
    `| Admin Console ==> ${guiUrl}`,
    "| Instructions  ==> https://counterfact.dev/docs/usage.html",
    "",
    "Starting REPL, type .help for more info",
  ];

  process.stdout.write(introduction.join("\n"));

  process.stdout.write("\n\n");

  debug("starting server");

  await start();

  debug("started server");

  if (openBrowser) {
    debug("opening browser");
    await open(guiUrl);
    debug("opened browser");
  }
}

program
  .name("counterfact")
  .description(
    "Counterfact is a tool for generating a REST API from an OpenAPI document.",
  )
  .argument("<openapi.yaml>", "path or URL to OpenAPI document")
  .argument("[destination]", "path to generated code", ".")
  .option("--port <number>", "server port number", DEFAULT_PORT)
  .option("--swagger", "include swagger-ui")
  .option("--open", "open a browser")
  .option("--proxy-url <string>", "proxy URL")
  .option(
    "--prefix <string>",
    "base path from which routes will be served (e.g. /api/v1)",
  )
  .action(main)
  // eslint-disable-next-line sonar/process-argv
  .parse(process.argv);
