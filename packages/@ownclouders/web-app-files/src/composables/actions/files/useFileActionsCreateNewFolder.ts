import { Resource, SpaceResource } from 'web-client/src/helpers'
import { Store } from 'vuex'
import { computed, unref } from 'vue'
import { useClientService, useRouter, useStore } from 'web-pkg/src/composables'
import { FileAction } from 'web-pkg/src/composables/actions'
import { useGettext } from 'vue3-gettext'
import { resolveFileNameDuplicate } from 'web-app-files/src/helpers/resource'
import { join } from 'path'
import { WebDAV } from 'web-client/src/webdav'
import { isLocationSpacesActive } from 'web-app-files/src/router'
import { getIndicators } from 'web-app-files/src/helpers/statusIndicators'

export const useFileActionsCreateNewFolder = ({
  store,
  space
}: { store?: Store<any>; space?: SpaceResource } = {}) => {
  store = store || useStore()
  const router = useRouter()
  const { $gettext } = useGettext()

  const clientService = useClientService()
  const currentFolder = computed((): Resource => store.getters['Files/currentFolder'])
  const files = computed((): Array<Resource> => store.getters['Files/files'])
  const ancestorMetaData = computed(() => store.getters['Files/ancestorMetaData'])

  const checkNewFolderName = (folderName) => {
    if (folderName.trim() === '') {
      return $gettext('Folder name cannot be empty')
    }

    if (/[/]/.test(folderName)) {
      return $gettext('Folder name cannot contain "/"')
    }

    if (folderName === '.') {
      return $gettext('Folder name cannot be equal to "."')
    }

    if (folderName === '..') {
      return $gettext('Folder name cannot be equal to ".."')
    }

    const exists = unref(files).find((file) => file.name === folderName)

    if (exists) {
      return $gettext('%{name} already exists', { name: folderName }, true)
    }

    return null
  }

  const loadIndicatorsForNewFile = computed(() => {
    return isLocationSpacesActive(router, 'files-spaces-generic') && space.driveType !== 'share'
  })

  const addNewFolder = async (folderName) => {
    folderName = folderName.trimEnd()

    try {
      const path = join(unref(currentFolder).path, folderName)
      const resource = await (clientService.webdav as WebDAV).createFolder(space, {
        path
      })

      if (unref(loadIndicatorsForNewFile)) {
        resource.indicators = getIndicators({ resource, ancestorMetaData: unref(ancestorMetaData) })
      }

      store.commit('Files/UPSERT_RESOURCE', resource)
      store.dispatch('hideModal')

      store.dispatch('showMessage', {
        title: $gettext('"%{folderName}" was created successfully', { folderName })
      })
    } catch (error) {
      console.error(error)
      store.dispatch('showMessage', {
        title: $gettext('Failed to create folder'),
        status: 'danger'
      })
    }
  }

  const handler = () => {
    const checkInputValue = (value) => {
      store.dispatch('setModalInputErrorMessage', checkNewFolderName(value))
    }
    let defaultName = $gettext('New folder')

    if (unref(files).some((f) => f.name === defaultName)) {
      defaultName = resolveFileNameDuplicate(defaultName, '', unref(files))
    }

    const inputSelectionRange = null

    const modal = {
      variation: 'passive',
      title: $gettext('Create a new folder'),
      cancelText: $gettext('Cancel'),
      confirmText: $gettext('Create'),
      hasInput: true,
      inputValue: defaultName,
      inputLabel: $gettext('Folder name'),
      inputError: checkNewFolderName(defaultName),
      inputSelectionRange,
      onCancel: () => store.dispatch('hideModal'),
      onConfirm: addNewFolder,
      onInput: checkInputValue
    }

    store.dispatch('createModal', modal)
  }

  const actions = computed((): FileAction[] => {
    return [
      {
        name: 'create-folder',
        icon: 'folder',
        handler,
        label: () => {
          return $gettext('New Folder')
        },
        isEnabled: () => {
          return unref(currentFolder)?.canCreate()
        },
        canBeDefault: true,
        componentType: 'button',
        class: 'oc-files-actions-create-new-folder'
      }
    ]
  })

  return {
    actions,
    checkNewFolderName,
    addNewFolder
  }
}
