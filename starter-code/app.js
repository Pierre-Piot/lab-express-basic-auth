const express        = require("express");
const path           = require("path");
const logger         = require("morgan");
const cookieParser   = require("cookie-parser");
const bodyParser     = require("body-parser");
const mongoose       = require("mongoose");
const app            = express();
const authRoutes     = require('./routes/authRoutes');
const siteRoutes     = require('./routes/siteRoutes');
const expressLayouts = require('express-ejs-layouts');

const session       = require("express-session");
const bcrypt        = require("bcrypt");
const passport      = require("passport");
const LocalStrategy = require("passport-local").Strategy;

const User          = require('./models/user')
const flash         = require("connect-flash");


// Controllers
app.use(session({
  secret: "my-secret-method",
  resave: true,
  saveUninitialized: true
}));



// Mongoose configuration
mongoose.Promise = global.Promise;
mongoose.connect("mongodb://localhost/basic-auth")
.then(() => console.log("successfully connected to MongoDB"))
.catch(err => console.log(err))

// Middlewares configuration
app.use(logger("dev"));

passport.serializeUser((user, cb) => {
  cb(null, user.id);
});

passport.deserializeUser((id, cb) => {
  User.findOne({ "_id": id }, (err, user) => {
    if (err) { return cb(err); }
    cb(null, user);
  });
});


app.use(flash());
passport.use(new LocalStrategy({
  passReqToCallback: true
}, (req, username, password, next) => {
  User.findOne({ username }, (err, user) => {
    if (err) {
      return next(err);
    }
    if (!user) {
      return next(null, false, { message: "Incorrect username" });
    }
    if (!bcrypt.compareSync(password, user.password)) {
      return next(null, false, { message: "Incorrect password" });
    }

    return next(null, user);
  });
}));


app.use(passport.initialize());
app.use(passport.session());

// View engine configuration
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
app.set('layout', 'layouts/main-layout');
app.use(express.static(path.join(__dirname, "public")));

// Access POST params with body parser
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(expressLayouts);
// Authentication
app.use(cookieParser());

// Routes
app.use('/', authRoutes);
app.use('/', siteRoutes);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  const err = new Error("Not Found");
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("error");
});

module.exports = app;
