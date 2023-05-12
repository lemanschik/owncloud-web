import SpaceDetailsMultiple from 'web-pkg/src/components/sideBar/Spaces/Details/SpaceDetailsMultiple.vue'
import { defaultPlugins, shallowMount } from 'web-test-helpers'

const spaceMock = {
  type: 'space',
  name: ' space',
  id: '1',
  mdate: 'Wed, 21 Oct 2015 07:28:00 GMT',
  spaceQuota: {
    used: 100,
    total: 1000,
    remaining: 900
  }
}

describe('Multiple Details SideBar Panel', () => {
  it('displays the details side panel', () => {
    const { wrapper } = createWrapper(spaceMock)
    expect(wrapper.html()).toMatchSnapshot()
  })
})

function createWrapper(spaceResource) {
  return {
    wrapper: shallowMount(SpaceDetailsMultiple, {
      global: {
        plugins: [...defaultPlugins()]
      },
      props: {
        selectedSpaces: [spaceResource]
      }
    })
  }
}
