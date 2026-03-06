import { describe, it, expect, vi } from 'vitest';
import { createRestAdapter } from '../src/auto/rest-adapter';
import type { QueryParams, QueryResult } from '../src/types';

// ─── helpers ─────────────────────────────────────────────────────────────────

const BASE_PARAMS: QueryParams = {
  page: 1,
  pageSize: 10,
  search: '',
  sort: '',
  sortOrder: 'asc',
  filters: {},
  dateRange: { from: '', to: '' },
};

interface User extends Record<string, unknown> {
  id: number;
  name: string;
}

const MOCK_RESULT: QueryResult<User> = {
  data: [{ id: 1, name: 'Alice' }],
  meta: { total: 1, page: 1, pageSize: 10, totalPages: 1 },
};

// ─── tests ───────────────────────────────────────────────────────────────────

describe('createRestAdapter — structure', () => {
  it('returns adapter with query method', () => {
    const adapter = createRestAdapter<User>({ queryFn: vi.fn() });
    expect(adapter).toBeDefined();
    expect(adapter.query).toBeTypeOf('function');
  });

  it('does not expose meta or queryByIds when not provided', () => {
    const adapter = createRestAdapter<User>({ queryFn: vi.fn() });
    expect(adapter.meta).toBeUndefined();
    expect(adapter.queryByIds).toBeUndefined();
  });

  it('exposes meta when metaFn is provided', () => {
    const adapter = createRestAdapter<User>({
      queryFn: vi.fn(),
      metaFn: vi.fn().mockResolvedValue({ name: 'users', columns: [], capabilities: {}, filters: [] }),
    });
    expect(adapter.meta).toBeTypeOf('function');
  });

  it('exposes queryByIds when queryByIdsFn is provided', () => {
    const adapter = createRestAdapter<User>({
      queryFn: vi.fn(),
      queryByIdsFn: vi.fn().mockResolvedValue([]),
    });
    expect(adapter.queryByIds).toBeTypeOf('function');
  });
});

describe('createRestAdapter — query delegation', () => {
  it('delegates to queryFn with the exact params', async () => {
    const queryFn = vi.fn().mockResolvedValue(MOCK_RESULT);
    const adapter = createRestAdapter<User>({ queryFn });

    const result = await adapter.query(BASE_PARAMS);

    expect(queryFn).toHaveBeenCalledOnce();
    expect(queryFn).toHaveBeenCalledWith(BASE_PARAMS);
    expect(result).toEqual(MOCK_RESULT);
  });

  it('propagates rejection from queryFn', async () => {
    const queryFn = vi.fn().mockRejectedValue(new Error('network failure'));
    const adapter = createRestAdapter<User>({ queryFn });

    await expect(adapter.query(BASE_PARAMS)).rejects.toThrow('network failure');
  });

  it('passes non-default params correctly', async () => {
    const queryFn = vi.fn().mockResolvedValue(MOCK_RESULT);
    const adapter = createRestAdapter<User>({ queryFn });

    const customParams: QueryParams = {
      ...BASE_PARAMS,
      page: 3,
      pageSize: 25,
      search: 'alice',
      sort: 'name',
      sortOrder: 'desc',
    };

    await adapter.query(customParams);

    expect(queryFn).toHaveBeenCalledWith(customParams);
  });
});

describe('createRestAdapter — meta delegation', () => {
  it('delegates meta() to metaFn', async () => {
    const mockMeta = { name: 'users', columns: [], capabilities: {}, filters: [] };
    const metaFn = vi.fn().mockResolvedValue(mockMeta);
    const adapter = createRestAdapter<User>({ queryFn: vi.fn(), metaFn });

    const meta = await adapter.meta!();

    expect(metaFn).toHaveBeenCalledOnce();
    expect(meta).toEqual(mockMeta);
  });
});

describe('createRestAdapter — queryByIds delegation', () => {
  it('delegates queryByIds() to queryByIdsFn', async () => {
    const users: User[] = [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }];
    const queryByIdsFn = vi.fn().mockResolvedValue(users);
    const adapter = createRestAdapter<User>({ queryFn: vi.fn(), queryByIdsFn });

    const result = await adapter.queryByIds!([1, 2]);

    expect(queryByIdsFn).toHaveBeenCalledWith([1, 2]);
    expect(result).toEqual(users);
  });

  it('passes sort options to queryByIdsFn', async () => {
    const queryByIdsFn = vi.fn().mockResolvedValue([]);
    const adapter = createRestAdapter<User>({ queryFn: vi.fn(), queryByIdsFn });

    await adapter.queryByIds!([1], { sortBy: 'name', sortOrder: 'asc' });

    expect(queryByIdsFn).toHaveBeenCalledWith([1], { sortBy: 'name', sortOrder: 'asc' });
  });
});

describe('createRestAdapter — type inference', () => {
  it('infers Record<string, unknown> when no generic provided', () => {
    const queryFn = vi.fn().mockResolvedValue({ data: [], meta: { total: 0, page: 1, pageSize: 10, totalPages: 0 } });
    const adapter = createRestAdapter({ queryFn });
    expect(adapter.query).toBeTypeOf('function');
  });
});
