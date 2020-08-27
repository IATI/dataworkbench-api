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

  if (organisationListResponse.status != 200) {
    console.error('IATI Registry returned other than 200 when getting the list of orgs - specifically ' + organisationListResponse.status);
    return;
  }

  const organisationList = organisationListResponse.data.result;

  let existing = await Publisher.find({},{slug:1,_id:0});

  for (let n=0; n<existing.length; n++) {
      if ( ! organisationList.includes(existing[n].slug)) {
        console.log(slug + ' no longer present in the Registry - removing.')
        Publisher.deleteOne({slug: existing[n].slug})
      }
  }

  console.log('Upserting ' + organisationList.length + ' organisations...');

  for (let i=0; i<organisationList.length; i++) {
    let slug = organisationList[i];

    existing = Publisher.find({},{slug:1,_id:0});

    let orgResponse = await axios.get(googleStorageConfig.registry.api_url + `/action/organization_show?id=` + slug);

    if (orgResponse.status != 200) {
      console.error('IATI Registry returned other than 200 getting details for ' + slug + ' - specifically ' + organisationListResponse.status);
      continue;
    }

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

const job = schedule.scheduleJob(googleStorageConfig.registry.cronschedule, () => {
  getPublishers();
});

module.exports = {name: 'registry', job};
