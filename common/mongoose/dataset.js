let mongoose = require('mongoose')
mongoose.pluralize(null);

let datasetSchema = new mongoose.Schema({

  id: {
    type: String    
  },
  name: {
    type: String
  },
  url: {
    type: String,
    required: true
  },
  md5: {
    type: String,
    required: true
  },
  publisher: {
    type: String
  },
  filename: {
    type: String
  },
  downloaded: {
    type: Date
  },
  updated: {
    type: Date
  },
  processing: {
    type: Date
  },
  "json-updated": {
    type: Date
  },
  lastseen: {
    type: Date
  },
  created: {
    type: Date
  },
  "feedback-updated": {
    type: Date
  },
  "svrl-updated": {
    type: Date
  },
  sourceUrl: {
    type: String,
  },
  sha1: {
    type: String,
    required: true
  },
  internal_url: {
    type: String,
  }
}, { collection: 'iati-dataset' })

module.exports = mongoose.model('iati-dataset', datasetSchema)