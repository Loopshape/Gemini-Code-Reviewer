
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from './components/Header';
import { Loader } from './components/Loader';
import { FeedbackDisplay } from './components/FeedbackDisplay';
import { reviewCode } from './services/geminiService';
import { LANGUAGES } from './constants';

// Define hljs and marked on window for TypeScript
declare global {
    interface Window {
        hljs: any;
        marked: any;
    }
}

const App: React.FC = () => {
  const [code, setCode] = useState<string>('');
  const [language, setLanguage] = useState<string>('javascript');
  const [feedback, setFeedback] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [ollamaEndpoint, setOllamaEndpoint] = useState<string>('http://localhost:11434/api/generate');
  const [isOllamaLoading, setIsOllamaLoading] = useState<boolean>(false);
  const [ollamaResponse, setOllamaResponse] = useState<string | null>(null);

  const [highlightedCode, setHighlightedCode] = useState<string>('');
  const [copyButtonText, setCopyButtonText] = useState('Copy Code');

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const languageDetectionRef = useRef<boolean>(false);
  const highlightTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    try {
      const savedCode = localStorage.getItem('gemini-code-reviewer-code');
      const savedLang = localStorage.getItem('gemini-code-reviewer-language');
      if (savedCode) {
        setCode(savedCode);
      }
      if (savedLang && LANGUAGES.some(l => l.value === savedLang)) {
        setLanguage(savedLang);
      }
    } catch (e) {
      console.error("Could not load from localStorage", e);
    }
  }, []);

  useEffect(() => {
    try {
      if (code || localStorage.getItem('gemini-code-reviewer-code')) {
        localStorage.setItem('gemini-code-reviewer-code', code);
      }
    } catch (e) {
      console.error("Could not save code to localStorage", e);
    }
  }, [code]);

  useEffect(() => {
    try {
      localStorage.setItem('gemini-code-reviewer-language', language);
    } catch (e) {
      console.error("Could not save language to localStorage", e);
    }
  }, [language]);
  
  const mapLanguageForHighlightJS = (lang: string) => {
    const map: { [key: string]: string } = {
        'js': 'javascript', 'jsx': 'javascript',
        'ts': 'typescript', 'tsx': 'typescript',
        'py': 'python', 'golang': 'go', 'rs': 'rust',
        'xml': 'html', 'cs': 'csharp', 'c++': 'cpp', 'rb': 'ruby',
        'kt': 'kotlin'
    };
    return map[lang] || lang;
  };

  useEffect(() => {
    if (highlightTimeoutRef.current) clearTimeout(highlightTimeoutRef.current);
    highlightTimeoutRef.current = window.setTimeout(() => {
      if (code.trim()) {
        const autoResult = window.hljs.highlightAuto(code);
        const detectedLang = mapLanguageForHighlightJS(autoResult.language || 'plaintext');
        
        if (LANGUAGES.some(l => l.value === detectedLang) && detectedLang !== language) {
          languageDetectionRef.current = true; // Flag to prevent re-highlighting on language change
          setLanguage(detectedLang);
        }
        setHighlightedCode(window.hljs.highlight(code, { language: detectedLang, ignoreIllegals: true }).value);
      } else {
        setHighlightedCode('');
      }
    }, 200);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  useEffect(() => {
    if (languageDetectionRef.current) {
      languageDetectionRef.current = false;
      return;
    }
    if (code.trim()) {
      setHighlightedCode(window.hljs.highlight(code, { language, ignoreIllegals: true }).value);
    } else {
      setHighlightedCode('');
    }
  }, [language, code]);


  const handleCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCode(e.target.value);
  };
  
  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setLanguage(e.target.value);
  };

  const handleReview = async () => {
    if (isLoading) return;
    setIsLoading(true);
    setError(null);
    setFeedback('');
    try {
      const result = await reviewCode(code, language);
      setFeedback(result);
    } catch (e: any) {
      setError(e.message || 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSendToOllama = async () => {
      if (!feedback) {
          setOllamaResponse("Please review with Gemini first.");
          return;
      }
      setIsOllamaLoading(true);
      setOllamaResponse("Sending to Ollama...");
      try {
          const response = await fetch(ollamaEndpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  model: 'llama2',
                  prompt: `Here is a code review from Gemini. Please summarize it and provide any additional feedback you have:\n\n${feedback}`,
                  stream: false
              })
          });
          if (!response.ok) {
              throw new Error(`Ollama API error: ${response.statusText}`);
          }
          const data = await response.json();
          setOllamaResponse(`Ollama Response:\n${data.response}`);
      } catch (err: any) {
          setOllamaResponse(`Error sending to Ollama: ${err.message || 'Unknown error'}`);
      } finally {
          setIsOllamaLoading(false);
      }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Tab') {
          e.preventDefault();
          const { selectionStart, selectionEnd, value } = e.currentTarget;
          const indent = '  ';
          const newValue = value.substring(0, selectionStart) + indent + value.substring(selectionEnd);
          setCode(newValue);
          // This is a simplified way to move the cursor. For a full implementation, you'd need more logic.
          setTimeout(() => {
              if (textareaRef.current) {
                  textareaRef.current.selectionStart = textareaRef.current.selectionEnd = selectionStart + indent.length;
              }
          }, 0);
      }
  };

  const handleCopyCode = useCallback(() => {
      if (!code) return;
      navigator.clipboard.writeText(code).then(() => {
          setCopyButtonText('Copied!');
          setTimeout(() => setCopyButtonText('Copy Code'), 2000);
      }).catch(err => {
          console.error('Failed to copy code: ', err);
          setCopyButtonText('Copy Failed');
          setTimeout(() => setCopyButtonText('Copy Code'), 2000);
      });
  }, [code]);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col font-sans">
      <Header />
      <main className="flex-1 flex flex-col p-4 pt-24 container mx-auto">
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 min-h-[60vh]">
          {/* Code Input Panel */}
          <div className="flex flex-col h-full">
            <div className="flex justify-between items-center p-2 bg-gray-800 border-b border-gray-700 rounded-t-lg">
              <span className="font-mono text-sm text-gray-400">Your Code</span>
              <div className="flex items-center gap-4">
                <button
                  onClick={handleCopyCode}
                  disabled={!code.trim()}
                  className={`bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed text-gray-300 text-xs font-mono py-1 px-3 rounded transition-all duration-200 ${copyButtonText === 'Copied!' ? '!bg-green-600 text-white' : ''}`}
                  aria-label="Copy code to clipboard"
                >
                  {copyButtonText}
                </button>
                <select
                  value={language}
                  onChange={handleLanguageChange}
                  className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  aria-label="Select programming language"
                >
                  {LANGUAGES.map(lang => (
                    <option key={lang.value} value={lang.value}>{lang.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="relative flex-1 bg-gray-900 ring-1 ring-gray-700 rounded-b-lg">
              <textarea
                ref={textareaRef}
                value={code}
                onChange={handleCodeChange}
                onKeyDown={handleKeyDown}
                className="absolute inset-0 w-full h-full p-4 font-mono text-base bg-transparent text-transparent caret-white resize-none z-10 focus:outline-none"
                spellCheck="false"
                aria-label="Code Input"
              />
              <pre ref={preRef} className="absolute inset-0 w-full h-full p-4 font-mono text-base pointer-events-none overflow-auto" aria-hidden="true">
                <code dangerouslySetInnerHTML={{ __html: highlightedCode }} />
              </pre>
            </div>
          </div>

          {/* Feedback Panel */}
          <div className="flex flex-col h-full">
            <div className="flex justify-between items-center p-2 bg-gray-800 border-b border-gray-700 rounded-t-lg">
              <span className="font-mono text-sm text-gray-400">Gemini's Feedback</span>
            </div>
            <div className="relative flex-1 bg-gray-900 ring-1 ring-gray-700 rounded-b-lg">
              {isLoading && <Loader />}
              <FeedbackDisplay feedback={feedback} error={error} />
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="py-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
                onClick={handleReview}
                disabled={isLoading || !code.trim()}
                className="w-full sm:w-auto bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 px-8 rounded-lg shadow-lg transform hover:scale-105 transition-all duration-300 ease-in-out"
            >
                {isLoading ? 'Reviewing...' : 'Review Code'}
            </button>
        </div>

        {/* Ollama Integration Panel */}
        <div className="bg-gray-800/60 p-4 rounded-lg ring-1 ring-gray-700">
            <h3 className="text-lg font-semibold mb-3 text-white">Forward to Ollama</h3>
            <div className="flex flex-col sm:flex-row items-center gap-4 mb-2">
                <input
                    type="text"
                    value={ollamaEndpoint}
                    onChange={e => setOllamaEndpoint(e.target.value)}
                    className="flex-grow bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 w-full sm:w-auto"
                    placeholder="Ollama API Endpoint"
                    aria-label="Ollama API Endpoint"
                />
                <button
                    onClick={handleSendToOllama}
                    disabled={isOllamaLoading || !feedback}
                    className="w-full sm:w-auto bg-purple-600 hover:bg-purple-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-2 px-6 rounded transition-colors duration-200"
                >
                    {isOllamaLoading ? 'Sending...' : 'Send to Ollama'}
                </button>
            </div>
            {ollamaResponse && (
                <div className="mt-3 p-3 bg-gray-900 rounded max-h-40 overflow-y-auto">
                    <pre className="whitespace-pre-wrap font-mono text-xs text-gray-300">{ollamaResponse}</pre>
                </div>
            )}
        </div>
      </main>
    </div>
  );
};

export default App;
