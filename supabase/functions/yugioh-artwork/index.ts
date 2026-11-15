/**
 * CTooniverse Yu-Gi-Oh! card artwork cache.
 *
 * YGOPRODeck API requires downloaded/re-hosted images, not hotlinked images.
 * This endpoint validates every image against an indexed local catalog, fetches
 * it once (per image variant + size), stores it in Supabase Storage, and serves
 * the locally cached copy on subsequent requests.
 *
 * Public, intentionally read-only to callers. The privileged key NEVER
 * leaves the Edge Function.
 */
import { createClient } from "npm:@supabase/supabase-js@2.119.0";

const BUCKET = "yugioh-artwork";
const ORIGIN = Deno.env.get("SUPABASE_URL")!;
const configuredSecrets = Deno.env.get("SUPABASE_SECRET_KEYS");
const adminKey = (configuredSecrets && JSON.parse(configuredSecrets)["default"]) ||
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
if (!adminKey) throw new Error("Supabase server-side secret missing");
const admin = createClient(ORIGIN, adminKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "X-Content-Type-Options": "nosniff",
};

function errorResponse(code: number, msg: string) {
  return new Response(msg, {
    status: code,
    headers: { ...cors, "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (request.method !== "GET") return errorResponse(405, "GET only");
  const query = new URL(request.url).searchParams;
  const imageId = query.get("id") || "";
  const size = query.get("size") || "small";
  if (!/^[1-9][0-9]{0,14}$/.test(imageId) || !["small", "full"].includes(size)) {
    return errorResponse(400, "Invalid artwork ID or image size");
  }

  // Do not let clients trigger downloads of arbitrary URLs or image IDs.
  const { data: variant, error: lookupError } = await admin
    .from("yugioh_artwork_variants").select("image_id").eq("image_id", imageId).maybeSingle();
  if (lookupError) return errorResponse(503, "Artwork catalog unavailable");
  if (!variant) return errorResponse(404, "Artwork is not in this catalog");

  const path = size + "/" + imageId + ".jpg";
  const publicUrl = admin.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  try {
    const existing = await fetch(publicUrl, {
      method: "HEAD",
      signal: AbortSignal.timeout(4000),
    });
    if (existing.ok) {
      return Response.redirect(publicUrl, 302);
    }

    // Controlled source host and exact expected filename; never accept a
    // source URL from the caller. Fetch a single image and persist it.
    const sourcePath = size === "small" ? "cards_small" : "cards";
    const source = "https://images.ygoprodeck.com/images/" + sourcePath + "/" + imageId + ".jpg";
    const remote = await fetch(source, {
      headers: { "User-Agent": "CTooniverse-Card-Catalog/1.0 (one-time image cache)" },
      signal: AbortSignal.timeout(12000),
    });
    if (remote.status === 404) return errorResponse(404, "Card artwork not available at source");
    if (!remote.ok) return errorResponse(502, "Card artwork source temporarily unavailable");
    if (!(remote.headers.get("content-type") || "").toLowerCase().includes("image/jpeg")) {
      return errorResponse(502, "Unexpected image format");
    }
    const length = Number(remote.headers.get("content-length") || 0);
    if (length > 2_097_152) return errorResponse(413, "Artwork image too large");
    const bytes = new Uint8Array(await remote.arrayBuffer());
    if (bytes.length < 4 || bytes.length > 2_097_152 ||
        bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) {
      return errorResponse(502, "Invalid JPEG image");
    }
    const { error: uploadError } = await admin.storage.from(BUCKET).upload(path, bytes, {
      contentType: "image/jpeg",
      cacheControl: "31536000",
      upsert: false,
    });
    // Another request may have won the race to upload the same image.
    if (uploadError && !/already exists|duplicate/i.test(uploadError.message)) {
      console.error("Artwork cache upload failed:", uploadError.message);
      return errorResponse(503, "Artwork cache temporarily unavailable");
    }
    return new Response(bytes, {
      status: 200,
      headers: {
        ...cors,
        "Content-Type": "image/jpeg",
        "Cache-Control": "public,max-age=604800",
        "Content-Length": String(bytes.byteLength),
      },
    });
  } catch (cause) {
    console.error("Artwork cache request failed:", String(cause));
    return errorResponse(502, "Artwork temporarily unavailable");
  }
});
