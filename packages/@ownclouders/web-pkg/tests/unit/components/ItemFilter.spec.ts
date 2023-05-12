import ItemFilter from 'web-pkg/src/components/ItemFilter.vue'
import { defaultComponentMocks, defaultPlugins, mount } from 'web-test-helpers'
import { queryItemAsString } from 'web-pkg/src/composables/appDefaults'

jest.mock('web-pkg/src/composables/appDefaults')

const filterItems = [
  { id: '1', name: 'Albert Einstein' },
  { id: '2', name: 'Marie Curie' }
]

const selectors = {
  filterInput: '.item-filter-input input',
  checkboxStub: 'oc-checkbox-stub',
  filterListItem: '.item-filter-list-item',
  clearBtn: '.oc-filter-chip-clear'
}

describe('ItemFilter', () => {
  it('renders all items', () => {
    const { wrapper } = getWrapper()
    expect(wrapper.html()).toMatchSnapshot()
  })
  it('can use a custom attribute as display name', () => {
    const filterItems = [
      { id: '1', displayName: 'Albert Einstein' },
      { id: '2', displayName: 'Marie Curie' }
    ]
    const { wrapper } = getWrapper({
      props: { displayNameAttribute: 'displayName', items: filterItems }
    })
    expect(wrapper.html()).toMatchSnapshot()
  })
  describe('filter', () => {
    it('renders the input field when enabled', () => {
      const { wrapper } = getWrapper({
        props: { showOptionFilter: true, filterableAttributes: ['name'] }
      })
      expect(wrapper.find(selectors.filterInput).exists()).toBeTruthy()
    })
    it.each([
      { filterTerm: '', expectedResult: 2 },
      { filterTerm: 'Albert', expectedResult: 1 },
      { filterTerm: 'invalid', expectedResult: 0 }
    ])('filters on input', async (data) => {
      const { wrapper } = getWrapper({
        props: { showOptionFilter: true, filterableAttributes: ['name'] }
      })
      await wrapper.find(selectors.filterInput).setValue(data.filterTerm)
      expect(wrapper.findAll(selectors.filterListItem).length).toBe(data.expectedResult)
    })
  })
  describe('selection', () => {
    it('allows selection of multiple items on click', async () => {
      const { wrapper } = getWrapper({ props: { allowMultiple: true } })
      expect(wrapper.emitted('selectionChange')).toBeFalsy()
      let selectionChangeEmits = 0
      for (const item of wrapper.findAll(selectors.filterListItem)) {
        expect(item.findComponent<any>(selectors.checkboxStub).props('modelValue')).toBeFalsy()
        await item.trigger('click')
        selectionChangeEmits += 1
        expect(wrapper.emitted('selectionChange').length).toBe(selectionChangeEmits)
        expect(item.findComponent<any>(selectors.checkboxStub).props('modelValue')).toBeTruthy()
      }
      expect(wrapper.vm.selectedItems.length).toBe(wrapper.findAll(selectors.filterListItem).length)
    })
    it('does not allow selection of multiple items on click when disabled', async () => {
      const { wrapper } = getWrapper({ props: { allowMultiple: false } })
      const first = wrapper.findAll(selectors.filterListItem).at(0)
      await first.trigger('click')
      expect(wrapper.emitted('selectionChange').length).toBe(1)
      expect(first.findComponent<any>(selectors.checkboxStub).props('modelValue')).toBeTruthy()

      const second = wrapper.findAll(selectors.filterListItem).at(1)
      await second.trigger('click')
      expect(wrapper.emitted('selectionChange').length).toBe(1)
      expect(second.findComponent<any>(selectors.checkboxStub).props('modelValue')).toBeFalsy()
      expect(second.findComponent<any>(selectors.checkboxStub).props('disabled')).toBeTruthy()
      expect(wrapper.vm.selectedItems.length).toBe(1)
    })
    it('can always de-select the current selected item', async () => {
      const { wrapper } = getWrapper({ props: { allowMultiple: false } })
      const item = wrapper.findAll(selectors.filterListItem).at(0)
      await item.trigger('click')
      await item.trigger('click')
      expect(wrapper.emitted('selectionChange').length).toBe(2)
      expect(item.findComponent<any>(selectors.checkboxStub).props('modelValue')).toBeFalsy()
      expect(wrapper.vm.selectedItems.length).toBe(0)
    })
    it('clears the selection when the clear-button is being clicked', async () => {
      const { wrapper } = getWrapper({ props: { allowMultiple: false } })
      const item = wrapper.findAll(selectors.filterListItem).at(0)
      await item.trigger('click')
      await wrapper.find(selectors.clearBtn).trigger('click')
      expect(wrapper.emitted('selectionChange').length).toBe(2)
      expect(item.findComponent<any>(selectors.checkboxStub).props('modelValue')).toBeFalsy()
      expect(wrapper.vm.selectedItems.length).toBe(0)
    })
  })
  describe('route query', () => {
    it('sets the selected item as route query param', async () => {
      const { wrapper, mocks } = getWrapper()
      const item = wrapper.findAll(selectors.filterListItem).at(0)
      const currentRouteQuery = (mocks.$router.currentRoute as any).query
      expect(mocks.$router.push).not.toHaveBeenCalled()
      await item.trigger('click')
      expect(currentRouteQuery[wrapper.vm.queryParam]).toBeDefined()
      expect(mocks.$router.push).toHaveBeenCalled()
    })
    it('sets the selected items initially when given via query param', () => {
      const { wrapper } = getWrapper({ initialQuery: '1' })
      expect(wrapper.vm.selectedItems).toEqual([filterItems[0]])
    })
  })

  describe('label prop', () => {
    it('sets the correct label using getLabel computed property', () => {
      const label = 'Filter groups'
      const { wrapper } = getWrapper({
        props: {
          showOptionFilter: true,
          filterableAttributes: ['name'],
          optionFilterLabel: label
        }
      })
      expect(wrapper.find('.item-filter-input label').text()).toBe(label)
    })

    it('sets the default label using getLabel computed property when no prop is set', () => {
      const label = undefined
      const { wrapper } = getWrapper({
        props: {
          showOptionFilter: true,
          filterableAttributes: ['name'],
          optionFilterLabel: label
        }
      })
      expect(wrapper.find('.item-filter-input label').text()).toBe('Filter list')
    })
  })
})

function getWrapper({ props = {}, initialQuery = '' }: any = {}) {
  jest.mocked(queryItemAsString).mockImplementation(() => initialQuery)
  const mocks = defaultComponentMocks()
  return {
    mocks,
    wrapper: mount(ItemFilter, {
      props: {
        filterLabel: 'Users',
        filterName: 'users',
        items: filterItems,
        ...props
      },
      slots: {
        item(data: any) {
          return props.displayNameAttribute ? data.item[props.displayNameAttribute] : data.item.name
        }
      },
      global: {
        plugins: [...defaultPlugins()],
        mocks,
        stubs: { OcCheckbox: true }
      }
    })
  }
}
