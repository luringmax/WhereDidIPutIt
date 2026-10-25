"use strict";
// Minimal local server: serves the app and stores the items in data.json next to this file.
// No dependencies. Run with: node server.js

const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const DATA_FILE = path.join(ROOT, "data.json");
const PORT = Number(process.env.PORT) || 3000;
const STATIC = new Set(["index.html", "style.css", "app.js", "fonts/outfit-latin.woff2", "fonts/space-grotesk-latin.woff2"]);
const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".woff2": "font/woff2" };

function send(res, status, body, type = "text/plain; charset=utf-8") {
  res.writeHead(status, { "Content-Type": type, "Cache-Control": "no-store" });
  res.end(body);
}

function handleItems(req, res) {
  if (req.method === "GET") {
    fs.readFile(DATA_FILE, "utf8", (err, text) =>
      err ? send(res, 404, "No data yet") : send(res, 200, text, "application/json"));
    return;
  }
  if (req.method === "PUT") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 200e6) req.destroy(); // photos are stored inside the JSON
    });
    req.on("end", () => {
      try {
        if (!Array.isArray(JSON.parse(body))) throw new Error("not an array");
      } catch (e) {
        return send(res, 400, "Invalid JSON");
      }
      const tmp = DATA_FILE + ".tmp";
      fs.writeFile(tmp, body, (err) => {
        if (err) return send(res, 500, "Write failed");
        fs.rename(tmp, DATA_FILE, (err2) => (err2 ? send(res, 500, "Write failed") : send(res, 204, "")));
      });
    });
    return;
  }
  send(res, 405, "Method not allowed");
}

http.createServer((req, res) => {
  const pathname = new URL(req.url, "http://localhost").pathname;
  if (pathname === "/api/items") return handleItems(req, res);

  const name = pathname === "/" ? "index.html" : pathname.slice(1);
  if (!STATIC.has(name)) return send(res, 404, "Not found");
  fs.readFile(path.join(ROOT, name), (err, data) =>
    err ? send(res, 404, "Not found") : send(res, 200, data, TYPES[path.extname(name)]));
}).listen(PORT, "127.0.0.1", () => {
  console.log(`WhereDidIPutIt? running at http://localhost:${PORT}`);
  console.log(`Data is saved to ${DATA_FILE}`);
});
