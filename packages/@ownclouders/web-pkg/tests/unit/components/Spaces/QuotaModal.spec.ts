import QuotaModal from 'web-pkg/src/components/Spaces/QuotaModal.vue'
import {
  createStore,
  defaultComponentMocks,
  defaultPlugins,
  defaultStoreMockOptions,
  defaultStubs,
  mount,
  mockAxiosResolve
} from 'web-test-helpers'

describe('QuotaModal', () => {
  describe('method "editQuota"', () => {
    it('should show message on success', async () => {
      const { wrapper, mocks, storeOptions } = getWrapper()
      mocks.$clientService.graphAuthenticated.drives.updateDrive.mockImplementation(() =>
        mockAxiosResolve({
          id: '1fe58d8b-aa69-4c22-baf7-97dd57479f22',
          name: 'any',
          quota: {
            remaining: 9999999836,
            state: 'normal',
            total: 10000000000,
            used: 164
          }
        })
      )
      await wrapper.vm.editQuota()

      expect(
        storeOptions.modules.runtime.modules.spaces.mutations.UPDATE_SPACE_FIELD
      ).toHaveBeenCalledTimes(1)
      expect(storeOptions.actions.showMessage).toHaveBeenCalledTimes(1)
    })

    it('should show message on server error', async () => {
      jest.spyOn(console, 'error').mockImplementation(() => undefined)
      const { wrapper, mocks, storeOptions } = getWrapper()
      mocks.$clientService.graphAuthenticated.drives.updateDrive.mockRejectedValue(new Error())
      await wrapper.vm.editQuota()

      expect(
        storeOptions.modules.runtime.modules.spaces.mutations.UPDATE_SPACE_FIELD
      ).toHaveBeenCalledTimes(0)
      expect(storeOptions.actions.showMessage).toHaveBeenCalledTimes(1)
    })
  })
})

function getWrapper() {
  const storeOptions = defaultStoreMockOptions
  const mocks = defaultComponentMocks()
  const store = createStore(storeOptions)
  return {
    mocks,
    storeOptions,
    wrapper: mount(QuotaModal, {
      props: {
        cancel: jest.fn(),
        spaces: [
          {
            id: '1fe58d8b-aa69-4c22-baf7-97dd57479f22',
            spaceQuota: {
              remaining: 9999999836,
              state: 'normal',
              total: 10000000000,
              used: 164
            }
          }
        ]
      },
      global: {
        stubs: { ...defaultStubs, portal: true, 'oc-modal': true },
        mocks,
        plugins: [...defaultPlugins(), store]
      }
    })
  }
}
