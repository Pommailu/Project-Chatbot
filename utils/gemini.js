const { GoogleGenerativeAI } = require("@google/generative-ai");
const axios = require("axios");

const genAI = new GoogleGenerativeAI(process.env.API_KEY);

// 1. Text-only input using Gemini Flash
const textOnly = async (prompt) => {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  const result = await model.generateContent(prompt);
  return result.response.text();
};

// 2. Text-only with context
const textOnlyWithContext = async (prompt) => {
  return await textOnly(prompt);
};

// 3. Multimodal (text + image)
const multimodal = async (prompt, imageBase64) => {
  const model = genAI.getGenerativeModel({ model: "gemini-pro-vision" });

  const result = await model.generateContent([
    { text: prompt },
    {
      inlineData: {
        mimeType: "image/jpeg",
        data: imageBase64,
      },
    },
  ]);

  return result.response.text();
};

// 4. Multi-turn chat using Gemini Flash
const chat = async (chatHistory, prompt) => {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  const chatSession = model.startChat({
    history: chatHistory,
  });
  const result = await chatSession.sendMessage(prompt);
  return result.response.text();
};

// 5. Google Maps lookup by location name
const getMapLocation = async (place) => {
  const apiKey = process.env.MAPS_API_KEY;
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(place)}&key=${apiKey}`;
  const response = await axios.get(url);
  const result = response.data.results[0];

  if (!result) return null;

  return {
    lat: result.geometry.location.lat,
    lng: result.geometry.location.lng,
    address: result.formatted_address,
    mapUrl: `https://www.google.com/maps?q=${result.geometry.location.lat},${result.geometry.location.lng}`
  };
};

module.exports = {
  textOnly,
  textOnlyWithContext,
  multimodal,
  chat,
  getMapLocation // ✅ Export the new function
};
