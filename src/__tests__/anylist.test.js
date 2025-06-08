import { describe, it, expect } from 'vitest';
import { preprocessAnylist } from '../anylist';

describe('preprocessAnylist', () => {
  it.each`
    description                        | input                                      | expected
    ${'invalid phrase'}                | ${'just a random phrase'}                  | ${undefined}
    ${'basic item addition'}           | ${'add milk to the grocery list'}          | ${['milk']}
    ${'item with "please add" prefix'} | ${'please add eggs to my grocery list'}    | ${['eggs']}
    ${'item with no "add" prefix'}     | ${'eggs to my grocery list'}               | ${['eggs']}
    ${'leading/trailing whitespace'}   | ${'   add bread   to the grocery list   '} | ${['bread']}
  `('$description', ({ input, expected }) => {
    expect(preprocessAnylist(input)).toEqual(expected);
  });

  describe('multiple items', () => {
    it.each`
      description                                             | input                                                | expected
      ${'multiple items with "and"'}                          | ${'add milk and eggs to the grocery list'}           | ${['milk', 'eggs']}
      ${'treats mac and cheese as one item'}                  | ${'add macaroni and cheese to the grocery list'}     | ${['mac and cheese']}
      ${'treats mac and cheese as one item with other items'} | ${'add mac and cheese and milk to the grocery list'} | ${['mac and cheese', 'milk']}
    `('$description', ({ input, expected }) => {
      expect(preprocessAnylist(input)).toEqual(expected);
    });
  });
});
