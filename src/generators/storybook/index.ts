import PrismicGenerator, {TemplateOptions} from '../base'

export default class StoryBook extends PrismicGenerator {
  framework: 'nuxt'| 'next'

  constructor(argv: string | string[], opts: TemplateOptions) {
    super(argv, opts)

    this.option('framework', {
      type: String,
      description: 'framework',
      storage: this.config, // adding this to a store for later usage by create-slice
    })
  }

  async prompting() {
    // TODO: maybe prompt for framework or check for framework
    this.framework = this.options.framework || this.config.get('framework')
  }

  async configuring() {
    if (this.framework === 'next') {
      this.composeWith(require.resolve('./next'), this.options)
    }
    if (this.framework === 'nuxt') {
      this.composeWith(require.resolve('./nuxt'), this.options)
    }
    // TODO handle other frameworks
  }
}