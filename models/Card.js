const mongoose = require("mongoose");
const { Schema } = mongoose;

const cardSchema = new mongoose.Schema(
  {
    videoId: {
      type: String,
      required: true,
      index: true,
    },
    cards: [
      {
        time: Number,            // 影片時間軸
        content: String,         // 卡片文字（可包含連結）
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    versionKey: false, // 🔸 不要 __v
  }
);

module.exports = mongoose.model("Card", cardSchema);
