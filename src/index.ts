interface Options {
  attempts?: {
    max: number
    delay?: number | ((attemptError: any, attemptIndex: number) => number)
  }
  canRetry?: (attemptError: any, attemptIndex: number) => boolean
  onRetry?: (attemptError: any, attemptIndex: number, attemptDelay: number) => void
}

interface Settings {
  max: number
  getDelay: (attemptError: unknown, attemptIndex: number) => number
  canRetry?: (attemptError: unknown, attemptIndex: number) => boolean
  onRetry?: (attemptError: unknown, attemptIndex: number, attemptDelay: number) => void
}

type AsyncFunction = (...args: Array<any>) => Promise<any>

const DEFAULT_DELAY = 0


export default function tente<F extends AsyncFunction>(
  fn: F,
  options: Options = {}
): F {
  const settings = getSettings(options)

  const withRetries = getWithRetries(settings)

  return getProxy(fn, withRetries)
}


function getSettings(options: Options): Settings {
  const max = options.attempts?.max ?? 0

  const delayOption = options.attempts?.delay

  const getDelay = (attemptError: unknown, attemptIndex: number) => {
    let delay = delayOption ?? DEFAULT_DELAY

    if (typeof delay === 'function') {
      delay = delay(attemptError, attemptIndex)
    }

    delay = isFinite(delay) ? delay : DEFAULT_DELAY

    return Math.max(delay, 0)
  }

  const canRetry = options.canRetry

  const onRetry = options.onRetry

  return { max, getDelay, canRetry, onRetry }
}

function getWithRetries<F extends AsyncFunction>(settings: Settings) {
  const { max, getDelay, canRetry, onRetry } = settings

  let attemptIndex = 0

  const withRetries = (fn: F, ...args: Parameters<typeof fn>): Promise<unknown> =>
    fn(...args)
      .catch(async error => {
        if (attemptIndex >= max || canRetry?.(error, attemptIndex) === false) {
          throw error
        }

        const delay = getDelay(error, attemptIndex)

        if (onRetry !== undefined) {
          onRetry(error, attemptIndex, delay)
        }

        await sleep(delay)

        attemptIndex++

        return withRetries(fn, ...args)
      })

  return withRetries
}

function getProxy<F extends AsyncFunction>(fn: F, withRetries: ReturnType<typeof getWithRetries>) {
  return new Proxy(fn, {
    get(target, prop) { // this-recoverying, see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy#no_private_property_forwarding
      const value = Reflect.get(target, prop)
      if (value instanceof Function) {
        return function (...args: Parameters<F>) {
          return Reflect.apply(value, target, args)
        }
      }
      return value
    },

    async apply(target, _, args: Parameters<F>) {
      return withRetries(target, ...args)
    }
  })
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
