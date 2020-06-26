#!/usr/bin/env node
const chalk = require('chalk');
const clear = require('clear');
const figlet = require('figlet');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss',
    }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'qualys-cli' },
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

logger.add(
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    ),
    level: 'debug',
  })
);

const files = require('./lib/files');
const inquirer = require('./lib/inquirer');
const api = require('./lib/qualys-api');

const { Spinner } = require('clui');
const Configstore = require('configstore');
const pkg = require('./package.json');

const conf = new Configstore(pkg.name);


clear();

console.log(
  chalk.yellow(figlet.textSync('qualys-CLI', { horizontalLayout: 'full' }))
);

const username = conf.get('username');
const password = conf.get('password');
const apiUri = conf.get('api');

const checkCredentials = async () => {
  if (!username || !password) {
    const credentials = await inquirer.askCredentials();
    conf.set('username', credentials.username);
    conf.set('password', credentials.password);
  } else {
    logger.info(`Logged in as ${username} using api: ${apiUri}`);
  }
};



const getHostAssetList = async (hostName, tagName) => {
  const status = new Spinner('Fetching host data...');
  logger.debug(`getHostAsset -> hostName: ${hostName}, tagName: ${tagName}`);
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

  console.log(postRequest.ServiceRequest.filters.Criteria);

  status.start();
  const result = await api.post(requestUri, postRequest);
  status.stop();
  return result.data.ServiceResponse.data;
};

const getHostById = async (id) => {
  const requestUri = '/qps/rest/2.0/get/am/hostasset/' + id;
  const result = await api.get(requestUri);

  return result.data.ServiceResponse.data[0].HostAsset;
};

const findTag = async (tagName) => {
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
  return result.data.ServiceResponse.data;
};

const addTagToHost = async (tagName, hostName) => {
  const hostList = await getHostAssetList(hostName);

  const host = hostList[0].HostAsset;
  const tagList = await findTag(tagName);
  const tag = tagList[0].Tag;

  if (tag) {
    const TagSimple = { TagSimle: { id: tag.id, name: tag.name } };
    host.tags.list = [TagSimple, ...host.tags.list];
  }

  const status = new Spinner('Updating host data...');
  const putRequest = {
    ServiceRequest: {
      data: {
        HostAsset: {
          tags: {
            add: { TagSimple: { id: tag.id } },
          },
        },
      },
    },
  };

  try {
    status.start();
    const result = await api.post(
      '/qps/rest/2.0/update/am/hostasset/' + host.id,
      putRequest
    );
    status.stop();
    console.log(chalk.green(`Updated succesfully: ${host.id}`));
  } catch (err) {
    status.stop();
    console.log(err);
  }
};

const removeTagFromHost = async (tagName, hostName) => {
  const hostList = await getHostAssetList(hostName);
  const host = hostList[0].HostAsset;
  // const host = await getHostById(104930684);
  const tagList = await findTag(tagName);
  const tag = tagList[0].Tag;

  if (tag) {
    const TagSimple = { TagSimle: { id: tag.id, name: tag.name } };
    host.tags.list = [TagSimple, ...host.tags.list];
  }

  const status = new Spinner(`Removing ${tagName} from host data...`);
  const putRequest = {
    ServiceRequest: {
      data: {
        HostAsset: {
          tags: {
            remove: { TagSimple: { id: tag.id } },
          },
        },
      },
    },
  };

  try {
    status.start();
    const result = await api.post(
      '/qps/rest/2.0/update/am/hostasset/' + host.id,
      putRequest
    );
    status.stop();
    console.log(chalk.green(`Removed succesfully from host: ${host.id}`));
  } catch (err) {
    status.stop();
    console.log(err);
  }
};

const updateNameWithDomainName = async (hostName) => {
  const hostList = await getHostAssetList(hostName);
  if (!hostList || hostList.length === 0) {
    console.log(chalk.red(`No host found with ${hostName}`));
    return;
  } else if (hostList.length > 1) {
    console.log(chalk.red(`Multiple hosts found with ${hostName}`));
    console.log(hostList);
    return;
  }
  const host = hostList[0].HostAsset;

  const newName = host.dnsHostName.toUpperCase();
  console.log(
    chalk.blue(`Updating ${hostName} to ${newName} for host ${host.id}`)
  );
  const status = new Spinner('Updating...');
  const putRequest = {
    ServiceRequest: {
      data: {
        HostAsset: {
          name: newName,
        },
      },
    },
  };
  // 54423943
  try {
    status.start();
    const result = await api.post(
      '/qps/rest/2.0/update/am/hostasset/' + host.id,
      putRequest
    );
    status.stop();
    console.log(
      `${updatedHost.name}, ${updatedHost.dnsHostName}, ${updatedHost.id}`
    );
  } catch (err) {
    status.stop();
    console.log(err);
  }
};

(async () => {
  try {
    await checkCredentials();

    const argv = require('minimist')(process.argv.slice(2));

    const func = argv._[0];
    switch (func) {
      case 'addTag':
        if (!argv.tagName || !argv.hostName) {
          logger.warning(chalk.yellow('Missing either tagName or hostName!'));
        } else {
          await addTagToHost(argv.tagName, argv.hostName);
        }
        break;
      case 'removeTag':
        await removeTagFromHost(argv.tagName, argv.hostName);
        break;
      case 'updateHostName':
        await updateNameWithDomainName(argv.hostName);
        break;
      case 'getAssetList':
        await getHostAssetList(argv.hostName, argv.tagName);
        break;
      default:
        console.log(chalk.red(`${func} is not a valid option.`));
    }
  } catch (err) {
    logger.error('Error:', err);
  }

  // await addTagToHost('DD I&T', 'ANDRIESESTERHU1');
  // await removeTagFromHost('DD I&T', 'ANDRIESESTERHU1');
  // const host = await getListByNameContains('DESKTOP-TTEUIJL');
  // console.log(host);
  // await updateNameWithDomainName('DESKTOP-TTEUIJL');
  // await updateNameWithDomainName('KEVINADERA');
})();
