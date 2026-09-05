import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import {
  api,
  type Priority,
  type TicketFilters,
  type TicketList,
  type TicketStatus,
} from "../api/client";

export interface TicketSort {
  sort: string;
  order: "asc" | "desc";
}

export interface TicketListFilters {
  search: string;
  status: TicketStatus | "";
  priority: Priority | "";
  assignee: string;
}

export const DEFAULT_FILTERS: TicketListFilters = {
  search: "",
  status: "",
  priority: "",
  assignee: "",
};

export const DEFAULT_SORT: TicketSort = { sort: "created_at", order: "desc" };

export const PAGE_SIZES = [10, 20, 50] as const;

export const DEFAULT_PAGE_SIZE = 10;

export function buildQueryFilters(
  filters: TicketListFilters,
  sort: TicketSort,
  page: number,
  pageSize: number,
): TicketFilters {
  return {
    search: filters.search.trim() === "" ? undefined : filters.search.trim(),
    status: filters.status === "" ? undefined : filters.status,
    priority: filters.priority === "" ? undefined : filters.priority,
    assignee: filters.assignee.trim() === "" ? undefined : filters.assignee.trim(),
    sort: sort.sort,
    order: sort.order,
    page,
    page_size: pageSize,
  };
}

export interface UseTicketsResult {
  data: TicketList | undefined;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  filters: TicketListFilters;
  sort: TicketSort;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  setSearch: (value: string) => void;
  setStatus: (value: TicketStatus | "") => void;
  setPriority: (value: Priority | "") => void;
  setAssignee: (value: string) => void;
  setSort: (sort: TicketSort) => void;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  resetFilters: () => void;
}

export function useTickets(): UseTicketsResult {
  const [filters, setFilters] = useState<TicketListFilters>(DEFAULT_FILTERS);
  const [sort, setSortState] = useState<TicketSort>(DEFAULT_SORT);
  const [page, setPageState] = useState<number>(1);
  const [pageSize, setPageSizeState] = useState<number>(DEFAULT_PAGE_SIZE);

  const queryFilters = useMemo(
    () => buildQueryFilters(filters, sort, page, pageSize),
    [filters, sort, page, pageSize],
  );

  const query = useQuery({
    queryKey: ["tickets", queryFilters],
    queryFn: () => api.listTickets(queryFilters),
    placeholderData: (previousData) => previousData,
  });

  const setSearch = useCallback((value: string) => {
    setFilters((prev) => ({ ...prev, search: value }));
    setPageState(1);
  }, []);

  const setStatus = useCallback((value: TicketStatus | "") => {
    setFilters((prev) => ({ ...prev, status: value }));
    setPageState(1);
  }, []);

  const setPriority = useCallback((value: Priority | "") => {
    setFilters((prev) => ({ ...prev, priority: value }));
    setPageState(1);
  }, []);

  const setAssignee = useCallback((value: string) => {
    setFilters((prev) => ({ ...prev, assignee: value }));
    setPageState(1);
  }, []);

  const setSort = useCallback((next: TicketSort) => {
    setSortState(next);
  }, []);

  const setPage = useCallback((next: number) => {
    setPageState(next);
  }, []);

  const setPageSize = useCallback((next: number) => {
    setPageSizeState(next);
    setPageState(1);
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    setSortState(DEFAULT_SORT);
    setPageState(1);
  }, []);

  const total = query.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return {
    data: query.data,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    filters,
    sort,
    page,
    pageSize,
    total,
    totalPages,
    setSearch,
    setStatus,
    setPriority,
    setAssignee,
    setSort,
    setPage,
    setPageSize,
    resetFilters,
  };
}
