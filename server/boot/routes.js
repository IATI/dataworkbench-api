let mongoose = require('mongoose')
const googleStorageConfig = require('../../common/config/google-storage');
mongoose.connect(googleStorageConfig.datastore.mongourl, {useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true});

const monDataset = require('../../common/mongoose/dataset');
const monTestDataset = require('../../common/mongoose/testdataset');
const monPublisherStats = require('../../common/mongoose/publisherstats');
const monAggregateStats = require('../../common/mongoose/aggregatestats');

module.exports = function(app) {

  //Get percentage of publishers which increased | decreased | unchanged their stats betweem two dates
  app.get('/api/v1/stats/progress', async function(req, res) {

    if ( ! req.query.start) {
      return res.status(400).send('missing required parameter: start');
    }

    if ( ! req.query.end) {
      return res.status(400).send('missing required parameter: end');
    }

    let where = { date: req.query.start };
    let startStats = await monPublisherStats.find(where);

    where = { date: req.query.end };
    let endStats = await monPublisherStats.find(where);

    let total = {};
    let increased = {};
    let decreased = {};

    for (let i=0; i < startStats.length; i++) {
      let startStat = startStats[i];
      let endStat = null
        for (let n=0; i < endStats.length && endStat === null; n++) {
          if (endStats[n].publisher === startStat.publisher) {
            endStat = endStats[n];
            endStats.splice[n, 1];
          }
        }

        if (endStat === null) {
          continue;
        }
  
        for(key in startStat.summaryStats) {
          if (! (key in total)) {
            total[key] = 0;
            increased[key] = 0;
            decreased[key] = 0;
          }

          total[key]++;
  
          if (startStat.summaryStats[key] > endStat.summaryStats[key]) {
            decreased[key]++;
          }
  
          if (startStat.summaryStats[key] < endStat.summaryStats[key]) {
            increased[key]++;
          }
        }
    }

    let stats = {};

    for (key in total) {    
      stats[key] = {}; 
      stats[key]['percPublishersIncreased'] = increased[key] * (100 / total[key]);
      stats[key]['percPublishersDecreased'] = increased[key] * (100 / total[key]);
      stats[key]['percPublishersUnchanged'] = 100 - stats[key]['percPublishersIncreased'] - stats[key]['percPublishersDecreased'];
    }

    return res.send(stats);
  });

  //Get aggregate stats for a specific date
  app.get('/api/v1/stats/summary', async function(req, res) {

    if ( ! req.query.date) {
      return res.status(400).send('missing required parameter: date');
    }

    let where = { date: req.query.date };
    let stats = await monAggregateStats.findOne(where);

    return res.send(stats);
  });


  //all publisher stats for a given date
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

  //all stats for a specific publisher, optional date range
  app.get('/api/v1/stats/', async function(req, res) {

    if ( ! req.query.date) {
      return res.status(400).send('missing required parameter: date');
    } 

    let where = {};

    if (req.query.date) {
      where['date'] = req.query.date;
    }

    let stats = await monPublisherStats.find(where);

    return res.send(stats);
  });

  app.get('/api/v1/stats/delta', async function(req, res) {

    if ( !req.query.date) {
      return res.status(400).send('missing required parameter: date');
    }

    let where = {};

    if (req.query.date) {
      where['date'] = req.query.date;
    }

    let stats = await monPublisherStats.find(where);

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
