import Footer from '@/components/Footer';
import api from '@/configs/axios';
import { authClient } from '@/lib/auth-client';
import { Loader2Icon, ChevronRight, Sparkles } from 'lucide-react';
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface Question {
  id: string;
  category: string;
  question: string;
  affirmation: string;
  placeholder: string;
  required: boolean;
}

const questions: Question[] = [
  // Basic Info (required)
  {
    id: 'productName',
    category: 'Basic Info',
    question: 'What is the Product or Service Name?',
    affirmation: 'The product/service name is: ',
    placeholder: 'e.g., TaskFlow Pro, Digital Marketing Mastery Course...',
    required: true
  },
  {
    id: 'offering',
    category: 'Basic Info',
    question: 'What exactly are you offering? Describe your product or service.',
    affirmation: 'The landing page offering is: ',
    placeholder: 'Describe your product details, key features, and what makes it special...',
    required: true
  },
  {
    id: 'primaryGoal',
    category: 'Basic Info',
    question: 'What is the primary goal of this landing page?',
    affirmation: 'The primary goal of this landing page is: ',
    placeholder: 'e.g., Generate leads, Drive product sales, Get webinar signups, App downloads...',
    required: true
  },
  {
    id: 'cta',
    category: 'Basic Info',
    question: 'What is the primary call to action? The link to your Checkout page or Whatsapp or Signup or Download Page, etc.',
    affirmation: 'The call to action link is: ',
    placeholder: 'e.g., https://yourwebsite.com/checkout or https://wa.me/123456789 ',
    required: true
  },
  // Positioning
  {
    id: 'valueProposition',
    category: 'Positioning',
    question: "What's your unique value proposition - why should someone choose you over competitors?",
    affirmation: 'The unique value proposition is: ',
    placeholder: 'e.g., "The only CRM built specifically for real estate agents" or "50% faster results than traditional methods"...',
    required: false
  },
  {
    id: 'pricing',
    category: 'Positioning',
    question: 'How much is the product or service?',
    affirmation: 'The pricing is: ',
    placeholder: 'e.g., $29/month, $497 one-time, Free with premium at $99/year...',
    required: true
  },
  {
    id: 'targetAudience',
    category: 'Positioning',
    question: 'Describe your audience in their own words? Who is your ideal customer?',
    affirmation: 'The target audience is: ',
    placeholder: 'e.g., "Busy freelancers struggling to manage multiple client projects" or "Marketing managers at mid-size B2B companies"...',
    required: false
  },
  // Urgency & Incentives
  {
    id: 'urgency',
    category: 'Urgency & Incentives',
    question: 'Is there a deadline, limited availability, or special promotion?',
    affirmation: 'The urgency/incentive is: ',
    placeholder: 'e.g., "Early bird discount ends Friday" or "Only 50 spots available" (leave blank if none)',
    required: false
  },
  {
    id: 'guarantees',
    category: 'Urgency & Incentives',
    question: 'Do you have any guarantees, free trials, or risk-reversals?',
    affirmation: 'The guarantees are: ',
    placeholder: 'e.g., "30-day money-back guarantee" or "14-day free trial, no credit card required" (leave blank if none)',
    required: false
  },
  // Social Proof & Credibility
  {
    id: 'credentials',
    category: 'Social Proof',
    question: 'What credentials, certifications, or awards do you have?',
    affirmation: 'The credentials or skills certifications are: ',
    placeholder: 'e.g., "Featured in TechCrunch, Forbes 30 Under 30, ISO 27001 Certified" (leave blank if none)',
    required: false
  },
  {
    id: 'results',
    category: 'Social Proof',
    question: 'Can you share specific results or metrics from past customers?',
    affirmation: 'The customers results or metrics are: ',
    placeholder: 'e.g., "Helped 500+ companies increase conversions by 35% on average" (leave blank if none)',
    required: false
  },
  {
    id: 'socialMedia',
    category: 'Social Proof',
    question: 'Do you want to include your Social Media? Paste the links below separated by commas.',
    affirmation: 'The social media links contact or to know more are: ',
    placeholder: 'e.g., https://twitter.com/yourcompany, https://linkedin.com/company/yourcompany (leave blank if none)',
    required: false
  },
  // Visual & Brand Assets
  {
    id: 'brandGuidelines',
    category: 'Brand Assets',
    question: 'Do you have existing brand guidelines?',
    affirmation: 'The landing page brand guidelines are: ',
    placeholder: 'e.g., "Primary color: #3B82F6, Secondary: #10B981, Font: Poppins" (leave blank if none)',
    required: false
  },
  {
    id: 'imagery',
    category: 'Brand Assets',
    question: 'What imagery or videos do you have available? Paste the links below separated by commas.',
    affirmation: 'The imagery and videos are: ',
    placeholder: 'e.g., https://yoursite.com/hero-image.jpg, https://youtube.com/watch?v=... (leave blank if none)',
    required: false
  },
  {
    id: 'screenshots',
    category: 'Brand Assets',
    question: 'Do you have product/service screenshots links? Paste the links below separated by commas.',
    affirmation: 'The product/service screenshots are: ',
    placeholder: 'e.g., https://yoursite.com/screenshot1.png, https://yoursite.com/screenshot2.png (leave blank if none)',
    required: false
  },
];

const Home = () => {
  const {data: session} = authClient.useSession();
  const navigate = useNavigate();

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [showQuestionnaire, setShowQuestionnaire] = useState(false);

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  const createProjectLabel = !session?.user ? 'Get Started' : 'Create Landing Page';

  const handleStartQuestionnaire = () => {
    if(!session?.user){
      navigate('/auth/signin');
      return toast.error('Please sign in to create a project')
    }
    setShowQuestionnaire(true);
  };

  const handleNext = () => {
    // Check if required field is filled
    if (currentQuestion.required && !currentAnswer.trim()) {
      toast.error('This field is required');
      return;
    }

    // Save current answer
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: currentAnswer
    }));

    // Check if this is the last question
    if (currentQuestionIndex === questions.length - 1) {
      handleSubmit();
    } else {
      // Move to next question
      setCurrentQuestionIndex(prev => prev + 1);
      // Load saved answer for next question if exists
      setCurrentAnswer(answers[questions[currentQuestionIndex + 1].id] || '');
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      
      // Compile all answers into a formatted prompt
      const finalAnswers = {
        ...answers,
        [currentQuestion.id]: currentAnswer
      };

      const prompt = Object.entries(finalAnswers)
        .map(([key, value]) => {
          const q = questions.find(q => q.id === key);
          return value.trim() ? `${q?.affirmation}\n${value}.\n` : '';
        })
        .filter(Boolean)
        .join('\n\n');

      const {data} = await api.post('/api/user/project', {initial_prompt: prompt});
      setLoading(false);
      navigate(`/projects/${data.projectId}`)
    } catch (error: any) {
      setLoading(false);
      toast.error(error?.response?.data?.message || error.message);
      console.log(error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleNext();
    }
  };

  if (!showQuestionnaire ) {
    return (
      <>
        <div>
          <section className="flex flex-col items-center text-white text-sm pb-20 px-4 font-['Poppins']">
            <div className="flex items-center gap-2 rounded-full p-1 pr-3 text-sm mt-20">
              <span className="text-xs px-3 py-1 rounded-full"></span>
              <p className="flex items-center gap-2">
                <span></span>
              </p>
            </div>

            <h1 className="text-center text-[40px] leading-[48px] md:text-6xl md:leading-[70px] mt-4 font-semibold max-w-3xl">
              Turn thoughts into Landing Pages instantly, with AI.
            </h1>

            <p className="text-center text-base max-w-md mt-2 text-gray-300">
              Create, customize and publish Landing Pages faster than ever with our powerful AI Builder.
            </p>

            <button 
              onClick={handleStartQuestionnaire}
              className="mt-10 group relative overflow-hidden bg-gradient-to-r from-[#CB52D4] to-indigo-600 rounded-xl px-8 py-4 text-lg font-semibold transition-all hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/50"
            >
              <span className="relative z-10 flex items-center gap-2">
                {createProjectLabel} <Sparkles className="size-5" />
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-[#CB52D4] opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>

            <p className="text-center text-sm text-gray-400 mt-4">
              Answer a few quick questions to generate your perfect landing page
            </p>
          </section>
        </div>
        <div className='pt-40'>
          <Footer />
        </div>
      </>
    );
  }

  return (
    <>
      <div className="min-h-screen flex justify-center px-4 py-12 items-start">
        <div className="w-full max-w-3xl ">
          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm font-medium text-gray-300">
                {currentQuestion.category}
              </span>
              <span className="text-sm text-gray-400">
                {currentQuestionIndex + 1} of {questions.length}
              </span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden backdrop-blur-sm">
              <div 
                className="h-full bg-gradient-to-r from-[#CB52D4] to-indigo-600 transition-all duration-500 ease-out rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Question Card */}
          <div 
            className="bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-xl rounded-2xl p-8 border border-white/10 shadow-2xl animate-fadeIn"
            key={currentQuestionIndex}
          >
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-6 leading-relaxed">
              {currentQuestion.question}
              {!currentQuestion.required && (
                <span className="ml-3 text-sm font-normal text-gray-400">(optional)</span>
              )}
            </h2>

            <textarea
              value={currentAnswer}
              onChange={(e) => setCurrentAnswer(e.target.value)}
              onKeyDown={handleKeyPress}
              className="w-full bg-white/5 border border-white/20 rounded-xl p-4 text-white placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all min-h-[140px] backdrop-blur-sm"
              placeholder={currentQuestion.placeholder}
              autoFocus
            />

            <div className="flex justify-between items-center mt-6">
              <button
                onClick={() => {
                  if (currentQuestionIndex > 0) {
                    // Save current answer before going back
                    setAnswers(prev => ({
                      ...prev,
                      [currentQuestion.id]: currentAnswer
                    }));
                    setCurrentQuestionIndex(prev => prev - 1);
                    setCurrentAnswer(answers[questions[currentQuestionIndex - 1].id] || '');
                  }
                }}
                disabled={currentQuestionIndex === 0}
                className="text-gray-400 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                ← Back
              </button>

              <div className="flex items-center gap-3">
                {!currentQuestion.required && currentQuestionIndex < questions.length - 1 && (
                  <button
                    onClick={() => {
                      setAnswers(prev => ({
                        ...prev,
                        [currentQuestion.id]: currentAnswer
                      }));
                      setCurrentQuestionIndex(prev => prev + 1);
                      setCurrentAnswer(answers[questions[currentQuestionIndex + 1].id] || '');
                    }}
                    className="text-gray-400 hover:text-white transition-colors text-sm"
                  >
                    Skip
                  </button>
                )}
                
                <button
                  onClick={handleNext}
                  disabled={loading}
                  className="group flex items-center gap-2 bg-gradient-to-r from-[#CB52D4] to-indigo-600 rounded-lg px-6 py-3 font-semibold text-white transition-all hover:scale-105 hover:shadow-lg hover:shadow-purple-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      Creating <Loader2Icon className='animate-spin size-4 text-white'/>
                    </>
                  ) : currentQuestionIndex === questions.length - 1 ? (
                    <>
                      Create Landing Page <Sparkles className="size-4" />
                    </>
                  ) : (
                    <>
                      Next <ChevronRight className="size-4 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </div>
            </div>

            <p className="text-xs text-gray-500 mt-4 text-center">
              Press <kbd className="px-2 py-1 bg-white/10 rounded">Ctrl</kbd> + <kbd className="px-2 py-1 bg-white/10 rounded">Enter</kbd> to continue
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.4s ease-out;
        }
        
        kbd {
          font-family: monospace;
          font-size: 0.75rem;
        }
      `}</style>
    </>
  );
};

export default Home;