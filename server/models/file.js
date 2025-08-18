const mongoose = require("mongoose");
const Schema = mongoose.Schema;


const fileSchema = new Schema({
    filename: {
        type: String,
        trim: true,
        required: true,
        unique: true,
    },
    fileid: {
        type: String,
        trim: true,
        required: true,
        unique: true,
    },
    description: {
        type: String,
        trim: true,
    },
    expiry: {
        type: String,
        trim: true,
    },
    email: {
        type: String,
        trim: true,
        required: true,
        
    },

});

const File = mongoose.model('filesdata', fileSchema);
module.exports = File;