import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const CONTENT_TYPES: Record<string, string> = {
  ".html": "text/html",
  ".htm": "text/html",
  ".js": "application/javascript",
  ".mjs": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".xml": "application/xml",
  ".xsd": "application/xml",
  ".dtd": "application/xml-dtd",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".mp4": "video/mp4",
  ".mp3": "audio/mpeg",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".ttf": "font/ttf",
  ".eot": "application/vnd.ms-fontobject",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".webm": "video/webm",
  ".ogg": "audio/ogg",
  ".wav": "audio/wav",
  ".pdf": "application/pdf",
  ".swf": "application/x-shockwave-flash",
};

function getContentType(filePath: string): string {
  const dotIdx = filePath.lastIndexOf(".");
  if (dotIdx === -1) return "application/octet-stream";
  const ext = filePath.substring(dotIdx).toLowerCase();
  return CONTENT_TYPES[ext] || "application/octet-stream";
}

function withToken(path: string, token: string): string {
  if (
    !path ||
    path.startsWith("http://") ||
    path.startsWith("https://") ||
    path.startsWith("//") ||
    path.startsWith("data:") ||
    path.startsWith("#") ||
    path.startsWith("javascript:")
  ) {
    return path;
  }

  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}token=${encodeURIComponent(token)}`;
}

function rewriteCssUrls(css: string, token: string): string {
  return css.replace(/url\((['"]?)([^'")]+)\1\)/gi, (_match, quote: string, path: string) => {
    return `url(${quote}${withToken(path.trim(), token)}${quote})`;
  });
}

// In-memory short-lived token cache to avoid re-verifying on every sub-resource
// Maps token -> { userId, expiresAt }
const tokenCache = new Map<string, { userId: string; roles: string[]; expiresAt: number }>();

function getCachedAuth(token: string) {
  const cached = tokenCache.get(token);
  if (cached && cached.expiresAt > Date.now()) return cached;
  tokenCache.delete(token);
  return null;
}

function setCachedAuth(token: string, userId: string, roles: string[]) {
  // Cache for 5 minutes
  tokenCache.set(token, { userId, roles, expiresAt: Date.now() + 5 * 60 * 1000 });
  // Evict old entries
  if (tokenCache.size > 500) {
    const now = Date.now();
    for (const [k, v] of tokenCache) {
      if (v.expiresAt < now) tokenCache.delete(k);
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);

    // Remove function name prefix if present
    let startIdx = 0;
    if (pathParts[0] === "serve-scorm") startIdx = 1;

    const packageId = pathParts[startIdx];
    let filePath: string;

    try {
      filePath = pathParts.slice(startIdx + 1).map((part) => decodeURIComponent(part)).join("/");
    } catch {
      return new Response(JSON.stringify({ error: "Invalid encoded file path" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!packageId || !filePath) {
      return new Response(JSON.stringify({ error: "Invalid path" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(packageId)) {
      return new Response(JSON.stringify({ error: "Invalid package ID" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Prevent path traversal
    if (filePath.includes("..") || filePath.startsWith("/")) {
      return new Response(JSON.stringify({ error: "Invalid file path" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get token from query param or Authorization header
    const token = url.searchParams.get("token");
    const authHeader = req.headers.get("authorization");
    const bearerToken = token || (authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null);

    if (!bearerToken) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    let userId: string;
    let roles: string[];

    // Check cache first
    const cached = getCachedAuth(bearerToken);
    if (cached) {
      userId = cached.userId;
      roles = cached.roles;
    } else {
      // Verify token
      const userClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: `Bearer ${bearerToken}` } },
      });
      const { data: { user }, error: authError } = await userClient.auth.getUser();
      if (authError || !user) {
        return new Response(JSON.stringify({ error: "Invalid token" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      userId = user.id;

      const adminClient = createClient(supabaseUrl, supabaseServiceKey);
      const { data: roleData } = await adminClient
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);
      roles = (roleData || []).map((r: any) => r.role);

      setCachedAuth(bearerToken, userId, roles);
    }

    const isAdmin = roles.includes("admin") || roles.includes("super_admin");

    // Authorization check: admin, or has registration/enrollment
    if (!isAdmin) {
      const adminClient = createClient(supabaseUrl, supabaseServiceKey);

      // Check SCORM registration
      const { data: reg } = await adminClient
        .from("scorm_registrations")
        .select("id")
        .eq("user_id", userId)
        .eq("scorm_package_id", packageId)
        .limit(1);

      if (!reg || reg.length === 0) {
        // Check enrollment via lessons
        const { data: lessonData } = await adminClient
          .from("lessons")
          .select("course_id")
          .eq("scorm_package_id", packageId)
          .limit(1);

        if (lessonData && lessonData.length > 0) {
          const { data: enrollmentData } = await adminClient
            .from("enrollments")
            .select("id")
            .eq("user_id", userId)
            .eq("course_id", lessonData[0].course_id)
            .limit(1);

          if (!enrollmentData || enrollmentData.length === 0) {
            return new Response(JSON.stringify({ error: "Access denied" }), {
              status: 403,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        } else {
          return new Response(JSON.stringify({ error: "Package not found" }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    // Serve the file from private storage
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const storagePath = `${packageId}/${filePath}`;
    const { data: fileData, error: downloadError } = await adminClient.storage
      .from("scorm-extracted")
      .download(storagePath);

    if (downloadError || !fileData) {
      return new Response(JSON.stringify({ error: "File not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const contentType = getContentType(filePath);
    const arrayBuffer = await fileData.arrayBuffer();

    // For HTML files, inject a <base> tag (so relative assets resolve back to
    // this function when the HTML is rendered via iframe srcDoc on another
    // origin) and a token propagation script so XHR/fetch requests also carry
    // the token.
    if (contentType === "text/html" && token) {
      let html = new TextDecoder().decode(arrayBuffer);

      // Absolute directory of the current file, e.g.
      // https://<proj>.supabase.co/functions/v1/serve-scorm/<pkg>/<dir>/
      const baseDir =
        url.origin + url.pathname.substring(0, url.pathname.lastIndexOf("/") + 1);
      const baseTag = `<base href="${baseDir}">`;

      const tokenScript = `<script>
(function(){
  var token = ${JSON.stringify(token)};
  function withToken(url) {
    if (!url || typeof url !== 'string' || url.startsWith('http') || url.startsWith('//') || url.startsWith('data:') || url.startsWith('#') || url.startsWith('javascript:')) {
      return url;
    }
    var sep = url.indexOf('?') >= 0 ? '&' : '?';
    return url + sep + 'token=' + encodeURIComponent(token);
  }
  var origOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url) {
    url = withToken(url);
    return origOpen.apply(this, arguments);
  };
  if (window.fetch) {
    var origFetch = window.fetch;
    window.fetch = function(input, init) {
      if (typeof input === 'string') {
        input = withToken(input);
      } else if (input && input.url) {
        input = new Request(withToken(input.url), input);
      }
      return origFetch.call(this, input, init);
    };
  }
})();
</script>`;
      // Inject base tag first (must precede any resource references), then the
      // token script. Insert right after the opening <head>.
      const headInjection = baseTag + tokenScript;
      if (html.includes("<head>")) {
        html = html.replace("<head>", "<head>" + headInjection);
      } else if (html.includes("<HEAD>")) {
        html = html.replace("<HEAD>", "<HEAD>" + headInjection);
      } else {
        html = headInjection + html;
      }


      // Rewrite relative src/href attributes to include token
      // This handles <script src="...">, <link href="...">, <img src="..."> etc.
      html = html.replace(
        /(src|href)="(?!https?:\/\/|\/\/|data:|#|javascript:)([^"]+)"/gi,
        (match: string, attr: string, path: string) => {
          return `${attr}="${withToken(path, token)}"`;
        }
      );

      return new Response(html, {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "private, no-cache",
        },
      });
    }

    if (contentType === "text/css" && token) {
      const css = rewriteCssUrls(new TextDecoder().decode(arrayBuffer), token);
      return new Response(css, {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "text/css; charset=utf-8",
          "Cache-Control": "private, max-age=3600",
        },
      });
    }

    const rangeHeader = req.headers.get("range");
    if (rangeHeader) {
      const rangeMatch = rangeHeader.match(/^bytes=(\d*)-(\d*)$/);
      if (rangeMatch) {
        const totalLength = arrayBuffer.byteLength;
        const start = rangeMatch[1] ? Number.parseInt(rangeMatch[1], 10) : 0;
        const end = rangeMatch[2] ? Number.parseInt(rangeMatch[2], 10) : totalLength - 1;

        if (start <= end && start >= 0 && end < totalLength) {
          const chunk = arrayBuffer.slice(start, end + 1);
          return new Response(chunk, {
            status: 206,
            headers: {
              ...corsHeaders,
              "Content-Type": contentType,
              "Cache-Control": "private, max-age=3600",
              "Accept-Ranges": "bytes",
              "Content-Range": `bytes ${start}-${end}/${totalLength}`,
              "Content-Length": String(chunk.byteLength),
            },
          });
        }
      }
    }

    return new Response(arrayBuffer, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=3600",
        "Accept-Ranges": "bytes",
        "Content-Length": String(arrayBuffer.byteLength),
      },
    });
  } catch (error) {
    console.error("serve-scorm error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
