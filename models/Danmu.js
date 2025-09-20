const mongoose = require("mongoose");
const { Schema } = mongoose;

const danmuSchema = new mongoose.Schema(
{
  videoId: String,
  danmus:[
    {
        text: String,
        time: String,
        createdAt: { type: Date, default: Date.now },
    },
  ]
},
{
    versionKey:false
});

module.exports = mongoose.model("Danmu", danmuSchema);