'use strict';

const chai = require('chai');
const chaiHttp = require('chai-http');
const mongoose = require('mongoose');
const express = require('express');
const seedUsers = require('../db/seed/users');
const User = require('../models/users');
const app = require('../server');
const Folder = require('../models/folder');
const seedFolders = require('../db/seed/folders');
const { TEST_MONGODB_URI } = require('../config');
const jwt = require('jsonwebtoken');
const {JWT_SECRET, JWT_EXPIRY} = require('../config');

chai.use(chaiHttp);
const expect = chai.expect;

describe('Noteful API - Folders', function () {

  before(function () {
    return mongoose.connect(TEST_MONGODB_URI)
      .then(() => mongoose.connection.db.dropDatabase());
  });

  let token;
  let user;

 
  beforeEach(function () {
    return Promise.all([
      User.insertMany(seedUsers),
      Folder.insertMany(seedFolders),
      Folder.createIndexes()
    ])
      .then(([users]) => {
        user = users[2];
        token = jwt.sign({ user }, JWT_SECRET, { subject: user.username });
      });
  });




  afterEach(function () {
    return mongoose.connection.db.dropDatabase();
  });

  after(function () {
    return mongoose.disconnect();
  });
  ////////////////////////////only copied test///////////////
  describe('GET /api/folders', function () {
    it('should return the correct number of folders', function () {
      const dbPromise = Folder.find({ userId: user.id });
      const apiPromise = chai.request(app)
        .get('/api/folders')
        .set('Authorization', `Bearer ${token}`); // <<== Add this

      return Promise.all([dbPromise, apiPromise])
        .then(([data, res]) => {
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.a('array');
          //expect(res.body).to.have.length(data.length);
          res.body.forEach(function (item) {
            expect(item).to.be.a('object');
            expect(item).to.have.keys('id', 'name', 'userId', 'createdAt', 'updatedAt');  // <<== Update assertion
          });
        });
    });
  });

  ////////////////other tests////////////////////
  describe.skip('GET /api/folders', function () {

    it('should return a list sorted by name with the correct number of folders', function () {
      // return Promise.all([
      //   Folder.find().sort('name'),
      //   chai.request(app).get('/api/folders')
      // ])
      const dbPromise = Folder.find({ userId: user.id});
      const apiPromise = chai.request(app)
        .then(([data, res]) => {
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.a('array');
          expect(res.body).to.have.length(data.length);
        });
    });

    it('should return a list with the correct fields and values', function () {
      return Promise.all([
        Folder.find().sort('name'),
        chai.request(app).get('/api/folders')
      ])
        .then(([data, res]) => {
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.a('array');
          expect(res.body).to.have.length(data.length);
          res.body.forEach(function (item, i) {
            expect(item).to.be.a('object');
            expect(item).to.have.all.keys('id', 'name', 'createdAt', 'updatedAt');
            expect(item.id).to.equal(data[i].id);
            expect(item.name).to.equal(data[i].name);
            expect(new Date(item.createdAt)).to.eql(data[i].createdAt);
            expect(new Date(item.updatedAt)).to.eql(data[i].updatedAt);
          });
        });
    });

  });

  describe('GET /api/folders/:id', function () {

    it('should return correct folder', function () {
      let data;
      console.log(user);
      return Folder.findOne({userId:user.id})
        .then(_data => {
          data = _data;
          console.log(data);
          return chai.request(app).get(`/api/folders/${data.id}`)
            .set('Authorization', `Bearer ${token}`);
        })
        
        .then((res) => {
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.an('object');
          expect(res.body).to.have.all.keys('id', 'name', 'createdAt', 'updatedAt', 'userId');
          expect(res.body.id).to.equal(data.id);
          expect(res.body.name).to.equal(data.name);
          expect(new Date(res.body.createdAt)).to.eql(data.createdAt);
          expect(new Date(res.body.updatedAt)).to.eql(data.updatedAt);
        });
    });

    it('should respond with a 400 for an invalid id', function () {
      return chai.request(app)
        .get('/api/folders/NOT-A-VALID-ID')
        .set('Authorization', `Bearer ${token}`)
        .then(res => {
          expect(res).to.have.status(400);
          expect(res.body.message).to.equal('The `id` is not valid');
        });
    });

    it('should respond with a 404 for an ID that does not exist', function () {
      // The string "DOESNOTEXIST" is 12 bytes which is a valid Mongo ObjectId
      return chai.request(app)
        .get('/api/folders/DOESNOTEXIST')
        .set('Authorization', `Bearer ${token}`)
        .then(res => {
          expect(res).to.have.status(404);
        });
    });

  });

  describe('POST /api/folders', function () {

    it('should create and return a new item when provided valid data', function () {
      const newItem = { name: 'newFolder' };
      let body;
      return chai.request(app)
        .post('/api/folders')
        .set('Authorization', `Bearer ${token}`)
        .send(newItem)
        .then(function (res) {
          body = res.body;
          expect(res).to.have.status(201);
          expect(res).to.have.header('location');
          expect(res).to.be.json;
          expect(body).to.be.a('object');
          expect(body).to.have.all.keys('id', 'name', 'createdAt', 'updatedAt','userId' );
          return Folder.findById(body.id);
        })
        .then(data => {
          expect(body.id).to.equal(data.id);
          expect(body.name).to.equal(data.name);
          expect(new Date(body.createdAt)).to.eql(data.createdAt);
          expect(new Date(body.updatedAt)).to.eql(data.updatedAt);
        });
    });

    it('should return an error when missing "name" field', function () {
      const newItem = { 'foo': 'bar' };
      return chai.request(app)
        .post('/api/folders')
        .send(newItem)
        .set('Authorization', `Bearer ${token}`)
        .then(res => {
          expect(res).to.have.status(400);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body.message).to.equal('Missing `name` in request body');
        });
    });

    it('should return an error when given a duplicate name', function () {
      return Folder.findOne({userId: user.id})
        .then(data => {
          const newItem = { name: data.name };
          return chai.request(app).post('/api/folders').send(newItem)
            .set('Authorization', `Bearer ${token}`);
        })
        .then(res => {
          expect(res).to.have.status(400);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body.message).to.equal('Folder name already exists');
        });
    });

  });

  describe('PUT /api/folders/:id', function () {

    it('should update the folder', function () {
      const updateItem = { name: 'Updated Name' };
      let data;
      return Folder.findOne({userId: user.id})
        .then(_data => {
          data = _data;
          return chai.request(app).put(`/api/folders/${data.id}`).send(updateItem)
            .set('Authorization', `Bearer ${token}`);
        })
        .then(function (res) {
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body).to.have.all.keys('id', 'name', 'createdAt', 'updatedAt','userId');
          expect(res.body.id).to.equal(data.id);
          expect(res.body.name).to.equal(updateItem.name);
          expect(new Date(res.body.createdAt)).to.eql(data.createdAt);
          // expect item to have been updated
          expect(new Date(res.body.updatedAt)).to.greaterThan(data.updatedAt);
        });
    });


    it('should respond with a 400 for an invalid id', function () {
      const updateItem = { name: 'Blah' };
      return chai.request(app)
        .put('/api/folders/NOT-A-VALID-ID')
        
        .send(updateItem)
        .set('Authorization', `Bearer ${token}`)
        .then(res => {
          expect(res).to.have.status(400);
          expect(res.body.message).to.equal('The `id` is not valid');
        });
    });

    it('should respond with a 404 for an id that does not exist', function () {
      const updateItem = { name: 'Blah' };
      // The string "DOESNOTEXIST" is 12 bytes which is a valid Mongo ObjectId
      return chai.request(app)
        .put('/api/folders/DOESNOTEXIST')
        
        .send(updateItem)
        .set('Authorization', `Bearer ${token}`)
        .then(res => {
          expect(res).to.have.status(404);
        });
    });

    it('should return an error when missing "name" field', function () {
      const updateItem = {};
      let data;
      return Folder.findOne({userId: user.id})
        .then(_data => {
          data = _data;
          return chai.request(app).put(`/api/folders/${data.id}`).send(updateItem)
            .set('Authorization', `Bearer ${token}`);
        })
        .then(res => {
          expect(res).to.have.status(400);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body.message).to.equal('Missing `name` in request body');
        });
    });

    it('should return an error when given a duplicate name', function () {
      
      return Folder.find({userId: user.id}).limit(2)
        .then(results => {
          const [item1, item2] = results;
          item1.name = item2.name;
          console.log(item1);
          console.log(item2);
          return chai.request(app)
            .put(`/api/folders/${item1.id}`)
            .send(item1)
            .set('Authorization', `Bearer ${token}`);
        })
        .then(res => {
          expect(res).to.have.status(400);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body.message).to.equal('Folder name already exists');
        });
    });

  });

  describe('DELETE /api/folders/:id', function () {

    it('should delete an existing document and respond with 204', function () {
      let data;
      return Folder.findOne({userId: user.id})
        .then(_data => {
          data = _data;
          return chai.request(app).delete(`/api/folders/${data.id}`)
            .set('Authorization', `Bearer ${token}`);
        })
        .then(function (res) {
          expect(res).to.have.status(204);
          expect(res.body).to.be.empty;
          return Folder.count({ _id: data.id });
        })
        .then(count => {
          expect(count).to.equal(0);
        });
    });

    it('should respond with a 400 for an invalid id', function () {
      return chai.request(app)
        .delete('/api/folders/NOT-A-VALID-ID')
        .set('Authorization', `Bearer ${token}`)
        .then(res => {
          expect(res).to.have.status(400);
          expect(res.body.message).to.equal('The `id` is not valid');
        });
    });

  });

});
