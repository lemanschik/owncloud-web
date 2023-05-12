import { getSizeClass } from './utils/sizeClasses'
import './utils/webFontLoader'

import * as components from './components'
import * as directives from './directives'

const initializeCustomProps = (tokens = [], prefix) => {
  for (const param in tokens) {
    initializeCustomProp(prefix + param, tokens[param])
  }
}

const initializeCustomProp = (key: string, value: string | undefined) => {
  if (value === undefined) {
    return
  }
  ;(document.querySelector(':root') as HTMLElement).style.setProperty('--oc-' + key, value)
}

export default {
  install(app, options: any = {}) {
    const themeOptions = options.tokens
    initializeCustomProps(themeOptions?.breakpoints, 'breakpoint-')
    initializeCustomProps(themeOptions?.colorPalette, 'color-')
    initializeCustomProps(themeOptions?.fontSizes, 'font-size-')
    initializeCustomProps(themeOptions?.sizes, 'size-')
    initializeCustomProps(themeOptions?.spacing, 'space-')
    initializeCustomProp('font-family', themeOptions?.fontFamily)

    Object.values(components).forEach((c) => app.component(c.name, c))
    Object.values(directives).forEach((d) => app.directive(d.name, d))
  }
}

export const utils = { getSizeClass }
export * as components from './components'
export * as composables from './composables'
export * as directives from './directives'
export * as helpers from './helpers'
