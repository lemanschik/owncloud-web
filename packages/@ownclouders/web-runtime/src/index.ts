import { DesignSystem as designSystem, pages, translations, supportedLanguages } from './defaults'
import { router } from './router'
import { configurationManager } from 'web-pkg/src/configuration'
import { createHead } from '@vueuse/head'
import { abilitiesPlugin } from '@casl/vue'
import { createMongoAbility } from '@casl/ability'
import merge from 'lodash-es/merge'

import {
  announceConfiguration,
  initializeApplications,
  announceApplicationsReady,
  announceClient,
  announceDefaults,
  announceClientService,
  announceStore,
  announceTheme,
  announceCustomStyles,
  announceTranslations,
  announceVersions,
  announceUppyService,
  announceAuthService,
  startSentry,
  announceCustomScripts,
  announceLoadingService,
  announcePreviewService
} from './container/bootstrap'
import { applicationStore } from './container/store'
import {
  buildPublicSpaceResource,
  buildSpace,
  isPersonalSpaceResource,
  isPublicSpaceResource,
  Resource
} from 'web-client/src/helpers'
import { loadCustomTranslations } from 'web-runtime/src/helpers/customTranslations'
import { WebDAV } from 'web-client/src/webdav'
import { DavProperty } from 'web-client/src/webdav/constants'
import { createApp } from 'vue'
import PortalVue, { createWormhole } from 'portal-vue'

import Avatar from './components/Avatar.vue'
import focusMixin from './mixins/focusMixin'

export const bootstrapApp = async (configurationPath: string): Promise<void> => {
  const app = createApp(pages.success)

  const runtimeConfiguration = await announceConfiguration(configurationPath)
  startSentry(runtimeConfiguration, app)

  const store = await announceStore({ runtimeConfiguration })
  app.use(abilitiesPlugin, createMongoAbility([]), { useGlobalProperties: true })

  const applicationsPromise = initializeApplications({
    app,
    runtimeConfiguration,
    configurationManager,
    store,
    supportedLanguages,
    router,
    translations
  })
  const customTranslationsPromise = loadCustomTranslations({ configurationManager })
  const themePromise = announceTheme({ store, app, designSystem, runtimeConfiguration })
  const [customTranslations] = await Promise.all([
    customTranslationsPromise,
    applicationsPromise,
    themePromise
  ])

  announceTranslations({
    app,
    availableLanguages: supportedLanguages,
    translations: merge(translations, customTranslations)
  })
  announceClientService({ app, runtimeConfiguration, configurationManager, store })
  announceUppyService({ app })
  announceLoadingService({ app })
  announcePreviewService({ app, store, configurationManager })
  await announceClient(runtimeConfiguration)
  announceAuthService({ app, configurationManager, store, router })
  announceCustomStyles({ runtimeConfiguration })
  announceCustomScripts({ runtimeConfiguration })
  announceDefaults({ store, router })

  app.use(router)
  app.use(store)
  app.use(createHead())
  app.config.globalProperties.$wormhole = createWormhole()
  app.use(PortalVue, {
    wormhole: app.config.globalProperties.$wormhole
  })

  app.component('AvatarImage', Avatar)
  app.mixin(focusMixin)

  app.mount('#owncloud')

  const applications = Array.from(applicationStore.values())
  applications.forEach((application) => application.mounted(app))

  store.watch(
    (state, getters) =>
      getters['runtime/auth/isUserContextReady'] ||
      getters['runtime/auth/isIdpContextReady'] ||
      getters['runtime/auth/isPublicLinkContextReady'],
    async (newValue, oldValue) => {
      if (!newValue || newValue === oldValue) {
        return
      }
      announceVersions({ store })
      await announceApplicationsReady({ applications })
    },
    {
      immediate: true
    }
  )

  store.watch(
    (state, getters) => {
      return getters['runtime/auth/isUserContextReady']
    },
    async (userContextReady) => {
      if (!userContextReady) {
        return
      }
      const clientService = app.config.globalProperties.$clientService

      // Load spaces to make them available across the application
      if (store.getters.capabilities?.spaces?.enabled) {
        const graphClient = clientService.graphAuthenticated
        await store.dispatch('runtime/spaces/loadSpaces', { graphClient })
        const personalSpace = store.getters['runtime/spaces/spaces'].find((space) =>
          isPersonalSpaceResource(space)
        )

        if (!personalSpace) {
          return
        }

        store.commit('runtime/spaces/UPDATE_SPACE_FIELD', {
          id: personalSpace.id,
          field: 'name',
          value: app.config.globalProperties.$gettext('Personal')
        })
        return
      }

      // Spaces feature not available. Create a virtual personal space
      const user = store.getters.user
      const space = buildSpace({
        id: user.id,
        driveAlias: `personal/${user.id}`,
        driveType: 'personal',
        name: app.config.globalProperties.$gettext('All files'),
        webDavPath: `/files/${user.id}`,
        webDavTrashPath: `/trash-bin/${user.id}`,
        serverUrl: configurationManager.serverUrl
      })
      const personalHomeInfo = await (clientService.webdav as WebDAV).getFileInfo(
        space,
        {
          path: ''
        },
        { davProperties: [DavProperty.FileId] }
      )
      space.fileId = personalHomeInfo.fileId
      store.commit('runtime/spaces/ADD_SPACES', [space])
      store.commit('runtime/spaces/SET_SPACES_INITIALIZED', true)
    },
    {
      immediate: true
    }
  )
  store.watch(
    (state, getters) => {
      return getters['runtime/auth/isPublicLinkContextReady']
    },
    (publicLinkContextReady) => {
      if (!publicLinkContextReady) {
        return
      }
      // Create virtual space for public link
      const publicLinkToken = store.getters['runtime/auth/publicLinkToken']
      const publicLinkPassword = store.getters['runtime/auth/publicLinkPassword']
      const space = buildPublicSpaceResource({
        id: publicLinkToken,
        name: app.config.globalProperties.$gettext('Public files'),
        ...(publicLinkPassword && { publicLinkPassword }),
        serverUrl: configurationManager.serverUrl
      })
      store.commit('runtime/spaces/ADD_SPACES', [space])
      store.commit('runtime/spaces/SET_SPACES_INITIALIZED', true)
    },
    {
      immediate: true
    }
  )
  store.watch(
    // only needed if a public link gets re-resolved with a changed password prop (changed or removed).
    // don't need to set { immediate: true } on the watcher.
    (state, getters) => {
      return getters['runtime/auth/publicLinkPassword']
    },
    (publicLinkPassword: string | undefined) => {
      const publicLinkToken = store.getters['runtime/auth/publicLinkToken']
      const space = store.getters['runtime/spaces/spaces'].find((space: Resource) => {
        return isPublicSpaceResource(space) && space.id === publicLinkToken
      })
      if (!space) {
        return
      }
      space.publicLinkPassword = publicLinkPassword
    }
  )
}

export const bootstrapErrorApp = async (err: Error): Promise<void> => {
  const store = await announceStore({ runtimeConfiguration: {} })
  announceVersions({ store })
  const app = createApp(pages.failure)
  await announceTheme({ store, app, designSystem })
  console.error(err)
  app.use(store)
  await announceTranslations({
    app,
    availableLanguages: supportedLanguages,
    translations
  })
  app.mount('#owncloud')
}
;(window as any).runtimeLoaded({
  bootstrapApp,
  bootstrapErrorApp
})
