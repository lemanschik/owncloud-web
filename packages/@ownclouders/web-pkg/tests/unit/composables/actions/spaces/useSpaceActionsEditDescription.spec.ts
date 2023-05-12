import { useSpaceActionsEditDescription } from 'web-pkg/src/composables/actions/spaces'
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
import { SpaceResource } from 'web-client/src'

describe('editDescription', () => {
  describe('handler', () => {
    it('should trigger the editDescription modal window with one resource', async () => {
      const { wrapper } = getWrapper({
        setup: async ({ actions }, { storeOptions }) => {
          await unref(actions)[0].handler({ resources: [{ id: 1 } as SpaceResource] })

          expect(storeOptions.actions.createModal).toHaveBeenCalledTimes(1)
        }
      })
    })
    it('should not trigger the editDescription modal window with no resource', async () => {
      const { wrapper } = getWrapper({
        setup: async ({ actions }, { storeOptions }) => {
          await unref(actions)[0].handler({ resources: [] })

          expect(storeOptions.actions.createModal).toHaveBeenCalledTimes(0)
        }
      })
    })
  })

  describe('method "editDescriptionSpace"', () => {
    it('should hide the modal on success', async () => {
      const { wrapper, mocks } = getWrapper({
        setup: async ({ actions, editDescriptionSpace }, { storeOptions, clientService }) => {
          clientService.graphAuthenticated.drives.updateDrive.mockResolvedValue(mockAxiosResolve())
          await editDescriptionSpace(mock<SpaceResource>(), 'doesntmatter')

          expect(storeOptions.actions.hideModal).toHaveBeenCalledTimes(1)
        }
      })
    })

    it('should show message on error', async () => {
      jest.spyOn(console, 'error').mockImplementation(() => undefined)
      const { wrapper, mocks } = getWrapper({
        setup: async ({ actions, editDescriptionSpace }, { storeOptions, clientService }) => {
          clientService.graphAuthenticated.drives.updateDrive.mockRejectedValue(new Error())
          await editDescriptionSpace(mock<SpaceResource>(), 'doesntmatter')

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
    instance: ReturnType<typeof useSpaceActionsEditDescription>,
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
    ...defaultStoreMockOptions,
    modules: { ...defaultStoreMockOptions.modules, user: { state: { id: 'alice', uuid: 1 } } }
  }
  const store = createStore(storeOptions)
  const mocks = defaultComponentMocks({
    currentRoute: mock<RouteLocation>({ name: 'files-spaces-projects' })
  })
  return {
    mocks,
    wrapper: getComposableWrapper(
      () => {
        const instance = useSpaceActionsEditDescription({ store })
        setup(instance, { storeOptions, clientService: mocks.$clientService })
      },
      {
        mocks,
        store
      }
    )
  }
}
