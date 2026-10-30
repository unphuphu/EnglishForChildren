import { speak } from '../core/speech.js'
import { useSpeechAvailable } from '../core/useSpeechAvailable.js'
import { useAutoSpeak } from '../games/useAutoSpeak.js'

// The explanation of a grammar lesson: Vietnamese text and English examples that can be heard.
// `short` shows only a reminder (the first block); `autoRead` reads the first example once;
// `onDone` adds the button that moves to the next step of a lesson.
export default function GrammarExplain({ lesson, short = false, autoRead = false, onDone, speechRate = 1, voiceName }) {
  const available = useSpeechAvailable()
  const blocks = short ? lesson.explain.slice(0, 1) : lesson.explain
  const firstExample = blocks[0]?.examples[0]?.en ?? null
  useAutoSpeak(autoRead ? firstExample : null, { rate: speechRate, voice: voiceName })

  return (
    <section className="grammar-explain">
      <h2>{lesson.title}</h2>
      {short && <p className="reminder">Nhắc lại nhé:</p>}
      {blocks.map((block, i) => (
        <div key={i} className="explain-block">
          <p className="explain-vi">{block.vi}</p>
          <ul className="examples">
            {block.examples.map((example) => (
              <li key={example.en}>
                <span className="example-en">{example.en}</span>
                <span className="example-vi">{example.vi}</span>
                {available && (
                  <button
                    type="button"
                    className="speaker small"
                    aria-label={`Nghe: ${example.en}`}
                    onClick={() => speak(example.en, { rate: speechRate, voice: voiceName })}
                  >
                    🔊
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
      {onDone && <button type="button" className="primary" onClick={onDone}>Tiếp tục</button>}
    </section>
  )
}
