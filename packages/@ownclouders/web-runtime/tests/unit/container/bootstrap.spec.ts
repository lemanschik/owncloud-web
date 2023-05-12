import { mockDeep } from 'jest-mock-extended'
import { createApp, defineComponent } from 'vue'
import { ConfigurationManager } from 'web-pkg/src'
import {
  initializeApplications,
  announceApplicationsReady,
  announceCustomScripts,
  announceCustomStyles
} from '../../../src/container/bootstrap'
import { buildApplication } from '../../../src/container/application'

jest.mock('../../../src/container/application')

describe('initialize applications', () => {
  it('continues even if one or more applications are falsy', async () => {
    const fishyError = new Error('fishy')
    const initialize = jest.fn()
    const ready = jest.fn()
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(jest.fn)
    const buildApplicationMock = jest
      .fn()
      .mockImplementation(({ applicationPath }: { applicationPath: string }) => {
        if (applicationPath.includes('Valid')) {
          return Promise.resolve({ initialize, ready })
        }

        return Promise.reject(fishyError)
      })

    jest.mocked(buildApplication).mockImplementation(buildApplicationMock)

    const applications = await initializeApplications({
      app: createApp(defineComponent({})),
      configurationManager: mockDeep<ConfigurationManager>(),
      runtimeConfiguration: {
        apps: ['internalFishy', 'internalValid'],
        external_apps: [{ path: 'externalFishy' }, { path: 'externalValid' }]
      },
      store: undefined,
      router: undefined,
      translations: undefined,
      supportedLanguages: {}
    })

    expect(buildApplicationMock).toHaveBeenCalledTimes(4)
    expect(initialize).toHaveBeenCalledTimes(2)
    expect(errorSpy).toHaveBeenCalledTimes(2)
    expect(errorSpy.mock.calls[0][0]).toMatchObject(fishyError)
    expect(errorSpy.mock.calls[1][0]).toMatchObject(fishyError)

    await announceApplicationsReady({ applications })
    expect(ready).toHaveBeenCalledTimes(2)
  })
})

describe('announceCustomScripts', () => {
  afterEach(() => {
    document.getElementsByTagName('html')[0].innerHTML = ''
  })

  it('injects basic scripts', () => {
    announceCustomScripts({
      runtimeConfiguration: { scripts: [{ src: 'foo.js' }, { src: 'bar.js' }] }
    })
    const elements = document.getElementsByTagName('script')
    expect(elements.length).toBe(2)
  })

  it('skips the injection if no src option is provided', () => {
    announceCustomScripts({ runtimeConfiguration: { scripts: [{}, {}, {}, {}, {}] } })
    const elements = document.getElementsByTagName('script')
    expect(elements.length).toBeFalsy()
  })

  it('loads scripts synchronous by default', () => {
    announceCustomScripts({ runtimeConfiguration: { scripts: [{ src: 'foo.js' }] } })
    const element = document.querySelector<HTMLScriptElement>('[src="foo.js"]')
    expect(element.async).toBeFalsy()
  })

  it('injects scripts async if the corresponding configurations option is set', () => {
    announceCustomScripts({ runtimeConfiguration: { scripts: [{ src: 'foo.js', async: true }] } })
    const element = document.querySelector<HTMLScriptElement>('[src="foo.js"]')
    expect(element.async).toBeTruthy()
  })
})

describe('announceCustomStyles', () => {
  afterEach(() => {
    document.getElementsByTagName('html')[0].innerHTML = ''
  })

  it('injects basic styles', () => {
    const styles = [{ href: 'foo.css' }, { href: 'bar.css' }]
    announceCustomStyles({ runtimeConfiguration: { styles } })

    styles.forEach(({ href }) => {
      const element = document.querySelector<HTMLLinkElement>(`[href="${href}"]`)
      expect(element).toBeTruthy()
      expect(element.type).toBe('text/css')
      expect(element.rel).toBe('stylesheet')
    })
  })

  it('skips the injection if no href option is provided', () => {
    announceCustomStyles({ runtimeConfiguration: { styles: [{}, {}] } })
    const elements = document.getElementsByTagName('link')
    expect(elements.length).toBeFalsy()
  })
})
