let mongoose = require('mongoose')
mongoose.pluralize(null);

let datasetSchema = new mongoose.Schema({

  id: {
    type: String    
  },
  country: {
    type: String
  },
  datasets: {
    type: String,
  },
  description: {
    type: String,
    required: true
  },
  iati_id: {
    type: String
  },
  logo: {
    type: String
  },
  name: {
    type: String,
    required: true
  },
  slug: {
    type: String,
    required: true
  },
  state: {
    type: String
  },
  
}, { collection: 'iati-dataset' })


module.exports = mongoose.model('iati-dataset', datasetSchema)