import {expect, test} from '@oclif/test'
import * as path from 'path'
import * as os from 'os'
import {fs} from '../../src/utils'
import {Theme as ThemeZip} from '../__stubs__/template'
import Theme from '../../src/commands/theme'
import * as lookpath from 'lookpath'

describe('theme', () => {
  test.it('theme flags', () => {
    expect(Theme.flags.conf).to.exist
    expect(Theme.flags.customTypes).to.exist
    expect(Theme.flags.documents).to.exist
    expect(Theme.flags.domain).to.exist
    expect(Theme.flags.folder).to.exist
    expect(Theme.flags.force).to.exist
    expect(Theme.flags.help).to.exist
    expect(Theme.flags['theme-url']).to.exist
    expect(Theme.flags['skip-install']).to.exist
    expect(Theme.flags['existing-repo']).to.exist
  })

  const fakeDomain = 'fake-theme-domain'
  const fakeBase = 'https://prismic.io'
  const fakeCookies = 'SESSION=tea; DOMAIN=.prismic.io; X_XSFR=biscuits; prismic-auth=xyz'
  const tmpDir = os.tmpdir()

  const fakeFolder = path.join(tmpDir, 'test-theme')

  const fakeSource = 'https://github.com/prismicio/fake-theme'

  const configFile = 'prismic-configuration.js'

  const zip = ThemeZip.toBuffer()

  before(async () => {
    if (fs.existsSync(fakeFolder)) {
      return fs.rmdir(fakeFolder, {recursive: true})
    }
    return Promise.resolve()
  })

  const withGithubFolder = path.join(fakeFolder, 'github')

  test
  .stub(lookpath, 'lookpath', async () => false)
  .stub(fs, 'readFileSync', () => JSON.stringify({base: fakeBase, cookies: fakeCookies}))
  .stub(fs, 'writeFile', () => Promise.resolve())
  .nock(fakeBase, api => {
    return api
    .get(`/app/dashboard/repositories/${fakeDomain}/exists`).reply(200, () => true) // we should really rename this.
    .post('/authentication/newrepository?app=slicemachine').reply(200, fakeDomain)
  })
  .nock('https://auth.prismic.io', api => {
    api.get('/validate?token=xyz').reply(200, {})
    api.get('/refreshtoken?token=xyz').reply(200, 'xyz')
  })
  .nock('https://github.com', api => {
    api.head('/prismicio/fake-theme/archive/main.zip').reply(404)
    api.head('/prismicio/fake-theme/archive/master.zip').reply(200)
    return api.get('/prismicio/fake-theme/archive/master.zip')
    .reply(200, zip, {
      'Content-Type': 'application/zip',
      'content-length': zip.length.toString(),
    })
  })
  .command(['theme', fakeSource, '--domain', fakeDomain, '--folder', withGithubFolder, '--conf', configFile, '--skip-install'])
  .it('creates a prismic project from a github url', () => {
    const configPath = path.join(withGithubFolder, configFile)
    expect(fs.existsSync(withGithubFolder)).to.be.true
    const conf = require(configPath)
    expect(conf.prismicRepo).to.include(fakeDomain)
  })

  const folderForExistinRepo = path.join(fakeFolder, 'existing-repo')

  test
  .stub(lookpath, 'lookpath', async () => false)
  .stub(fs, 'readFileSync', () => JSON.stringify({base: fakeBase, cookies: fakeCookies}))
  .stub(fs, 'writeFile', () => Promise.resolve())
  .nock(fakeBase, api => {
    return api
    .get(`/app/dashboard/repositories/${fakeDomain}/exists`).reply(200, () => false) // we should really rename this.
  })
  .nock('https://auth.prismic.io', api => {
    api.get('/validate?token=xyz').reply(200, {})
    api.get('/refreshtoken?token=xyz').reply(200, 'xyz')
  })
  .nock('https://github.com', api => {
    api.head('/prismicio/fake-theme/archive/main.zip').reply(404)
    api.head('/prismicio/fake-theme/archive/master.zip').reply(200)
    return api.get('/prismicio/fake-theme/archive/master.zip')
    .reply(200, zip, {
      'Content-Type': 'application/zip',
      'content-length': zip.length.toString(),
    })
  })
  .command(['theme', fakeSource, '--domain', fakeDomain, '--folder', folderForExistinRepo, '--conf', configFile, '--skip-install', '--existing-repo'])
  .it('when passed existing repo it should not try to create a repository', () => {
    const configPath = path.join(folderForExistinRepo, configFile)
    expect(fs.existsSync(folderForExistinRepo)).to.be.true
    const conf = require(configPath)
    expect(conf.prismicRepo).to.include(fakeDomain)
  })
})
