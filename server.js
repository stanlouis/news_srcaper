const express = require("express");
const logger = require("morgan");
const mongoose = require("mongoose");

// Our scraping tools
// Axios is a promised-based http library, similar to jQuery's Ajax method
// It works on the client and on the server
const axios = require("axios");
const cheerio = require("cheerio");

// Require all models
const db = require("./models");

const PORT = 4000;

// Initialize Express
const app = express();

// Configure middleware

// Use morgan logger for logging requests
app.use(logger("dev"));
// For handling form submissions
app.use(express.urlencoded({ extended: true }));

// Use express.static to serve the public folder as a static directory
app.use(express.static("public"));

// handlebars view engine init
const exphbs = require("express-handlebars");
app.engine("handlebars", exphbs({
  defaultLayout: "main"
}));
app.set("view engine", "handlebars");

// Connect to the Mongo DB
mongoose
  .connect("mongodb://localhost:27017/mongoHeadlines", {
    useNewUrlParser: true
  })
  .then(() => console.log("Connected to MongoDB..."))
  .catch(err => console.log("Could not connect to MongoDB", err));


//Get request to home
app.get('/', (req, res) => {
  res.render('index')
})


// A GET route for scraping the nytimes website
app.get("/scrape", function(req, res) {
  // First, we grab the body of the html with request
  axios.get("https://www.nytimes.com/").then(function(response) {
    // Then, we load that into cheerio and save it to $ for a shorthand selector
    var $ = cheerio.load(response.data);

    // Now, we grab every h2 within an article tag, and do the following:
    $("article").each(function(i, element) {
      // Save an empty result object
      var result = {};

      // Add the text and href of every link, and save them as properties of the result object
      result.title = $(this).children("h2").text().replace(/\n/g,'').trim();
      result.summary = $(this).children(".summary").text().replace(/\n/g,'').trim();
      result.link = $(this).children("h2").children("a").attr("href");

      // Create a new Article using the `result` object built from scraping
      db.Article.create(result)
      .then(function(dbArticle) {
        // View the added result in the console
        console.log(dbArticle);
      })
      .catch(function(err) {
        // If an error occurred, send it to the client
        return res.json(err);
      });
    });

    // If we were able to successfully scrape and save an Article, send a message to the client
    res.send("Scrape Complete");
    res.redirect('/')
  });
});


// Start the server
app.listen(PORT, function() {
  console.log("App running on port " + PORT + "!");
});