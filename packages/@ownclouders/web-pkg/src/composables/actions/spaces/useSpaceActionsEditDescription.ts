import { Drive } from 'web-client/src/generated'
import { computed, unref } from 'vue'
import { SpaceAction, SpaceActionOptions } from '../types'
import { useRoute } from '../../router'
import { useAbility, useClientService, useStore } from 'web-pkg/src/composables'
import { useGettext } from 'vue3-gettext'
import { Store } from 'vuex'
import { SpaceResource } from 'web-client/src'

export const useSpaceActionsEditDescription = ({ store }: { store?: Store<any> } = {}) => {
  store = store || useStore()
  const { $gettext } = useGettext()
  const ability = useAbility()
  const clientService = useClientService()
  const route = useRoute()

  const editDescriptionSpace = (space: SpaceResource, description: string) => {
    const graphClient = clientService.graphAuthenticated
    return graphClient.drives
      .updateDrive(space.id as string, { description } as Drive, {})
      .then(() => {
        store.dispatch('hideModal')
        store.commit('runtime/spaces/UPDATE_SPACE_FIELD', {
          id: space.id,
          field: 'description',
          value: description
        })
        if (unref(route).name === 'admin-settings-spaces') {
          space.description = description
        }
        store.dispatch('showMessage', {
          title: $gettext('Space subtitle was changed successfully')
        })
      })
      .catch((error) => {
        console.error(error)
        store.dispatch('showMessage', {
          title: $gettext('Failed to change space subtitle'),
          status: 'danger'
        })
      })
  }

  const handler = ({ resources }: SpaceActionOptions) => {
    if (resources.length !== 1) {
      return
    }

    const modal = {
      variation: 'passive',
      title: $gettext('Change subtitle for space') + ' ' + resources[0].name,
      cancelText: $gettext('Cancel'),
      confirmText: $gettext('Confirm'),
      hasInput: true,
      inputLabel: $gettext('Space subtitle'),
      inputValue: resources[0].description,
      onCancel: () => store.dispatch('hideModal'),
      onConfirm: (description) => editDescriptionSpace(resources[0], description)
    }

    store.dispatch('createModal', modal)
  }

  const actions = computed((): SpaceAction[] => [
    {
      name: 'editDescription',
      icon: 'h-2',
      iconFillType: 'none',
      label: () => {
        return $gettext('Edit subtitle')
      },
      handler,
      isEnabled: ({ resources }) => {
        if (resources.length !== 1) {
          return false
        }

        return resources[0].canEditDescription({ user: store.getters.user, ability })
      },
      componentType: 'button',
      class: 'oc-files-actions-edit-description-trigger'
    }
  ])

  return {
    actions,

    // HACK: exported for unit tests:
    editDescriptionSpace
  }
}
