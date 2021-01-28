let mongoose = require('mongoose')
mongoose.pluralize(null);

let datasetSchema = new mongoose.Schema({
  date: {
    type: Date,
    index: true,
    required: true
  },
  publisher: {
    type: String,
    index: true,
    required: true
  },
  summaryStats: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  activityStats: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  messageStats: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
}, { collection: 'publisher-stats' })

module.exports = mongoose.model('publisher-stats', datasetSchema)