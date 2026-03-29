export default {
  async fetch(request, env, ctx) {
    // 1. Chỉ chấp nhận method GET và OPTIONS (CORS)
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
        },
      });
    }

    if (request.method !== "GET") {
      return new Response("Method not allowed", { status: 405 });
    }

    // 2. Phân tích URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/").filter(Boolean); // url: /image/AgACAgUAA...

    if (pathParts[0] !== "image" || !pathParts[1]) {
      return new Response("Not found", { status: 404 });
    }

    const fileId = pathParts[1];
    
    // 3. Kiểm tra Token Telegram
    const { TELEGRAM_BOT_TOKEN } = env;
    if (!TELEGRAM_BOT_TOKEN) {
      return new Response("Server error: Missing TELEGRAM_BOT_TOKEN in variables", { status: 500 });
    }

    // 4. Khởi tạo Cache API (Cơ chế caching của Cloudflare Edge)
    const cache = caches.default;
    const cacheKey = new Request(url.toString(), request);
    
    // Kiểm tra xem hình ảnh này đã có sẵn trong Edge Cache của Cloudflare chưa
    let cachedResponse = await cache.match(cacheKey);
    if (cachedResponse) {
      // Nếu có, trả về ngay lập tức với tốc độ tính bằng phần nghìn giây!
      console.log(`[Cache HIT] Phục vụ từ vị trí Data Center Cloudflare gần user nhất`);
      return cachedResponse;
    }

    console.log(`[Cache MISS] Lấy image từ Telegram: ${fileId}`);
    try {
      // BƯỚC A: Lấy file path từ Telegram (Sẽ không bao giờ được gọi lại nếu cache Hit)
      const fileRes = await fetch(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getFile?file_id=${fileId}`
      );
      
      const fileData = await fileRes.json();
      if (!fileData.ok || !fileData.result?.file_path) {
        return new Response("Invalid Telegram File ID", { status: 400 });
      }

      // BƯỚC B: Tải luồng ảnh stream thẳng từ Telegram API CDN (Sẽ không bao giờ được gọi lại nếu cache Hit)
      const imageRes = await fetch(
        `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${fileData.result.file_path}`
      );

      if (!imageRes.ok) throw new Error("Thất bại khi lấy dữ liệu hình ảnh");

      // BƯỚC C: Tạo cấu hình nội dung chuẩn Proxy & Ép trình duyệt cache lại
      const newResponse = new Response(imageRes.body, imageRes);
      // Cache Vĩnh Viễn: max-age=31536000 (1 năm), immutable có nghĩa file ID không bao giờ bị đổi nội dung
      newResponse.headers.set("Cache-Control", "public, max-age=31536000, immutable");
      // Mở CORS cho mọi nguồn
      newResponse.headers.set("Access-Control-Allow-Origin", "*");
      // Đặt Content Type chuẩn (nếu có trả về) hoặc jpeg
      newResponse.headers.set("Content-Type", imageRes.headers.get("content-type") || "image/jpeg");

      // Lưu trữ ảnh này tại máy chủ Cloudflare gần user nhất (xử lý Async ngầm)
      ctx.waitUntil(cache.put(cacheKey, newResponse.clone()));

      return newResponse;

    } catch (error) {
      return new Response(`Worker Error: ${error.message}`, { status: 500 });
    }
  },
};
