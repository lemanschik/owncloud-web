<template>
  <app-loading-spinner v-if="isLoading" />
  <main v-else id="account" class="oc-height-1-1 oc-m">
    <div class="oc-flex oc-flex-between oc-flex-bottom oc-width-1-1 oc-border-b oc-py">
      <h1 id="account-page-title" class="oc-page-title oc-m-rm">{{ pageTitle }}</h1>
      <div>
        <edit-password-modal
          v-if="editPasswordModalOpen"
          @cancel="closeEditPasswordModal"
          @confirm="editPassword"
        ></edit-password-modal>
        <oc-button
          v-if="isChangePasswordEnabled"
          variation="primary"
          data-testid="account-page-edit-url-btn"
          @click="showEditPasswordModal"
        >
          <oc-icon name="lock" />
          <span v-text="$gettext('Change Password')" />
        </oc-button>
        <oc-button
          v-if="accountEditLink"
          variation="primary"
          type="a"
          :href="accountEditLink.href"
          target="_blank"
          data-testid="account-page-edit-url-btn"
        >
          <oc-icon name="edit" />
          <span v-text="$gettext('Edit')" />
        </oc-button>
      </div>
    </div>
    <h2 class="oc-text-bold oc-mb" v-text="$gettext('Account Information')" />
    <dl class="account-page-info oc-flex oc-flex-wrap">
      <div class="account-page-info-username oc-mb oc-width-1-2@s">
        <dt class="oc-text-normal oc-text-muted" v-text="$gettext('Username')" />
        <dd>
          {{ user.username || user.id }}
        </dd>
      </div>
      <div v-if="user.username && user.id" class="account-page-info-userid">
        <dt class="oc-text-normal oc-text-muted" v-text="$gettext('User ID')" />
        <dd>
          {{ user.id }}
        </dd>
      </div>
      <div class="account-page-info-displayname oc-mb oc-width-1-2@s">
        <dt class="oc-text-normal oc-text-muted" v-text="$gettext('Display name')" />
        <dd>
          {{ user.displayname }}
        </dd>
      </div>
      <div class="account-page-info-email oc-mb oc-width-1-2@s">
        <dt class="oc-text-normal oc-text-muted" v-text="$gettext('Email')" />
        <dd>
          <template v-if="user.email">{{ user.email }}</template>
          <span v-else v-text="$gettext('No email has been set up')" />
        </dd>
      </div>
      <div class="account-page-info-groups oc-mb oc-width-1-2@s">
        <dt class="oc-text-normal oc-text-muted" v-text="$gettext('Group memberships')" />
        <dd data-testid="group-names">
          <span v-if="groupNames">{{ groupNames }}</span>
          <span
            v-else
            data-testid="group-names-empty"
            v-text="$gettext('You are not part of any group')"
          />
        </dd>
      </div>
      <div
        v-if="isSettingsServiceSupported"
        class="account-page-info-language oc-mb oc-width-1-2@s"
      >
        <dt class="oc-text-normal oc-text-muted" v-text="$gettext('Language')" />
        <dd data-testid="language">
          <oc-select
            v-if="languageOptions"
            :placeholder="$gettext('Please choose...')"
            :model-value="selectedLanguageValue"
            :clearable="false"
            :options="languageOptions"
            @update:model-value="updateSelectedLanguage"
          />
        </dd>
      </div>
      <div v-if="logoutUrl" class="account-page-logout-all-devices oc-mb oc-width-1-2@s">
        <dt class="oc-text-normal oc-text-muted" v-text="$gettext('Logout from active devices')" />
        <dd data-testid="logout">
          <oc-button
            appearance="raw"
            type="a"
            :href="logoutUrl"
            target="_blank"
            data-testid="account-page-logout-url-btn"
          >
            <span v-text="$gettext('Show devices')" />
          </oc-button>
        </dd>
      </div>
      <div v-if="showGdprExport" class="account-page-gdpr-export oc-mb oc-width-1-2@s">
        <dt class="oc-text-normal oc-text-muted" v-text="$gettext('GDPR export')" />
        <dd data-testid="gdpr-export">
          <gdpr-export />
        </dd>
      </div>
      <div v-if="isSettingsServiceSupported" class="account-page-notification oc-mb oc-width-1-2@s">
        <dt class="oc-text-normal oc-text-muted" v-text="$gettext('Notifications')" />
        <dd data-testid="notification-mails">
          <oc-checkbox
            :model-value="disableEmailNotificationsValue"
            size="large"
            :label="$gettext('Receive notification mails')"
            data-testid="account-page-notification-mails-checkbox"
            @update:model-value="updateDisableEmailNotifications"
          />
        </dd>
      </div>
    </dl>
  </main>
</template>

<script lang="ts">
import { mapActions } from 'vuex'
import EditPasswordModal from '../components/EditPasswordModal.vue'
import { SettingsBundle, LanguageOption, SettingsValue } from '../helpers/settings'
import { computed, defineComponent, onMounted, unref, ref } from 'vue'
import {
  useCapabilityGraphPersonalDataExport,
  useCapabilitySpacesEnabled,
  useClientService,
  useStore
} from 'web-pkg/src/composables'
import { useTask } from 'vue-concurrency'
import { useGettext } from 'vue3-gettext'
import { setCurrentLanguage } from 'web-runtime/src/helpers/language'
import GdprExport from 'web-runtime/src/components/Account/GdprExport.vue'
import { useConfigurationManager } from 'web-pkg/src/composables/configuration'
import { isPersonalSpaceResource } from 'web-client/src/helpers'
import AppLoadingSpinner from 'web-pkg/src/components/AppLoadingSpinner.vue'

export default defineComponent({
  name: 'AccountPage',
  components: {
    AppLoadingSpinner,
    EditPasswordModal,
    GdprExport
  },
  setup() {
    const store = useStore()
    const language = useGettext()
    const { $gettext } = language
    const clientService = useClientService()
    const configurationManager = useConfigurationManager()
    const valuesList = ref<SettingsValue[]>()
    const accountBundle = ref<SettingsBundle>()
    const selectedLanguageValue = ref<LanguageOption>()
    const disableEmailNotificationsValue = ref<boolean>()

    // FIXME: Use graph capability when we have it
    const isSettingsServiceSupported = useCapabilitySpacesEnabled()
    const isChangePasswordEnabled = useCapabilitySpacesEnabled()
    const isPersonalDataExportEnabled = useCapabilityGraphPersonalDataExport()
    const user = computed(() => {
      return store.getters.user
    })

    const showGdprExport = computed(() => {
      return (
        unref(isPersonalDataExportEnabled) &&
        store.getters['runtime/spaces/spaces'].some((s) => isPersonalSpaceResource(s))
      )
    })

    const loadValuesListTask = useTask(function* () {
      try {
        const {
          data: { values }
        } = yield clientService.httpAuthenticated.post('/api/v0/settings/values-list', {
          account_uuid: 'me'
        })
        valuesList.value = values || []
      } catch (e) {
        console.error(e)
        store.dispatch('showMessage', {
          title: $gettext('Unable to load account data…'),
          status: 'danger'
        })
        valuesList.value = []
      }
    }).restartable()

    const loadAccountBundleTask = useTask(function* () {
      try {
        const {
          data: { bundles }
        } = yield clientService.httpAuthenticated.post('/api/v0/settings/bundles-list', {})
        accountBundle.value = bundles?.find((b) => b.extension === 'ocis-accounts')
      } catch (e) {
        console.error(e)
        store.dispatch('showMessage', {
          title: $gettext('Unable to load account data…'),
          status: 'danger'
        })
        accountBundle.value = undefined
      }
    }).restartable()

    const isLoading = computed(() => {
      if (!unref(isSettingsServiceSupported)) {
        return false
      }
      return (
        loadValuesListTask.isRunning ||
        !loadValuesListTask.last ||
        loadAccountBundleTask.isRunning ||
        !loadAccountBundleTask.last
      )
    })

    const languageOptions = computed(() => {
      const languageOptions = unref(accountBundle)?.settings?.find((s) => s.name === 'language')
        ?.singleChoiceValue.options
      return languageOptions?.map((l) => ({
        label: l.displayValue,
        value: l.value.stringValue
      }))
    })

    const groupNames = computed(() => {
      if (unref(useCapabilitySpacesEnabled())) {
        return unref(user)
          .groups.map((group) => group.displayName)
          .join(', ')
      }

      return unref(user).groups.join(', ')
    })

    const saveValue = async ({
      identifier,
      valueOptions
    }: {
      identifier: string
      valueOptions: Record<string, any>
    }) => {
      const valueId = unref(valuesList)?.find((cV) => cV.identifier.setting === identifier)?.value
        ?.id

      const value = {
        bundleId: unref(accountBundle)?.id,
        settingId: unref(accountBundle)?.settings?.find((s) => s.name === identifier)?.id,
        resource: { type: 'TYPE_USER' },
        accountUuid: 'me',
        ...valueOptions,
        ...(valueId && { id: valueId })
      }

      try {
        await clientService.httpAuthenticated.post('/api/v0/settings/values-save', {
          value: {
            accountUuid: 'me',
            ...value
          }
        })

        /**
         * Edge case: we need to reload the values list to retrieve the valueId if not set,
         * otherwise the backend saves multiple entries
         */
        if (!valueId) {
          loadValuesListTask.perform()
        }

        return value
      } catch (e) {
        throw e
      }
    }

    const updateSelectedLanguage = async (option: LanguageOption) => {
      try {
        const value = await saveValue({
          identifier: 'language',
          valueOptions: { listValue: { values: [{ stringValue: option.value }] } }
        })
        selectedLanguageValue.value = option
        setCurrentLanguage({
          language,
          languageSetting: {
            identifier: {
              extension: 'ocis-accounts',
              bundle: 'profile',
              setting: 'language'
            },
            value
          }
        })
        store.dispatch('showMessage', {
          title: $gettext('Language was saved successfully.')
        })
      } catch (e) {
        console.error(e)
        store.dispatch('showMessage', {
          title: $gettext('Saving language failed…'),
          status: 'danger'
        })
      }
    }

    const updateDisableEmailNotifications = async (option: boolean) => {
      try {
        await saveValue({
          identifier: 'disable-email-notifications',
          valueOptions: { boolValue: !option }
        })
        disableEmailNotificationsValue.value = option
        store.dispatch('showMessage', {
          title: $gettext('Email notifications preference saved successfully.')
        })
      } catch (e) {
        console.error(e)
        store.dispatch('showMessage', {
          title: $gettext('Unable to save email notifications preference…'),
          status: 'danger'
        })
      }
    }

    onMounted(async () => {
      if (unref(isSettingsServiceSupported)) {
        await loadAccountBundleTask.perform()
        await loadValuesListTask.perform()

        const languageConfiguration = unref(valuesList)?.find(
          (cV) => cV.identifier.setting === 'language'
        )
        selectedLanguageValue.value = languageConfiguration
          ? unref(languageOptions)?.find(
              (lO) => lO.value === languageConfiguration.value?.listValue?.values?.[0]?.stringValue
            )
          : unref(languageOptions)?.find((o) => o.value === language.current)

        const disableEmailNotificationsConfiguration = unref(valuesList)?.find(
          (cV) => cV.identifier.setting === 'disable-email-notifications'
        )

        disableEmailNotificationsValue.value = disableEmailNotificationsConfiguration
          ? !disableEmailNotificationsConfiguration.value?.boolValue
          : true
      }
    })

    return {
      clientService,
      languageOptions,
      selectedLanguageValue,
      updateSelectedLanguage,
      updateDisableEmailNotifications,
      accountEditLink: store.getters.configuration?.options?.accountEditLink,
      isChangePasswordEnabled,
      showGdprExport,
      isSettingsServiceSupported,
      groupNames,
      user,
      logoutUrl: configurationManager.logoutUrl,
      isLoading,
      disableEmailNotificationsValue,
      loadAccountBundleTask,
      loadValuesListTask
    }
  },
  data() {
    return {
      editPasswordModalOpen: false
    }
  },
  computed: {
    pageTitle() {
      return this.$gettext(this.$route.meta.title as string)
    }
  },
  methods: {
    ...mapActions(['showMessage']),
    showEditPasswordModal() {
      this.editPasswordModalOpen = true
    },
    closeEditPasswordModal() {
      this.editPasswordModalOpen = false
    },
    editPassword(currentPassword, newPassword) {
      return this.clientService.graphAuthenticated.users
        .changeOwnPassword(currentPassword.trim(), newPassword.trim())
        .then(() => {
          this.closeEditPasswordModal()
          this.showMessage({
            title: this.$gettext('Password was changed successfully')
          })
        })
        .catch((error) => {
          console.error(error)
          this.showMessage({
            title: this.$gettext('Failed to change password'),
            status: 'danger'
          })
        })
    }
  }
})
</script>
<style lang="scss">
.account-page-info dd {
  margin-left: 0;
}
</style>
