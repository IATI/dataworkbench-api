'use strict';

module.exports = {
  container_public: {
    enum: ['source', 'feedback', 'json', 'svrl'],
    source: process.env.CONTAINER_PUBLIC_SOURCE ||
      'iati',
    feedback: process.env.CONTAINER_PUBLIC_FEEDBACK ||
      'iatifeedback',
    json: process.env.CONTAINER_PUBLIC_JSON ||
      'json',
    svrl: process.env.CONTAINER_PUBLIC_SVRL ||
      'svrl',
  },

  container_upload: {
    enum: ['feedback', 'json', 'svrl'],
    source: process.env.CONTAINER_UPLOAD_SOURCE ||
      'test',
    feedback: process.env.CONTAINER_UPLOAD_FEEDBACK ||
      'testfeedback',
    json: process.env.CONTAINER_UPLOAD_JSON ||
      'testjson',
    svrl: process.env.CONTAINER_UPLOAD_SVRL ||
      'testsvrl',
  },

  validator: {
    api_url: process.env.VALIDATOR_API_URL ||
      'http://validator-api/api/v1',
  },

  datastore: {
    api_url: process.env.DATASTORE_API_URL ||
      'https://iati.cloud/api',
    pagesize: process.env.DATASTORE_PAGESIZE || 1000,
    cronschedule: process.env.DATASTORE_CRONSCHEDULE ||
      '51 * * * *',
    workers: process.env.DATASTORE_WORKERS || 3,
  },

  registry: {
    api_url: process.env.REGISTRY_API_URL ||
      'https://iatiregistry.org/api/3',
    cronschedule: process.env.REGISTRY_CRONSCHEDULE ||
      '* 2 * * *',
  },
};
