const mongoose = require("mongoose");
const Schema = mongoose.Schema;


const userSchema = new Schema({
    username: {
      type: String,
      trim: true,
      required: true,
      unique: true,
    },
    userid:{
        type: String,
        trim: true,
        required: true,
        unique: true,

    },
    email: {
      type: String,
      trim: true,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      trim: true,
      required: true,
      minLength: 6,
    },
    accesstoken: {
      type: String,
      trim: true,
      default: 'defaultaccesstoken',
    },
    refreshtoken: {
        type: String,
        trim: true,
        default: 'defaultrefreshtoken',
    },
});

const User = mongoose.model('usersdata', userSchema);
module.exports = User;