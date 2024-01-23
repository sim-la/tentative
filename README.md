# 🌀 Tentative

A simple promises retry utility.

## 🦾 Usage

The `tentative` package exports a single default function, here called `withRetries`, which allows to retry a promise in case of failure.

### 🤖 Syntax

```javascript
withRetries(promise)
withRetries(promise, options)
```

### ⚙️ Parameters

- `promise`: The promise that will be retried on failure.
- `options` _(optional)_: An object that allows to customize the retry behavior. It supports the following optional fields:
  - `attempts`: Specifies the maximum number of retries and the delay between each retry. It can be either an object or an array of numbers. If it's an array, each element represents the delay in milliseconds before the corresponding retry. If it's an object, it can have the following fields:
    - `max`: The maximum number of retries.
    - `delayInMs`: The delay between retries in milliseconds.
  - `canRetry`: A function that determines whether a retry should be attempted or not. It takes the current error as the first argument and the zero-based index of the current retry as the second argument.
  - `onRetry`: A function that is called at every retry. It takes the zero-based index of the current retry as the first argument and the array of every retries delays in milliseconds as the second argument.

## 💡 Example

```javascript
import withRetries from 'tentative'

const myPromise = new Promise(/* some great code */)

const p = withRetries(
  myPromise,
  {
    attempts: {
      max: 4, // Retry 4 times maximum
      delayInMs: 5000 // Wait 5 seconds between each retry
    },
    canRetry: (e) => e.message.includes('EAI_AGAIN'), // Retry only if the error is a DNS lookup error
    onRetry: (i, delays) => console.log(`🌀 Retrying in ${delays[i]}ms (attempt ${i + 1} out of ${delays.length})`) // Log some information at each retry
  }
)

await p()
```
