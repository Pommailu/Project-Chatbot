const axios = require("axios");

const LINE_MESSAGING_API = "https://api.line.me/v2/bot";
const LINE_HEADER = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${process.env.CHANNEL_ACCESS_TOKEN}`,
};

// Standard reply with message(s)
const reply = async (replyToken, messages) => {
  await axios.post(
    `${LINE_MESSAGING_API}/message/reply`,
    {
      replyToken: replyToken,
      messages: messages,
    },
    { headers: LINE_HEADER }
  );
};

// Reply with a location (Google Maps pin)
const replyLocation = async (replyToken, title, address, lat, lng) => {
  const locationMessage = {
    type: "location",
    title: title,
    address: address,
    latitude: lat,
    longitude: lng,
  };

  await reply(replyToken, [locationMessage]);
};

// Fetch image binary from LINE content API
const getImageBinary = async (messageId) => {
  const response = await axios.get(
    `${LINE_MESSAGING_API}/message/${messageId}/content`,
    {
      responseType: "arraybuffer",
      headers: LINE_HEADER,
    }
  );
  return response.data;
};

module.exports = {
  reply,
  replyLocation, // ✅ export location reply
  getImageBinary,
};
