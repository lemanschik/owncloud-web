<template>
  <component :is="listSearch.component" :search-result="searchResult" :loading="loading" />
</template>

<script lang="ts">
import { defineComponent } from 'vue'

import { providerStore } from '../service'
import { debounce } from 'lodash-es'
import { queryItemAsString } from 'web-pkg/src'

export default defineComponent({
  data() {
    const { provider: providerId } = this.$route.query
    const { listSearch } = providerStore.availableProviders.find(
      (provider) => provider.id === providerId
    )
    // abort and return if no provider is found
    return {
      loading: false,
      debouncedSearch: undefined,
      searchResult: {
        values: [],
        totalResults: null
      },
      listSearch
    }
  },
  watch: {
    '$route.query': {
      handler: function (newVal, oldVal) {
        if (newVal?.term === oldVal?.term) {
          return
        }

        this.$nextTick(() => {
          this.debouncedSearch()
        })
      },
      immediate: true
    }
  },
  created() {
    this.debouncedSearch = debounce(this.search, 10)
  },
  methods: {
    async search() {
      this.loading = true
      this.searchResult = await this.listSearch.search(
        queryItemAsString(this.$route.query.term) || ''
      )
      this.loading = false
    }
  }
})
</script>
