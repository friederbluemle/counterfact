/* eslint-disable node/no-missing-import */
/* eslint-disable node/file-extension-in-import */
/* eslint-disable import/no-unresolved */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable node/no-unsupported-features/node-builtins */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable no-console */

import { fileURLToPath } from "node:url";

import Koa from "koa";
import { counterfact } from "counterfact";

import { context } from "./context/context.js";

const PORT = 3100;

const app = new Koa();

const { koaMiddleware } = await counterfact(
  fileURLToPath(new URL("paths/", import.meta.url)),
  context
);

app.use(koaMiddleware);

app.listen(PORT);
console.log("Try these URLs:");
console.log(`http://localhost:${PORT}/hello/world`);
console.log(`http://localhost:${PORT}/hello/friends`);
console.log(`http://localhost:${PORT}/hello/kitty`);
console.log(`http://localhost:${PORT}/hello/world?greeting=Hi`);
console.log(`http://localhost:${PORT}/count`);