
import React, { useEffect, useState } from 'react';

interface FeedbackDisplayProps {
  feedback: string;
  error: string | null;
}

export const FeedbackDisplay: React.FC<FeedbackDisplayProps> = ({ feedback, error }) => {
    const [htmlContent, setHtmlContent] = useState('');

    useEffect(() => {
        if (feedback && window.marked && window.hljs) {
            window.marked.setOptions({
                highlight: function (code: string, lang: string) {
                    const language = window.hljs.getLanguage(lang) ? lang : 'plaintext';
                    return window.hljs.highlight(code, { language, ignoreIllegals: true }).value;
                },
                gfm: true,
                breaks: true,
            });
            setHtmlContent(window.marked.parse(feedback));
        } else {
            setHtmlContent('');
        }
    }, [feedback]);

    if (error) {
        return (
            <div className="bg-red-900/50 border border-red-700 text-red-200 p-6 rounded-lg h-full overflow-y-auto">
                <h3 className="font-bold text-lg mb-2">An Error Occurred</h3>
                <pre className="whitespace-pre-wrap font-mono text-sm">{error}</pre>
            </div>
        );
    }
    
    const hasContent = feedback.trim() !== '';

    return (
      <div className="bg-gray-800/60 p-6 rounded-lg h-full overflow-y-auto ring-1 ring-gray-700">
        {hasContent ? (
          <div
            className="prose prose-invert prose-sm max-w-none font-sans"
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            <p>Your code review feedback will appear here.</p>
          </div>
        )}
        <style>{`
        .prose-invert h3 {
          color: #d1d5db; /* gray-300 */
          font-weight: 600;
          margin-top: 1.5em;
          margin-bottom: 0.5em;
          border-bottom: 1px solid #4b5563; /* gray-600 */
          padding-bottom: 0.25em;
        }
        .prose-invert ul {
          list-style-type: disc;
          padding-left: 1.5em;
        }
        .prose-invert li {
          margin-bottom: 0.25em;
        }
        .prose-invert p {
          color: #d1d5db;
        }
        .prose-invert strong {
            color: #f9fafb;
        }
        .prose-invert pre {
            font-family: 'Fira Code', monospace;
            font-size: 0.875rem;
            line-height: 1.25rem;
            border-radius: 0.5rem;
            padding: 1rem;
            margin-top: 1em;
            margin-bottom: 1em;
        }
        .prose-invert code:not(pre > code) {
            background-color: #1f2937; /* gray-800 */
            color: #f3f4f6; /* gray-100 */
            padding: 0.2em 0.4em;
            border-radius: 0.25rem;
            font-size: 0.9em;
            border: 1px solid #4b5563;
        }
      `}</style>
      </div>
    );
};
