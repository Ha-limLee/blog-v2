---
title: Handling Optional Properties in TypeScript
date: '2024-06-03'
tags: ['typescript']
draft: false
summary: Use `exactOptionalPropertyTypes` to distinguish between optional and undefined properties.
images: []
layout: PostSimple
authors: ['default']
---





⚠ This post is based on TS v4.4.4.

Sample codes

- [TS Playground](https://www.typescriptlang.org/play/?jsx=0&module=1&exactOptionalPropertyTypes=true&ts=4.4.4&ssl=61&ssc=44&pln=61&pc=5#code/PTAEDMHsCdQFwJ4AcCm8UGc4ChGtAKICOArgIYA2APAIIA0oAQgHygC8oAFFQCrOcBKdqx6gUADzgoAdgBMMoGqAD8oAIygAXKABMQiVLkLe-IWxFjJM+U2ygV6u1t1PVcaCRRPt4ShhQA3NgAxpDSWJaowXA8yCjatKbCoFROjJaGNsTk1PRMrAbWCu6eDiTSANbSkADu0s7SKABuKNB02PxO4tqM7WasTZAAlrLsXP1c4hMA3gC+QbhxoAByYcskFBRDGAAWJmOihUag5bIo4EONowA+oNIbFA6NLbDaPAvg5dFDYaDbq3B1pttns+JxuqAeAJtOI-gpVtIgVtdvtpk5oCg4CRoPVYQBCNgce6bUAAMlJoHxhJOcnOlxQsiCs2wi3wAFkSFh9hw0fYANoAaT+9QqKAQkHAkIAutoEUiQbxBVLmEyFsAAFTquzqyFLADm5GgozgOzIcFAwR2KGCFQUlEeJrQSGgkCQdoxdzCAFpicidgA6bXAbCfaTfX7bDlcw5WY4AJWtMFkVCw0EueoY5SqtWkzH4EKhMLhoCjcFR6Mx2PqAHkAEYAK2tcH9ooQGHBAn9zVaCE4nFbE3+kEBDxB4L5ralAgETJZvNAIFANRgtsD9lC4XNsjNZG00zuZAAtvFQKn06Bbr6AqBnUNgihlNp7ofa61QLMxvP7NIjyeAERkEgSAUCgf7tPY8wsvYi4AAJwBgXoSFEcCIdALrQNodaNtExZIJAGAYEMtYUAgoAAOS+mRa4WmEGCQCB-oUJAeqcNucBkP6P7Hv6lpkNANBwJwAAM04LPYQySpwkacoJbFkNOoBfpETaxKgVD7lxJ5ntIerXre96PncJAvm+symKxO4zk4660fRKCMcxFnsZxv48aa-GCSJVkQWIFD+Ip1nwDsLo1HcKChQQaEwJwZEAOpDCS1TmhiZCWqAVoYmR3nvtgzLYPOi5JUuK4KDUKAkjUQwmpAJDmhIqVwNWSBwD8P4UAACi6qDQIgqmYNRG4RHJe4Hse2jaXqF5GZselpgZT7Ga+sAfjygWadoAFASBYGBfpJ6nHSVzge+YkLmAcEIUhTaoehmENk2uH4YRxGkRRDxUU4g12Q5LFyS53G8R5wmiVBZ1wqWTnyckvh+V44mSdJWCQwpSlXdEfXqaNWnuOms13g+C0mct5lydlNnhN9TG-Tu-32YDAnA2TQUhWFEVRdAMXxYlw6gClaUZSgWVBBBuVzk4i71dETUtWElCda6rS9XEGDaCUcM0ZuoDDYpWPjTjOlTVeN5zQTRlE++n5rb+G2AcBoHHdBYDBGQ0hFWQBFDHq9QHRcVzwJAQVoK6MttcbCs9Qg1GO8b+PaD79KyMdkHi+d8GIeIyE3TAd3Yea2w3k9REkeRlEDbZDFU5DtNuXxDNeadi6I7JlnJGrTgSVwTfI0IqMZypcSY+tp767pMfzWbS3viTlnC-YGt0RXjl-ZpNdA-XTgfuV-lKSaLONGz6GcwljxFXzOzpa0gvZcyzJAA)

# Problem: Optional and undefined

Sometimes we want to ensure that all the props of a record are not nullish.

Here's a simple type guard implementation:

```ts
type NonNullish<T> = T extends undefined | null ? never : T;

function isNotNullish<T>(x: T): x is NonNullish<T> {
  return x !== null && x !== undefined;
}

type Must<T> = {
  [K in keyof T]: NonNullish<T[K]>;
};

/**
 * Type guard that checks all the props are non-nullish.
 */
function isMust<T extends Record<string, unknown>>(x: T): x is Must<T> {
  return Object.keys(x).every((key) => isNotNullish(x[key]));
}
```

Now we can use the type guard like this:

```ts
// data.name is nullish.
const data: { name: string | null; price?: number } = {
  name: 'apple',
};

if (isMust(data)) {
  // data.name is not nullish here.
  expectType<{ name: string; price?: number }>()(data);
  console.log(data.name.charAt(0));
}
```

Looks good. But this type guard has a caveat:

```ts
const data: { name: string | null; price?: number } = {
  name: 'apple',
  // price is optional so we can assign undefined to it.
  price: undefined,
};

// isMust(data) returns false since data.price is nullish.
if (isMust(data)) {
  // Cannot reach here
  expectType<{ name: string; price?: number }>()(data);
  console.log(data.name.charAt(0));
}
```

It doesn't work well with optional properties.

An optional property in TS can be undefined or absent.

So, we can assign undefined to the optioanl properties.

This type information is valid in general, but when we handle keys of an object, it can break type safety.

# Solution: Exact optional property types

To solve the problem, we should differentiate the absence of the property from the property defined as `undefined`.

Fortunately, TS offers an option for us: `exactOptionalPropertyTypes`.

```ts
// exactOptionalPropertyTypes: true
const data: { name: string | null; price?: number } = {
  name: 'apple',
  // Cannot assign undefined to the optional property.
  // @ts-expect-error: Type 'undefined' is not assignable to type 'number'.
  price: undefined,
};
```

Here's how the data type is inferred.

⬇ `exactOptionalPropertyTypes: false`

![data type before](/static/images/exact-optional-properties/data-type-before.png)

⬇ `exactOptionalPropertyTypes: true`

![data type after](/static/images/exact-optional-properties/data-type-after.png)

With this option, we can use the type guard safely.

```ts
const data: { name: string | null; price?: number } = {
  name: 'apple',
  // Cannot assign undefined to the optional property.
  // So, we can safely narrow the object type to ensure that every property is not nullish, except for optional properties.
  // price: undefined,
};

// isMust(data) => true
if (isMust(data)) {
  expectType<{ name: string; price?: number }>()(data);
  console.log(data.name.charAt(0));
} else {
  throw new Error('Will not reach here');
}
```

# References

[tsconfig#exactOptionalPropertyTypes
](https://www.typescriptlang.org/tsconfig/#exactOptionalPropertyTypes)
