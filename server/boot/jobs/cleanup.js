'use strict';

const axios = require('axios');
const schedule = require('node-schedule');

// TODO: rename googleStorageConfig to more generic config identifier
const googleStorageConfig = require('../../../common/config/google-storage');

let mongoose = require('mongoose')
mongoose.connect(googleStorageConfig.datastore.mongourl, {useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true});

const monDataset = require('../../../common/mongoose/dataset');

const cleanup = async () => {
  console.log('cleanup starting');

  const cursor = monDataset.find({'json-updated': { $exists: true, $ne: null }}).cursor();

  for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
    let url = googleStorageConfig.cleanup.api_url + doc.md5 + '.json'

    try {
      await axios.get(url);      

    } catch (error) {
      //The record says there should be json, but the call for it results in an error
      //That means the actual Validator failed to upload it - a bug which will be addressed in Version 2, when this routine should not be needed
      //However, now, lets remove the field which is lying to us, and the report should join the queue to reprocess
      console.error('Dataset with sha1 ' + doc.sha1 + ' has no report apparent - removing field that says it does.');
      doc['json-updated'] = undefined;
      doc.save();
    }
  }

  console.log('cleanup completed');
};

const job = schedule.scheduleJob(googleStorageConfig.cleanup.cronschedule, () => {
  cleanup();
});

module.exports = {name: 'cleanup', job};
