//jshint esversion:6
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const encrypt = require("mongoose-encryption");

const app = express();

app.use(express.static("public"));// to serve the atatic files
app.set('view engine', 'ejs');// to render the dynamic pages
app.use(bodyParser.urlencoded({ // to parse the URL-encoded data for request body
    extended: true,
}));//handles form submissions  parse the data sent from HTML forms

mongoose
    .connect("mongodb://127.0.0.1:27017/userDB", {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
    .then((data) => {
      console.log(`Mongodb connected with server: ${data.connection.host}`);
    });


const userSchema = new mongoose.Schema({
    email: String,
    password: String
});


userSchema.plugin(encrypt, {secret:process.env.SECRET, encryptedFields: ["password"]});

const User = new mongoose.model("User", userSchema);


app.get("/", async(req, res) =>{
    res.render("home");
});

app.get("/login", async(req, res) =>{
    res.render("login");
});

app.get("/register", async(req, res) =>{
    res.render("register");
});

app.post("/register", async(req,res) => {
    try{
    const newUser = new User({
        email: req.body.username,
        password: req.body.password
    })
    newUser.save();
    res.render("secrets");
    }catch(err){
         console.error(err);
         res.status(500).send("Internal server error");
    }
});


app.post("/login", async(req, res)=>{

    try{
        const username = req.body.username;
        const password = req.body.password;

        const foundUser = await User.findOne({email:username});

        if(foundUser){
            if (foundUser.password = password){
                res.render("secrets");
            }
        }
    }catch(err){
        console.error(err);
        res.status(500).send("internal server error");
    }

})


app.listen(3000, function(){
    console.log("server is running at port 3000.")
});