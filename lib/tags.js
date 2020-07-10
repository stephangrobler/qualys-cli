const api = require('./qualys-api');
const { Spinner } = require('clui');
const log = require('./logger');
const logger = log.getLogger();

module.exports = {
  searchTagsByName: async (tagName) => {
    const status = new Spinner('Fetching tag data...');
    const requestUri = '/qps/rest/2.0/search/am/tag';
    const postRequest = {
      ServiceRequest: {
        preferences: {
          startFromOffset: 1,
          limitResults: 10,
        },
        filters: {
          Criteria: [
            {
              field: 'name',
              operator: 'CONTAINS',
              value: tagName,
            },
          ],
        },
      },
    };

    status.start();
    const searchResult = await api.post(requestUri, postRequest);
    status.stop();
    const tagList = searchResult.data.ServiceResponse.data;
    if (!tagList || tagList.length === 0) {
      console.log(chalk.red(`No tags found for search: ${tagName}`));
      return;
    }
    return searchResult.data.ServiceResponse.data;
  },
};
