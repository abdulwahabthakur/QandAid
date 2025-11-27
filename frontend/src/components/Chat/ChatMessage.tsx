import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { User, Bot } from 'lucide-react';

interface ChatMessageProps {
  message: {
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date | string;
  };
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === 'user';
  const timestamp = new Date(message.timestamp);
  
  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {}
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
        isUser ? 'bg-indigo-600' : 'bg-gradient-to-br from-purple-500 to-indigo-600'
      }`}>
        {isUser ? (
          <User className="w-4 h-4 text-white" />
        ) : (
          <Bot className="w-4 h-4 text-white" />
        )}
      </div>
      
      {}
      <div className={`max-w-[75%] lg:max-w-[65%] ${isUser ? 'text-right' : 'text-left'}`}>
        <div
          className={`inline-block px-4 py-3 rounded-2xl ${
            isUser
              ? 'bg-indigo-600 text-white rounded-tr-md'
              : 'bg-white border border-gray-200 text-gray-800 rounded-tl-md shadow-sm ai-message'
          }`}
        >
          {isUser ? (
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="markdown-content">
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]}
                components={{
                  a: ({ node, ...props }) => (
                    <a {...props} target="_blank" rel="noopener noreferrer" />
                  ),
                  ul: ({ node, ...props }) => (
                    <ul {...props} className="list-disc ml-5 mb-3 space-y-1" />
                  ),
                  ol: ({ node, ...props }) => (
                    <ol {...props} className="list-decimal ml-5 mb-3 space-y-1" />
                  ),
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          )}
        </div>
        
        {}
        <p className={`text-xs text-gray-400 mt-1 ${isUser ? 'text-right' : 'text-left'}`}>
          {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );
};

export const TypingIndicator: React.FC = () => (
  <div className="flex gap-3">
    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
      <Bot className="w-4 h-4 text-white" />
    </div>
    <div className="bg-white border border-gray-200 px-4 py-3 rounded-2xl rounded-tl-md shadow-sm">
      <div className="flex space-x-1.5">
        <div className="w-2 h-2 bg-gray-400 rounded-full loading-dot"></div>
        <div className="w-2 h-2 bg-gray-400 rounded-full loading-dot"></div>
        <div className="w-2 h-2 bg-gray-400 rounded-full loading-dot"></div>
      </div>
    </div>
  </div>
);

export default ChatMessage;

