let mongoose = require('mongoose')
const googleStorageConfig = require('../../common/config/google-storage');
mongoose.connect(googleStorageConfig.datastore.mongourl, {useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true});

const monDataset = require('../../common/mongoose/dataset');
const monTestDataset = require('../../common/mongoose/testdataset');
const monPublisherStats = require('../../common/mongoose/publisherstats');

module.exports = function(app) {
  app.get('/api/v1/stats/:publisher', async function(req, res) {

    let where = { "publisher": req.params.publisher };

    if (req.query.start) {
      where['date'] = { $gte: req.query.start };
    }

    if (req.query.end) {
      where['date'] = { $lte: req.query.end };
    }

    let stats = await monPublisherStats.find(where).sort({ 'date' : "asc"});

    return res.send(stats);
  });

  app.get('/api/v1/queue/next', async function(req, res) {
    let ds = await monDataset.findOne({"json-updated": { "$exists" : false }}).sort({ 'downloaded' : "asc"});

    return res.send(ds);
  });

  app.get('/api/v1/testqueue/next', async function(req, res) {
    let ds = await monTestDataset.findOne({"json-updated": { "$exists" : false }}).sort({ 'downloaded' : "asc"});

    return res.send(ds);
  });

  app.post('/api/v1/queue/processing', async function(req, res) {
    const now = new Date().toISOString();

    const id = req.body.id;

    if ( ! id) {
      return res.status(400).send('id missing')
    }

    let ds = await monDataset.findById(id);

    if ( ! ds) {
      return res.status(400).send('Record with that ID not found')
    }

    if (ds.processing) {
      return res.status(400).send('That dataset is already being processed')
    }

    if (ds['json-updated']) {
      return res.status(400).send('That dataset has already been processed')
    }

    ds.processing = now;
    let updated = await ds.save();

    console.log('Updated dataset id ' + updated._id + ' to processing at ' + updated.processing);

    return res.send(updated);
  });

  app.post('/api/v1/queue/processed', async function(req, res) {
    const now = new Date().toISOString();

    const md5 = req.body.md5;

    if ( ! md5) {
      return res.status(400).send('MD5 missing')
    }
  
    let ds = await monDataset.findOne({ md5: md5 });

    if ( ! ds) {
      return res.status(400).send('Record with that MD5 not found')
    }

    if ( ! ds.processing) {
      return res.status(400).send('That dataset has not yet been sent for processing')
    }

    if (ds.json-updated) {
      return res.status(400).send('That dataset has already been marked as processed')
    }

    ds['json-updated'] = now;
    let updated = await ds.save();

    return res.send(updated);
  });
}
