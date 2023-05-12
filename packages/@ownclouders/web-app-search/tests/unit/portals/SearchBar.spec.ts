import SearchBar from '../../../src/portals/SearchBar.vue'
import { createLocationCommon } from 'web-app-files/src/router'
import flushPromises from 'flush-promises'
import { defineComponent } from 'vue'
import { createStore, defaultPlugins, mount, defaultStoreMockOptions } from 'web-test-helpers'
import { ProviderStore } from 'web-app-search/src/service/providerStore'

const component = defineComponent({
  emits: ['click', 'keyup'],
  setup(props, ctx) {
    const onClick = (event) => {
      ctx.emit('click', event)
    }
    return { onClick }
  },
  template: '<div @click="onClick"></div>'
})

const providerFiles = {
  id: 'files',
  displayName: 'Files',
  available: true,
  previewSearch: {
    available: true,
    search: jest.fn(),
    component
  },
  listSearch: {}
}

const providerContacts = {
  id: 'contacts',
  displayName: 'Contacts',
  available: true,
  previewSearch: {
    available: true,
    search: jest.fn(),
    component
  }
}

const selectors = {
  noResults: '#no-results',
  searchInput: 'input',
  searchInputClear: '.oc-search-clear',
  providerListItem: '.provider',
  providerDisplayName: '.provider .display-name',
  providerMoreResultsLink: '.provider .more-results',
  optionsHidden: '.tippy-box[data-state="hidden"]',
  optionsVisible: '.tippy-box[data-state="visible"]'
}

jest.mock('lodash-es/debounce', () => (fn) => fn)

const providerStore = new ProviderStore()

beforeEach(() => {
  providerFiles.previewSearch.search.mockImplementation(() => {
    return {
      values: [
        { id: 'f1', data: 'albert.txt' },
        { id: 'f2', data: 'marie.txt' }
      ]
    }
  })

  providerContacts.previewSearch.search.mockImplementation(() => {
    return {
      values: [
        { id: 'c1', data: 'albert' },
        { id: 'c2', data: 'marie' }
      ]
    }
  })

  jest
    .spyOn(providerStore, 'availableProviders', 'get')
    .mockReturnValue([providerFiles, providerContacts])
})

let wrapper
afterEach(() => {
  wrapper.unmount()
})

describe('Search Bar portal component', () => {
  jest.spyOn(console, 'warn').mockImplementation(undefined)
  test('does not render a search field if no availableProviders given', () => {
    wrapper = getMountedWrapper({ data: { providerStore: { availableProviders: [] } } }).wrapper
    expect(wrapper.element.innerText).toBeFalsy()
  })
  test('does not render a search field if no user given', () => {
    wrapper = getMountedWrapper({ isUserContextReady: false }).wrapper
    expect(wrapper.element.innerText).toBeFalsy()
  })
  test('updates the search term on input', () => {
    wrapper = getMountedWrapper().wrapper
    wrapper.find(selectors.searchInput).setValue('alice')
    expect(wrapper.vm.$data.term).toBe('alice')
  })
  test('shows message if no results are available', async () => {
    wrapper = getMountedWrapper().wrapper
    providerFiles.previewSearch.search.mockImplementationOnce(() => {
      return {
        values: []
      }
    })
    providerContacts.previewSearch.search.mockImplementationOnce(() => {
      return {
        values: []
      }
    })
    wrapper.find(selectors.searchInput).setValue('nothing found')
    await flushPromises()
    expect(wrapper.find(selectors.noResults)).toBeTruthy()
  })
  test('displays all available providers', async () => {
    wrapper = getMountedWrapper().wrapper
    wrapper.find(selectors.searchInput).setValue('albert')
    await flushPromises()
    expect(wrapper.findAll(selectors.providerListItem).length).toEqual(2)
  })
  test('only displays provider list item if search results are attached', async () => {
    wrapper = getMountedWrapper().wrapper
    providerContacts.previewSearch.search.mockImplementation(() => {
      return {
        values: []
      }
    })
    wrapper.find(selectors.searchInput).setValue('albert')
    await flushPromises()
    expect(wrapper.findAll(selectors.providerListItem).length).toEqual(1)
  })
  test('displays the provider name in the provider list item', async () => {
    wrapper = getMountedWrapper().wrapper
    wrapper.find(selectors.searchInput).setValue('albert')
    await flushPromises()
    const providerDisplayNameItems = wrapper.findAll(selectors.providerDisplayName)
    expect(providerDisplayNameItems.at(0).text()).toEqual('Files')
    expect(providerDisplayNameItems.at(1).text()).toEqual('Contacts')
  })
  test('The search provider only displays the more results link if a listSearch component is present', async () => {
    wrapper = getMountedWrapper().wrapper
    wrapper.find(selectors.searchInput).setValue('albert')
    await flushPromises()
    expect(wrapper.findAll(selectors.providerMoreResultsLink).length).toEqual(1)
  })
  test('hides options on preview item click', async () => {
    wrapper = getMountedWrapper().wrapper
    wrapper.find(selectors.searchInput).setValue('albert')
    await flushPromises()
    expect(wrapper.findAll(selectors.optionsVisible).length).toEqual(1)
    wrapper.findAll('.preview-component').at(0).trigger('click')
    expect(wrapper.findAll(selectors.optionsHidden).length).toEqual(1)
  })
  test('hides options on key press enter', async () => {
    wrapper = getMountedWrapper().wrapper
    wrapper.find(selectors.searchInput).setValue('albert')
    await flushPromises()
    expect(wrapper.findAll(selectors.optionsVisible).length).toEqual(1)
    wrapper.find(selectors.searchInput).trigger('keyup.enter')
    expect(wrapper.findAll(selectors.optionsHidden).length).toEqual(1)
  })
  test('hides options on key press escape', async () => {
    wrapper = getMountedWrapper().wrapper
    wrapper.find(selectors.searchInput).setValue('albert')
    await flushPromises()
    expect(wrapper.findAll(selectors.optionsVisible).length).toEqual(1)
    wrapper.find(selectors.searchInput).trigger('keyup.esc')
    expect(wrapper.findAll(selectors.optionsHidden).length).toEqual(1)
  })
  test('hides options on clear', async () => {
    wrapper = getMountedWrapper().wrapper
    wrapper.find(selectors.searchInput).setValue('albert')
    await flushPromises()
    expect(wrapper.findAll(selectors.optionsVisible).length).toEqual(1)
    await wrapper.find(selectors.searchInputClear).trigger('click')
    expect(wrapper.findAll(selectors.optionsHidden).length).toEqual(1)
  })
  test('hides options if no search term is given', async () => {
    wrapper = getMountedWrapper().wrapper
    wrapper.find(selectors.searchInput).setValue('albert')
    await flushPromises()
    expect(wrapper.findAll(selectors.optionsVisible).length).toEqual(1)
    wrapper.find(selectors.searchInput).setValue('')
    await wrapper.find(selectors.searchInputClear).trigger('click')
    expect(wrapper.findAll(selectors.optionsHidden).length).toEqual(1)
  })
  test('resets search term on clear', async () => {
    wrapper = getMountedWrapper().wrapper
    wrapper.find(selectors.searchInput).setValue('albert')
    await flushPromises()
    await wrapper.find(selectors.searchInputClear).trigger('click')
    expect(wrapper.vm.$data.term).toBeFalsy()
  })
  test('sets the search term according to route value on mount', async () => {
    wrapper = getMountedWrapper({
      mocks: {
        $route: {
          query: {
            term: 'alice'
          }
        }
      }
    }).wrapper

    await wrapper.vm.$nextTick()
    expect(wrapper.vm.$data.term).toBe('alice')
    expect((wrapper.get('input').element as HTMLInputElement).value).toBe('alice')
  })
  test.skip('sets active preview item via keyboard navigation', async () => {
    wrapper = getMountedWrapper().wrapper
    wrapper.find(selectors.searchInput).setValue('albert')
    await flushPromises()
    wrapper.find(selectors.searchInput).trigger('keyup.down')
    wrapper.find(selectors.searchInput).trigger('keyup.down')
  })
  test('navigates to files-common-search route on key press enter if search term is given', async () => {
    wrapper = getMountedWrapper().wrapper
    wrapper.find(selectors.searchInput).setValue('albert')
    const spyRouterPushStub = wrapper.vm.$router.push
    await flushPromises()
    wrapper.find(selectors.searchInput).trigger('keyup.enter')
    expect(spyRouterPushStub).toHaveBeenCalledTimes(1)
    expect(spyRouterPushStub).toHaveBeenCalledWith(
      createLocationCommon('files-common-search', {
        query: { term: 'albert', provider: 'files.sdk' }
      })
    )
  })
  test('does not navigate to files-common-search route on key press enter if no search term is given', async () => {
    wrapper = getMountedWrapper().wrapper
    wrapper.find(selectors.searchInput).setValue('')
    const spyRouterPushStub = wrapper.vm.$router.push
    await flushPromises()
    wrapper.find(selectors.searchInput).trigger('keyup.enter')
    expect(spyRouterPushStub).toHaveBeenCalledTimes(0)
  })
})

function getMountedWrapper({ data = {}, mocks = {}, isUserContextReady = true } = {}) {
  const localMocks = {
    $gettextInterpolate: (text) => text,
    $gettext: (text) => text,
    $route: {
      name: ''
    },
    $router: {
      go: jest.fn(),
      push: jest.fn()
    },
    ...mocks
  }

  const storeOptions = defaultStoreMockOptions
  storeOptions.modules.runtime.modules.auth.getters.isUserContextReady.mockImplementation(
    () => isUserContextReady
  )
  const store = createStore(storeOptions)
  return {
    wrapper: mount(SearchBar, {
      attachTo: document.body,
      data: () => {
        return {
          providerStore,
          ...data
        }
      },

      global: {
        plugins: [...defaultPlugins(), store],
        mocks: localMocks,
        stubs: {
          'router-link': true
        }
      }
    })
  }
}
