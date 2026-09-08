import type { IncomingMessage, ServerResponse } from "node:http";

// Dynamically import the built server (ESM)
const serverModule = await import("../dist/server/server.js");
const app: { fetch: (req: Request) => Promise<Response> } = serverModule.default;

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  // Convert Node IncomingMessage to a Web API Request
  const protocol = (req.headers["x-forwarded-proto"] as string | undefined) || "https";
  const host = req.headers.host || "localhost";
  const url = `${protocol}://${host}${req.url}`;

  const bodyBytes: Uint8Array | undefined =
    req.method !== "GET" && req.method !== "HEAD"
      ? await new Promise<Uint8Array>((resolve) => {
          const chunks: Buffer[] = [];
          req.on("data", (chunk: Buffer) => chunks.push(chunk));
          req.on("end", () => resolve(new Uint8Array(Buffer.concat(chunks))));
        })
      : undefined;

  const webRequest = new Request(url, {
    method: req.method,
    headers: req.headers as Record<string, string>,
    body: bodyBytes?.length ? (bodyBytes as BodyInit) : undefined,
  });

  // Call the TanStack Start fetch handler
  const webResponse: Response = await app.fetch(webRequest);

  // Write status and headers
  res.statusCode = webResponse.status;
  webResponse.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });

  // Stream the body
  if (webResponse.body) {
    const reader = webResponse.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(value);
    }
  }
  res.end();
}
