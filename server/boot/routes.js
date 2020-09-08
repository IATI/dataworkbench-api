let mongoose = require('mongoose')
mongoose.connect('mongodb://localhost:27017/local-validator', {useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true});

const monDataset = require('../../common/mongoose/dataset');

module.exports = function(app) {
  app.get('/queue/next', async function(req, res) {
    const now = new Date().toISOString();

    let ds = await monDataset.findOne({ $or : [ { "json_updated" : { "$exists" : false }}, { "processing" : { "$exists" : false }} ] }).sort({ 'downloaded' : "asc"});
    ds.processing = now;
    await ds.save();

    return res.send(ds);
  });

  app.post('/queue/processed', async function(req, res) {
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

    ds.json_updated = now;
    await ds.save();

    return res.send(ds);
  });
}
