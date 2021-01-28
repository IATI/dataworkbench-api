'use strict';

const axios = require('axios');
const schedule = require('node-schedule');
const _ = require('lodash');
const md5 = require('md5');
const stream = require('stream');
const path = require('path');
const https = require('https');
const app = require('../../server');

const Dataset = app.models['iati-dataset'];
const iatifile = app.models['iati-file'];
// TODO: rename googleStorageConfig to more generic config identifier
const googleStorageConfig = require('../../../common/config/google-storage');

let mongoose = require('mongoose')
mongoose.connect(googleStorageConfig.datastore.mongourl, {useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true});

const monDataset = require('../../../common/mongoose/dataset');

const cloneFile = async (file) => {
  const sourceFile = await axios.get(file.internal_url, {
    responseType: 'arraybuffer',
    timeout: 15 * 1000,
    httpsAgent: new https.Agent({
      rejectUnauthorized: false,
    }),
  });

  const md5hash = md5(sourceFile.data);

  const fileStream = new stream.PassThrough();

  fileStream.end(sourceFile.data);

  return new Promise((resolve, reject) => {
    const uploadStream = iatifile.uploadStream(
      googleStorageConfig.container_public.source,
      `${md5hash}.xml`,
    );

    fileStream.pipe(uploadStream);

    uploadStream.on('data', (data) => {});
    uploadStream.on('error', reject);
    uploadStream.on('finish', () => {
      resolve(md5hash);
    });
  });
};

const fetchDatastorePage = async (url) => {
  if (!url) {
    return [];
  }

  console.log('fetching page from datastore:', url);
  const {data: {next, results}} = await axios.get(url);

  return _.concat(results, await fetchDatastorePage(next));
};

const fetchFiles = async () => {
  console.log('datastore sync starting');

  const SYNCDATE = new Date().toISOString();
  const DELTHRESHOLD = new Date(Date.now() - 10000);

  const filesDatastoreRaw = await fetchDatastorePage(`${googleStorageConfig.datastore.api_url
  }/datasets/?format=json&page=1&page_size=${
    googleStorageConfig.datastore.pagesize}`);
  const filesDatastoreUrl = _.filter(filesDatastoreRaw,
    (o) => o.internal_url != null);

  let recordsWithoutUrl = filesDatastoreRaw.length - filesDatastoreUrl.length;

  if ( recordsWithoutUrl > googleStorageConfig.datastore.noUrlThreshold) {
    console.warn(recordsWithoutUrl + ' records without an internal_url field returned from the DS API, probably inferring a bug their end - skipping the sync.');
    return;
  }

  const filesDatastore = _.filter(filesDatastoreUrl,
    (o) => o.sha1 !== '');

  const filteredResults = _.chunk(filesDatastore, googleStorageConfig.datastore.workers);

  const processFile = async (file) => {
    try {
      let where = {
        internal_url: file.internal_url,
        sha1: file.sha1,        
      }

      let ds = {
        name: `${file.publisher.name}/${file.name}`,
        url: file.source_url,
        publisher: file.publisher.name,
        filename: `${path.basename(file.source_url)}`,
        updated: file.date_updated,
        lastseen: SYNCDATE,
        downloaded: file.date_updated,
        created: file.date_created,
        internal_url: file.internal_url,        
      }
      
      let options = { upsert: false, useFindAndModify: false};

      let record = await monDataset.findOneAndUpdate(where, ds, options)

      if (record) {
        return
      }

      const md5hash = await cloneFile(file);

      ds['md5'] = md5hash;
      ds['sha1'] = file.sha1;
      ds['internal_url'] = file.internal_url,
      ds['received'] = new Date().toISOString(),

      options = { upsert: true, new: true, useFindAndModify: false, setDefaultsOnInsert: true };

      await monDataset.findOneAndUpdate(where, ds, options);

    } catch (err) {
      console.error('File error: ', err.message, file.internal_url, file.sha1);
    } 
  };

  // eslint-disable-next-line
  for (const filesChunk of filteredResults) {
    try {
      // eslint-disable-next-line
      await Promise.all(filesChunk.map(processFile));
    } catch (err) {
      console.log('Error sending: ', err.message);
    }
  }

  console.log('DELTHRESHOLD = ' + DELTHRESHOLD)

  await monDataset.deleteMany({lastseen: {$lt: DELTHRESHOLD}})

  console.log('datastore sync completed');
};

console.log('datastore sync cron schedule:', googleStorageConfig.datastore.cronschedule);

const job = schedule.scheduleJob(googleStorageConfig.datastore.cronschedule, () => {
  fetchFiles();
});

module.exports = {name: 'datastore', job};
