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

const PORT = process.env.PORT || 4000;

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
app.engine(
  "handlebars",
  exphbs({
    defaultLayout: "main"
  })
);
app.set("view engine", "handlebars");

// Connect to the Mongo DB
var MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/mongoHeadlines";
mongoose
  .connect(MONGODB_URI)
  .then(() => console.log("Connected to MongoDB..."))
  .catch(err => console.log("Could not connect to MongoDB", err));

//Get request to home
app.get("/", (req, res) => {
  res.render("index");
});

//Get request from save
app.get("/saved", (req, res) => {
  res.render("saved");
});

// A GET route for scraping the nytimes website
app.get("/api/fetch", function(req, res) {
  // First, we grab the body of the html with request
  axios.get("https://www.nytimes.com/").then(function(response) {
    // Then, we load that into cheerio and save it to $ for a shorthand selector
    var $ = cheerio.load(response.data);

    // Now, we grab every h2 within an article tag, and do the following:
    $("article").each(function(i, element) {
      // Save an empty result object
      var result = {};

      // Add the text and href of every link, and save them as properties of the result object
      result.title = $(this)
        .children("h2")
        .text()
        .replace(/\n/g, "")
        .trim();
      result.summary = $(this)
        .children(".summary")
        .text()
        .replace(/\n/g, "")
        .trim();
      result.link = $(this)
        .children("h2")
        .children("a")
        .attr("href");

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
    res.redirect("/");
  });
});


// Route for getting all unsaved Articles from the db
app.get("/api/articles/saved", (req, res) => {
  // Grab every document in the Articles collection
  db.Article.find({saved:true})
  .then(function(dbArticle) {
    // If we were able to successfully find Articles, send them back to the client
    res.json(dbArticle);
  })
  .catch(function(err) {
    // If an error occurred, send it to the client
    res.json(err);
  });
});

// Route for getting all unsaved Articles from the db
app.get("/api/articles/unsaved", (req, res) => {
  // Grab every document in the Articles collection
  db.Article.find({saved:false})
  .then(function(dbArticle) {
    // If we were able to successfully find Articles, send them back to the client
    res.json(dbArticle);
  })
  .catch(function(err) {
    // If an error occurred, send it to the client
    res.json(err);
  });
});

app.get("/api/clear", (req, res) => {
  db.Article.remove({}, err => {
    console.log("collection removed");
  });
  res.redirect("/");
});

// Route for grabbing a specific Article by id, populate it with it's note
app.get("/api/articles/:id", function(req, res) {
  // Using the id passed in the id parameter, prepare a query that finds the matching one in our db...
  db.Article.findOne({ _id: req.params.id })
  // ..and populate all of the notes associated with it
      .populate("note")
      .then(function(dbArticle) {
    // If we were able to successfully find an Article with the given id, send it back to the client
    res.json(dbArticle);
  })
  .catch(function(err) {
    // If an error occurred, send it to the client
    res.json(err);
  });
});


app.post("/api/notes/", function(req, res) {
  // Create a new note and pass the req.body to the entry
  console.log("note", req.body)
  db.Note.create(req.body)
    .then(function(dbNote) {
      return db.Article.findOneAndUpdate({ _id: req.body._headlineId }, { note: dbNote._id }, { new: true });
    })
    .then(function(dbArticle) {
      res.json(dbArticle);
    })
    .catch(function(err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});

app.put("/api/headlines/:id", function(req, res) {
  // Use the article id to find and update its saved boolean
  db.Article.findOneAndUpdate({ _id: req.params.id }, { saved: true })
    .then(function(dbArticle) {
      // If we were able to successfully update an Article, send it back to the client
      res.json(dbArticle);
    })
    .catch(function(err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});


app.delete("/api/headlines/:id", function(req, res) {
  db.Article.deleteOne({_id: req.params.id}).then(function(dbArticle) {
    db.Article.findOneAndUpdate({_id: req.params.id}, {saved: true},
        {new: true});
    console.log("saved" + req.params.id).catch(function(err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
  });

});
// Start the server
app.listen(PORT, function() {
  console.log("App running on port " + PORT + "!");
});
