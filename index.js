const { onRequest } = require("firebase-functions/v2/https");
const line = require("./utils/line");
const gemini = require("./utils/gemini");
const axios = require("axios");
const NodeCache = require("node-cache");

const cache = new NodeCache();
const CACHE_IMAGE = "image_";
const CACHE_CHAT = "chat_";

// Helper: Get coordinates using Google Maps Geocoding API
const getCoordinates = async (place) => {
  const apiKey = process.env.MAPS_API_KEY;
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(place)}&key=${apiKey}`;
  const response = await axios.get(url);
  const result = response.data.results[0];
  if (!result) return null;
  return {
    lat: result.geometry.location.lat,
    lng: result.geometry.location.lng,
    address: result.formatted_address,
  };
};

exports.webhook = onRequest(async (req, res) => {
  const events = req.body.events;

  for (const event of events) {
    const userId = event.source.userId;

    if (event.type === "message") {
      const msg = event.message;

      // Handle text input
      if (msg.type === "text") {
        const prompt = msg.text;
        const cacheImage = cache.get(CACHE_IMAGE + userId);

        // Google Maps functionality (trigger: map <location>)
        if (prompt.toLowerCase().startsWith("map ")) {
          const locationName = prompt.slice(4); // remove "map " prefix
          const coords = await getCoordinates(locationName);
          if (coords) {
            // Reply with location pin and Google Maps link
            await line.reply(event.replyToken, [
              {
                type: "location",
                title: locationName,
                address: coords.address,
                latitude: coords.lat,
                longitude: coords.lng,
              },
              {
                type: "text",
                text: `🗺️ View on Google Maps:\nhttps://www.google.com/maps?q=${coords.lat},${coords.lng}`,
              },
            ]);
          } else {
            // No location found or invalid location
            await line.reply(event.replyToken, [
              {
                type: "text",
                text: "❌ ไม่พบสถานที่ กรุณาระบุให้ชัดเจนขึ้น เช่น 'map Bangkok'",
              },
            ]);
          }
          return;
        }

        // Multimodal input (image + text)
        if (cacheImage) {
          const multimodalText = await gemini.multimodal(prompt, cacheImage);
          await line.reply(event.replyToken, [
            { type: "text", text: multimodalText },
          ]);
          return;
        }

        // Multi-turn conversation handling (chat)
        let chatHistory = cache.get(CACHE_CHAT + userId) || [];
        const chatResponse = await gemini.chat(chatHistory, prompt);
        await line.reply(event.replyToken, [
          { type: "text", text: chatResponse },
        ]);

        // Update chat history
        chatHistory.push({ role: "user", parts: [{ text: prompt }] });
        chatHistory.push({ role: "model", parts: [{ text: chatResponse }] });
        cache.set(CACHE_CHAT + userId, chatHistory, 300);
        return;
      }

      // Handle image input
      if (msg.type === "image") {
        const imageBinary = await line.getImageBinary(msg.id);
        const imageBase64 = Buffer.from(imageBinary, "binary").toString("base64");
        cache.set(CACHE_IMAGE + userId, imageBase64, 300);

        await line.reply(event.replyToken, [
          { type: "text", text: "📸 โปรดระบุสิ่งที่คุณต้องการให้ช่วยจากภาพนี้" },
        ]);
        return;
      }
    }
  }

  res.end();
});
