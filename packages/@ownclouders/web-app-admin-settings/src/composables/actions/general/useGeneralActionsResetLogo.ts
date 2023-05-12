import { Store } from 'vuex'
import { useGettext } from 'vue3-gettext'
import { computed } from 'vue'
import { useAbility, useClientService, useRouter, useStore } from 'web-pkg/src/composables'
import { Action } from 'web-pkg/src/composables/actions'

export const useGeneralActionsResetLogo = ({ store }: { store?: Store<any> }) => {
  store = store || useStore()
  const { $gettext } = useGettext()
  const ability = useAbility()
  const clientService = useClientService()
  const router = useRouter()

  const handler = async () => {
    try {
      const httpClient = clientService.httpAuthenticated
      await httpClient.delete('/branding/logo')
      store.dispatch('showMessage', {
        title: $gettext('Logo was reset successfully. Reloading page...')
      })
      setTimeout(() => {
        router.go(0)
      }, 1000)
    } catch (e) {
      console.error(e)
      store.dispatch('showMessage', {
        title: $gettext('Failed to reset logo'),
        status: 'danger'
      })
    }
  }

  const actions = computed((): Action[] => [
    {
      name: 'reset-logo',
      icon: 'restart',
      label: () => {
        return $gettext('Reset logo')
      },
      isEnabled: () => {
        return ability.can('update-all', 'Logo')
      },
      handler,
      componentType: 'button',
      class: 'oc-general-actions-reset-logo-trigger'
    }
  ])

  return {
    actions
  }
}
