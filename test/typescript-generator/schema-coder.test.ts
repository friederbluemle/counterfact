import prettier from "prettier";

import { SchemaCoder } from "../../src/typescript-generator/schema-coder.js";
import { Requirement } from "../../src/typescript-generator/requirement.js";

function format(code) {
  return prettier.format(code, { parser: "typescript" });
}

describe("a SchemaCoder", () => {
  it("generates a list of potential names", () => {
    const coder = new SchemaCoder(
      new Requirement({ $ref: "/components/schemas/Example" })
    );

    const [one, two, three] = coder.names();

    expect([one, two, three]).toStrictEqual([
      "ExampleSchema",
      "ExampleSchema2",
      "ExampleSchema3",
    ]);
  });

  it("when given a $ref, creates an import", () => {
    const coder = new SchemaCoder(
      new Requirement({ $ref: "/components/schemas/Example" })
    );

    const script = {
      import(c) {
        this.importedCoder = c;

        return "aVariable";
      },
    };

    const result = coder.write(script);

    expect(script.importedCoder).toBe(coder);
    expect(result).toBe("aVariable");
  });

  it.each`
    type         | output
    ${"string"}  | ${'{"type":"string"}'}
    ${"number"}  | ${'{"type":"number"}'}
    ${"integer"} | ${'{"type":"integer"}'}
  `("generates a type declaration for $type", ({ type, output }) => {
    const coder = new SchemaCoder(
      new Requirement({ type, xml: "should be ignored" })
    );
    const result = coder.write({});

    expect(result).toBe(output);
  });

  it("generates a type declaration for an object", () => {
    const coder = new SchemaCoder(
      new Requirement({
        type: "object",

        properties: {
          name: { type: "string" },
          age: { type: "integer" },
        },

        xml: "should be ignored",
      })
    );

    const expected = format(`const x = { 
      type: "object",
      required: [],
      properties: { "name": {"type":"string"}, "age": {"type":"integer"} }
    }`);

    expect(format(`const x = ${coder.write()}`)).toStrictEqual(expected);
  });

  it("generates a type declaration for an array", () => {
    const coder = new SchemaCoder(
      new Requirement({
        type: "array",
        items: { type: "string" },
        xml: "should be ignored",
      })
    );

    const expected = format(
      `const x = { 
          type: "array", 
          items: { type: "string" } 
      };`
    );

    expect(format(`const x = ${coder.write()}`)).toStrictEqual(expected);
  });

  it("has type JSONSchema6", () => {
    const coder = new SchemaCoder(
      new Requirement({
        type: "array",
        items: { type: "string" },
        xml: "should be ignored",
      })
    );

    const script = {
      importExternalType(name, path) {
        this.imported = { name, path };

        return name;
      },
    };

    expect(coder.typeDeclaration(script)).toBe("JSONSchema6");

    expect(script.imported).toStrictEqual({
      name: "JSONSchema6",
      path: "json-schema",
    });
  });

  it("calculates the modulePath", () => {
    const coder = new SchemaCoder(
      new Requirement({
        $ref: "foo/bar/baz",
      })
    );

    expect(coder.modulePath()).toBe("components/baz.ts");
  });
});
