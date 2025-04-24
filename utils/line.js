const axios = require("axios");

const LINE_MESSAGING_API = "https://api.line.me/v2/bot";
const LINE_HEADER = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${process.env.CHANNEL_ACCESS_TOKEN}`,
};

class LINE {
  // Method to reply with a message
  async reply(token, payload) {
    await axios({
      method: "post",
      url: `https://api.line.me/v2/bot/message/reply`,
      headers: LINE_HEADER,
      data: {
        replyToken: token,
        messages: payload
      },
    });
  }

  // Method to reply with a location
  async replyLocation(replyToken, title, address, lat, lng) {
    const locationMessage = {
      type: "location",
      title: title,
      address: address,
      latitude: lat,
      longitude: lng,
    };
    await this.reply(replyToken, [locationMessage]);
  }

  // Method to get the binary content of an image
  async getImageBinary(messageId) {
    const originalImage = await axios({
      method: "get",
      headers: LINE_HEADER,
      url: `https://api-data.line.me/v2/bot/message/${messageId}/content`,
      responseType: "arraybuffer",
    });
    return originalImage.data;
  }
}

module.exports = new LINE();
