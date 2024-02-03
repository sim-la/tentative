# 🌀 Tentative

A simple yet handy promises retry utility.

## ✨ Features

- 🪶 Light & minimal with 0 dependencies.
- 🛠️ Easily & highly customisable.
- 🧬 Leverages proxies so that the output can be used as a drop-in replacement of the original function; its call is powered with a retry strategy.

## 🦾 Usage

The `tentative` package exports a single default function, here called `tente`, to retry a promise in case of failure using a custom strategy.

### 🤖 Syntax

```javascript
tente(retryable)
tente(retryable, options)
```

### ⚙️ Parameters

- `retryable`: The function returning a promise that will be retried on failure.
- `options` _(optional)_: An object to customise the retry behavior. It supports the following fields:
  - `attempts` _(optional)_: Specifies the maximum number of retries and the delay between each retry. It can have the following fields:
    - `max` _(optional)_: The maximum number of retries. **Defaults to 0**.
    - `delay` _(optional)_: The delay between retries. It can be a number or a function. If it is a number, it represents the delay in _milliseconds_. Any non-finite or negative number will be replaced by 0. If it is a function, it will be invoked before each retry and given the current error as the first argument and the zero-based index of the current retry as the second argument, and it must return a number that represents the current delay needed in _milliseconds_. Any non-finite or negative number returned will be replaced by 0. **Defaults to 0**.
  - `canRetry` _(optional)_: A function that determines whether a retry should be attempted or not. It takes the current error as the first argument and the zero-based index of the current retry as the second argument. It won't be called if the maximum attempt number defined by the `max` parameter is reached. **If not provided, only the `max` parameter is checked to determine if the retry has to be performed.**
  - `onRetry` _(optional)_: A function that is called before every retry. It takes the current error as the first argument, the zero-based index of the current retry as the second argument, and the current retry delay in milliseconds as the third argument. The function is called before waiting for the current retry delay.

### 📤 Output

A proxy of the given retryable function.
Only the call is changed, powered with a given retry strategy.
The output can be used just like the original function.

### 📦 Installation

#### npm

```sh
npm install tentative
```

#### Bun

```sh
bun install tentative
```

#### Deno

No installation required.
Import the function directly from the URL `https://deno.land/x/tentative/index.ts` (see examples below).

## 💡 Examples

For the sake of simplicity, here the `tentative` exported function is called `t`, but use whatever name that makes sense (such as `tente`, `withRetries`, `retry`, etc.).

### Fixed delay with conditional and logging

Retry an async function 4 times maximum with a 5-second delay between retries.
Retry only if the error is a DNS lookup error and log a message on every retry.

```javascript
// npm & Bun
import t from 'tentative'
// Deno
import t from 'https://deno.land/x/tentative/index.ts'

const asyncFct = (/* some arguments */) => new Promise(/* some great code */)

const max = 4

const p = t(
  asyncFct,
  {
    attempts: {
      max,
      delay: 5000
    },
    canRetry: (e) => e.message.includes('EAI_AGAIN'),
    onRetry: (e, i, delay) => console.log(`🌀 [${i + 1}/${max}] Retrying in ${delay}ms (${e.message})`)
  }
)

await p()
```

### Random delays

Retry an async function 10 times maximum with a 3-second delay on DNS lookup errors and with a random delay between 5 to 10 seconds on other errors.

```javascript
// npm & Bun
import t from 'tentative'
// Deno
import t from 'https://deno.land/x/tentative/index.ts'

const asyncFct = (/* some arguments */) => new Promise(/* some great code */)

const p = t(
  asyncFct,
  {
    attempts: {
      max: 10,
      delay: (e) => e.message.includes('EAI_AGAIN') ? 3000 : 5000 + Math.random() * 5000
    }
  }
)

await p()
```

### Incremental delays

Retry an async function 7 times maximum with a 1-second incremental delay starting at 2 seconds.

```javascript
// npm & Bun
import t from 'tentative'
// Deno
import t from 'https://deno.land/x/tentative/index.ts'

const asyncFct = (/* some arguments */) => new Promise(/* some great code */)

const p = t(
  asyncFct,
  {
    attempts: {
      max: 7,
      delay: (_, i) => 2000 + i * 1000
    }
  }
)

await p()
```

### Fixed custom delays

Retry an async function 3 times maximum with different custom delays.

```javascript
// npm & Bun
import t from 'tentative'
// Deno
import t from 'https://deno.land/x/tentative/index.ts'

const asyncFct = (/* some arguments */) => new Promise(/* some great code */)

const delays = [2000, 4000, 9000]

const p = t(
  asyncFct,
  {
    attempts: {
      max: delays.length,
      delay: (_, i) => delays[i]
    }
  }
)

await p()
```
