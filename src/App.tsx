import { useMemo, useState, useRef } from 'react'
import './style.css'

type TypingState = 'idle' | 'running' | 'finished'
type TypedMark = 'correct' | 'incorrect' | null

function isPrintableKey(event: React.KeyboardEvent) {
  if (event.ctrlKey || event.metaKey || event.altKey) return false
  // Includes space and punctuation. Excludes things like "Backspace", "ArrowLeft", etc.
  return event.key.length === 1
}

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
    setTimeout(() => {
      typingInputRef.current?.focus()
    }, 0)
  }

  const handleTypingKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (typingState !== 'running') return

    if (event.key === 'Backspace') {
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
      return
    }

    if (!isPrintableKey(event)) return

    event.preventDefault()

    const expected = targetText[position]
    const actual = event.key

    if (expected === undefined) {
      setTypingState('finished')
      setErrorMessage('Nice work! You finished.')
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
    } else {
      setPosition(nextPos)
    }
  }

  const handleSourceKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleStart()
    }
  }

  const renderHighlightedText = () => {
    if (!targetText || typingState === 'idle') {
      return <p className="muted">Enter some text above and press "Start practice".</p>
    }

    return (
      <p className="practice-text">
        {Array.from(targetText).map((ch, i) => {
          const mark = typedMarks[i] ?? null
          const isCaret = typingState === 'running' && i === position

          const className =
            mark === 'correct'
              ? 'typed typed--correct'
              : mark === 'incorrect'
                ? 'typed typed--incorrect'
                : isCaret
                  ? 'typed typed--caret'
                  : 'typed'

          return (
            <span key={i} className={className}>
              {ch}
            </span>
          )
        })}
      </p>
    )
  }

  return (
    <div className="app">
      <h1>Typing Practice</h1>

      <section className="panel">
        <h2 className="panel-title">1. Enter text to practice</h2>
        <textarea
          value={sourceText}
          onChange={(e) => setSourceText(e.target.value)}
          onKeyDown={handleSourceKeyDown}
          className="source-input"
          rows={4}
          placeholder="Type or paste any text you want to practice..."
        />
        <button onClick={handleStart} className="primary-button">
          Start practice
        </button>
      </section>

      <section className="panel">
        <h2 className="panel-title">2. Type the text below</h2>
        <div
          className={`practice-area ${
            typingState === 'idle'
              ? 'practice-area--idle'
              : typingState === 'finished'
              ? 'practice-area--finished'
              : 'practice-area--active'
          }`}
        >
          {renderHighlightedText()}
        </div>
        <input
          ref={typingInputRef}
          value=""
          onKeyDown={handleTypingKeyDown}
          className="typing-input"
          type="text"
          autoComplete="off"
          spellCheck={false}
          disabled={typingState !== 'running'}
          placeholder="Start typing… (this box stays empty; it captures keystrokes)"
        />
        {errorMessage && (
          <p className="error-message" role="alert">
            {errorMessage}
          </p>
        )}
      </section>
    </div>
  )
}

export default App
