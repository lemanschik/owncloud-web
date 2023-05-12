import { useSpaceActionsDisable } from 'web-pkg/src/composables/actions/spaces'
import { buildSpace, SpaceResource } from 'web-client/src/helpers'
import {
  createStore,
  defaultComponentMocks,
  mockAxiosResolve,
  defaultStoreMockOptions,
  RouteLocation,
  getComposableWrapper
} from 'web-test-helpers'
import { mock } from 'jest-mock-extended'
import { unref } from 'vue'

describe('disable', () => {
  describe('isEnabled property', () => {
    it('should be false when no resource given', () => {
      const { wrapper } = getWrapper({
        setup: ({ actions }) => {
          expect(unref(actions)[0].isEnabled({ resources: [] })).toBe(false)
        }
      })
    })
    it('should be true when the space is not disabled', () => {
      const spaceMock = {
        id: '1',
        root: {
          permissions: [{ roles: ['manager'], grantedToIdentities: [{ user: { id: 1 } }] }]
        }
      }
      const { wrapper } = getWrapper({
        setup: ({ actions }) => {
          expect(unref(actions)[0].isEnabled({ resources: [buildSpace(spaceMock)] })).toBe(true)
        }
      })
    })
    it('should be false when the space is disabled', () => {
      const spaceMock = {
        id: '1',
        root: {
          permissions: [{ roles: ['manager'], grantedToIdentities: [{ user: { id: 1 } }] }],
          deleted: { state: 'trashed' }
        }
      }
      const { wrapper } = getWrapper({
        setup: ({ actions }) => {
          expect(unref(actions)[0].isEnabled({ resources: [buildSpace(spaceMock)] })).toBe(false)
        }
      })
    })
    it('should be false when current user is a viewer', () => {
      const spaceMock = {
        id: '1',
        root: {
          permissions: [{ roles: ['viewer'], grantedToIdentities: [{ user: { id: 1 } }] }]
        }
      }
      const { wrapper } = getWrapper({
        setup: ({ actions }) => {
          expect(unref(actions)[0].isEnabled({ resources: [buildSpace(spaceMock)] })).toBe(false)
        }
      })
    })
  })

  describe('handler', () => {
    it('should trigger the disable modal window', async () => {
      const { wrapper } = getWrapper({
        setup: async ({ actions }, { storeOptions }) => {
          await unref(actions)[0].handler({
            resources: [mock<SpaceResource>({ id: 1, canDisable: () => true })]
          })

          expect(storeOptions.actions.createModal).toHaveBeenCalledTimes(1)
        }
      })
    })
    it('should not trigger the disable modal window without any resource', async () => {
      const { wrapper } = getWrapper({
        setup: async ({ actions }, { storeOptions }) => {
          await unref(actions)[0].handler({
            resources: [mock<SpaceResource>({ id: 1, canDisable: () => false })]
          })

          expect(storeOptions.actions.createModal).toHaveBeenCalledTimes(0)
        }
      })
    })
  })

  describe('method "disableSpace"', () => {
    it('should hide the modal on success', async () => {
      const { wrapper, mocks } = getWrapper({
        setup: async ({ disableSpaces }, { storeOptions, clientService }) => {
          clientService.graphAuthenticated.drives.deleteDrive.mockResolvedValue(mockAxiosResolve())
          await disableSpaces([mock<SpaceResource>({ id: 1, canDisable: () => true })])

          expect(storeOptions.actions.hideModal).toHaveBeenCalledTimes(1)
        }
      })
    })

    it('should show message on error', async () => {
      jest.spyOn(console, 'error').mockImplementation(() => undefined)
      const { wrapper } = getWrapper({
        setup: async ({ actions, disableSpaces }, { storeOptions, clientService }) => {
          clientService.graphAuthenticated.drives.deleteDrive.mockRejectedValue(new Error())
          await disableSpaces([mock<SpaceResource>({ id: 1, canDisable: () => true })])

          expect(storeOptions.actions.showMessage).toHaveBeenCalledTimes(1)
        }
      })
    })
  })
})

function getWrapper({
  setup
}: {
  setup: (
    instance: ReturnType<typeof useSpaceActionsDisable>,
    {
      storeOptions,
      clientService
    }: {
      storeOptions: typeof defaultStoreMockOptions
      clientService: ReturnType<typeof defaultComponentMocks>['$clientService']
    }
  ) => void
}) {
  const storeOptions = {
    ...defaultStoreMockOptions
  }
  storeOptions.getters.user.mockReturnValue({ id: 'alice', uuid: 1 })

  const store = createStore(storeOptions)
  const mocks = defaultComponentMocks({
    currentRoute: mock<RouteLocation>({ name: 'files-spaces-projects' })
  })
  return {
    mocks,
    wrapper: getComposableWrapper(
      () => {
        const instance = useSpaceActionsDisable({ store })
        setup(instance, { storeOptions, clientService: mocks.$clientService })
      },
      {
        mocks,
        store
      }
    )
  }
}
