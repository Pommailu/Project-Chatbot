const { GoogleGenerativeAI } = require("@google/generative-ai");
const axios = require("axios");

const genAI = new GoogleGenerativeAI(process.env.API_KEY);

// 🔹 Text-only generation
const textOnly = async (prompt) => {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-8b" });
  const result = await model.generateContent(prompt);
  return result.response.text();
};

// 🔹 Chat with memory
const chat = async (chatHistory, prompt) => {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-8b" });
  const chatSession = model.startChat({ history: chatHistory });
  const result = await chatSession.sendMessage(prompt);
  return result.response.text();
};

// 🔹 Multimodal (image + text)
const multimodal = async (prompt, imageBase64) => {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-8b" });
  const result = await model.generateContent([
    { text: prompt },
    {
      inlineData: {
        mimeType: "image/jpeg", // or "image/png" if needed
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

// 🔹 Chat with Travel Expert Role
const travelExpertChat = async (chatHistory, prompt) => {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-8b" });
  const chatSession = model.startChat({
    history: [
      {
        role: "user",
        parts: [{ text: "คุณคือผู้เชี่ยวชาญด้านการท่องเที่ยวในประเทศไทย ช่วยแนะนำสถานที่ท่องเที่ยว อาหาร และกิจกรรมยอดนิยมตามความต้องการของผู้ใช้" }],
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
