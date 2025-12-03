{/* Chart Section - Top Left */}
          <div style={{
            backgroundColor: cardBg,
            borderRadius: '16px',
            padding: '24px',
            border: `1px solid ${borderColor}`,
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            animation: 'fadeInUp 1s ease-out',
            transition: 'all 0.3s ease',
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            minHeight: 0
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)'
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.15)'
            e.currentTarget.style.borderColor = borderColor === '#333333' ? '#444444' : '#d1d5db'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)'
            e.currentTarget.style.borderColor = borderColor
          }}
          >
            <h3 style={{
              fontSize: '20px',
              fontWeight: 600,
              color: textColor,
              marginBottom: '20px'
            }}>
              Évolution des Réservations
            </h3>
            
            {/* Legend */}
            <div style={{
              display: 'flex',
              gap: '24px',
              marginBottom: '20px',
              flexWrap: 'wrap'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  backgroundColor: '#3b82f6',
                  boxShadow: '0 0 8px rgba(59, 130, 246, 0.5)'
                }}></div>
                <span style={{ fontSize: '14px', color: textSecondary }}>Metré</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  backgroundColor: orangeColor,
                  boxShadow: `0 0 8px ${orangeColor}50`
                }}></div>
                <span style={{ fontSize: '14px', color: textSecondary }}>Pose</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  backgroundColor: '#10b981',
                  boxShadow: '0 0 8px rgba(16, 185, 129, 0.5)'
                }}></div>
                <span style={{ fontSize: '14px', color: textSecondary }}>SAV</span>
              </div>
            </div>

            {/* Chart */}
            <div style={{ position: 'relative', width: '100%', flex: 1, minHeight: '400px' }}>
              {chartData.length === 0 ? (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  minHeight: '400px',
                  color: textSecondary,
                  fontSize: '16px',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  <Calendar style={{ width: '48px', height: '48px', opacity: 0.5 }} />
                  <span>Aucune réservation pour afficher le graphique</span>
                </div>
              ) : (
              <svg width="100%" height="100%" style={{ overflow: 'visible' }} viewBox="0 0 900 400" preserveAspectRatio="xMidYMid meet">
                {/* Grid lines */}
                {[0, 1, 2, 3, 4, 5].map((i) => {
                  const y = (i / 5) * 380 + 10
                  return (
                    <line
                      key={`grid-${i}`}
                      x1="60"
                      y1={y}
                      x2="860"
                      y2={y}
                      stroke={borderColor}
                      strokeWidth="1"
                      strokeDasharray="4 4"
                      opacity="0.3"
                      style={{
                        animation: chartAnimation ? `fadeIn 0.5s ease-out ${i * 0.1}s both` : 'none'
                      }}
                    />
                  )
                })}

                {/* Y-axis labels */}
                {[0, 1, 2, 3, 4, 5].map((i) => {
                  const value = Math.round((maxValue / 5) * (5 - i))
                  const y = (i / 5) * 380 + 10
                  return (
                    <text
                      key={`y-label-${i}`}
                      x="55"
                      y={y + 4}
                      textAnchor="end"
                      fontSize="12"
                      fill={textSecondary}
                      style={{
                        animation: chartAnimation ? `fadeIn 0.5s ease-out ${i * 0.1}s both` : 'none'
                      }}
                    >
                      {value}
                    </text>
                  )
                })}

                {/* Chart area */}
                <g transform="translate(60, 10)">
                  {chartData.length > 0 && chartData.map((data, index) => {
                    const chartWidth = 800
                    const divisor = chartData.length > 1 ? (chartData.length - 1) : 1
                    const x = (index / divisor) * chartWidth
                    
                    return (
                      <g key={`month-${index}`}>
                        {/* X-axis labels */}
                        <text
                          x={x}
                          y="395"
                          textAnchor="middle"
                          fontSize="13"
                          fill={textSecondary}
                          style={{
                            animation: chartAnimation ? `fadeInUp 0.5s ease-out ${0.6 + index * 0.1}s both` : 'none'
                          }}
                        >
                          {data.month}
                        </text>
                      </g>
                    )
                  })}

                  {/* Metré line - offset up when overlapping */}
                  {chartData.length > 0 && (
                    <path
                      d={(() => {
                        const chartWidth = 800
                        const divisor = chartData.length > 1 ? (chartData.length - 1) : 1
                        const points = chartData.map((data, index) => {
                          const x = (index / divisor) * chartWidth
                          const baseY = 380 - (data.Metré / maxValue) * 380
                          // Add offset when overlapping with other values
                          let offset = 0
                          if (data.Metré === data.Pose || data.Metré === data.SAV) offset = -8
                          const y = Math.max(5, baseY + offset)
                          return `${index === 0 ? 'M' : 'L'} ${x} ${y}`
                        }).join(' ')
                        return points || 'M 0 380'
                      })()}
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{
                        strokeDasharray: chartAnimation ? '1000' : '0',
                        strokeDashoffset: chartAnimation ? '0' : '1000',
                        transition: 'stroke-dashoffset 2s ease-out',
                        filter: 'drop-shadow(0 0 4px rgba(59, 130, 246, 0.5))'
                      }}
                    />
                  )}

                  {/* Pose line - no offset (middle) */}
                  {chartData.length > 0 && (
                    <path
                      d={(() => {
                        const chartWidth = 800
                        const divisor = chartData.length > 1 ? (chartData.length - 1) : 1
                        const points = chartData.map((data, index) => {
                          const x = (index / divisor) * chartWidth
                          const y = 380 - (data.Pose / maxValue) * 380
                          return `${index === 0 ? 'M' : 'L'} ${x} ${y}`
                        }).join(' ')
                        return points || 'M 0 380'
                      })()}
                      fill="none"
                      stroke={orangeColor}
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{
                        strokeDasharray: chartAnimation ? '1000' : '0',
                        strokeDashoffset: chartAnimation ? '0' : '1000',
                        transition: 'stroke-dashoffset 2s ease-out 0.3s',
                        filter: `drop-shadow(0 0 4px ${orangeColor}50)`
                      }}
                    />
                  )}

                  {/* SAV line - offset down when overlapping */}
                  {chartData.length > 0 && (
                    <path
                      d={(() => {
                        const chartWidth = 800
                        const divisor = chartData.length > 1 ? (chartData.length - 1) : 1
                        const points = chartData.map((data, index) => {
                          const x = (index / divisor) * chartWidth
                          const baseY = 380 - (data.SAV / maxValue) * 380
                          // Add offset when overlapping with other values
                          let offset = 0
                          if (data.SAV === data.Pose || data.SAV === data.Metré) offset = 8
                          const y = Math.min(378, baseY + offset)
                          return `${index === 0 ? 'M' : 'L'} ${x} ${y}`
                        }).join(' ')
                        return points || 'M 0 380'
                      })()}
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{
                        strokeDasharray: chartAnimation ? '1000' : '0',
                        strokeDashoffset: chartAnimation ? '0' : '1000',
                        transition: 'stroke-dashoffset 2s ease-out 0.6s',
                        filter: 'drop-shadow(0 0 4px rgba(16, 185, 129, 0.5))'
                      }}
                    />
                  )}

                  {/* Data points with combined hover */}
                  {chartData.length > 0 && chartData.map((data, index) => {
                    const chartWidth = 800
                    const divisor = chartData.length > 1 ? (chartData.length - 1) : 1
                    const x = (index / divisor) * chartWidth
                    const delay = 0.8 + index * 0.1
                    const isHovered = hoveredMonth === index
                    
                    // Calculate Y positions with offsets for overlapping values
                    const metreY = 380 - (data.Metré / maxValue) * 380
                    const poseY = 380 - (data.Pose / maxValue) * 380
                    const savY = 380 - (data.SAV / maxValue) * 380
                    
                    // Offset points when overlapping
                    const metreOffset = (data.Metré === data.Pose || data.Metré === data.SAV) ? -8 : 0
                    const savOffset = (data.SAV === data.Pose || data.SAV === data.Metré) ? 8 : 0
                    
                    return (
                      <g 
                        key={`points-${index}`}
                        onMouseEnter={() => setHoveredMonth(index)}
                        onMouseLeave={() => setHoveredMonth(null)}
                        style={{ cursor: 'pointer' }}
                      >
                        {/* Invisible hover zone for the entire column */}
                        <rect
                          x={x - 30}
                          y={0}
                          width={60}
                          height={380}
                          fill="transparent"
                        />
                        
                        {/* Vertical hover line */}
                        {isHovered && (
                          <line
                            x1={x}
                            y1={10}
                            x2={x}
                            y2={380}
                            stroke={isDarkMode ? '#ffffff20' : '#00000015'}
                            strokeWidth="2"
                            strokeDasharray="4 4"
                          />
                        )}
                        
                        {/* Metré point */}
                        <circle
                          cx={x}
                          cy={Math.max(5, metreY + metreOffset)}
                          r={isHovered ? 8 : 6}
                          fill="#3b82f6"
                          stroke={isHovered ? '#ffffff' : 'none'}
                          strokeWidth="2"
                          style={{
                            opacity: chartAnimation ? 1 : 0,
                            transform: chartAnimation ? 'scale(1)' : 'scale(0)',
                            transformOrigin: 'center',
                            transition: `all 0.3s ease-out ${delay}s`,
                            filter: isHovered 
                              ? 'drop-shadow(0 0 10px rgba(59, 130, 246, 1))' 
                              : 'drop-shadow(0 0 6px rgba(59, 130, 246, 0.8))'
                          }}
                        />
                        
                        {/* Pose point */}
                        <circle
                          cx={x}
                          cy={poseY}
                          r={isHovered ? 8 : 6}
                          fill={orangeColor}
                          stroke={isHovered ? '#ffffff' : 'none'}
                          strokeWidth="2"
                          style={{
                            opacity: chartAnimation ? 1 : 0,
                            transform: chartAnimation ? 'scale(1)' : 'scale(0)',
                            transformOrigin: 'center',
                            transition: `all 0.3s ease-out ${delay + 0.1}s`,
                            filter: isHovered 
                              ? `drop-shadow(0 0 10px ${orangeColor})` 
                              : `drop-shadow(0 0 6px ${orangeColor}80)`
                          }}
                        />
                        
                        {/* SAV point */}
                        <circle
                          cx={x}
                          cy={Math.min(378, savY + savOffset)}
                          r={isHovered ? 8 : 6}
                          fill="#10b981"
                          stroke={isHovered ? '#ffffff' : 'none'}
                          strokeWidth="2"
                          style={{
                            opacity: chartAnimation ? 1 : 0,
                            transform: chartAnimation ? 'scale(1)' : 'scale(0)',
                            transformOrigin: 'center',
                            transition: `all 0.3s ease-out ${delay + 0.2}s`,
                            filter: isHovered 
                              ? 'drop-shadow(0 0 10px rgba(16, 185, 129, 1))' 
                              : 'drop-shadow(0 0 6px rgba(16, 185, 129, 0.8))'
                          }}
                        />
                        
                        {/* Combined tooltip */}
                        {isHovered && (
                          <g>
                            {/* Tooltip background */}
                            <rect
                              x={x - 70}
                              y={Math.min(metreY, poseY, savY) - 90}
                              width={140}
                              height={80}
                              rx="8"
                              fill={isDarkMode ? '#1a1a1a' : '#ffffff'}
                              stroke={isDarkMode ? '#333333' : '#e5e7eb'}
                              strokeWidth="1"
                              style={{
                                filter: 'drop-shadow(0 4px 12px rgba(0, 0, 0, 0.15))'
                              }}
                            />
                            {/* Month title */}
                            <text
                              x={x}
                              y={Math.min(metreY, poseY, savY) - 68}
                              textAnchor="middle"
                              fontSize="12"
                              fontWeight="600"
                              fill={isDarkMode ? '#ffffff' : '#111827'}
                            >
                              {data.month}
                            </text>
                            {/* Metré value */}
                            <text
                              x={x - 55}
                              y={Math.min(metreY, poseY, savY) - 48}
                              fontSize="11"
                              fill="#3b82f6"
                              fontWeight="500"
                            >
                              ● Metré: {data.Metré}
                            </text>
                            {/* Pose value */}
                            <text
                              x={x - 55}
                              y={Math.min(metreY, poseY, savY) - 32}
                              fontSize="11"
                              fill={orangeColor}
                              fontWeight="500"
                            >
                              ● Pose: {data.Pose}
                            </text>
                            {/* SAV value */}
                            <text
                              x={x - 55}
                              y={Math.min(metreY, poseY, savY) - 16}
                              fontSize="11"
                              fill="#10b981"
                              fontWeight="500"
                            >
                              ● SAV: {data.SAV}
                            </text>
                          </g>
                        )}
                      </g>
                    )
                  })}
                </g>

                {/* Y-axis */}
                <line
                  x1="60"
                  y1="10"
                  x2="60"
                  y2="390"
                  stroke={borderColor}
                  strokeWidth="2"
                  style={{
                    animation: chartAnimation ? 'fadeIn 0.5s ease-out' : 'none'
                  }}
                />

                {/* X-axis */}
                <line
                  x1="60"
                  y1="390"
                  x2="860"
                  y2="390"
                  stroke={borderColor}
                  strokeWidth="2"
                  style={{
                    animation: chartAnimation ? 'fadeIn 0.5s ease-out 0.3s both' : 'none'
                  }}
                />
              </svg>
              )}
            </div>
          </div>