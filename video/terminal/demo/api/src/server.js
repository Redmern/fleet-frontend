import { createServer } from "node:http";
import { products } from "./products.js";

export function handle(req, res) {
  if (req.method === "GET" && req.url === "/products") {
    res.writeHead(200, { "content-type": "application/json" });
    return res.end(JSON.stringify(products));
  }
  res.writeHead(404).end();
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  createServer(handle).listen(3000, () => console.log("shop-api on :3000"));
}
