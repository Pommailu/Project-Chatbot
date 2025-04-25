const { onRequest } = require("firebase-functions/v2/https");
const line = require("./utils/line");
const gemini = require("./utils/gemini");
const NodeCache = require("node-cache");
const templates = require("./utils/flexTemplates");

const cache = new NodeCache();
const CACHE_IMAGE = "image_";
const CACHE_CHAT = "chat_";

exports.webhook = onRequest(async (req, res) => {
  const events = req.body.events;

  for (const event of events) {
    const userId = event.source.userId;

    if (event.type === "message") {
      const msg = event.message;

      if (msg.type === "text") {
        const prompt = msg.text;
        const cachedImage = cache.get(CACHE_IMAGE + userId);

        const categoryMap = {
          "เที่ยวทะเล": templates.seaTripCarousel,
          "เที่ยวภูเขา": templates.mountainTripCarousel,
          "เที่ยวธรรมชาติ": templates.natureTripCarousel,
          "เที่ยววัด": templates.templeTripCarousel,
        };
        
        if (categoryMap[prompt]) {
          await line.reply(event.replyToken, [{
            type: "flex",
            altText: `ที่${prompt}แนะนำ`,
            contents: categoryMap[prompt]
          }]);
          return;
        }

        // Map feature
        if (prompt.toLowerCase().startsWith("map ")) {
          const place = prompt.slice(4).trim();
          const coords = await gemini.getMapLocation(place);
          if (coords) {
            await line.reply(event.replyToken, [
              {
                type: "location",
                title: place,
                address: coords.address,
                latitude: coords.lat,
                longitude: coords.lng,
              },
              {
                type: "text",
                text: `🗺️ Google Maps: https://www.google.com/maps?q=${coords.lat},${coords.lng}`,
              },
            ]);
          } else {
            await line.reply(event.replyToken, [
              { type: "text", text: "❌ ไม่พบสถานที่ กรุณาระบุให้ชัดเจนขึ้น เช่น 'map Bangkok'" },
            ]);
          }
          return;
        }

        // Image + text (multimodal)
        if (cachedImage) {
          try {
            const multimodalText = await gemini.multimodal(prompt, cachedImage);
            await line.reply(event.replyToken, [{ type: "text", text: multimodalText }]);
            cache.del(CACHE_IMAGE + userId); // Clear after use
          } catch (err) {
            console.error("Multimodal error:", err);
            await line.reply(event.replyToken, [
              { type: "text", text: "❌ เกิดข้อผิดพลาดในการประมวลผลภาพ" },
            ]);
          }
          return;
        }

        // Text-only conversation
        const chatHistory = cache.get(CACHE_CHAT + userId) || [];
        const replyText = await gemini.travelExpertChat(chatHistory, prompt);
        chatHistory.push({ role: "user", parts: [{ text: prompt }] });
        chatHistory.push({ role: "model", parts: [{ text: replyText }] });
        cache.set(CACHE_CHAT + userId, chatHistory, 300); // Save 5 mins
        await line.reply(event.replyToken, [{ type: "text", text: replyText }]);
        return;
      }

      // Handle image
      if (msg.type === "image") {
        try {
          const binary = await line.getImageBinary(msg.id);
          if (!binary) {
            await line.reply(event.replyToken, [{ type: "text", text: "❌ ไม่สามารถโหลดรูปภาพได้" }]);
            return;
          }
          const base64 = Buffer.from(binary, "binary").toString("base64");
          cache.set(CACHE_IMAGE + userId, base64, 300); // Save 5 mins
          await line.reply(event.replyToken, [
            { type: "text", text: "📸 โปรดระบุสิ่งที่คุณต้องการให้ช่วยจากภาพนี้" },
          ]);
        } catch (err) {
          console.error("Image error:", err);
          await line.reply(event.replyToken, [{ type: "text", text: "❌ ไม่สามารถประมวลผลรูปภาพได้" }]);
        }
      }
    }
  }

  res.end();
})
