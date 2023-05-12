import { nextTick, computed, unref, Ref } from 'vue'
import { folderService } from '../../services/folder'
import { fileList } from '../../helpers/ui'
import { usePagination } from '../'
import { useSort, SortDir, SortField } from 'web-pkg/src/composables'
import { useSideBar } from 'web-pkg/src/composables/sideBar'

import {
  queryItemAsString,
  useMutationSubscription,
  useRouteQuery,
  useStore
} from 'web-pkg/src/composables'
import { determineSortFields as determineResourceTableSortFields } from '../../helpers/ui/resourceTable'
import { determineSortFields as determineResourceTilesSortFields } from '../../helpers/ui/resourceTiles'
import { Task } from 'vue-concurrency'
import { Resource } from 'web-client'
import { useSelectedResources, SelectedResourcesResult } from '../selection'
import { ReadOnlyRef } from 'web-pkg'
import { useFileListHeaderPosition } from 'web-pkg/src/composables'

import { ScrollToResult, useScrollTo } from '../scrollTo'
import { useViewMode, useViewSize, ViewModeConstants } from '../viewMode'

interface ResourcesViewDefaultsOptions<T, U extends any[]> {
  loadResourcesTask?: Task<T, U>
}

type ResourcesViewDefaultsResult<T, TT, TU extends any[]> = {
  fileListHeaderY: Ref<any>
  refreshFileListHeaderPosition(): void
  loadResourcesTask: Task<TT, TU>
  areResourcesLoading: ReadOnlyRef<boolean>
  storeItems: ReadOnlyRef<T[]>
  sortFields: ReadOnlyRef<SortField[]>
  paginatedResources: Ref<T[]>
  paginationPages: ReadOnlyRef<number>
  paginationPage: ReadOnlyRef<number>
  handleSort({ sortBy, sortDir }: { sortBy: string; sortDir: SortDir }): void
  sortBy: ReadOnlyRef<string>
  sortDir: ReadOnlyRef<SortDir>
  viewMode: ReadOnlyRef<string>
  viewSize: ReadOnlyRef<number>
  selectedResources: Ref<Resource[]>
  selectedResourcesIds: Ref<(string | number)[]>
  isResourceInSelection(resource: Resource): boolean

  sideBarOpen: Ref<boolean>
  sideBarActivePanel: Ref<string>
} & SelectedResourcesResult &
  ScrollToResult

export const useResourcesViewDefaults = <T, TT, TU extends any[]>(
  options: ResourcesViewDefaultsOptions<TT, TU> = {}
): ResourcesViewDefaultsResult<T, TT, TU> => {
  const loadResourcesTask = options.loadResourcesTask || folderService.getTask()
  const areResourcesLoading = computed(() => {
    return loadResourcesTask.isRunning || !loadResourcesTask.last
  })

  const store = useStore()
  const { refresh: refreshFileListHeaderPosition, y: fileListHeaderY } = useFileListHeaderPosition()

  const storeItems = computed((): T[] => store.getters['Files/activeFiles'] || [])

  const currentViewModeQuery = useRouteQuery('view-mode', ViewModeConstants.defaultModeName)
  const currentViewMode = computed((): string => queryItemAsString(currentViewModeQuery.value))
  const viewMode = useViewMode(currentViewMode)

  const currentTilesSizeQuery = useRouteQuery('tiles-size', '1')
  const currentTilesSize = computed((): string => String(currentTilesSizeQuery.value))
  const viewSize = useViewSize(currentTilesSize)

  const sortFields = computed((): SortField[] => {
    if (unref(viewMode) === ViewModeConstants.tilesView.name) {
      return determineResourceTilesSortFields(unref(storeItems)[0])
    }
    return determineResourceTableSortFields(unref(storeItems)[0])
  })

  const { sortBy, sortDir, items, handleSort } = useSort({ items: storeItems, fields: sortFields })
  const paginationPageQuery = useRouteQuery('page', '1')
  const paginationPage = computed((): number => parseInt(String(paginationPageQuery.value)))
  const { items: paginatedResources, total: paginationPages } = usePagination({
    page: paginationPage,
    items
  })

  useMutationSubscription(['Files/UPSERT_RESOURCE'], async ({ payload }) => {
    await nextTick()
    fileList.accentuateItem(payload.id)
  })

  return {
    fileListHeaderY,
    refreshFileListHeaderPosition,
    loadResourcesTask,
    areResourcesLoading,
    storeItems,
    sortFields,
    viewMode,
    viewSize,
    paginatedResources,
    paginationPages,
    paginationPage,
    handleSort,
    sortBy,
    sortDir,
    ...useSelectedResources({ store }),
    ...useSideBar(),
    ...useScrollTo()
  }
}
