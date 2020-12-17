'use strict';

const schedule = require('node-schedule');
const axios = require('axios');

const googleStorageConfig = require('../../../common/config/google-storage');

let mongoose = require('mongoose');
mongoose.connect(googleStorageConfig.datastore.mongourl, {useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true});
const app = require('../../server');
const monDataset = require('../../../common/mongoose/dataset');
const monPublisherStats = require('../../../common/mongoose/publisherstats');
const monAggregateStats = require('../../../common/mongoose/aggregatestats');
const Publisher = app.models['iati-publisher'];

const generate = async () => {
  console.log('stats generator starting');

  let now = new Date();
  let date = now.toISOString().split('T')[0];  

  const publishers = await Publisher.find({where: {state: "active", datasets: {gt: 0}}});

  for (let i = 0; i < publishers.length; i++) {
    let publisher = publishers[i];
    let summaryTotal = {};
    let activitiesTotal = {};
    let messagesTotal = {};

    console.log('Generating stats for ' + publisher.name);
    let cursor = monDataset.find({'publisher': publisher.slug, 'json-updated': { $exists: true, $ne: null }}).cursor();

    for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {       
      try {
        let report = await axios.get(googleStorageConfig.stats.api_url + doc.md5 + '.json');

        for (let key in report.data.summary) {
          if ( !(key in summaryTotal)) {
            summaryTotal[key] = 0;
          }

          summaryTotal[key] += report.data.summary[key]
        }

        if (! ('activities' in report.data)) {
          continue;
        }
        
        for (let n = 0; n < report.data.activities.length; n++) {
          for (let o = 0; o < report.data.activities[n].feedback.length; o++) {
            let feedback = report.data.activities[n].feedback[o];

            if ( !(feedback.category in activitiesTotal)) {
              activitiesTotal[feedback.category] = {label: feedback.label, count: 0}
            }

            activitiesTotal[feedback.category].count++;

            for (let p = 0; p < report.data.activities[n].feedback[o].messages.length; p++) {
              let message = report.data.activities[n].feedback[o].messages[p];
  
              if ( !(message.id in messagesTotal)) {
                messagesTotal[message.id] = {text: message.text, count: 0}
              }
  
              messagesTotal[message.id].count++;
            }
          }
        }
      } catch (error) {
        console.error('Error for doc ' + doc.md5 + ', publisher: ' + doc.publisher);
        console.error(error.message);
        console.error(googleStorageConfig.stats.api_url + doc.md5 + '.json');
      }
    }

    let stats = {
      date: date,
      publisher: publisher.slug,
      summaryStats: summaryTotal,
      activityStats: activitiesTotal,
      messageStats: messagesTotal
    }

    let options = { upsert: true };
    let where = { date: date, publisher: publisher.slug };

    await monPublisherStats.findOneAndUpdate(where, stats, options)
  }

  console.log('Base stats generated, doing the aggregates...');

  // Aggregate from the base stats
  let cursor = await monPublisherStats.find({date: date}).cursor();

  let count = 0;
  let sumSummaryStats = {}

  //Sum the summary
  for (let stat = await cursor.next(); stat != null; stat = await cursor.next()) {

    count++;

    if (stat.publisher === "usaid") {
      let brake = true;
    }

    for (let key in stat.summaryStats) {
      if ( !(key in sumSummaryStats)) {
        sumSummaryStats[key] = 0;
      }

      sumSummaryStats[key] += stat.summaryStats[key];
    }
   
  }

  let avgSummaryStats = {};

  //Do the averages
  for (let key in sumSummaryStats) {
    let average = sumSummaryStats[key] / count;
    avgSummaryStats[key] = average.toFixed(4);   
  }

  let stats = {
    publishers: count,
    sum: sumSummaryStats,
    average: avgSummaryStats
  }

  let options = { upsert: true };
  let where = { date: date };

  await monAggregateStats.findOneAndUpdate(where, stats, options)

  console.log('stats generated');
};

  generate();

const job = schedule.scheduleJob(googleStorageConfig.stats.cronschedule, () => {
  generate();
});

module.exports = {name: 'statsgenerator', job};
