import PrismicGenerator, {TemplateOptions} from '../../prismic-generator'

export default class StoryBook extends PrismicGenerator {
  framework: 'nuxt'| 'next' | undefined;

  pm: 'npm' | 'yarn' | undefined;

  constructor(argv: string|string[], opts: TemplateOptions) {
    super(argv, opts)
    // TODO: this logic is repeated in setup, create-slice and here
    this.pm = this.pm || 'npm'

    if (this.destinationRoot().endsWith(this.path) === false) {
      this.destinationRoot(this.path)
    }

    if (opts.framework) {
      this.config.set('framework', opts.framework)
      this.framework = opts.framework
    } else {
      this.framework = this.config.get('framework')
    }
  }

  async prompting() {
    if (!this.framework) {
      await this.prompt([
        {
          name: 'framework',
          type: 'list',
          choices: ['next', 'nuxt'],
        },
      ]).then(res => {
        this.framework = res.framework
        this.config.set('framework', this.framework)
      })
    }
  }

  async configuring() {
    if (this.framework === 'next') {
      this.composeWith(require.resolve('./next'), this.options)
    }
    if (this.framework === 'nuxt') {
      this.composeWith(require.resolve('./nuxt'), this.options)
    }
  }

  async install() {
    if (this.pm === 'yarn') {
      return this.yarnInstall()
    }
    return this.npmInstall()
  }
}
