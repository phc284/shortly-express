var db = require('../config');
var bcrypt = require('bcrypt-nodejs');
var Promise = require('bluebird');



var User = db.Model.extend({
  tableName: 'users',

  initialize: function () {
    this.on('creating', function (model, attrs, options) {
      //create the salt
      var salt = bcrypt.genSaltSync();
      //create hash with salt added to front
      var hash = bcrypt.hashSync(model.attributes.password, salt);
      //change this models password to the salt+hash password
      model.attributes.password = hash;

    });
  }

});

module.exports = User;
