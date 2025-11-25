import { useState } from 'react'
import './NoelDecorations.css'

interface NoelDecorationsProps {
  isDarkMode: boolean
}

function NoelDecorations({ isDarkMode }: NoelDecorationsProps) {
  const [snowflakes] = useState(() => Array.from({ length: 30 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 5,
    duration: 3 + Math.random() * 4,
    size: 5 + Math.random() * 10
  })))

  const [stars] = useState(() => Array.from({ length: 15 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    top: Math.random() * 100,
    delay: Math.random() * 2,
    size: 10 + Math.random() * 15
  })))

  return (
    <div className="noel-decorations">
      {/* Falling snowflakes */}
      {snowflakes.map(snowflake => (
        <div
          key={`snowflake-${snowflake.id}`}
          className="snowflake"
          style={{
            left: `${snowflake.left}%`,
            animationDelay: `${snowflake.delay}s`,
            animationDuration: `${snowflake.duration}s`,
            width: `${snowflake.size}px`,
            height: `${snowflake.size}px`,
          }}
        >
          ❄
        </div>
      ))}

      {/* Twinkling stars */}
      {stars.map(star => (
        <div
          key={`star-${star.id}`}
          className={`star ${isDarkMode ? 'star-dark' : 'star-light'}`}
          style={{
            left: `${star.left}%`,
            top: `${star.top}%`,
            animationDelay: `${star.delay}s`,
            width: `${star.size}px`,
            height: `${star.size}px`,
          }}
        >
          ⭐
        </div>
      ))}

      {/* Floating ornaments */}
      <div className="ornament ornament-1">🎄</div>
      <div className="ornament ornament-2">🎁</div>
      <div className="ornament ornament-3">🌟</div>
      <div className="ornament ornament-4">❄️</div>
      <div className="ornament ornament-5">🎅</div>

      {/* Corner decorations */}
      <div className="corner-decoration corner-top-left">✨</div>
      <div className="corner-decoration corner-top-right">✨</div>
      <div className="corner-decoration corner-bottom-left">✨</div>
      <div className="corner-decoration corner-bottom-right">✨</div>
    </div>
  )
}

export default NoelDecorations

