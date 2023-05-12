import { shallowMount } from 'web-test-helpers'
import Cell from './_OcTableCell.vue'

describe('OcTableCell', () => {
  it('Uses correct element', () => {
    const wrapper = shallowMount(Cell, {
      props: {
        type: 'th',
        alignH: 'right',
        alignV: 'bottom',
        width: 'shrink'
      },
      slots: {
        default: 'Hello world!'
      }
    })

    expect(wrapper.element.tagName).toBe('TH')
    expect(wrapper.classes()).toContain('oc-table-cell-align-right')
    expect(wrapper.classes()).toContain('oc-table-cell-align-bottom')
    expect(wrapper.classes()).toContain('oc-table-cell-width-shrink')
    expect(wrapper.html()).toMatchSnapshot()
  })
})
