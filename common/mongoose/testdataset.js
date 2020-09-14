let mongoose = require('mongoose')
mongoose.pluralize(null);

let datasetSchema = new mongoose.Schema({

  id: {
    type: String    
  },
  type: {
    type: String
  },
  url: {
    type: String
  },
  fileid: {
    type: String
  },
  tmpworkspaceId: {
    type: String
  },
  uploaded: {
    type: Date
  },
  "json-updated": {
    type: Date
  },
  filename: {
    type: String
  },
  status: {
    type: String
  }
}, { collection: 'iati-testdataset' })

module.exports = mongoose.model('iati-testdataset', datasetSchema)