import assert from "node:assert/strict";
import test from "node:test";

test("renders the production title and Portuguese document metadata", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  const response = await worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );

  assert.equal(response.status, 200);
  assert.match(
    response.headers.get("content-type") ?? "",
    /^text\/html\b/i,
  );
  const html = await response.text();
  assert.match(html, /<html\s+lang=["']pt-BR["']/i);
  assert.match(html, /<title>Ficha Tokyo Guru - Kakuja<\/title>/i);
  assert.match(html, /sistema modular completo de Kakuja/i);
  assert.doesNotMatch(html, /name=["']codex-preview["']/i);
});
