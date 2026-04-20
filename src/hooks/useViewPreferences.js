import { useEffect, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useLocation } from 'react-router-dom'
import {
  fetchActiveView, saveActiveView, selectActiveView,
  fetchActiveTab, saveActiveTab, selectActiveTab,
  fetchSavedFilters, selectSavedFilters,
  createSavedFilter, updateSavedFilter, deleteSavedFilter,
} from '../features/views/viewsSlice'

/**
 * Persists the active view type (e.g. 'grid' | 'list') for the current page.
 * Returns [currentView, setView] — drop-in replacement for useState.
 *
 * Usage:
 *   const [viewMode, setViewMode] = useActiveView('grid')
 */
export function useActiveView(defaultView = 'list') {
  const dispatch = useDispatch()
  const { pathname } = useLocation()
  const stored = useSelector(selectActiveView(pathname))

  useEffect(() => {
    dispatch(fetchActiveView(pathname))
  }, [dispatch, pathname])

  const currentView = stored?.type || defaultView

  const setView = useCallback((type) => {
    dispatch(saveActiveView({ path: pathname, type }))
  }, [dispatch, pathname])

  return [currentView, setView]
}

/**
 * Persists the active tab for the current page.
 * Returns [currentTab, setTab] — drop-in replacement for useState.
 *
 * Usage:
 *   const [tab, setTab] = useActiveTab('Overview')
 */
export function useActiveTab(defaultTab = '') {
  const dispatch = useDispatch()
  const { pathname } = useLocation()
  const stored = useSelector(selectActiveTab(pathname))

  useEffect(() => {
    dispatch(fetchActiveTab(pathname))
  }, [dispatch, pathname])

  const currentTab = stored?.tabTarget || defaultTab

  const setTab = useCallback((tabTarget) => {
    dispatch(saveActiveTab({ path: pathname, tabTarget }))
  }, [dispatch, pathname])

  return [currentTab, setTab]
}

/**
 * Loads and manages saved filters for the current page.
 * Returns { filters, saveFilter, updateFilter, removeFilter }
 *
 * Usage:
 *   const { filters, saveFilter, removeFilter } = useSavedFilters()
 */
export function useSavedFilters() {
  const dispatch = useDispatch()
  const { pathname } = useLocation()
  const filters = useSelector(selectSavedFilters(pathname))

  useEffect(() => {
    dispatch(fetchSavedFilters(pathname))
  }, [dispatch, pathname])

  const saveFilter = useCallback((title, color, filterData) => {
    dispatch(createSavedFilter({ path: pathname, title, color, filter: JSON.stringify(filterData) }))
  }, [dispatch, pathname])

  const updateFilter = useCallback((id, updates) => {
    dispatch(updateSavedFilter({ id, data: { ...updates, path: pathname } }))
  }, [dispatch, pathname])

  const removeFilter = useCallback((id) => {
    dispatch(deleteSavedFilter({ id, path: pathname }))
  }, [dispatch, pathname])

  return { filters, saveFilter, updateFilter, removeFilter }
}
