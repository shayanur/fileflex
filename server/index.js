// @shayanur
const express = require("express");
const crypto = require('crypto');
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const dotenv = require("dotenv");
const multer = require("multer");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { GetObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const app = express();
const mongoose = require("mongoose");
const User = require("./models/user");

app.use(express.json());
dotenv.config();
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
const bucketName = process.env.BUCKET_NAME;
const region = process.env.BUCKET_REGION;
const accessKeyId = process.env.ACCESS_KEY;
const secretAccessKey = process.env.SECRET_ACCESS_KEY;
const s3Client = new S3Client({
    region,
    credentials: {
        accessKeyId,
        secretAccessKey
    }
})

const mongodbURL = process.env.mongodbURL;
async function main() {
    try {

        await mongoose.connect(mongodbURL, { dbName: "fileflash" });
        console.log("***connected***");
    } catch (err) {
        console.log(err);
    }
}
main();
const jwtsecretkey = "@ADBKSM If the opposition disarms, well and good. If it refuses to disarm, we shall disarm it ourselves.@";

app.get("/", (req, res) => {
    const myobject = {
        working: "yes",
        myarray: [`Response time ${Date.now()}`]
    }
    const myjson = JSON.stringify(myobject)
    res.send(myjson);
})

app.post("/signup", async (req, res) => {
    const body = req.body;
    console.log("signup body:", body);
    const generateHash = (input) => {
        const hash = crypto.createHash('sha256');
        hash.update(input);
        return hash.digest('hex');
    }
    // @comradekaushik SHA-256 is a cryptographic hash function that produces a 64-character hexadecimal string.
    const hashingpasswords = async (password) => {
        try {
            const saltRounds = 10;
            const salt = await bcrypt.genSalt(saltRounds);
            const hashedPassword = await bcrypt.hash(`${password}`, salt);
            return hashedPassword;
        } catch (err) {
            console.error('Error while hashing passwords with bcypt in /signup path:', err);

        }
    }
    const hashedPassword = await hashingpasswords(req.body.password);
    const data = [
        {
            "username": req.body.username,
            "userid": generateHash(req.body.username),
            "email": req.body.email,
            "password": hashedPassword,
        },
    ];

    try {
        const result = await User.findOne({ username: req.body.username.toLowerCase() });
        if (result) {
            res.json({ alreadyregistered: 'true', registered: 'false' });
        }
        const insertedresult = await User.insertMany(data);
        if (insertedresult) {
            res.json({ registered: 'true', username: data[0].username, userid: data[0].userid, message: "user was sucessfully registered" });
        }
    } catch (err) {
        console.error(err);
        res.status(500).send("path: /signup Error inserting users , A mongoose or mongodb error encontered ");
    }

    try {
        await transporter.sendMail({
            from: '"fileflash app" <adityakm5500@gmail.com>',
            to: body.email,
            subject: "Signup Successful 🎉",
            text: `Welcome ${body.username || "User"}! Your signup was successfull.`,
            html: `
                <h3>Welcome ${body.username || "User"} 🎉<h3>
                <p>We're excited to have you onboard. Your signup was succesfull!</p>
                <p><b>Date:</b> ${new Date().toLocaleString()}</p>
            `
        });
        // res.json({ signup: "successful", emailSent: true });
    } catch (err) {
        console.error("Email error: ", err);
        // res.status(500).json({ signup: "failed", error: "Email not sent" });
    }
});

app.post("/login", async (req, res) => {
    const userdatasent = {
        email: req.body.email || "empty",
        password: req.body.password || "empty",
    }
    if (userdatasent.email === "empty" || userdatasent.password === "empty") {
        return res.status(400).json({ error: "Username and password are required." });
    }
    const user = await User.findOne({ email: req.body.email.toLowerCase() });
    if (!user) {
        return res.status(404).json({ error: "User not found" });
    }
    async function verifyPassword(inputPassword, storedHashedPassword) {
        try {
            const isMatch = await bcrypt.compare(inputPassword, storedHashedPassword);
            return isMatch;
        } catch (error) {
            console.error('Password comparison error:', error);
            return false;
        }
    }
    const isUserAuthentic = await verifyPassword(userdatasent.password, user.password);
    if (isUserAuthentic) {
        const token = jwt.sign(
            { email: user.email, username: user.username },
            jwtsecretkey,
            { expiresIn: "1h" }
        );
        try {
            const updatedUser = await User.findOneAndUpdate(
                { email: user.email },
                { accesstoken: token },
                { new: true }
            );
            if (!updatedUser) {
                console.log("User not found");
            } else {
                console.log("Access token updated:", updatedUser);
            }
        } catch (err) {
            console.error("Error updating access token:", err);
            return res.status(401).json({ error: "Error encountered while signing up the user" });
        }
        return res.json({ message: "Login successful", token });
    }
    else {
        return res.status(401).json({ error: "Invalid credentials" });
    }
})

app.post("/upload/file",upload.single('file'), async(req, res) => {
    const generateHash = (input) => {
        const hash = crypto.createHash('sha256');
        hash.update(input);
        return hash.digest('hex');
    }
    const generateFileName = (bytes = 32) => crypto.randomBytes(bytes).toString('hex');
    const currentTime = new Date();
    const timeString = currentTime.toISOString()();
    try {
        const file = req.file;
        if (!file) {
            return res.status(400).json({"message" : "No file uploaded"});
        }
        const description = req.body.description;
        const email = req.body.email;
        if(!email){
            return res.status(400).json({"message" : "No Email Provided"});
        }
        const fileName = `${generateHash(email)}${timeString}${generateFileName()}${Math.round(Math.random()*999)}`;
        const fileBuffer = file.buffer;
        const fileid = `${generateFileName(48)}${generateHash(`${email}${timeString}`)}${Math.round(Math.random()*9999)}`;
        const uploadParams = {
            Bucket: bucketName,
            Body: fileBuffer,
            Key: fileName,
            ContentType: file.mimetype
        };
        await s3Client.send(new PutObjectCommand(uploadParams));
        const fileDoc = await File.insertMany([{ 
            email: email,
            description: description,
            fileid: fileid,
            filename : fileName,
        }]);
        res.send(fileDoc);
    } catch (err) {
        console.error(err);
        res.status(500).send("Error Uploading files");
    }
})



