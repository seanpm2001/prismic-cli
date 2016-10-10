import Communication, { Domain } from './communication';
import Helpers from './helpers';
import Authentication from './authentication';
import templates from './templates';
import config from './config';

import inquirer from 'inquirer';
import _ from 'lodash';
import shell from 'shelljs';

const isWin = /^win/.test(process.platform);

function createWithDomain(base, domain, args) {
  return new Promise((resolve, reject) => {
    Authentication.connect(base, args)
    .then(function (cookies) {
      queryCreateRepository(base, domain, cookies)
      .then(() => resolve(domain))
      .catch((err) => {
        reject()
      })
    });
  });
}

function create(base, domain, args) {
  const noconfirm = (args['--noconfirm'] === 'true');
  return new Promise((resolve, reject) => {
    let pDomain = null;
    if (domain) {
      exists(base, domain, args)
      .then((isExist) => {
        if(isExist) resolve(domain)
        else reject(`We didn't create the new repository ${domain}`)
      })
      .catch(() => reject())
    } else if (noconfirm) {
      throw 'The noconfirm options requires the domain option to be set.';
    } else {
      promptName().then((answers) => {
        exists(base, answers.domain, args)
        .then((isExist) => {
          if(isExist) resolve(answers.domain)
          else reject(`We didn't create the new repository ${domain}`)
        })
      })
    }
  })
  .then((finalDomain) => {
    if(!finalDomain) {
      Helpers.UI.display('Init aborted.');
    } else {
      return initTemplate(finalDomain, args['--folder'], args['--template'], noconfirm)
      .then((answers) => {
        if (answers && answers.folder) {
          queryValidateCLI(base, finalDomain);
          console.log('Running npm install...');
          var devnull = isWin ? 'NUL' : '/dev/null';
          shell.cd(answers.folder);
          shell.exec('npm install > ' + devnull);
          console.log('Go to the project folder : cd ' + answers.folder);
          if(answers.template.instructions) {
            answers.template.instructions();
          }
        }
        return anwsers.template;
      });
    }
  })
  .catch((msg) => Helpers.UI.display(msg || 'Repository creation aborted !'))
}

function exists(base, domain, args) {
  return new Promise((resolve, reject) => {
    return queryExists(base, domain)
    .then(function (exists) {
      const isExists = exists === 'false'
      if (!isExists) {
        return promptCreateIfNotExists()
        .then((answers) => {
          if(answers.createIfNotExist) createWithDomain(base, domain, args).then((d) => resolve(true))
          else return resolve(false)
        })
      } else {
        return resolve(true)
      }
    })
    .catch((err) => {
      Helpers.UI.display(`Unable to check if ${domain} exists.`)
    })
  });
}

function promptName (domain) {
  return inquirer.prompt([{
    type: 'input',
    name: 'domain',
    message: 'Domain name: ',
    default: domain
  }]);
};

function promptCreateIfNotExists() {
  return inquirer.prompt([{
    type: 'confirm',
    name: 'createIfNotExist',
    message: 'This repository doesn\'t exists. Do you want to create it?'
  }]);
}

function queryExists(base, domain) {
  const url = `${base}/app/dashboard/repositories/${domain}/exists`;
  return Communication.get(url)
}

function queryCreateRepository(base, domain, cookies) {
  const url = `${base}/authentication/newrepository`;
  const data = {
    domain: domain,
    plan: 'personal',
    isAnnual: 'false'
  }
  return Communication.post(url, data, cookies)
}

function queryValidateCLI(base, domain) {
  const baseWithDomain = Domain.WithDomain(base, domain)
  const url = `${baseWithDomain}/app/settings/onboarding/cli`;
  return Communication.get(url)
}

function folderQuestion(folderName) {
  return {
    type: 'input',
    name: 'folder',
    message: 'Local folder to initalize project: ',
    default: folderName,
    validate: function(value) {
      return (shell.test('-e', value)) ? 'Folder already exists' : true;
    }
  };
}

function templateQuestion(templateName) {
  return {
    type: 'list',
    name: 'template',
    message: 'Technology for your project: ',
    default: _(templates.TEMPLATES).findIndex(function(tmpl) { return tmpl.name === templateName; }),
    choices: _.map(templates.TEMPLATES, function(template) {
      return {
        name: template.name,
        value: template
      };
    })
  };
}

function promptFolder(folderName) {
  return inquirer.prompt([folderQuestion(folderName)]);
}

function promptTemplate(templateName) {
  return inquirer.prompt([templateQuestion(templateName)])
}

function promptFolderAndTemplate(folderName, templateName) {
  return inquirer.prompt([folderQuestion(folderName), templateQuestion(templateName)])
}

function buildAnswers(folder, template) {
  return { folder, template };
}

function initTemplate(domain, foldername, templateName, noconfirm) {
  var answersPromise, template;
  return requireFolderAndTemplate(domain, foldername, templateName, noconfirm)
  .then(function(answers) {
    var folder = answers.folder;
    if (!answers.template.url) {
      throw new Error(`${answers.template.name} is not implemented yet!`);
    }
    console.log('Initialize local project...');
    return templates.unzip(answers.template, folder).then(function() {
      templates.replace(folder, [{
        pattern: /your-repo-name/,
        value: domain
      }]);
      return answers;
    });
  });
}

function requireFolderAndTemplate(domain, foldername, templateName, noconfirm) {
  if (noconfirm || (foldername && templateName)) {
    const folder = foldername || domain;
    const template = templates.getOrDefault(templateName);
    if (shell.test('-e', folder)) {
      throw new Error('Error: folder '+ folder + ' already exists.');
    }
    if (!template) {
      throw new Error('Error: invalid template ' + templateName);
    }
    return Promise.resolve(buildAnswers(folder, template));
  } else if (templateName) {
    return promptFolder(foldername || domain)
    .then((answers) => buildAnswers(answers.folder, templates.get(templateName)));
  } else if (foldername) {
    return promptTemplate(templateName)
    .then((answers) => buildAnswers(answers.folder, templates.get(answers.template)));
  } else {
    return promptFolderAndTemplate(foldername || domain, templateName)
    .then((answers) => buildAnswers(answers.folder, answers.template))
  }
}

export default { create }





function heroku (templateName) {
  var answersPromise;
  if (templateName) {
    var template = templates.get(templateName);
    answersPromise = Promise.resolve({
      template: template
    });
  } else {
    answersPromise = new inquirer.prompt([
      templateQuestion(templateName)
    ]);
  }
  return answersPromise.then(function(answers) {
    if (!answers.template.url) {
      throw new Error('Not implemented yet!');
    }
    console.log('Initialize local project...');
    return templates.unzip(answers.template).then(function() {
      templates.replace('.', [{
        pattern: /[\'\"]https:\/\/your-repo-name\.prismic\.io\/api[\'\"]/,
        value: 'process.env.PRISMIC_ENDPOINT'
      }]);
      return answers;
    });
  });

}