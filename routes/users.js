'use strict';

const express = require('express');
const mongoose = require('mongoose');

const Users = require('../models/users');

const router = express.Router();

////////post a single item/////

router.post('/users', (req, res, next) => { 
  
  const {fullname,username, password} = req.body;
  const newUser = {fullname,username, password};
  Users.create(newUser)
    .then(result => {
      res.location(`${req.originalUrl}/${result.id}`).status(201).json(result);
    });
  return Users.hashPassword(password)
    .then(digest => {
      const newUser = {
        username,
        password: digest,
        fullname
      };
      return Users.create(newUser);
    })
    .then(result => {
      return res.status(201).location(`/api/users/${result.id}`).json(result);
    })
    .catch(err => {
      if (err.code === 11000) {
        err = new Error('The username already exists');
        err.status = 400;
      }
      next(err);
    });
});



module.exports = router;