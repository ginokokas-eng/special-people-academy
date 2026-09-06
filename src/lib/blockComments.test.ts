import { describe, expect, it } from 'vitest';
import { openCount, openCountByBlock, orphanCommentIds, sortThread } from './blockComments';

const comment = (
  id: string,
  block: string,
  resolved: string | null = null,
  created = '2026-01-01T00:00:00Z'
) => ({ id, block_client_id: block, resolved_at: resolved, created_at: created });

describe('block comments derivation', () => {
  it('counts only open comments, per block', () => {
    const list = [
      comment('1', 'a'),
      comment('2', 'a'),
      comment('3', 'a', '2026-01-02T00:00:00Z'),
      comment('4', 'b'),
    ];
    expect(openCountByBlock(list)).toEqual({ a: 2, b: 1 });
    expect(openCount(list)).toBe(3);
  });

  it('drops a block from the counts once every comment is resolved', () => {
    const list = [comment('1', 'a', '2026-01-02T00:00:00Z')];
    expect(openCountByBlock(list)).toEqual({});
    expect(openCount(list)).toBe(0);
  });

  it('finds comments whose block has been deleted', () => {
    const list = [comment('1', 'a'), comment('2', 'gone')];
    expect(orphanCommentIds(list, ['a', 'b'])).toEqual(['2']);
    expect(orphanCommentIds(list, ['a', 'gone'])).toEqual([]);
  });

  it('reads a thread oldest first', () => {
    const list = [
      comment('2', 'a', null, '2026-02-01T00:00:00Z'),
      comment('1', 'a', null, '2026-01-01T00:00:00Z'),
    ];
    expect(sortThread(list).map((c) => c.id)).toEqual(['1', '2']);
  });
});
