import Accept from "@hapi/accept";
import nodeFetch, { Headers as NodeFetchHeaders } from "node-fetch";

import { createResponseBuilder } from "./response-builder.js";
import { Tools } from "./tools.js";

function parameterTypes(parameters) {
  if (!parameters) {
    return {};
  }

  const types = {
    path: {},
    query: {},
    header: {},
    cookie: {},
    formData: {},
    body: {},
  };

  for (const parameter of parameters) {
    if (parameter.schema) {
      types[parameter.in][parameter.name] =
        parameter.schema.type === "integer" ? "number" : parameter.schema.type;
    }
  }

  return types;
}

export class Dispatcher {
  registry;

  // alias the fetch function so we can mock it in tests
  fetch = nodeFetch;

  public constructor(registry, contextRegistry, openApiDocument) {
    this.registry = registry;
    this.contextRegistry = contextRegistry;
    this.openApiDocument = openApiDocument;
  }

  private operationForPathAndMethod(path, method) {
    return this.openApiDocument?.paths?.[path]?.[method.toLowerCase()];
  }

  normalizeResponse(response, acceptHeader) {
    if (typeof response === "string") {
      return {
        status: 200,
        headers: {},
        contentType: "text/plain",
        body: response,
      };
    }

    if (response.content) {
      const content = this.selectContent(acceptHeader, response.content);

      if (!content) {
        return {
          status: 406,
        };
      }

      const normalizedResponse = {
        ...response,
        contentType: content.type,
        body: content.body,
      };

      delete normalizedResponse.content;

      return normalizedResponse;
    }

    return response;
  }

  private selectContent(acceptHeader, content) {
    const preferredMediaTypes = Accept.mediaTypes(acceptHeader);

    for (const mediaType of preferredMediaTypes) {
      const contentItem = content.find((item) =>
        this.isMediaType(item.type, mediaType)
      );

      if (contentItem) {
        return contentItem;
      }
    }

    return {
      type: preferredMediaTypes,
      body: "no match",
    };
  }

  private isMediaType(type, pattern) {
    if (pattern === "*/*") {
      return true;
    }

    const [baseType, subType] = type.split("/");

    const [patternType, patternSubType] = pattern.split("/");

    if (baseType === patternType) {
      return subType === patternSubType || patternSubType === "*";
    }

    if (subType === patternSubType) {
      return baseType === patternType || patternType === "*";
    }

    return false;
  }

  private async request({ method, path, headers, body, query }) {
    const { matchedPath } = this.registry.handler(path);
    const operation = this.operationForPathAndMethod(matchedPath, method);

    const response = await this.registry.endpoint(
      method,
      path,
      parameterTypes(operation?.parameters)
    )({
      tools: new Tools({ headers }),
      body,
      query,
      headers,
      context: this.contextRegistry.find(path),

      response: createResponseBuilder(
        this.operationForPathAndMethod(
          this.registry.handler(path).matchedPath,
          method
        )
      ),

      proxy: async (hostOrOptions) => {
        const options =
          typeof hostOrOptions === "string"
            ? { host: hostOrOptions }
            : hostOrOptions;

        const fetchResponse = await this.fetch(options.host, {
          method,
          path,
          headers: new NodeFetchHeaders(headers),
          query,
          ...options,
        });

        const responseHeaders = Object.fromEntries(
          fetchResponse.headers.entries()
        );

        return {
          status: fetchResponse.status,
          contentType: responseHeaders["content-type"] ?? "unknown/unknown",
          headers: responseHeaders,
          body: await fetchResponse.text(),
        };
      },
    });

    const normalizedResponse = this.normalizeResponse(
      response,
      headers?.accept ?? "*/*"
    );

    if (
      !Accept.mediaTypes(headers?.accept ?? "*/*").some((type) =>
        this.isMediaType(normalizedResponse.contentType, type)
      )
    ) {
      return { status: 406, body: Accept.mediaTypes(headers?.accept ?? "*/*") };
    }

    return normalizedResponse;
  }
}
