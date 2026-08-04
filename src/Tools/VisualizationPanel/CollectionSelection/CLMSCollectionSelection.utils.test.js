import { flattenCLMSCategoryOptions } from './CLMSCollectionSelection.utils';

describe('flattenCLMSCategoryOptions', () => {
  it('returns [] when every node is a leaf', () => {
    const leaves = [
      { label: 'Leaf A', id: 'leaf-a' },
      { label: 'Leaf B', id: 'leaf-b' },
    ];

    expect(flattenCLMSCategoryOptions(leaves)).toEqual([]);
  });

  it('treats a node with an empty options array as a leaf', () => {
    const tree = [{ label: 'Empty category', id: 'empty', options: [] }];

    expect(flattenCLMSCategoryOptions(tree)).toEqual([]);
  });

  it('returns only non-leaf category nodes across multiple tree levels', () => {
    const tree = [
      {
        label: 'Root',
        id: 'root',
        options: [
          {
            label: 'Mid',
            id: 'mid',
            options: [{ label: 'Leaf', id: 'leaf' }],
          },
          { label: 'Leaf sibling', id: 'leaf-sibling' },
        ],
      },
    ];

    expect(flattenCLMSCategoryOptions(tree)).toEqual([
      { label: 'Root', id: 'root', options: tree[0].options },
      { label: 'Mid', id: 'mid', options: tree[0].options[0].options },
    ]);
  });
});
