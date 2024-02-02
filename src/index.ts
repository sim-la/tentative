interface Options {
  attempts?: {
    max: number
    delay?: number | ((attemptError: Error, attemptIndex: number) => number)
  }
  canRetry?: (attemptError: Error, attemptIndex: number) => boolean
  onRetry?: (attemptError: Error, attemptIndex: number, attemptDelay: number) => void
}

interface Settings {
  max: number
  getDelay: (attemptError: Error, attemptIndex: number) => number
  canRetry?: (attemptError: Error, attemptIndex: number) => boolean
  onRetry?: (attemptError: Error, attemptIndex: number, attemptDelay: number) => void
}

type Retryable<Arguments, Output> = (...args: Array<Arguments>) => Promise<Output>

const DEFAULT_DELAY = 0

export default function tente<Arguments, Output>(
  fn: Retryable<Arguments, Output>,
  options: Options = {}
): Retryable<Arguments, Output> {
  const { max, getDelay, canRetry, onRetry } = getSettings(options)
  let attemptIndex = 0

  const retry: Retryable<Arguments, Output> = (...args: Array<Arguments>) =>
    fn(...args)
      .catch(async (error) => {
        if (attemptIndex >= max || canRetry?.(error, attemptIndex) === false) {
          throw error
        }

        const delay = getDelay(error, attemptIndex)

        if (onRetry !== undefined) {
          onRetry(error, attemptIndex, delay)
        }

        await sleep(delay)

        attemptIndex++

        return retry(...args)
      })

  return retry
}

function getSettings(options: Options): Settings {
  const max = options.attempts?.max ?? 0

  const delayOption = options.attempts?.delay

  const getDelay = (attemptError: Error, attemptIndex: number) => {
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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
