import { test } from "node:test";
import assert from "node:assert/strict";
import { handle } from "../src/server.js";

function call(method, url) {
  return new Promise(resolve => {
    const res = {
      status: 200, headers: {},
      writeHead(s, h) { this.status = s; Object.assign(this.headers, h); return this; },
      end(body) { resolve({ status: this.status, body }); },
    };
    handle({ method, url }, res);
  });
}

test("GET /products lists products", async () => {
  const r = await call("GET", "/products");
  assert.equal(r.status, 200);
  assert.equal(JSON.parse(r.body).length, 3);
});
