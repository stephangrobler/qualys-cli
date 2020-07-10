#!/usr/bin/env node
const chalk = require('chalk');
const clear = require('clear');
const figlet = require('figlet');
const log = require('./lib/logger');
const logger = log.getLogger();

const inquirer = require('./lib/inquirer');
const api = require('./lib/qualys-api');
const hostAssets = require('./lib/host-assets');
const tags = require('./lib/tags');

const { Spinner } = require('clui');
const Configstore = require('configstore');
const pkg = require('./package.json');

const conf = new Configstore(pkg.name);


clear();

console.log(
  chalk.yellow(figlet.textSync(pkg.name, { horizontalLayout: 'full' }))
);

let username = conf.get('username');
let password = conf.get('password');
let apiUri = conf.get('api');

const checkCredentials = async () => {
  if (!username || !password) {
    const credentials = await inquirer.askCredentials();
    conf.set('username', credentials.username);
    conf.set('password', credentials.password);
    conf.set('api', credentials.api);
    username = conf.get('username');
    password = conf.get('password');
    apiUri = conf.get('api');

  } else {
    logger.info(`Logged in as ${username} using api: ${apiUri}`);
  }
};

const searchHosts = hostAssets.getWithQuery;
const getHostById = hostAssets.getById;


const searchTag = tags.searchTagsByName;

const addTagToHost = async (tag, host) => {
  const status = new Spinner(`Updating host ${host.id} - ${host.name}: adding tag ${tag.id} - ${tag.name}`);
  const serviceRequest = {
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
    await hostAssets.update(host.id, serviceRequest);
    status.stop();
    logger.info(chalk.green(`Updated succesfully: ${host.id}`));
  } catch (err) {
    status.stop();
    logger.error(err);
  }
};

const removeTagFromHost = async (tagName, hostName) => {
  const hostList = await searchHosts(hostName);
  const host = hostList[0].HostAsset;
  // const host = await getHostById(104930684);
  const tagList = await searchTag(tagName);
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

const updateHostsWithDomain = async (hostName, tagName) => {
  if (!hostName || !tagName) {
    throw new Error('Host search and tag name required for update multiple hosts.');
  }
  const hostList = await searchHosts(hostName, tagName);
  if (!hostList || hostList.length === 0){
    logger.info(`No hosts found for search: { hostName: '${hostName}', tagName: '${tagName}' } `);
    return;
  } else {
    logger.info(`Found ${hostList.length} records`);
    for (let index = 0; index < hostList.length; index++) {
      const host = hostList[index].HostAsset;
      const newName = host.dnsHostName.toUpperCase();
      await updateHostName(host, newName);
    }
  }
  
}

const updateHostName = async (host, newName) => {
  logger.info(
    chalk.blue(`Updating ${host.name} to ${newName} for host ${host.id}`)
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
  } catch (err) {
    status.stop();
    console.log(err);
  }
}

const updateNameWithDomainName = async (hostName) => {
  const hostList = await searchHosts(hostName);
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
  } catch (err) {
    status.stop();
    console.log(err);
  }
};

const addTagToHosts = async (options) => {
  
  let tag = null;
  if (!options.tagToAdd) {
    logger.warn(`You need to add a tag name option: --tagToAdd=""`);
    return;
  } else {
    const tagList = await tags.searchTagsByName(options.tagToAdd);
    if (!tagList || tagList.length === 0){
      logger.warn(`No tags found for ${options.tagToAdd}`);
      return;
    } else {
      tag = tagList[0].Tag;
      logger.debug(`Tag found: ${tag.id} - ${tag.name}`);
    }
  }
  if (options.hostIds){
    let hostIds = options.hostIds + '';
    hostIds = hostIds.split(',');
    for (let index = 0; index < hostIds.length; index++) {
      const id = hostIds[index];
      const host = await hostAssets.getById(id);
      await addTagToHost(tag, host);
    }
  }
}


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
        const results = await searchHosts(argv.hostName, argv.tagName);
        logger.info(results);
        break;
      case 'add-tag-to-hosts':
        const addTagToHostsResults = await addTagToHosts(argv);
        break;
      case 'update-hosts-with-domain':
        await updateHostsWithDomain(argv.hostName, argv.tagName);
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
