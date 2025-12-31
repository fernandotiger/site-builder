import React, { useState, useEffect } from 'react';
import { Lightbulb, Sparkles, Target, Zap, MessageSquare, Palette } from 'lucide-react';

const PromptTipsBalloons = () => {
  const [visibleTips, setVisibleTips] = useState<number[]>([]);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const tips = [
    {
      id: 1,
      icon: <Lightbulb className="w-5 h-5" />,
      text: "Be specific about your design style",
      color: "from-blue-400 to-blue-600",
      position: { top: '20%', left: '6%' }
    },
    {
      id: 2,
      icon: <Sparkles className="w-5 h-5" />,
      text: "Mention your target audience",
      color: "from-purple-400 to-purple-600",
      position: { top: '20%', right: '6%' }
    },
    {
      id: 3,
      icon: <Target className="w-5 h-5" />,
      text: "Include your business goals",
      color: "from-pink-400 to-pink-600",
      position: { top: '35%', left: '6%' }
    },
    {
      id: 4,
      icon: <Zap className="w-5 h-5" />,
      text: "Describe desired features & sections",
      color: "from-orange-400 to-orange-600",
      position: { top: '35%', right: '6%' }
    },
    {
      id: 5,
      icon: <MessageSquare className="w-5 h-5" />,
      text: "Share your brand personality",
      color: "from-green-400 to-green-600",
      position: { top: '50%', left: '6%' }
    },
    {
      id: 6,
      icon: <Palette className="w-5 h-5" />,
      text: "Mention preferred colors & mood",
      color: "from-cyan-400 to-cyan-600",
      position: { top: '50%', right: '6%' }
    }
  ];

  useEffect(() => {
    // Stagger the appearance of tips
    tips.forEach((tip, index) => {
      setTimeout(() => {
        setVisibleTips(prev => [...prev, tip.id]);
      }, index * 1000);
    });
  }, []);

  return (
    <div className={`${isMobile ? 'relative mt-8' : 'absolute inset-0'} pointer-events-none overflow-hidden`}>
        {isMobile ? (
        // Mobile Layout: Grid below the text area
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 px-4 pointer-events-auto">
          {tips.map((tip) => (
            <div
              key={tip.id}
              className={`transition-opacity duration-1000 ${
                visibleTips.includes(tip.id) ? 'animate-float-fade-mobile' : 'opacity-0'
              }`}
            >
              <div
                className={`bg-gradient-to-br ${tip.color} text-white px-4 py-3 rounded-2xl shadow-lg backdrop-blur-sm`}
                style={{
                  animation: visibleTips.includes(tip.id) 
                    ? `floatAndFadeMobile 8s ease-in-out infinite ${tip.id * 0.5}s` 
                    : 'none'
                }}
              >
                <div className="flex items-center gap-2">
                  <div className="flex-shrink-0">{tip.icon}</div>
                  <p className="text-sm font-medium">{tip.text}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
      
        tips.map((tip) => (
        <div
          key={tip.id}
          className={`absolute transition-opacity duration-1000 ${
            visibleTips.includes(tip.id) ? 'animate-float-fade' : 'opacity-0'
          }`}
          style={tip.position}
        >
          <div
            className={`relative bg-gradient-to-br ${tip.color} text-white px-4 py-3 rounded-2xl shadow-lg backdrop-blur-sm pointer-events-auto max-w-xs`}
            
          >
            <div className="flex items-center gap-2">
              <div className="flex-shrink-0">{tip.icon}</div>
              <p className="text-sm font-medium">{tip.text}</p>
            </div>
            
            {/* Balloon tail */}
            <div
              className={`absolute w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent`}
              style={{
                bottom: '-6px',
                left: '20px',
                borderTopColor: 'inherit',
                filter: 'brightness(0.9)'
              }}
            />
          </div>
        </div>
      ))
      )}

      

      <style>{`
        @keyframes floatAndFade {
          0% {
            opacity: 0;
            transform: translateY(10px);
          }
          15% {
            opacity: 1;
            transform: translateY(0px);
          }
          85% {
            opacity: 1;
            transform: translateY(-5px);
          }
          100% {
            opacity: 0;
            transform: translateY(-15px);
          }
        }

        .animate-float-fade {
          animation: floatAndFade 20s ease-in-out infinite;
        }
        
        .animate-float-fade-mobile {
          animation: floatAndFadeMobile 8s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};
export default PromptTipsBalloons;