const api = require('./qualys-api');
const { Spinner } = require('clui');
const log = require('./logger');
const logger = log.getLogger();

const getServiceRequest = () => {
  return this;
}


module.exports = {
  getById: async (id) => {
    const requestUri = '/qps/rest/2.0/get/am/hostasset/' + id;
    const result = await api.get(requestUri);

    return result.data.ServiceResponse.data[0].HostAsset;
  },
  getWithQuery: async (hostName, tagName) => {
    const status = new Spinner('Fetching host data...');
    logger.debug(`host-assets.getWithQuery -> hostName: ${hostName}, tagName: ${tagName}`);
    const requestUri = '/qps/rest/2.0/search/am/hostasset';
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
              value: hostName,
            },
          ],
        },
      },
    };

    if (tagName) {
      const tagCriteria = {
        field: 'tagName',
        operator: 'EQUALS',
        value: tagName,
      };
      postRequest.ServiceRequest.filters.Criteria = [
        tagCriteria,
        ...postRequest.ServiceRequest.filters.Criteria,
      ];
    }

    status.start();
    const result = await api.post(requestUri, postRequest);
    status.stop();
    return result.data.ServiceResponse.data;
  },
  update: async (id, ServiceRequest) => {
    api.post(
      '/qps/rest/2.0/update/am/hostasset/' + id,
      ServiceRequest
    );
  }
};
