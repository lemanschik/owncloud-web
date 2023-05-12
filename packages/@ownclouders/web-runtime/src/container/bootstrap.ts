import { registerClient } from '../services/clientRegistration'
import { RuntimeConfiguration } from './types'
import { buildApplication, NextApplication } from './application'
import { Store } from 'vuex'
import { Router } from 'vue-router'
import { App, unref } from 'vue'
import { loadTheme } from '../helpers/theme'
import OwnCloud from 'owncloud-sdk'
import { createGettext, GetTextOptions } from 'vue3-gettext'
import { getBackendVersion, getWebVersion } from './versions'
import { useLocalStorage } from 'web-pkg/src/composables'
import { useDefaultThemeName } from '../composables'
import { authService } from '../services/auth'
import { ClientService, LoadingService, PreviewService } from 'web-pkg/src/services'
import { UppyService } from '../services/uppyService'
import { default as storeOptions } from '../store'
import { init as sentryInit } from '@sentry/vue'
import { configurationManager, RawConfig, ConfigurationManager } from 'web-pkg/src/configuration'
import { webdav } from 'web-client/src/webdav'
import { v4 as uuidV4 } from 'uuid'

/**
 * fetch runtime configuration, this step is optional, all later steps can use a static
 * configuration object as well
 *
 * @remarks
 * does not check if the configuration is valid, for now be careful until a schema is declared
 *
 * @param path - path to main configuration
 */
export const announceConfiguration = async (path: string): Promise<RuntimeConfiguration> => {
  const request = await fetch(path, { headers: { 'X-Request-ID': uuidV4() } })
  if (request.status !== 200) {
    throw new Error(`config could not be loaded. HTTP status-code ${request.status}`)
  }

  const rawConfig = (await request.json().catch((error) => {
    throw new Error(`config could not be parsed. ${error}`)
  })) as RawConfig
  configurationManager.initialize(rawConfig)
  // TODO: we might want to get rid of exposing the raw config. needs more refactoring though.
  return rawConfig
}

/**
 * Announce and prepare vuex store with data that is needed before any application gets announced.
 *
 * @param vue
 * @param runtimeConfiguration
 * @param language
 */
export const announceStore = async ({
  runtimeConfiguration
}: {
  runtimeConfiguration: RuntimeConfiguration
}): Promise<any> => {
  const store = new Store({ ...storeOptions })
  await store.dispatch('loadConfig', runtimeConfiguration)

  /**
   * TODO: Find a different way to access store from within JS files
   * potential options are:
   * - use the api which already is in place but deprecated
   * - use a global object
   *
   * at the moment it is not clear if this api should be exposed or not.
   * we need to decide if we extend the api more or just expose the store and de deprecate
   * the apis for retrieving it.
   */
  ;(window as any).__$store = store
  return store
}

/**
 * announce auth client to the runtime, currently only openIdConnect is supported here
 *
 * @remarks
 * if runtimeConfiguration does not ship any options for openIdConnect this step get skipped
 *
 * @param runtimeConfiguration
 */
export const announceClient = async (runtimeConfiguration: RuntimeConfiguration): Promise<void> => {
  const { openIdConnect = {} } = runtimeConfiguration

  if (!openIdConnect.dynamic) {
    return
  }

  const { client_id: clientId, client_secret: clientSecret } = await registerClient(openIdConnect)
  openIdConnect.client_id = clientId
  openIdConnect.client_secret = clientSecret
}

/**
 * announce applications to the runtime, it takes care that all requirements are fulfilled and then:
 * - bulk build all applications
 * - bulk register all applications, no other application is guaranteed to be registered here, don't request one
 *
 * @param app
 * @param runtimeConfiguration
 * @param store
 * @param router
 * @param translations
 * @param supportedLanguages
 */
export const initializeApplications = async ({
  app,
  runtimeConfiguration,
  configurationManager,
  store,
  router,
  translations,
  supportedLanguages
}: {
  app: App
  runtimeConfiguration: RuntimeConfiguration
  configurationManager: ConfigurationManager
  store: Store<unknown>
  router: Router
  translations: unknown
  supportedLanguages: { [key: string]: string }
}): Promise<NextApplication[]> => {
  const { apps: internalApplications = [], external_apps: externalApplications = [] } =
    rewriteDeprecatedAppNames(runtimeConfiguration)

  const applicationPaths = [
    ...internalApplications.map((application) => `web-app-${application}`),
    ...externalApplications.map((application) => application.path)
  ].filter(Boolean)

  const applicationResults = await Promise.allSettled(
    applicationPaths.map((applicationPath) =>
      buildApplication({
        app,
        applicationPath,
        store,
        supportedLanguages,
        router,
        translations,
        configurationManager
      })
    )
  )

  const applications = applicationResults.reduce<NextApplication[]>((acc, applicationResult) => {
    // we don't want to fail hard with the full system when one specific application can't get loaded. only log the error.
    if (applicationResult.status !== 'fulfilled') {
      console.error(applicationResult.reason)
    } else {
      acc.push(applicationResult.value)
    }

    return acc
  }, [])

  await Promise.all(applications.map((application) => application.initialize()))

  return applications
}

/**
 * Bulk activate all applications, all applications are registered, it's safe to request a application api here
 *
 * @param applications
 */
export const announceApplicationsReady = async ({
  applications
}: {
  applications: NextApplication[]
}): Promise<void> => {
  await Promise.all(applications.map((application) => application.ready()))
}

/**
 * Rewrites old names of renamed apps to their new name and prints a warning to adjust configuration to the respective new app name.
 *
 * @param {RuntimeConfiguration} runtimeConfiguration
 */
const rewriteDeprecatedAppNames = (
  runtimeConfiguration: RuntimeConfiguration
): RuntimeConfiguration => {
  const appAliases = [
    { name: 'preview', oldName: 'media-viewer' },
    { name: 'text-editor', oldName: 'markdown-editor' },
    { name: 'admin-settings', oldName: 'user-management' }
  ]
  return {
    ...runtimeConfiguration,
    apps: runtimeConfiguration.apps.map((appName) => {
      const appAlias = appAliases.find((appAlias) => appAlias.oldName === appName)
      if (appAlias) {
        console.warn(`app "${appAlias.oldName}" has been renamed, use "${appAlias.name}" instead.`)
        return appAlias.name
      }
      return appName
    })
  }
}

/**
 * announce runtime theme to the runtime, this also takes care that the store
 * and designSystem has all needed information to render the customized ui
 *
 * @param themeLocation
 * @param store
 * @param vue
 * @param designSystem
 */
export const announceTheme = async ({
  store,
  app,
  designSystem,
  runtimeConfiguration
}: {
  store: Store<unknown>
  app: App
  designSystem: any
  runtimeConfiguration?: RuntimeConfiguration
}): Promise<void> => {
  const { theme } = await loadTheme(runtimeConfiguration?.theme)
  await store.dispatch('loadThemes', { theme })
  const currentThemeName = useLocalStorage('oc_currentThemeName', null) // note: use null as default so that we can fall back to system preferences
  if (unref(currentThemeName) === null) {
    currentThemeName.value = useDefaultThemeName()
  }
  await store.dispatch('loadTheme', { theme: theme[unref(currentThemeName)] || theme.default })

  app.use(designSystem, {
    tokens: store.getters.theme.designTokens
  })
}

/**
 * announce runtime translations by injecting them into the getTextPlugin
 *
 * @param vue
 * @param options
 */
export const announceTranslations = ({
  app,
  ...options
}: {
  app: App
} & Partial<GetTextOptions>): void => {
  app.use(
    createGettext({
      defaultLanguage: navigator.language.substring(0, 2),
      silent: true,
      ...options
    })
  )
}

/**
 * announce clientService and owncloud SDK and inject it into vue
 *
 * @param vue
 * @param runtimeConfiguration
 * @param configurationManager
 * @param store
 */
export const announceClientService = ({
  app,
  runtimeConfiguration,
  configurationManager,
  store
}: {
  app: App
  runtimeConfiguration: RuntimeConfiguration
  configurationManager: ConfigurationManager
  store: Store<any>
}): void => {
  const sdk = new OwnCloud()
  sdk.init({ baseUrl: runtimeConfiguration.server || window.location.origin })
  const clientService = new ClientService({
    configurationManager,
    language: app.config.globalProperties.$language,
    store
  })
  app.config.globalProperties.$client = sdk
  app.config.globalProperties.$clientService = clientService
  app.config.globalProperties.$clientService.owncloudSdk = sdk
  app.config.globalProperties.$clientService.webdav = webdav({
    sdk
  })
}

/**
 * @param vue
 */
export const announceLoadingService = ({ app }: { app: App }): void => {
  const loadingService = new LoadingService()
  app.config.globalProperties.$loadingService = loadingService
}

/**
 * announce uppyService and inject it into vue
 *
 * @param vue
 */
export const announceUppyService = ({ app }: { app: App }): void => {
  app.config.globalProperties.$uppyService = new UppyService()
}

/**
 * @param vue
 * @param store
 * @param configurationManager
 */
export const announcePreviewService = ({
  app,
  store,
  configurationManager
}: {
  app: App
  store: Store<any>
  configurationManager: ConfigurationManager
}): void => {
  const clientService = app.config.globalProperties.$clientService
  const previewService = new PreviewService({ store, clientService, configurationManager })
  app.config.globalProperties.$previewService = previewService
}

/**
 * announce authService and inject it into vue
 *
 * @param vue
 * @param configurationManager
 * @param store
 * @param router
 */
export const announceAuthService = ({
  app,
  configurationManager,
  store,
  router
}: {
  app: App
  configurationManager: ConfigurationManager
  store: Store<any>
  router: Router
}): void => {
  const ability = app.config.globalProperties.$ability
  const language = app.config.globalProperties.$language
  const clientService = app.config.globalProperties.$clientService
  authService.initialize(configurationManager, clientService, store, router, ability, language)
  app.config.globalProperties.$authService = authService
}

/**
 * announce runtime defaults, this is usual the last needed announcement before rendering the actual ui
 *
 * @param vue
 * @param store
 * @param router
 */
export const announceDefaults = ({
  store,
  router
}: {
  store: Store<unknown>
  router: Router
}): void => {
  // set home route
  const appIds = store.getters.appIds
  let defaultExtensionId = store.getters.configuration.options.defaultExtension
  if (!defaultExtensionId || appIds.indexOf(defaultExtensionId) < 0) {
    defaultExtensionId = appIds[0]
  }

  let route = router.getRoutes().find((r) => {
    return r.path.startsWith(`/${defaultExtensionId}`) && r.meta?.entryPoint === true
  })
  if (!route) {
    route = store.getters.getNavItemsByExtension(defaultExtensionId)[0]?.route
  }
  if (route) {
    router.addRoute({
      path: '/',
      redirect: () => route
    })
  }
}

/**
 * announce some version numbers
 *
 * @param store
 */
export const announceVersions = ({ store }: { store: Store<unknown> }): void => {
  const versions = [getWebVersion(), getBackendVersion({ store })].filter(Boolean)
  versions.forEach((version) => {
    console.log(
      `%c ${version} `,
      'background-color: #041E42; color: #FFFFFF; font-weight: bold; border: 1px solid #FFFFFF; padding: 5px;'
    )
  })
}

/**
 * starts the sentry monitor
 *
 * @remarks
 * if runtimeConfiguration does not contain dsn sentry will not be started
 *
 * @param runtimeConfiguration
 */
export const startSentry = (runtimeConfiguration: RuntimeConfiguration, app: App): void => {
  if (runtimeConfiguration.sentry?.dsn) {
    const { dsn, environment = 'production', ...moreSentryOptions } = runtimeConfiguration.sentry

    sentryInit({
      app,
      dsn,
      environment,
      attachProps: true,
      logErrors: true,
      ...moreSentryOptions
    })
  }
}

/**
 * announceCustomScripts injects custom header scripts.
 *
 * @param runtimeConfiguration
 */
export const announceCustomScripts = ({
  runtimeConfiguration
}: {
  runtimeConfiguration?: RuntimeConfiguration
}): void => {
  const { scripts = [] } = runtimeConfiguration

  scripts.forEach(({ src = '', async = false }) => {
    if (!src) {
      return
    }

    const script = document.createElement('script')
    script.src = src
    script.async = async
    document.head.appendChild(script)
  })
}

/**
 * announceCustomStyles injects custom header styles.
 *
 * @param runtimeConfiguration
 */
export const announceCustomStyles = ({
  runtimeConfiguration
}: {
  runtimeConfiguration?: RuntimeConfiguration
}): void => {
  const { styles = [] } = runtimeConfiguration

  styles.forEach(({ href = '' }) => {
    if (!href) {
      return
    }

    const link = document.createElement('link')
    link.href = href
    link.type = 'text/css'
    link.rel = 'stylesheet'
    document.head.appendChild(link)
  })
}
