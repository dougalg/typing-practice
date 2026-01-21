import { useMemo, useState, useRef } from 'react'
import './style.css'

type TypingState = 'idle' | 'running' | 'finished'
type TypedMark = 'correct' | 'incorrect' | null

function displayChar(ch: string) {
  if (ch === ' ') return 'space'
  if (ch === '\n') return 'newline'
  if (ch === '\t') return 'tab'
  return ch
}

function App() {
  const [sourceText, setSourceText] = useState('')
  const [typingState, setTypingState] = useState<TypingState>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [position, setPosition] = useState(0)
  const [typedMarks, setTypedMarks] = useState<TypedMark[]>([])
  const [isComposing, setIsComposing] = useState(false)
  const [currentInputValue, setCurrentInputValue] = useState('')
  const typingInputRef = useRef<HTMLInputElement>(null)

  const targetText = useMemo(() => sourceText.replace(/\s+$/g, ''), [sourceText])

  const handleStart = () => {
    if (!targetText) {
      setErrorMessage('Please enter some text to practice first.')
      return
    }
    setTypingState('running')
    setPosition(0)
    setTypedMarks(Array.from({ length: targetText.length }, () => null))
    setErrorMessage('')
    setCurrentInputValue('')
    setIsComposing(false)
    setTimeout(() => {
      typingInputRef.current?.focus()
    }, 0)
  }

  const handleTypingInput = (event: React.FormEvent<HTMLInputElement>) => {
    if (typingState !== 'running' || isComposing) return

    const inputElement = event.currentTarget
    const newValue = inputElement.value

    // Find the difference - what was just typed
    if (newValue.length > currentInputValue.length) {
      const typedChar = newValue.slice(currentInputValue.length)
      // Handle the typed character(s) - might be multiple if pasted, but we only care about one at a time
      const actual = typedChar[0]

      const expected = targetText[position]

      if (expected === undefined) {
        setTypingState('finished')
        setErrorMessage('Nice work! You finished.')
        inputElement.value = ''
        setCurrentInputValue('')
        return
      }

      const isExpectedWhitespace = typeof expected === 'string' && expected.length === 1 && /\s/.test(expected)
      // Treat spacebar as "any whitespace" (space, tab, newline, etc.)
      const isCorrect = actual === expected || (actual === ' ' && isExpectedWhitespace)

      if (!isCorrect) {
        // Wrong character - don't advance, show error
        setTypedMarks((prev) => {
          const next = prev.slice()
          next[position] = 'incorrect'
          return next
        })
        setErrorMessage(
          `Error at position ${position + 1}: expected "${displayChar(expected)}" but got "${displayChar(actual)}". Keep typing until you get it right!`,
        )
        inputElement.value = currentInputValue // Reset to previous value
        return
      }

      // Correct character - advance position
      setTypedMarks((prev) => {
        const next = prev.slice()
        next[position] = 'correct'
        return next
      })
      setErrorMessage('')

      const nextPos = position + 1
      if (nextPos >= targetText.length) {
        setTypingState('finished')
        setErrorMessage('Nice work! You finished.')
        inputElement.value = ''
        setCurrentInputValue('')
      } else {
        setPosition(nextPos)
        inputElement.value = '' // Clear input after each character
        setCurrentInputValue('')
      }
    } else if (newValue.length < currentInputValue.length) {
      // Backspace was pressed
      setErrorMessage('')
      setPosition((pos) => {
        if (pos <= 0) return 0
        const newPos = pos - 1
        setTypedMarks((prev) => {
          const next = prev.slice()
          next[newPos] = null
          return next
        })
        return newPos
      })
      setCurrentInputValue('')
      inputElement.value = ''
    }
  }

  const handleCompositionStart = () => {
    setIsComposing(true)
  }

  const handleCompositionEnd = (event: React.CompositionEvent<HTMLInputElement>) => {
    setIsComposing(false)
    // After composition ends, process the input
    if (typingState === 'running') {
      const inputElement = event.currentTarget
      const composedText = inputElement.value

      if (composedText.length > 0) {
        // Handle each character in the composed text
        const expected = targetText[position]
        const actual = composedText[0]

        if (expected !== undefined) {
          const isExpectedWhitespace = typeof expected === 'string' && expected.length === 1 && /\s/.test(expected)
          const isCorrect = actual === expected || (actual === ' ' && isExpectedWhitespace)

          if (!isCorrect) {
            setTypedMarks((prev) => {
              const next = prev.slice()
              next[position] = 'incorrect'
              return next
            })
            setErrorMessage(
              `Error at position ${position + 1}: expected "${displayChar(expected)}" but got "${displayChar(actual)}". Keep typing until you get it right!`,
            )
          } else {
            setTypedMarks((prev) => {
              const next = prev.slice()
              next[position] = 'correct'
              return next
            })
            setErrorMessage('')

            const nextPos = position + 1
            if (nextPos >= targetText.length) {
              setTypingState('finished')
              setErrorMessage('Nice work! You finished.')
            } else {
              setPosition(nextPos)
            }
          }
        }
      }

      inputElement.value = ''
      setCurrentInputValue('')
    }
  }

  const handleTypingKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (typingState !== 'running') return

    // Handle backspace when not composing
    if (event.key === 'Backspace' && !isComposing) {
      event.preventDefault()
      setErrorMessage('')
      setPosition((pos) => {
        if (pos <= 0) return 0
        const newPos = pos - 1
        setTypedMarks((prev) => {
          const next = prev.slice()
          next[newPos] = null
          return next
        })
        return newPos
      })
      setCurrentInputValue('')
      if (typingInputRef.current) {
        typingInputRef.current.value = ''
      }
    }
  }

  const handleSourceKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleStart()
    }
  }

  const renderHighlightedText = () => {
    return (
      <p className="m-0 whitespace-pre-wrap break-words font-mono text-[0.95rem]">
        {Array.from(targetText).map((ch, i) => {
          const mark = typedMarks[i] ?? null
          const isCaret = typingState === 'running' && i === position

          const className =
            mark === 'correct'
              ? 'text-green-600'
              : mark === 'incorrect'
                ? 'text-red-600'
                : isCaret
                  ? 'text-blue-600 font-semibold'
                  : ''

          return (
            <span key={i} className={className}>
              {ch}
            </span>
          )
        })}
      </p>
    )
  }

  const progressPercentage = targetText.length > 0 
    ? Math.round((position / targetText.length) * 100) 
    : 0

  const handleReset = () => {
    setTypingState('idle')
    setPosition(0)
    setTypedMarks([])
    setErrorMessage('')
    setCurrentInputValue('')
    setIsComposing(false)
    if (typingInputRef.current) {
      typingInputRef.current.value = ''
    }
  }

  // Setup view - show text entry and start button
  if (typingState === 'idle') {
    return (
      <div className="bg-white/96 rounded-[18px] p-8 pb-9 sm:p-6 sm:pb-7 shadow-[0_18px_60px_rgba(15,23,42,0.2),0_0_0_1px_rgba(148,163,184,0.25)] backdrop-blur-[14px]">
        <h1 className="m-0 mb-6 text-[2.2rem] sm:text-[1.8rem] tracking-[-0.03em] text-slate-950">
          Typing Practice
        </h1>

        <section className="rounded-[14px] p-5 pb-6 bg-gradient-to-br from-slate-50 to-blue-50 border border-slate-300/40">
          <h2 className="m-0 mb-3 text-[0.95rem] uppercase tracking-[0.09em] text-slate-500">
            Enter text to practice
          </h2>
          <textarea
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
            onKeyDown={handleSourceKeyDown}
            className="w-full resize-y min-h-[80px] max-h-[200px] py-3 px-[0.9rem] rounded-[10px] border border-slate-300 font-inherit leading-relaxed text-slate-950 bg-white transition-all duration-150 ease-out focus:outline-none focus:border-blue-600 focus:shadow-[0_0_0_1px_rgba(37,99,235,0.4),0_0_0_4px_rgba(191,219,254,0.9)] placeholder:text-slate-400"
            rows={4}
            placeholder="Type or paste any text you want to practice..."
          />
          {errorMessage && (
            <p className="min-h-[1.25rem] mt-2.5 text-sm text-red-700" role="alert">
              {errorMessage}
            </p>
          )}
          <button
            onClick={handleStart}
            className="mt-3 rounded-full border-none py-[0.55rem] px-5 text-[0.95rem] font-semibold tracking-[0.03em] uppercase bg-gradient-to-br from-blue-500 to-blue-700 text-blue-50 cursor-pointer inline-flex items-center gap-1.5 shadow-[0_10px_25px_rgba(37,99,235,0.35),0_0_0_1px_rgba(30,64,175,0.7)] transition-all duration-[120ms] ease-out hover:-translate-y-[1px] hover:brightness-105 hover:shadow-[0_14px_30px_rgba(37,99,235,0.4),0_0_0_1px_rgba(30,64,175,0.75)] active:translate-y-0 active:shadow-[0_6px_18px_rgba(37,99,235,0.35),0_0_0_1px_rgba(30,64,175,0.8)]"
          >
            Start practice
          </button>
        </section>
      </div>
    )
  }

  // Practice view - show text, typing input, and progress

  return (
    <div className="bg-white/96 rounded-[18px] p-8 pb-9 sm:p-6 sm:pb-7 shadow-[0_18px_60px_rgba(15,23,42,0.2),0_0_0_1px_rgba(148,163,184,0.25)] backdrop-blur-[14px]">
      <div className="flex items-center justify-between mb-6">
        <h1 className="m-0 text-[2.2rem] sm:text-[1.8rem] tracking-[-0.03em] text-slate-950">
          Typing Practice
        </h1>
        <button
          onClick={handleReset}
          className="rounded-full border-none py-2 px-4 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 cursor-pointer transition-colors duration-150"
        >
          Reset
        </button>
      </div>

      {/* Progress Bar */}
      <div className="mb-6 rounded-full bg-slate-200 h-2 overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${
            typingState === 'finished'
              ? 'bg-green-500'
              : 'bg-blue-500'
          }`}
          style={{ width: `${progressPercentage}%` }}
        />
      </div>

      {/* Progress Stats */}
      <div className="mb-6 flex items-center gap-6 text-sm text-slate-600">
        <div>
          <span className="font-semibold">{position}</span> / <span>{targetText.length}</span> characters
        </div>
        <div>
          <span className="font-semibold">{progressPercentage}%</span> complete
        </div>
      </div>

      {/* Text Display */}
      <section className="rounded-[14px] p-5 pb-6 bg-gradient-to-br from-slate-50 to-blue-50 border border-slate-300/40 mb-5">
        <h2 className="m-0 mb-3 text-[0.95rem] uppercase tracking-[0.09em] text-slate-500">
          Type the text below
        </h2>
        <div
          className={`mt-2 min-h-[80px] rounded-[10px] py-3 px-[0.9rem] text-left flex items-center ${
            typingState === 'finished'
              ? 'border border-solid border-green-500 bg-gradient-to-br from-green-50 to-green-50/50'
              : 'border border-solid border-blue-500 bg-blue-50'
          }`}
        >
          {renderHighlightedText()}
        </div>
        <input
          ref={typingInputRef}
          value={currentInputValue}
          onInput={handleTypingInput}
          onKeyDown={handleTypingKeyDown}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={handleCompositionEnd}
          className="mt-3 w-full py-2.5 px-[0.9rem] rounded-[10px] border border-slate-300 font-inherit bg-white transition-all duration-150 ease-out focus:outline-none focus:border-blue-600 focus:shadow-[0_0_0_1px_rgba(37,99,235,0.4),0_0_0_4px_rgba(191,219,254,0.9)] disabled:bg-gray-200 disabled:cursor-not-allowed placeholder:text-slate-400"
          type="text"
          autoComplete="off"
          spellCheck={false}
          disabled={typingState !== 'running'}
          placeholder="Start typing… (this box stays empty; it captures keystrokes)"
        />
        {errorMessage && (
          <p className="min-h-[1.25rem] mt-2.5 text-sm text-red-700" role="alert">
            {errorMessage}
          </p>
        )}
      </section>
    </div>
  )
}

export default App
