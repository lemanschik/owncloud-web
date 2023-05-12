import { computed } from 'vue'
import { Store } from 'vuex'
import { eventBus } from 'web-pkg'
import { useClientService, useStore } from 'web-pkg/src/composables'
import { GroupAction, GroupActionOptions } from 'web-pkg/src/composables/actions'
import { useGettext } from 'vue3-gettext'

export const useGroupActionsDelete = ({ store }: { store?: Store<any> }) => {
  store = store || useStore()
  const { $gettext, $ngettext } = useGettext()
  const clientService = useClientService()

  const deleteGroups = async (groups) => {
    const graphClient = clientService.graphAuthenticated
    const promises = groups.map((group) => graphClient.groups.deleteGroup(group.id))

    const results = await Promise.allSettled(promises)

    const succeeded = results.filter((r) => r.status === 'fulfilled')
    if (succeeded.length) {
      const title =
        succeeded.length === 1 && groups.length === 1
          ? $gettext('Group "%{group}" was deleted successfully', { group: groups[0].displayName })
          : $ngettext(
              '%{groupCount} group was deleted successfully',
              '%{groupCount} groups were deleted successfully',
              succeeded.length,
              { groupCount: succeeded.length.toString() },
              true
            )
      store.dispatch('showMessage', { title })
    }

    const failed = results.filter((r) => r.status === 'rejected')
    if (failed.length) {
      failed.forEach(console.error)

      const title =
        failed.length === 1 && groups.length === 1
          ? $gettext('Failed to delete group "%{group}"', { group: groups[0].displayName })
          : $ngettext(
              'Failed to delete %{groupCount} group',
              'Failed to delete %{groupCount} groups',
              failed.length,
              { groupCount: failed.length.toString() },
              true
            )
      store.dispatch('showMessage', { title, status: 'danger' })
    }

    store.dispatch('hideModal')
    eventBus.publish('app.admin-settings.list.load')
  }

  const handler = ({ resources }: GroupActionOptions) => {
    if (!resources.length) {
      return
    }

    const modal = {
      variation: 'danger',
      title: $ngettext(
        'Delete group "%{group}"?',
        'Delete %{groupCount} groups?',
        resources.length,
        {
          group: resources[0].displayName,
          groupCount: resources.length.toString()
        }
      ),
      cancelText: $gettext('Cancel'),
      confirmText: $gettext('Delete'),
      message: $ngettext(
        'Are you sure you want to delete this group?',
        'Are you sure you want to delete the %{groupCount} selected groups?',
        resources.length,
        {
          groupCount: resources.length.toString()
        }
      ),
      hasInput: false,
      onCancel: () => store.dispatch('hideModal'),
      onConfirm: () => deleteGroups(resources)
    }

    store.dispatch('createModal', modal)
  }

  const actions = computed((): GroupAction[] => [
    {
      name: 'delete',
      icon: 'delete-bin',
      label: () => {
        return $gettext('Delete')
      },
      handler,
      isEnabled: ({ resources }) => {
        return !!resources.length && !resources.some((r) => r.groupTypes?.includes('ReadOnly'))
      },
      componentType: 'button',
      class: 'oc-groups-actions-delete-trigger'
    }
  ])

  return {
    actions,
    // HACK: exported for unit tests:
    deleteGroups
  }
}
