export const dynamic = "force-dynamic";

const healthBody = JSON.stringify({ ok: true, service: "conspiracy" });

function healthResponse(includeBody: boolean): Response {
  return new Response(includeBody ? healthBody : null, {
    status: 200,
    headers: {
      "cache-control": "no-store",
      "content-type": "application/json; charset=utf-8",
    },
  });
}

export function GET(): Response {
  return healthResponse(true);
}

export function HEAD(): Response {
  return healthResponse(false);
}

