import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, range",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Expose-Headers":
    "Accept-Ranges, Content-Length, Content-Range, Content-Type",
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

      // Absolute public directory of the current file. Inside the Edge runtime
      // req.url is mounted at /serve-scorm/..., but browsers must request the
      // public /functions/v1/serve-scorm/... route or assets redirect and get
      // blocked by the browser.
      const fileDir = filePath.includes("/")
        ? filePath.substring(0, filePath.lastIndexOf("/") + 1)
        : "";
      const baseDir = `${supabaseUrl}/functions/v1/serve-scorm/${packageId}/${fileDir}`;
      const baseTag = `<base href="${baseDir}">`;

      const tokenScript = `<script>
(function(){
  var token = ${JSON.stringify(token)};
  function withToken(url) {
    if (!url || typeof url !== 'string' || url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('#') || url.startsWith('javascript:')) {
      return url;
    }
    try {
      var parsed = new URL(url, document.baseURI);
      if (parsed.searchParams.has('token')) return parsed.href;
      parsed.searchParams.set('token', token);
      return parsed.href;
    } catch (_) {
      var sep = url.indexOf('?') >= 0 ? '&' : '?';
      return url + sep + 'token=' + encodeURIComponent(token);
    }
  }
  var origSetAttribute = Element.prototype.setAttribute;
  Element.prototype.setAttribute = function(name, value) {
    var attr = String(name || '').toLowerCase();
    if ((attr === 'src' || attr === 'href') && typeof value === 'string') {
      value = withToken(value);
    }
    return origSetAttribute.call(this, name, value);
  };
  function patchUrlProperty(proto, prop) {
    var desc = Object.getOwnPropertyDescriptor(proto, prop);
    if (!desc || !desc.set || !desc.get) return;
    Object.defineProperty(proto, prop, {
      configurable: true,
      enumerable: desc.enumerable,
      get: desc.get,
      set: function(value) { return desc.set.call(this, typeof value === 'string' ? withToken(value) : value); }
    });
  }
  [HTMLMediaElement.prototype, HTMLSourceElement.prototype, HTMLImageElement.prototype, HTMLScriptElement.prototype, HTMLIFrameElement.prototype].forEach(function(proto) {
    patchUrlProperty(proto, 'src');
  });
  [HTMLLinkElement.prototype, HTMLAnchorElement.prototype].forEach(function(proto) {
    patchUrlProperty(proto, 'href');
  });
  var origOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url) {
    var args = Array.prototype.slice.call(arguments);
    args[1] = withToken(url);
    return origOpen.apply(this, args);
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

      // Cosmetic overrides injected at the END of <head> so they win over the
      // package's own styles. Goal: a smooth, centred, letter-boxed player on
      // every screen and a clean launch state (no overlapping floating controls
      // or stretched video) — especially on mobile. Purely presentational; the
      // SCORM runtime, video element and progress tracking are untouched.
      const overrideStyle = `<style id="spta-scorm-overrides">
  html, body { height: 100%; width: 100%; margin: 0; padding: 0; background: #000; }
  body { display: flex; align-items: center; justify-content: center; overflow: hidden; }
  #videoContainer {
    width: 100% !important; max-width: 100% !important; height: 100% !important;
    margin: 0 !important; display: flex; align-items: center; justify-content: center;
  }
  #videoContainer video, video#miVideo {
    width: 100% !important; height: 100% !important;
    max-width: 100% !important; max-height: 100% !important;
    object-fit: contain; background: #000; display: block;
  }
  /* Slim, less intrusive floating language/speed chips on desktop. */
  .controls-container { top: 10px !important; right: 10px !important; gap: 6px !important; }
  .controls-container select { padding: 4px 8px !important; font-size: 12px !important; border-width: 1px !important; border-radius: 6px !important; }
  .controls-container label { font-size: 12px !important; padding: 3px 6px !important; border-radius: 6px !important; }
  /* On touch / small screens the floating bar overlaps the video and looks
     broken during launch. The native control bar still exposes volume,
     fullscreen and speed, so hide the custom overlay there for a clean start. */
  @media (max-width: 640px), (hover: none) and (pointer: coarse) {
    .controls-container { display: none !important; }
  }
</style>`;
      if (html.includes("</head>")) {
        html = html.replace("</head>", overrideStyle + "</head>");
      } else if (html.includes("</HEAD>")) {
        html = html.replace("</HEAD>", overrideStyle + "</HEAD>");
      } else if (html.includes("<body")) {
        html = html.replace("<body", overrideStyle + "<body");
      } else {
        html = overrideStyle + html;
      }




      // Rewrite relative src/href attributes to include token
      // This handles <script src="...">, <link href="...">, <img src="..."> etc.
      html = html.replace(
        /(src|href)="(?!https?:\/\/|\/\/|data:|#|javascript:)([^"]+)"/gi,
        (match: string, attr: string, path: string) => {
          return `${attr}="${withToken(path, token)}"`;
        }
      );

      // Explicit CSP suitable for SCORM/HeyGen content: allow inline + eval
      // scripts, inline styles, media (video/audio), images, fonts and network
      // calls over same-origin/https plus blob:/data: URIs, and permit the app
      // to embed this document in an iframe.
      const scormCsp =
        "default-src 'self' https: data: blob: 'unsafe-inline' 'unsafe-eval'; " +
        "script-src 'self' https: blob: 'unsafe-inline' 'unsafe-eval'; " +
        "style-src 'self' https: 'unsafe-inline'; " +
        "img-src 'self' https: data: blob:; " +
        "media-src 'self' https: data: blob:; " +
        "font-src 'self' https: data:; " +
        "connect-src 'self' https: data: blob:; " +
        "frame-ancestors *;";

      return new Response(html, {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "text/html; charset=utf-8",
          "Content-Security-Policy": scormCsp,
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
