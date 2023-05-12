import SkipTo from 'web-runtime/src/components/SkipTo.vue'
import { shallowMount } from 'web-test-helpers'
;(document as any).getElementById = jest.fn(() => ({
  setAttribute: jest.fn(),
  focus: jest.fn(),
  scrollIntoView: jest.fn()
}))

const selectors = {
  skipButton: '.skip-button'
}

describe('SkipTo component', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  const spySkipToTarget = jest.spyOn((SkipTo as any).methods, 'skipToTarget')

  let wrapper
  let skipButton
  beforeEach(() => {
    wrapper = getShallowWrapper().wrapper
    skipButton = wrapper.find(selectors.skipButton)
  })

  it('should render provided text in the slot', () => {
    expect(skipButton.text()).toEqual('Skip to main')
  })
  it('should call "skipToTarget" method on click', async () => {
    await skipButton.trigger('click')

    expect(spySkipToTarget).toHaveBeenCalledTimes(1)
  })
})

function getShallowWrapper() {
  return {
    wrapper: shallowMount(SkipTo, {
      props: {
        target: ''
      },
      slots: {
        default: 'Skip to main'
      }
    })
  }
}
