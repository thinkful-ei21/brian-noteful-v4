'use strict';

const options = {session: false, failWithError: true};
const passport = require('passport');
const localAuth = passport.authenticate('local', options);

const {JWT_SECRET, JWT_EXPIRY} = require('../config');

const jwt = require('jsonwebtoken');
const express = require('express');
const router = express.Router();
const jwtAuth = passport.authenticate('jwt', { session: false, failWithError: true });
//const config = require('config');


function createAuthToken (user) {
  return jwt.sign({ user }, JWT_SECRET, {
    subject: user.username,
    expiresIn: JWT_EXPIRY
  });
}

router.post('/login', localAuth, function (req, res) {
  const authToken = createAuthToken(req.user);
  res.json({ authToken });
});

router.post('/refresh', jwtAuth, (req, res) => {
  const authToken = createAuthToken(req.user);
  res.json({ authToken });
});

module.exports = router;