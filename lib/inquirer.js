const inquirer = require('inquirer');

module.exports = {
  askCredentials: () => {
    const questions = [
      {
        name: 'username',
        type: 'input',
        message: 'Input your Qualys username:',
        validate: (value) => {
          if (value.length) {
            return true;
          } else {
            return 'Please enter your username.';
          }
        }
      },
      {
        name: 'password',
        type: 'password',
        message: 'Enter your password:',
        validate: (value) => {
          if (value.length) {
            return true;
          } else {
            return 'Please enter your password.';
          }
        }
      },
      {
        name: 'api',
        type: 'input',
        message: 'Please set the API url to use:',
        default: 'https://qualysapi.qg2.apps.qualys.com',
        validate: (value) => {
          if (value.length) {
            return true;
          } else {
            return 'Please enter the API Url.'
          }
        }
      }
    ];
    return inquirer.prompt(questions);
  },
  askTagDetails: () => {
    const argv = require('minimist')(process.argv.slice(2));
  }
}