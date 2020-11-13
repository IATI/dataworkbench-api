let mongoose = require('mongoose')
mongoose.pluralize(null);

let datasetSchema = new mongoose.Schema({
  date: {
    type: Date,
    index: true,
    required: true
  },
  publishers: {
    type: Number,
    required: true
  },
  sum: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  average: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
}, { collection: 'aggregate-stats' })

module.exports = mongoose.model('aggregate-stats', datasetSchema)