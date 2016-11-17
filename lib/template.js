'use strict';

import request from 'request';
import AdmZip from 'adm-zip';
import tmp from 'tmp';
import fs from 'fs';
import shell from 'shelljs';

export default {
  get(templates, name) {
    var template = templates.find(tmpl => tmpl.name === name);
    if (!template) {
      throw new Error('Error: invalid template ' + name);
    }
    return template;
  },

  getDisplayed(templates) {
    return templates.filter(t => !t.isQuickstart);
  },

  getOrDefault(templates, name) {
    const t = templates.find(function(tmpl) {
      return tmpl.name === name;
    });
    return t || templates[0];
  },

  unzip(templateURL) {
    const tmpZipFile = tmp.tmpNameSync();
    const tmpFolder = tmp.dirSync().name;
    return new Promise(function(resolve, reject) {
      request({uri: templateURL})
        .pipe(fs.createWriteStream(tmpZipFile))
        .on('close', function() {
          try {
            var zip = new AdmZip(tmpZipFile);
            zip.extractAllTo(tmpFolder, /*overwrite*/true);
            shell.rm(tmpZipFile);
            resolve(tmpFolder);
          } catch(e) {
            reject(e);
          }
        });
    });
  },

  replace(folder, template, data) {
    const configPath = `${folder}/${template.configuration}`;
    if (shell.test('-f', configPath)) {
      data.forEach(function(rule) {
        shell.sed('-i', rule.pattern, rule.value, configPath);
      });
    }
  }
};