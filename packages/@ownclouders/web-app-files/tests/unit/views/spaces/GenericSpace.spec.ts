import { ref } from 'vue'
import { mock, mockDeep } from 'jest-mock-extended'
import { Resource, SpaceResource } from 'web-client/src/helpers'
import GenericSpace from 'web-app-files/src/views/spaces/GenericSpace.vue'
import { useResourcesViewDefaults } from 'web-app-files/src/composables'
import { useResourcesViewDefaultsMock } from 'web-app-files/tests/mocks/useResourcesViewDefaultsMock'
import {
  createStore,
  defaultPlugins,
  mount,
  defaultStoreMockOptions,
  defaultComponentMocks,
  defaultStubs,
  RouteLocation
} from 'web-test-helpers'

jest.mock('web-app-files/src/composables')

describe('GenericSpace view', () => {
  it('appBar always present', () => {
    const { wrapper } = getMountedWrapper()
    expect(wrapper.find('app-bar-stub').exists()).toBeTruthy()
  })
  it('sideBar always present', () => {
    const { wrapper } = getMountedWrapper()
    expect(wrapper.find('side-bar-stub').exists()).toBeTruthy()
  })
  describe('space header', () => {
    it('does not render the space header in the personal space', () => {
      const { wrapper } = getMountedWrapper()
      expect(wrapper.find('space-header-stub').exists()).toBeFalsy()
    })
    it('does not render the space header in a nested project space', () => {
      const { wrapper } = getMountedWrapper({
        props: {
          item: '/someFolder',
          space: mock<SpaceResource>({ driveType: 'project' })
        }
      })
      expect(wrapper.find('space-header-stub').exists()).toBeFalsy()
    })
    it('renders the space header on a space frontpage', () => {
      const { wrapper } = getMountedWrapper({
        props: {
          space: mock<SpaceResource>({ driveType: 'project' })
        }
      })
      expect(wrapper.find('space-header-stub').exists()).toBeTruthy()
    })
  })
  describe('different files view states', () => {
    it('shows the loading spinner during loading', () => {
      const { wrapper } = getMountedWrapper({ loading: true })
      expect(wrapper.find('oc-spinner-stub').exists()).toBeTruthy()
    })
    it('shows the no-content-message after loading', () => {
      const { wrapper } = getMountedWrapper()
      expect(wrapper.find('oc-spinner-stub').exists()).toBeFalsy()
      expect(wrapper.find('.no-content-message').exists()).toBeTruthy()
    })
    it('shows the files table when files are available', () => {
      const { wrapper } = getMountedWrapper({ files: [mock<Resource>()] })
      expect(wrapper.find('.no-content-message').exists()).toBeFalsy()
      expect(wrapper.find('resource-table-stub').exists()).toBeTruthy()
    })
  })
  describe('breadcrumbs', () => {
    it.each([
      { driveType: 'personal', expectedItems: 1 },
      { driveType: 'project', expectedItems: 2 },
      { driveType: 'share', expectedItems: 3 }
    ])('include root item(s)', (data) => {
      const { driveType } = data
      const space = { id: 1, getDriveAliasAndItem: jest.fn(), driveType }
      const { wrapper } = getMountedWrapper({ files: [mockDeep<Resource>()], props: { space } })
      expect(wrapper.findComponent<any>('app-bar-stub').props().breadcrumbs.length).toBe(
        data.expectedItems
      )
    })
    it('include the root item and the current folder', () => {
      const folderName = 'someFolder'
      const { wrapper } = getMountedWrapper({
        files: [mockDeep<Resource>()],
        props: { item: `/${folderName}` }
      })
      expect(wrapper.findComponent<any>('app-bar-stub').props().breadcrumbs.length).toBe(2)
      expect(wrapper.findComponent<any>('app-bar-stub').props().breadcrumbs[1].text).toEqual(
        folderName
      )
    })
    it('omit the "page"-query of the current route', () => {
      const currentRoute = { name: 'files-spaces-generic', path: '/', query: { page: '2' } }
      const { wrapper } = getMountedWrapper({
        files: [mockDeep<Resource>()],
        props: { item: 'someFolder' },
        currentRoute
      })
      const breadCrumbItem = wrapper.findComponent<any>('app-bar-stub').props().breadcrumbs[0]
      expect(breadCrumbItem.to.query.page).toBeUndefined()
    })
  })
  describe('loader task', () => {
    it('re-loads the resources on item change', async () => {
      const { wrapper, mocks } = getMountedWrapper()
      await wrapper.vm.loadResourcesTask.last
      expect(mocks.refreshFileListHeaderPosition).toHaveBeenCalledTimes(1)
      await wrapper.setProps({ item: 'newItem' })
      await wrapper.vm.loadResourcesTask.last
      expect(mocks.refreshFileListHeaderPosition).toHaveBeenCalledTimes(2)
    })
    it('re-loads the resources on space change', async () => {
      const { wrapper, mocks } = getMountedWrapper()
      await wrapper.vm.loadResourcesTask.last
      expect(mocks.refreshFileListHeaderPosition).toHaveBeenCalledTimes(1)
      await wrapper.setProps({ space: mockDeep<SpaceResource>() })
      await wrapper.vm.loadResourcesTask.last
      expect(mocks.refreshFileListHeaderPosition).toHaveBeenCalledTimes(2)
    })
  })
  describe('empty folder upload hint', () => {
    it('renders if the user can upload to the current folder', () => {
      const { wrapper } = getMountedWrapper({
        currentFolder: mock<Resource>({ canUpload: () => true })
      })
      expect(wrapper.find('.file-empty-upload-hint').exists()).toBeTruthy()
    })
    it('does not render if the user can not upload to the current folder', () => {
      const { wrapper } = getMountedWrapper({
        currentFolder: mock<Resource>({ canUpload: () => false })
      })
      expect(wrapper.find('.file-empty-upload-hint').exists()).toBeFalsy()
    })
  })
  describe('whitespace context menu', () => {
    it('shows whitespace context menu on right click in whitespace', async () => {
      const { wrapper } = getMountedWrapper()
      await wrapper.vm.loadResourcesTask.last
      await wrapper.find('#files-view').trigger('contextmenu')
      await wrapper.vm.$nextTick()
      expect(wrapper.vm.whitespaceContextMenu).toBeDefined()
    })
  })
  describe('for a single file', () => {
    describe('on EOS for single shared resources', () => {
      it('renders the ResourceDetails component if no currentFolder id is present', () => {
        const { wrapper } = getMountedWrapper({
          currentFolder: {},
          files: [mock<Resource>()],
          runningOnEos: true
        })
        expect(wrapper.find('resource-details-stub').exists()).toBeTruthy()
      })
      it('renders the ResourceDetails component if currentFolder path matches single shared resource path', () => {
        const path = 'foo'
        const { wrapper } = getMountedWrapper({
          currentFolder: {
            ...mock<Resource>(),
            path
          },
          files: [{ ...mock<Resource>(), path }],
          runningOnEos: true
        })
        expect(wrapper.find('resource-details-stub').exists()).toBeTruthy()
      })
    })
    describe('on public links', () => {
      it('renders the ResourceDetails component', () => {
        const { wrapper } = getMountedWrapper({
          currentFolder: {
            ...mock<Resource>(),
            fileId: '4'
          },
          files: [{ ...mock<Resource>(), isFolder: false }],
          space: {
            id: 1,
            getDriveAliasAndItem: jest.fn(),
            name: 'Personal space',
            driveType: 'public'
          }
        })
        expect(wrapper.find('resource-details-stub').exists()).toBeTruthy()
      })
    })
  })
})

function getMountedWrapper({
  mocks = {},
  props = {},
  files = [],
  loading = false,
  currentRoute = { name: 'files-spaces-generic', path: '/' },
  currentFolder = mock<Resource>() || {},
  runningOnEos = false,
  space = { id: 1, getDriveAliasAndItem: jest.fn(), name: 'Personal space', driveType: '' }
} = {}) {
  const resourcesViewDetailsMock = useResourcesViewDefaultsMock({
    paginatedResources: ref(files),
    areResourcesLoading: ref(loading)
  })
  jest.mocked(useResourcesViewDefaults).mockImplementation(() => resourcesViewDetailsMock)
  const defaultMocks = {
    ...defaultComponentMocks({ currentRoute: mock<RouteLocation>(currentRoute) }),
    ...(mocks && mocks)
  }

  const storeOptions = {
    ...defaultStoreMockOptions,
    getters: {
      ...defaultStoreMockOptions.getters,
      configuration: function () {
        return {
          currentTheme: { general: { slogan: 'Public link slogan' } },
          options: {
            runningOnEos
          }
        }
      }
    }
  }
  storeOptions.modules.Files.getters.currentFolder.mockReturnValue(currentFolder)
  const propsData = {
    space,
    item: '/',
    ...props
  }
  const store = createStore(storeOptions)
  return {
    mocks: { ...defaultMocks, ...resourcesViewDetailsMock },
    storeOptions,
    wrapper: mount(GenericSpace, {
      props: propsData,
      global: {
        plugins: [...defaultPlugins(), store],
        mocks: defaultMocks,
        stubs: { ...defaultStubs, 'resource-details': true }
      }
    })
  }
}
