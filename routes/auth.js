'use strict';

const options = {session: false, failWithError: true};
const passport = require('passport');
const localAuth = passport.authenticate('local', options);

const express = require('express');
const router = express.Router();


router.post('/login', localAuth, function (req, res) {
  return res.json(req.user);
});

module.exports = router;