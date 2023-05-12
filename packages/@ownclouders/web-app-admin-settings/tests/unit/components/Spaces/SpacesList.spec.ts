import SpacesList from '../../../../src/components/Spaces/SpacesList.vue'
import { defaultPlugins, mount, shallowMount } from 'web-test-helpers'
import { eventBus } from 'web-pkg'
import { displayPositionedDropdown } from 'web-pkg/src/helpers'
import { SideBarEventTopics } from 'web-pkg/src/composables/sideBar'
import { nextTick } from 'vue'

const spaceMocks = [
  {
    id: '1',
    name: '1 Some space',
    disabled: false,
    spaceRoles: {
      manager: [
        { id: 'user1', displayName: 'user1' },
        { id: 'user2', displayName: 'user2' },
        { id: 'user3', displayName: 'user3' }
      ],
      editor: [],
      viewer: []
    },
    spaceQuota: {
      total: 1000000000,
      used: 0,
      remaining: 1000000000
    }
  },
  {
    id: '2',
    name: '2 Another space',
    disabled: true,
    spaceRoles: {
      manager: [
        { id: 'user1', displayName: 'user1' },
        { id: 'user2', displayName: 'user2' },
        { id: 'user3', displayName: 'user3' }
      ],
      editor: [{ id: 'user4', displayName: 'user4' }],
      viewer: [{ id: 'user5', displayName: 'user5' }]
    },
    spaceQuota: {
      total: 2000000000,
      used: 500000000,
      remaining: 1500000000
    }
  }
]

const selectors = {
  ocTableStub: 'oc-table-stub'
}

jest.mock('web-pkg/src/helpers', () => ({
  ...jest.requireActual('web-pkg/src/helpers'),
  displayPositionedDropdown: jest.fn()
}))

describe('SpacesList', () => {
  it('should render all spaces in a table', () => {
    const { wrapper } = getWrapper({ spaces: [spaceMocks[0]] })
    expect(wrapper.html()).toMatchSnapshot()
  })
  it.each(['name', 'members', 'totalQuota', 'usedQuota', 'remainingQuota', 'status'])(
    'sorts by property "%s"',
    async (prop) => {
      const { wrapper } = getWrapper({ mountType: shallowMount, spaces: spaceMocks })
      wrapper.vm.sortBy = prop
      await wrapper.vm.$nextTick()
      expect(wrapper.findComponent<any>(selectors.ocTableStub).props().data[0].id).toBe(
        spaceMocks[0].id
      )
      wrapper.vm.sortDir = 'desc'
      await wrapper.vm.$nextTick()
      expect(wrapper.findComponent<any>(selectors.ocTableStub).props().data[0].id).toBe(
        spaceMocks[1].id
      )
    }
  )
  it('should set the sort parameters accordingly when calling "handleSort"', () => {
    const { wrapper } = getWrapper({ spaces: [spaceMocks[0]] })
    const sortBy = 'members'
    const sortDir = 'desc'
    wrapper.vm.handleSort({ sortBy, sortDir })
    expect(wrapper.vm.sortBy).toEqual(sortBy)
    expect(wrapper.vm.sortDir).toEqual(sortDir)
  })
  it('emits events on file click', () => {
    const { wrapper } = getWrapper({ spaces: [spaceMocks[0]] })
    wrapper.vm.fileClicked(spaceMocks[0])
    expect(wrapper.emitted().unSelectAllSpaces.length).toBeTruthy()
    expect(wrapper.emitted().toggleSelectSpace).toBeTruthy()
  })
  it('shows only filtered spaces if filter applied', async () => {
    const { wrapper } = getWrapper({ spaces: spaceMocks })
    wrapper.vm.filterTerm = 'Another'
    await nextTick()
    expect(wrapper.vm.orderedSpaces).toEqual([spaceMocks[1]])
  })
  it('should show the context menu on right click', async () => {
    const spyDisplayPositionedDropdown = jest.mocked(displayPositionedDropdown)
    const { wrapper } = getWrapper({ spaces: spaceMocks })
    await wrapper.find(`[data-item-id="${spaceMocks[0].id}"]`).trigger('contextmenu')
    expect(spyDisplayPositionedDropdown).toHaveBeenCalledTimes(1)
  })
  it('should show the context menu on context menu button click', async () => {
    const spyDisplayPositionedDropdown = jest.mocked(displayPositionedDropdown)
    const { wrapper } = getWrapper({ spaces: spaceMocks })
    await wrapper.find('.spaces-table-btn-action-dropdown').trigger('click')
    expect(spyDisplayPositionedDropdown).toHaveBeenCalledTimes(1)
  })
  it('should show the space details on details button click', async () => {
    const eventBusSpy = jest.spyOn(eventBus, 'publish')
    const { wrapper } = getWrapper({ spaces: spaceMocks })
    await wrapper.find('.spaces-table-btn-details').trigger('click')
    expect(eventBusSpy).toHaveBeenCalledWith(SideBarEventTopics.open)
  })
})

function getWrapper({ mountType = mount, spaces = [], selectedSpaces = [] } = {}) {
  return {
    wrapper: mountType(SpacesList, {
      props: {
        spaces,
        selectedSpaces,
        headerPosition: 0
      },
      global: {
        plugins: [...defaultPlugins()],
        stubs: {
          OcCheckbox: true
        }
      }
    })
  }
}
