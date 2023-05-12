import { mock } from 'jest-mock-extended'
import { nextTick, unref } from 'vue'
import { useFileActionsCreateNewFolder } from 'web-app-files/src/composables'
import { SpaceResource } from 'web-client/src'
import { FolderResource } from 'web-client/src/helpers'
import {
  RouteLocation,
  createStore,
  defaultComponentMocks,
  defaultStoreMockOptions,
  getComposableWrapper
} from 'web-test-helpers/src'

describe('useFileActionsCreateNewFolder', () => {
  describe('checkFolderName', () => {
    it.each([
      { input: '', output: 'Folder name cannot be empty' },
      { input: '/', output: 'Folder name cannot contain "/"' },
      { input: '.', output: 'Folder name cannot be equal to "."' },
      { input: '..', output: 'Folder name cannot be equal to ".."' },
      { input: 'myfolder', output: null }
    ])('should validate folder name %s', async (data) => {
      const space = mock<SpaceResource>({ id: '1' })
      getWrapper({
        space,
        setup: async ({ checkNewFolderName }) => {
          const result = checkNewFolderName(data.input)
          expect(result).toBe(data.output)
        }
      })
    })
  })
  describe('addNewFolder', () => {
    it('create new folder', async () => {
      const space = mock<SpaceResource>({ id: '1' })
      getWrapper({
        space,
        setup: async ({ addNewFolder }, { storeOptions }) => {
          await addNewFolder('myfolder')
          await nextTick()
          expect(storeOptions.modules.Files.mutations.UPSERT_RESOURCE).toHaveBeenCalled()
          expect(storeOptions.actions.hideModal).toHaveBeenCalled()
          expect(storeOptions.actions.showMessage).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({
              title: '"myfolder" was created successfully'
            })
          )
        }
      })
    })
    it('show error message if createFolder fails', async () => {
      const consoleErrorMock = jest.spyOn(console, 'error').mockImplementation()
      const space = mock<SpaceResource>({ id: '1' })
      getWrapper({
        resolveCreateFolder: false,
        space,
        setup: async ({ addNewFolder }, { storeOptions }) => {
          await addNewFolder('myfolder')
          await nextTick()
          expect(storeOptions.actions.showMessage).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({
              title: 'Failed to create folder',
              status: 'danger'
            })
          )
          consoleErrorMock.mockRestore()
        }
      })
    })
  })
  describe('createNewFolderModal', () => {
    it('should show modal', async () => {
      const space = mock<SpaceResource>({ id: '1' })
      getWrapper({
        space,
        setup: async ({ actions }, { storeOptions }) => {
          unref(actions)[0].handler()
          await nextTick()
          expect(storeOptions.actions.createModal).toHaveBeenCalled()
        }
      })
    })
  })
})

function getWrapper({
  resolveCreateFolder = true,
  space = undefined,
  setup
}: {
  resolveCreateFolder?: boolean
  space?: SpaceResource
  setup: (
    instance: ReturnType<typeof useFileActionsCreateNewFolder>,
    options: { storeOptions: typeof defaultStoreMockOptions }
  ) => void
}) {
  const mocks = {
    ...defaultComponentMocks({
      currentRoute: mock<RouteLocation>({ name: 'files-spaces-generic' })
    }),
    space
  }
  mocks.$clientService.webdav.createFolder.mockImplementation(() => {
    if (resolveCreateFolder) {
      return Promise.resolve({
        id: 1,
        type: 'folder',
        isReceivedShare: jest.fn(),
        path: '/'
      } as FolderResource)
    }
    return Promise.reject('error')
  })

  const storeOptions = {
    ...defaultStoreMockOptions
  }
  const currentFolder = {
    id: 1,
    path: '/'
  }
  storeOptions.modules.Files.getters.currentFolder.mockReturnValue(currentFolder)
  const store = createStore(storeOptions)
  return {
    wrapper: getComposableWrapper(
      () => {
        const instance = useFileActionsCreateNewFolder({ store, space })
        setup(instance, { storeOptions })
      },
      {
        store,
        mocks
      }
    )
  }
}
