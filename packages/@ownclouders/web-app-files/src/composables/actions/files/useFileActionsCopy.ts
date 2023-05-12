import {
  isLocationCommonActive,
  isLocationPublicActive,
  isLocationSpacesActive
} from '../../../router'
import { Store } from 'vuex'
import { computed, unref } from 'vue'
import { useRouter, useStore } from 'web-pkg/src/composables'
import { useGettext } from 'vue3-gettext'
import { FileAction, FileActionOptions } from 'web-pkg/src/composables/actions'

export const useFileActionsCopy = ({ store }: { store?: Store<any> } = {}) => {
  store = store || useStore()
  const router = useRouter()

  const language = useGettext()
  const { $pgettext } = language

  const isMacOs = computed(() => {
    return window.navigator.platform.match('Mac')
  })

  const copyShortcutString = computed(() => {
    if (unref(isMacOs)) {
      return $pgettext('Keyboard shortcut for macOS for copying files', '⌘ + C')
    }
    return $pgettext('Keyboard shortcut for non-macOS systems for copying files', 'Ctrl + C')
  })

  const handler = ({ space, resources }: FileActionOptions) => {
    store.dispatch('Files/copySelectedFiles', { ...language, space, resources })
  }

  const actions = computed((): FileAction[] => {
    return [
      {
        name: 'copy',
        icon: 'file-copy-2',
        handler,
        shortcut: unref(copyShortcutString),
        label: () =>
          $pgettext('Action in the files list row to initiate copying resources', 'Copy'),
        isEnabled: ({ resources }) => {
          if (
            !isLocationSpacesActive(router, 'files-spaces-generic') &&
            !isLocationPublicActive(router, 'files-public-link') &&
            !isLocationCommonActive(router, 'files-common-favorites')
          ) {
            return false
          }
          if (isLocationSpacesActive(router, 'files-spaces-projects')) {
            return false
          }
          if (resources.length === 0) {
            return false
          }

          if (isLocationPublicActive(router, 'files-public-link')) {
            return store.getters['Files/currentFolder'].canCreate()
          }

          // copy can't be restricted in authenticated context, because
          // a user always has their home dir with write access
          return true
        },
        componentType: 'button',
        class: 'oc-files-actions-copy-trigger'
      }
    ]
  })

  return {
    actions
  }
}
