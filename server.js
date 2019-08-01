'use strict';

var express = require('express');
var mongo = require('mongodb');
var mongoose = require('mongoose');
var dns = require('dns');
var bodyParser = require('body-parser')


var cors = require('cors');

var app = express();

// Basic Configuration 
var port = process.env.PORT || 3000;

/** this project needs a db !! **/ 
// mongoose.connect(process.env.MONGOLAB_URI);



mongoose.connect(process.env.MONGOLAB_URI);

app.use(cors());

/** this project needs to parse POST bodies **/
// you should mount the body-parser here
app.use(bodyParser.urlencoded({extended: false}));


app.use('/public', express.static(process.cwd() + '/public'));


app.get('/', function(req, res){
  res.sendFile(process.cwd() + '/views/index.html');
});

//Setup document schema for DB.
var Schema = mongoose.Schema;

var urlSchema = new Schema({
  original_url: { type: String, required: true, unique: true },
  short_url: {type: Number, unique: true}
})

var urlObj = mongoose.model("urlObj", urlSchema)

//Create a function for adding objects.  Probably not necessary as this is only going to be called once.
//Need to add fields for original and short URLs.
var addObj = function(addURL, sURL) {
  console.log(addURL)
  urlObj.create({
    original_url: addURL,
    short_url: sURL
  }, function (err, data) {
    if (err) {
      console.log(err.errmsg)
    }
    else { console.log("Successfully added.")}
  }
  )
}



// Define our POST request here.
app.post("/api/shorturl/new", function (req, res, done) {
  let regex = /^https:\/\/|^http:\/\//
  const urlB = req.body.url
  //The REGEX will ensure compliancy with the http(s):// requirement.
  if (!urlB.match(regex)) {
    res.json({"error":"invalid URL"});
  }
  else {
    //Much of these are asynchronous requests that I found (I'm not an expert) most suited to be in the post request itself.
    dns.lookup(urlB.replace(regex, ""), function (err, address, family) {
    if (err) {
      res.json({"error":"invalid URL"});
    }
    else {
      //If the DNS lookup is ok, we'll actually search the MongoDB for the url itself and return data.
      //Essentially if not found, we'll randomize a short_url and then add the object, and return the json notation.
      urlObj.find({original_url: urlB}, function (err, data) {
        if (!data.length) {
          console.log(data)
          console.log("Entry not found.")
          var rURL = Math.floor(Math.random() * 5000)
          addObj(urlB, rURL)
          res.json({original_url: urlB, short_url: rURL});
        }
        else {
          //If found we'll just return our urlB from our body since it matched as well as the short URL from our MongoDB.
          console.log(data)
          res.json({original_url: urlB, short_url: data[0].short_url});
        }
      })
    }
  })
       }
});

//This is our GET request for sending users to the shortened URL.
//This is a pretty simple function that takes a params and redirects based on our MongoDB.
//If not found it should return the invalid URL call like the post request.
app.get("/api/shorturl/:shortURL", function (req,res) {
    var shortURL = req.params.shortURL;
  console.log(shortURL)
    urlObj.find({short_url: shortURL}, function (err, data) {
      if (!data.length) {
        console.log(data)
        res.json({"error":"invalid URL"});
      }
      else {
        console.log(data)
        res.redirect(data[0].original_url);
      }
    })
 })

app.listen(port, function () {
  console.log('Node.js listening ...');
});