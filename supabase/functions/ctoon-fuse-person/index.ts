/**
 * Generate ONE new character from two CToon artworks (owner only).
 * OPENAI_API_KEY must be set in Supabase Edge Function secrets; never in a browser.
 * The browser uploads the approved final result to the existing owner-only fusion bucket.
 */
import { createClient } from "npm:@supabase/supabase-js@2.119.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const secretKeys = Deno.env.get("SUPABASE_SECRET_KEYS");
const adminKey = (secretKeys ? JSON.parse(secretKeys).default : "") ||
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const admin = adminKey && SUPABASE_URL
  ? createClient(SUPABASE_URL, adminKey, {auth: {persistSession: false, autoRefreshToken: false}})
  : null;
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "600",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const filename = /^[a-z0-9][a-z0-9._-]*\.(?:png|jpe?g|webp)$/i;
const REPO = "https://raw.githubusercontent.com/JTheKax/CTooniverse/main/public/images/ctoons/";
const FUSION = SUPABASE_URL + "/storage/v1/object/public/ctoon-fusions/";

function json(status: number, message: string) {
  return new Response(JSON.stringify({error: message}), {
    status, headers: {...CORS, "Content-Type": "application/json"},
  });
}

/** Only public, predictable artwork sources; never fetch arbitrary user-provided URLs. */
function safeImageUrl(path: unknown): string | null {
  const raw = String(path || "").trim();
  if (!raw) return null;
  if (/^https:\/\//i.test(raw)) {
    if (raw.startsWith(FUSION) &&
        /^fusions\/[a-f0-9-]{36}\.(png|jpe?g|webp)$/i.test(raw.slice(FUSION.length))) return raw;
    if (raw.toLowerCase().startsWith(REPO.toLowerCase()) &&
        filename.test(raw.slice(REPO.length))) return raw;
    return null;
  }
  const base = raw.replace(/^\/?(?:public\/)?images\/ctoons\//i, "");
  return filename.test(base) && !base.includes("..") ? REPO + encodeURIComponent(base) : null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, {status: 204, headers: CORS});
  if (req.method !== "POST") return json(405, "POST only");
  if (!admin) return json(503, "The secure fusion service is not configured.");

  const bearer = /^Bearer (.+)$/i.exec(req.headers.get("authorization") || "");
  if (!bearer || bearer[1].startsWith("sb_")) return json(401, "Sign in as the site owner first.");
  const {data: {user}, error: userError} = await admin.auth.getUser(bearer[1]);
  if (userError || !user) return json(401, "Your sign-in expired. Please sign in again.");
  const {data: owner, error: ownerError} = await admin.from("site_owners")
    .select("user_id").eq("user_id", user.id).maybeSingle();
  if (ownerError) return json(503, "Unable to verify owner authorization.");
  if (!owner) return json(403, "Only the verified site owner can generate fusions.");

  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) return json(503,
    "To generate single-character fusions, add OPENAI_API_KEY in Supabase Edge Function secrets.");

  let input: {left_id?: string; right_id?: string};
  try {
    if (Number(req.headers.get("content-length") || 0) > 2048) return json(413, "Request too large.");
    input = await req.json();
  } catch { return json(400, "Invalid fusion request."); }
  if (!uuid.test(input?.left_id || "") || !uuid.test(input?.right_id || "") ||
      input.left_id === input.right_id) {
    return json(400, "Choose two different CToons.");
  }
  const {data: items, error: catalogError} = await admin.from("ctoon_catalog")
    .select("id,name,image_path").in("id", [input.left_id, input.right_id]);
  if (catalogError) return json(503, "CToon catalog is temporarily unavailable.");
  const first = items?.find(item => item.id === input.left_id);
  const second = items?.find(item => item.id === input.right_id);
  if (!first || !second) return json(404, "One of the selected CToons no longer exists.");
  const leftImage = safeImageUrl(first.image_path);
  const rightImage = safeImageUrl(second.image_path);
  if (!leftImage || !rightImage) return json(422,
    "Fusion needs source artwork from the CToon GitHub image folder or CToon fusion storage.");

  const prompt = [
    "Using BOTH reference images, create ONE genuinely NEW FUSED CARTOON CHARACTER.",
    "The first image is " + first.name + "; the second image is " + second.name + ".",
    "Combine their recognizable facial structures, hair/head shapes, expressions, clothing, colors,",
    "and distinctive visual traits into ONE unified original character design.",
    "The result must have exactly ONE head, ONE face, ONE complete body, two arms and two legs",
    "unless both source characters naturally share a different anatomy.",
    "The resulting person must look like they were always one character, not two people.",
    "DO NOT place characters side-by-side; DO NOT make a split-face collage,",
    "double exposure, overlapping silhouettes, two heads, two torsos or a seam.",
    "Preserve the hand-drawn 2D cartoon/anime energy and recognizable design cues from BOTH sources.",
    "Full-body standing pose, centered, unclipped, clear silhouette, professionally drawn,",
    "transparent background, portrait orientation, NO lettering, NO watermarks, NO frame.",
  ].join(" ");
  try {
    const res = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: {"Authorization": "Bearer " + apiKey, "Content-Type": "application/json"},
      body: JSON.stringify({
        model: "gpt-image-2.5-sunburst", images: [{image_url: leftImage}, {image_url: rightImage}],
        prompt, n: 1, size: "1024x1536", quality: "medium",
        background: "transparent", output_format: "webp", output_compression: 85,
      }),
      signal: AbortSignal.timeout(110000),
    });
    if (!res.ok) {
      const message = await res.text();
      console.error("Fusion generation error:", res.status, message.slice(0, 350));
      return json(res.status === 429 ? 429 : 502,
        res.status === 429 ? "Fusion image service is rate limited. Try again later." :
          "Fusion generation failed. Check your image API key, credits, and source artwork.");
    }
    const result = await res.json();
    const encoded = result?.data?.[0]?.b64_json;
    if (typeof encoded !== "string" || !encoded.length) return json(502, "No fusion image was generated.");
    const bytes = Uint8Array.from(atob(encoded), character => character.charCodeAt(0));
    if (!bytes.length || bytes.length > 5 * 1024 * 1024) {
      return json(502, "The generated artwork exceeds the 5 MB catalog image limit.");
    }
    return new Response(bytes, {
      status: 200, headers: {...CORS, "Content-Type": "image/webp"},
    });
  } catch (e) {
    console.error("Fusion request failed:", String(e));
    return json(502, "Fusion generation could not finish. Try again.");
  }
});
