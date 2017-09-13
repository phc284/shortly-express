var express = require('express');
var util = require('./lib/utility');
var partials = require('express-partials');
var bodyParser = require('body-parser');


var db = require('./app/config');
var Users = require('./app/collections/users');
var User = require('./app/models/user');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var Click = require('./app/models/click');

var session = require('express-session');
var app = express();

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(partials());
// Parse JSON (uniform resource locators)
app.use(bodyParser.json());
// Parse forms (signup/login)
app.use(session({
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: true}));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));

var restrict = function(req, res, next) {
  // console.log('req session ', req.session.user)
  if (req.session.user) {
    next();
  } else {
    req.session.error = 'Access denied!';
    // console.log('res.req: ', res.req)
    res.redirect('/login');
  }
};


app.get('/', restrict, function(req, res) {
  console.log('inside / route');
});

app.get('/create', restrict, function(req, res) {
  res.render('index');
});


app.get('/links', restrict, function(req, res) {
  Links.reset().fetch().then(function(links) {
    res.status(200).send(links.models);
  });
});

app.post('/links', function(req, res) {
  var uri = req.body.url;

  if (!util.isValidUrl(uri)) {
    console.log('Not a valid url: ', uri);
    return res.sendStatus(404);
  }

  new Link({ url: uri }).fetch().then(function(found) {
    if (found) {
      res.status(200).send(found.attributes);
    } else {
      util.getUrlTitle(uri, function(err, title) {
        if (err) {
          console.log('Error reading URL heading: ', err);
          return res.sendStatus(404);
        }

        Links.create({
          url: uri,
          title: title,
          baseUrl: req.headers.origin
        })
        .then(function(newLink) {
          res.status(200).send(newLink);
        });
      });
    }
  });
});

/************************************************************/
// Write your authentication routes here
/************************************************************/

app.get('/login', function(req, res) {
  res.render('login');
});

app.post('/signup', function(req, res) {
  if (req.body.username.length < 20 && req.body.password.length < 20) {
    new User({username: req.body.username, password: req.body.password})
    .fetch().then(function(found) {
      if (found) {
        res.status(200).send(found.attributes);
      } else {
        Users.create({
          username: req.body.username,
          password: req.body.password
        })
        .then(function(newUser) {
          console.log('response headers: ', res.headers);
          res.status(200).send(newUser);
        });
      }
    });
  } else {
    res.sendStatus(404);
  }
});


/************************************************************/
// Handle the wildcard route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/*', function(req, res) {
  new Link({ code: req.params[0] }).fetch().then(function(link) {
    if (!link) {
      res.redirect('/');
    } else {
      var click = new Click({
        linkId: link.get('id')
      });

      click.save().then(function() {
        link.set('visits', link.get('visits') + 1);
        link.save().then(function() {
          return res.redirect(link.get('url'));
        });
      });
    }
  });
});

module.exports = app;
