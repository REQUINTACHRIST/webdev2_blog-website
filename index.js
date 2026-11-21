"use strict";

const f = require("node:fs");
const http = require("node:http");
const path = require("node:path");

const root = path.resolve(__dirname);
const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp"
};
const port = Number(process.env.PORT || 3000);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT must be a whole number between 1 and 65535.");
}

const server = http.createServer((request, response) => {
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { Allow: "GET, HEAD" });
    response.end("Method not allowed");
    return;
  }

  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
  } catch (error) {
    response.writeHead(400);
    response.end("Bad request");
    return;
  }

  const relativePath = (pathname === "/" ? "index.html" : pathname)
    .replace(/\\/g, "/")
    .replace(/^\/+/, "");
  const filePath = path.resolve(root, relativePath);
  const resolvedPath = path.relative(root, filePath);
  if (resolvedPath === ".." || resolvedPath.startsWith(".." + path.sep) || path.isAbsolute(resolvedPath)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, contents) => {
    if (error) {
      if (error.code === "ENOENT" || error.code === "EISDIR") {
        response.writeHead(404);
        response.end("Not found");
        return;
      }
      console.error("Unable to read requested file:", error);
      response.writeHead(500);
      response.end("Internal server error");
      return;
    }

    response.writeHead(200, {
      "Content-Type": contentTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream",
      "X-Content-Type-Options": "nosniff"
    });
    response.end(request.method === "HEAD" ? undefined : contents);
  });
});

server.on("error", (error) => {
  console.error("Unable to start the Ian's Kitchen server:", error.message);
  process.exitCode = 1;
});

server.listen(port, "127.0.0.1", () => {
  console.log("Ian's Kitchen is running at http://localhost:" + port);
});
