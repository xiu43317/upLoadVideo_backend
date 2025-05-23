const mongoose = require("mongoose");
// 使用解構物件取得mongoose裡面的Schema
const { Schema } = mongoose;

const VideosSchema = new Schema({
    name: {
      type:String,
      required:true
    },
    fileName: {
        type:String,
        require:true
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },{
    versionKey:false,
  });

  module.exports = mongoose.model('Videos', VideosSchema);