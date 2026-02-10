import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify user is admin
    const userClient = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin role
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);
    const roles = roleData?.map((r: any) => r.role) || [];
    if (!roles.includes("admin") && !roles.includes("super_admin")) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const title = (formData.get("title") as string) || file.name;
    const version = (formData.get("version") as string) || "1.2";

    if (!file) {
      return new Response(JSON.stringify({ error: "No file provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const packageId = crypto.randomUUID();
    const zipPath = `${packageId}/${file.name}`;
    const extractedBasePath = `${packageId}`;

    // Upload ZIP to scorm bucket
    const zipBuffer = await file.arrayBuffer();
    const { error: uploadError } = await adminClient.storage
      .from("scorm")
      .upload(zipPath, zipBuffer, { contentType: "application/zip" });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return new Response(JSON.stringify({ error: "Failed to upload ZIP" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract ZIP using JSZip
    const { default: JSZip } = await import("https://esm.sh/jszip@3.10.1");
    const zip = await JSZip.loadAsync(zipBuffer);

    // Parse imsmanifest.xml
    let manifestXml = "";
    let launchPath = "";
    let manifestJson: any = null;

    const manifestFile = zip.file("imsmanifest.xml") || zip.file(/imsmanifest\.xml$/i)[0];
    if (manifestFile) {
      manifestXml = await manifestFile.async("text");
      
      // Simple XML parsing for launch file
      // Look for <resource> with adlcp:scormType="sco" or type="webcontent"
      const resourceMatch = manifestXml.match(/<resource[^>]*href="([^"]+)"[^>]*>/i);
      if (resourceMatch) {
        launchPath = resourceMatch[1];
      }
      
      // Also try to find it in <file> elements if no href on resource
      if (!launchPath) {
        const fileMatch = manifestXml.match(/<file\s+href="([^"]+\.html?)"/i);
        if (fileMatch) {
          launchPath = fileMatch[1];
        }
      }

      // If manifest is in a subdirectory, adjust paths
      const manifestPath = manifestFile.name;
      const manifestDir = manifestPath.includes("/")
        ? manifestPath.substring(0, manifestPath.lastIndexOf("/") + 1)
        : "";
      
      if (manifestDir && launchPath && !launchPath.startsWith(manifestDir)) {
        // launchPath is relative to manifest
      }

      manifestJson = {
        raw_xml_length: manifestXml.length,
        detected_launch: launchPath,
        manifest_dir: manifestDir,
      };
    }

    if (!launchPath) {
      // Fallback: look for index.html or story.html
      const htmlFiles = Object.keys(zip.files).filter(
        (f) => f.endsWith(".html") || f.endsWith(".htm")
      );
      const indexFile = htmlFiles.find(
        (f) =>
          f.toLowerCase().includes("index") ||
          f.toLowerCase().includes("story") ||
          f.toLowerCase().includes("launch")
      );
      launchPath = indexFile || htmlFiles[0] || "index.html";
    }

    // Extract all files to scorm-extracted bucket
    const fileEntries = Object.entries(zip.files);
    let uploadedCount = 0;
    
    for (const [filename, zipEntry] of fileEntries) {
      if (zipEntry.dir) continue;

      const content = await zipEntry.async("uint8array");
      const filePath = `${extractedBasePath}/${filename}`;

      // Determine content type
      let contentType = "application/octet-stream";
      if (filename.endsWith(".html") || filename.endsWith(".htm")) contentType = "text/html";
      else if (filename.endsWith(".js")) contentType = "application/javascript";
      else if (filename.endsWith(".css")) contentType = "text/css";
      else if (filename.endsWith(".json")) contentType = "application/json";
      else if (filename.endsWith(".xml")) contentType = "application/xml";
      else if (filename.endsWith(".png")) contentType = "image/png";
      else if (filename.endsWith(".jpg") || filename.endsWith(".jpeg")) contentType = "image/jpeg";
      else if (filename.endsWith(".gif")) contentType = "image/gif";
      else if (filename.endsWith(".svg")) contentType = "image/svg+xml";
      else if (filename.endsWith(".mp4")) contentType = "video/mp4";
      else if (filename.endsWith(".mp3")) contentType = "audio/mpeg";
      else if (filename.endsWith(".woff2")) contentType = "font/woff2";
      else if (filename.endsWith(".woff")) contentType = "font/woff";

      const { error: extractError } = await adminClient.storage
        .from("scorm-extracted")
        .upload(filePath, content, { contentType, upsert: true });

      if (extractError) {
        console.error(`Error extracting ${filename}:`, extractError);
      } else {
        uploadedCount++;
      }
    }

    // Create scorm_packages record
    const { data: packageData, error: packageError } = await adminClient
      .from("scorm_packages")
      .insert({
        id: packageId,
        title,
        version,
        storage_zip_path: zipPath,
        storage_extracted_path: extractedBasePath,
        launch_path: launchPath,
        manifest_json: manifestJson,
        created_by: user.id,
      })
      .select()
      .single();

    if (packageError) {
      console.error("Package insert error:", packageError);
      return new Response(JSON.stringify({ error: "Failed to save package record" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        package: packageData,
        files_extracted: uploadedCount,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("SCORM upload error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
