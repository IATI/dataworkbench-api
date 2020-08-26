'use strict';

const axios = require('axios');
const schedule = require('node-schedule');
const app = require('../../server');

const Publisher = app.models['iati-publisher'];
// TODO: rename googleStorageConfig to more generic config identifier
const googleStorageConfig = require('../../../common/config/google-storage');

const getPublishers = async () => {
  console.log('registry sync starting');
  const organisationListResponse =
    await axios.get(googleStorageConfig.registry.api_url + `/action/organization_list`);

  const organisationList = organisationListResponse.data.result;

  for (let i=0; i<organisationList.length; i++) {
    let slug = organisationList[i];

    let orgResponse = await axios.get(googleStorageConfig.registry.api_url + `/action/organization_show?id=` + slug);

    let orgData = orgResponse.data.result;

    Publisher.upsert(new Publisher({
      id: orgData.id,
      name: orgData.title,
      slug: orgData.name,
      datasets: orgData.package_count,
      state: orgData.state,
      iati_id: orgData.publisher_iati_id,
      registry_id: orgData.registry_id,
      logo: orgData.image_display_url,
      country: orgData.publisher_country,
      description: orgData.publisher_description
    }), (err, data) => {
      if (err) {
        console.error(err);
      }
    });
  }
  console.log('registry sync completed');
};

getPublishers();

const job = schedule.scheduleJob(googleStorageConfig.registry.cronschedule, () => {
  getPublishers();
});

module.exports = {name: 'registry', job};
