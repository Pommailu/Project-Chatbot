const { GoogleGenerativeAI } = require("@google/generative-ai");
const axios = require("axios");

const genAI = new GoogleGenerativeAI(process.env.API_KEY);

// 🔧 Configuration for Gemini model
const GEMINI_MODEL = "gemini-1.5-flash-8b";
const geminiConfig = {
  temperature: 0.9,
  topP: 1,
  topK: 1,
  maxOutputTokens: 4096,
};

// 🔹 Text-only generation
const textOnly = async (prompt) => {
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
  const result = await model.generateContent(prompt);
  return result.response.text();
};

// 🔹 Chat with memory (General chat)
const chat = async (chatHistory, prompt) => {
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
  const chatSession = model.startChat({ history: chatHistory });
  const result = await chatSession.sendMessage(prompt);
  return result.response.text();
};

// 🔹 Multimodal (image + text)
const multimodal = async (prompt, imageBase64) => {
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
  const result = await model.generateContent([
    { text: prompt },
    {
      inlineData: {
        mimeType: "image/jpeg", // หรือ "image/png"
        data: imageBase64,
      },
    },
  ]);
  return result.response.text();
};

// 🔹 Google Maps API - Get Lat/Lng from place name
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
  };
};

// 🔹 Travel Expert Role Chat
const travelExpertChat = async (chatHistory, prompt) => {
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
  const chatSession = model.startChat({
    history: [
      {
        role: "user",
        parts: [
          {
            text: "คุณคือผู้เชี่ยวชาญด้านการท่องเที่ยวในประเทศไทย ช่วยแนะนำสถานที่ท่องเที่ยว อาหาร และกิจกรรมยอดนิยมตามความต้องการของผู้ใช้",
          },
        ],
      },
      ...chatHistory,
    ],
  });
  const result = await chatSession.sendMessage(prompt);
  return result.response.text();
};

module.exports = {
  textOnly,
  chat,
  multimodal,
  getMapLocation,
  travelExpertChat,
};
