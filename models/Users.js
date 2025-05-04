const mongoose = require("mongoose");
// 使用解構物件取得mongoose裡面的Schema
const { Schema } = mongoose;

const UsersSchema = new Schema({
    // 也可以寫name: { type: String },
    name: {
      type:String,
      required:true
    },
    email: {
      type:String,
      required:true
    },
    password:{
      type:String,
      required:true
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    isManger:{
      type:Boolean,
      default:false
    },
  },{
    versionKey:false,
  });

  module.exports = mongoose.model('Users', UsersSchema);

