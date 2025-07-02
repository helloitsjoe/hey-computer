import { describe, it, expect } from 'vitest';
import { parseHappyDog } from '../happy-dog';

describe('parseDogApp', () => {
  it('should return an empty object for no match', () => {
    expect(parseHappyDog('just a random phrase')).toEqual({});
  });

  it.each`
    input                            | expected
    ${'i just fed olive'}            | ${{ type: 'feed' }}
    ${'i just gave olive food'}      | ${{ type: 'feed' }}
    ${'i just gave olive her food'}  | ${{ type: 'feed' }}
    ${'i gave olive her food'}       | ${{ type: 'feed' }}
    ${'i just gave olive medicine'}  | ${{ type: 'med' }}
    ${'i just gave olive her meds'}  | ${{ type: 'med' }}
    ${'i gave olive her medication'} | ${{ type: 'med' }}
  `('$input', ({ input, expected }) => {
    expect(parseHappyDog(input)).toEqual(expected);
  });
});
