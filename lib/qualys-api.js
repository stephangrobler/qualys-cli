
const axios = require('axios');
const Configstore = require('configstore');
const pkg = require('../package.json');
const conf = new Configstore(pkg.name);

username = conf.get('username');
password = conf.get('password');
apiUri = conf.get('api');

module.exports = {
  get: (requestUri, requestOptions) => {
    requestUri = apiUri + requestUri;
    return axios.get(requestUri, {
      auth: {
        username,
        password,
      },
      headers: {
        'X-Requested-With': 'qualys-cli:',
      },
    });
  },

  post: (postUri, postData, postOptions) => {
    postUri = apiUri + postUri;
    return axios.post(postUri, postData, {
      auth: {
        username,
        password,
      },
      headers: {
        'X-Requested-With': 'qualsys-cli:',
      },
    });
  },
};
