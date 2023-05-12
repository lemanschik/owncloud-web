import TrashOverview from '../../../../src/views/trash/Overview.vue'
import {
  createStore,
  defaultComponentMocks,
  defaultPlugins,
  defaultStoreMockOptions,
  defaultStubs,
  mount,
  RouteLocation
} from 'web-test-helpers'
import { mock } from 'jest-mock-extended'
import { nextTick } from 'vue'

const spaceMocks = [
  {
    id: '1',
    name: 'admin',
    disabled: false,
    driveType: 'personal',
    getDriveAliasAndItem: () => '1'
  },
  {
    id: '2',
    name: 'Project space 1',
    disabled: false,
    driveType: 'project',
    getDriveAliasAndItem: () => '2'
  },
  {
    id: '3',
    name: 'Project space 2',
    disabled: false,
    driveType: 'project',
    getDriveAliasAndItem: () => '3'
  }
]

describe('TrashOverview', () => {
  it('should render no content message if no spaces exist', async () => {
    const { wrapper } = getWrapper({ spaces: [] })
    await wrapper.vm.loadResourcesTask.last
    expect(wrapper.find('no-content-message-stub').exists()).toBeTruthy()
  })
  it('should navigate to single space trash if only one space exists', () => {
    const { mocks } = getWrapper({ spaces: [spaceMocks[0]] })
    expect(mocks.$router.push).toHaveBeenCalledWith({
      name: 'files-trash-generic',
      params: { driveAliasAndItem: spaceMocks[0].getDriveAliasAndItem() },
      query: {}
    })
  })
  describe('view states', () => {
    it('shows the loading spinner during loading', () => {
      const { wrapper } = getWrapper()
      expect(wrapper.find('oc-spinner-stub').exists()).toBeTruthy()
    })
    it('should render spaces list', async () => {
      const { wrapper } = getWrapper()
      await wrapper.vm.loadResourcesTask.last
      expect(wrapper.html()).toMatchSnapshot()
    })
  })
  describe('sorting', () => {
    it('sorts by property name', async () => {
      const { wrapper } = getWrapper()
      await wrapper.vm.loadResourcesTask.last
      let sortedSpaces = []

      wrapper.vm.sortBy = 'name'
      await nextTick()
      sortedSpaces = wrapper.findComponent<any>({ name: 'oc-table' }).props().data
      expect(sortedSpaces.map((s) => s.id)).toEqual([
        spaceMocks[0].id,
        spaceMocks[1].id,
        spaceMocks[2].id
      ])

      wrapper.vm.sortDir = 'desc'
      await nextTick()
      sortedSpaces = wrapper.findComponent<any>({ name: 'oc-table' }).props().data
      expect(sortedSpaces.map((s) => s.id)).toEqual([
        spaceMocks[0].id,
        spaceMocks[2].id,
        spaceMocks[1].id
      ])
    })
    it('should set the sort parameters accordingly when calling "handleSort"', () => {
      const { wrapper } = getWrapper({ spaces: [spaceMocks[0]] })
      const sortBy = 'members'
      const sortDir = 'desc'
      wrapper.vm.handleSort({ sortBy, sortDir })
      expect(wrapper.vm.sortBy).toEqual(sortBy)
      expect(wrapper.vm.sortDir).toEqual(sortDir)
    })
  })
  describe('filtering', () => {
    it('shows only filtered spaces if filter applied', async () => {
      const { wrapper } = getWrapper()
      wrapper.vm.filterTerm = 'admin'
      await nextTick()
      expect(wrapper.vm.displaySpaces.length).toEqual(1)
      expect(wrapper.vm.displaySpaces[0].id).toEqual(spaceMocks[0].id)
    })
  })
})

function getWrapper({ spaces = spaceMocks } = {}) {
  const storeOptions = { ...defaultStoreMockOptions }
  const store = createStore(storeOptions)
  storeOptions.modules.runtime.modules.spaces.getters.spaces.mockReturnValue(spaces)
  const mocks = {
    ...defaultComponentMocks({
      currentRoute: mock<RouteLocation>({ name: 'trash-overview' })
    })
  }

  return {
    mocks,
    wrapper: mount(TrashOverview, {
      global: {
        stubs: { ...defaultStubs, NoContentMessage: true },
        mocks,
        plugins: [...defaultPlugins(), store]
      }
    })
  }
}
