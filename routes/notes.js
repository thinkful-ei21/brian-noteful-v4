'use strict';

const express = require('express');
const mongoose = require('mongoose');
const passport = require('passport');
const Note = require('../models/note');
const Folder = require('../models/folder');
const Tag = require('../models/tag');
const router = express.Router();

router.use('/', passport.authenticate('jwt', {session:false, failWithError:true  }));
/* ========== GET/READ ALL ITEMS ========== */
router.get('/', (req, res, next) => {
  const { searchTerm, folderId, tagId} = req.query;
  const userId = req.user.id;
  let filter = {userId};

  if (searchTerm) {
    // filter.title = { $regex: searchTerm, $options: 'i' };

    // Mini-Challenge: Search both `title` and `content`
    const re = new RegExp(searchTerm, 'i');
    filter.$or = [{ 'title': re }, { 'content': re }];
  }


  if (folderId) {
    filter.folderId = folderId;
  }

  if (tagId) {
    filter.tags = tagId;
  }

  Note.find(filter)
    .populate('tags')
    .sort({ updatedAt: 'desc' })
    .then(results => {
      res.json(results);
    })
    .catch(err => {
      next(err);
    });
});

/* ========== GET/READ A SINGLE ITEM ========== */
router.get('/:id', (req, res, next) => {
  const { id } = req.params;
  const userId = req.user.id;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error('The `id` is not valid');
    err.status = 400;
    return next(err);
  }

  Note.findOne({_id: id, userId})
    .populate('tags')
    .then(result => {
      if (result) {
        res.json(result);
      } else {
        next();
      }
    })
    .catch(err => {
      next(err);
    });
});

/* ========== POST/CREATE AN ITEM ========== */
router.post('/', (req, res, next) => {
  const { title, content, folderId, tags  = [] } = req.body;
  const userId = req.user.id;
  /***** Never trust users - validate input *****/
  if (!title) {
    const err = new Error('Missing `title` in request body');
    err.status = 400;
    return next(err);
  }

  // if (folderId && !mongoose.Types.ObjectId.isValid(folderId)) {
  //   const err = new Error('The `folderId` is not valid');
  //   err.status = 400;
  //   return next(err);
  // }

  // if (tags) {
  //   tags.forEach((tag) => {
  //     if (!mongoose.Types.ObjectId.isValid(tag)) {
  //       const err = new Error('The tags `id` is not valid');
  //       err.status = 400;
  //       return next(err);
  //     }
  //   });
  // }

  /////work in prgress///
  // if (folderId !== req.body.folderId){
  //   const err = new Error('you cannot edit this folder'); 
  //   err.status = 400;
  //   return next(err);
  // }
  
  function validateFolderId(folderId, userId) {
    if (folderId === undefined) {
      return Promise.resolve();
    }
    if (!mongoose.Types.ObjectId.isValid(folderId)) {
      const err = new Error('The `folderId` is not valid');
      err.status = 400;
      return Promise.reject(err);
    }
    return Folder.count({ _id: folderId, userId })
      .then(count => {
        if (count === 0) {
          const err = new Error('The `folderId` is not valid');
          err.status = 400;
          return Promise.reject(err);
        }
      });
  }
  function validateTagIds(tags, userId) {
    if (tags === undefined) {
      return Promise.resolve();
    }
    if (!Array.isArray(tags)) {
      const err = new Error('The `tags` must be an array');
      err.status = 400;
      return Promise.reject(err);
    }
    return Tag.find({ $and: [{ _id: { $in: tags }, userId }] })
      .then(results => {
        if (tags.length !== results.length) {
          const err = new Error('The `tags` array contains an invalid id');
          err.status = 400;
          return Promise.reject(err);
        }
      });
  }


  const newNote = { title, content, folderId, tags, userId };

  Note.create(newNote)
    .then(result => {
      res
        .location(`${req.originalUrl}/${result.id}`)
        .status(201)
        .json(result);
    })
    .catch(err => {
      next(err);
    });
});

/* ========== PUT/UPDATE A SINGLE ITEM ========== */
router.put('/:id', (req, res, next) => {
  const { id } = req.params;
  const { title, content, folderId, tags = [] } = req.body;
  const userId = req.user.id;
  /***** Never trust users - validate input *****/
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error('The `id` is not valid');
    err.status = 400;
    return next(err);
  }

  if (title === '') {
    const err = new Error('Missing `title` in request body');
    err.status = 400;
    return next(err);
  }

  if (folderId && !mongoose.Types.ObjectId.isValid(folderId)) {
    const err = new Error('The `folderId` is not valid');
    err.status = 400;
    return next(err);
  }

  if (tags) {
    const badIds = tags.map((tag) => !mongoose.Types.ObjectId.isValid(tag));
    if (badIds.length) {
      const err = new Error('The tags `id` is not valid');
      err.status = 400;
      return next(err);
    }
  }

  const updateNote = { title, content, folderId, tags, userId };

  Note.findOneAndUpdate({_id: id, userId}, { new: true })
    .then(result => {
      if (result) {
        res.json(result);
      } else {
        next();
      }
    })
    .catch(err => {
      next(err);
    });
});

/* ========== DELETE/REMOVE A SINGLE ITEM ========== */
router.delete('/:id', (req, res, next) => {
  const { id } = req.params;
  const userId = req.user.id;
  /***** Never trust users - validate input *****/
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error('The `id` is not valid');
    err.status = 400;
    return next(err);
  }

  Note.findOneAndRemove({_id: id, userId})
    .then(() => {
      res.sendStatus(204);
    })
    .catch(err => {
      next(err);
    });
});

router.use('/', passport.authenticate('jwt', { session: false, failWithError: true }));

module.exports = router;