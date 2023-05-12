import { useFileActionsDeleteResources } from 'web-app-files/src/composables/actions/helpers/useFileActionsDeleteResources'
import { mockDeep } from 'jest-mock-extended'
import { FolderResource, SpaceResource } from 'web-client/src/helpers'
import {
  createStore,
  defaultStoreMockOptions,
  defaultComponentMocks,
  getComposableWrapper
} from 'web-test-helpers'
import { useStore } from 'web-pkg/src/composables'
import { nextTick } from 'vue'

const currentFolder = {
  id: 1,
  path: '/folder'
}

describe('deleteResources', () => {
  describe('method "filesList_delete"', () => {
    it('should call the delete action on a resource in the file list', async () => {
      const { wrapper } = getWrapper({
        currentFolder,
        setup: async ({ filesList_delete }, { space, router, storeOptions }) => {
          await filesList_delete(space)
          await nextTick()
          expect(router.push).toHaveBeenCalledTimes(0)
          expect(storeOptions.actions.hideModal).toHaveBeenCalledTimes(1)
        }
      })
    })

    it('should call the delete action on the current folder', async () => {
      const resourcesToDelete = [currentFolder]
      const { wrapper } = getWrapper({
        currentFolder,
        setup: async ({ displayDialog, filesList_delete }, { space, router, storeOptions }) => {
          displayDialog(space, resourcesToDelete)
          await filesList_delete(space)
          await nextTick()
          expect(router.push).toHaveBeenCalledTimes(1)
          expect(storeOptions.actions.hideModal).toHaveBeenCalledTimes(1)
        }
      })
    })
  })
})

function getWrapper({
  currentFolder,
  setup
}: {
  currentFolder: FolderResource
  setup: (
    instance: ReturnType<typeof useFileActionsDeleteResources>,
    {
      space,
      router,
      storeOptions
    }: {
      space: SpaceResource
      router: ReturnType<typeof defaultComponentMocks>['$router']
      storeOptions: typeof defaultStoreMockOptions
    }
  ) => void
}) {
  const mocks = {
    ...defaultComponentMocks(),
    space: mockDeep<SpaceResource>()
  }

  const storeOptions = {
    ...defaultStoreMockOptions
  }
  storeOptions.modules.Files.getters.currentFolder.mockReturnValue(currentFolder)

  const store = createStore(storeOptions)
  return {
    mocks,
    storeOptions,
    wrapper: getComposableWrapper(
      () => {
        const store = useStore()
        const instance = useFileActionsDeleteResources({ store })
        setup(instance, { space: mocks.space, storeOptions, router: mocks.$router })
      },
      {
        mocks,
        store
      }
    )
  }
}
