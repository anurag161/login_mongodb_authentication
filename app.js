//jshint esversion:6
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const md5 = require("md5");
const bcrypt = require("bcrypt");
const saltRounds = 10;
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const findOrCreate = require("mongoose-findorcreate");
// const encrypt = require("mongoose-encryption");

const app = express();

app.use(express.static("public")); // to serve the atatic files
app.set("view engine", "ejs"); // to render the dynamic pages
app.use(
  bodyParser.urlencoded({
    // to parse the URL-encoded data for request body
    extended: true,
  })
); //handles form submissions  parse the data sent from HTML forms

app.use(
  session({
    secret: "Our little secret",
    resave: false,
    saveUninitialized: true,
  })
);

app.use(passport.initialize());
app.use(passport.session());

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
  password: String,
  googleId: String,
  secret: String,
});

// userSchema.plugin(encrypt, {secret:process.env.SECRET, encryptedFields: ["password"]});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);
const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function (user, cb) {
  process.nextTick(function () {
    return cb(null, {
      id: user.id,
      username: user.username,
      picture: user.picture,
    });
  });
});

passport.deserializeUser(function (user, cb) {
  process.nextTick(function () {
    return cb(null, user);
  });
});

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      callbackURL: "http://localhost:5000/auth/google/secrets",
      userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
    },
    function (accessToken, refreshToken, profile, cb) {
      console.log(profile);
      User.findOrCreate({ googleId: profile.id }, function (err, user) {
        return cb(err, user);
      });
    }
  )
);

app.get("/", async (req, res) => {
  res.render("home");
});

app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile"] })
);

app.get(
  "/auth/google/secrets",
  passport.authenticate("google", { failureRedirect: "/login" }),
  function (req, res) {
    // Successful authentication, redirect home.
    res.redirect("/secrets");
  }
);

app.get("/login", async (req, res) => {
  res.render("login");
});

app.get("/register", async (req, res) => {
  res.render("register");
});

app.get("/secrets", async (req, res) => {
  if (req.isAuthenticated()) {
    res.render("secrets");
  } else {
    res.redirect("/login");
  }
});

app.get("/submit", async (req, res) => {
  if (req.isAuthenticated()) {
    res.render("submit");
  } else {
    res.redirect("/login");
  }
});

app.get("/secrets", async (req, res) => {
  try {
    const foundUsers = await User.find({ secret: { $ne: null } });
    if (foundUsers) {
      res.render("secrets", { usersWithSecrets: foundUsers });
    } else {
      res.render("secrets", { usersWithSecrets: [] }); // Pass an empty array if no users with secrets are found
    }
  } catch (err) {
    console.log(err);
    res.status(500).send("Internal Server Error");
  }
});

app.post("/submit", async (req, res) => {
  try {
    const submittedSecret = req.body.secret;

    console.log(req.user.id);

    const foundUser = await User.findById(req.user.id);
    if (foundUser) {
      foundUser.secret = submittedSecret;
      await foundUser.save(); // Use await to wait for the promise to resolve
      res.redirect("/secrets");
    }
  } catch (err) {
    console.log(err);
  }
});

app.get("/logout", function (req, res, next) {
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
    res.redirect("/");
  });
});

// app.post("/register", async(req,res) => {
//     try{

//         // bcrypt.hash(myPlaintextPassword, saltRounds, function(err, hash) {

//         // });
//         const hash = await bcrypt.hash(req.body.password, saltRounds);
//         const newUser = new User({
//             email: req.body.username,
//             password: hash
//         })
//         newUser.save();
//         res.render("secrets");
//     }catch(err){
//          console.error(err);
//          res.status(500).send("Internal server error");
//     }
// });

// app.post("/login", async(req, res)=>{

//     try{
//         const username = req.body.username;
//         const password = req.body.password;

//         const foundUser = await User.findOne({email:username});

//         if(foundUser){
//             const result = await bcrypt.compare(password, foundUser.password);
//             if (result==true){
//                 res.render("secrets");
//             }

//         }
//     }catch(err){
//         console.error(err);
//         res.status(500).send("internal server error");
//     }

// })

app.post("/register", async (req, res) => {
  try {
    const user = await User.register(
      { username: req.body.username },
      req.body.password
    );

    passport.authenticate("local")(req, res, function () {
      res.redirect("/secrets");
    });
  } catch (err) {
    console.error(err);
    res.redirect("/register");
  }
});

app.post("/login", async (req, res) => {
  try {
    const user = new User({
      username: req.body.username,
      password: req.body.password,
    });

    req.login(user, (err) => {
      if (err) {
        console.error(err);
        res.status(500).send("Internal Server Error");
      } else {
        passport.authenticate("local")(req, res, () => {
          res.redirect("/secrets");
        });
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});

app.listen(5000, function () {
  console.log("server is running at port 5000.");
});
