import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, RotateCcw, Code } from 'lucide-react';
import { ChatMessage } from '../types';

interface AIAssistantViewProps {
  chats: ChatMessage[];
  onSendMessage: (text: string) => void;
  onClearChats: () => void;
  isSending: boolean;
}

export default function AIAssistantView({
  chats,
  onSendMessage,
  onClearChats,
  isSending
}: AIAssistantViewProps) {
  const [inputText, setInputText] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chats]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isSending) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  return (
    <div className="max-w-4xl mx-auto w-full h-[calc(100vh-160px)] animate-fade-in">
      {/* CHAT INTERACTIVE PANEL (Full width) */}
      <section className="bg-canvas border border-border-hairline rounded-xl flex flex-col h-full shadow-xs">
        {/* Panel Header */}
        <header className="flex justify-between items-center px-5 py-4 border-b border-border-hairline bg-surface-card rounded-t-xl">
          <div className="flex items-center gap-2">
            <div className="p-1 px-1.5 bg-[#ad5f45]/15 text-[#8f482f] rounded-lg">
              <Sparkles size={16} />
            </div>
            <div>
              <h3 className="font-serif text-lg font-medium text-ink">Editorial Companion</h3>
              <p className="text-[10px] font-mono uppercase text-ink-muted tracking-wider">SECURE MODEL • GEMINI 3.5 FLASH</p>
            </div>
          </div>

          <button
            onClick={onClearChats}
            className="p-1 px-2.5 text-xs text-ink-muted hover:text-[#8f482f] border border-border-hairline hover:bg-canvas rounded-md cursor-pointer transition-all flex items-center gap-1 font-semibold"
            title="Clear Chat Logs"
          >
            <RotateCcw size={12} /> Reset
          </button>
        </header>

        {/* Message Feed lists */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {chats.map((msg) => {
            const isUser = msg.sender === 'user';
            return (
              <div
                key={msg.id}
                className={`flex gap-3 max-w-[90%] ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
              >
                {/* Avatar representation */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 select-none ${isUser ? 'bg-primary text-white' : 'bg-surface-emphasis text-primary'}`}>
                  {isUser ? 'ME' : 'AI'}
                </div>

                <div className="space-y-1 flex-1 min-w-0">
                  <div className={`p-4 rounded-xl leading-relaxed text-sm ${isUser ? 'bg-primary/10 border border-primary/20 text-ink' : 'bg-surface-card border border-border-hairline text-ink'}`}>
                    <p className="whitespace-pre-line font-sans">{msg.text}</p>
                    
                    {/* Inline code blocks beautifully displayed within the message bubble */}
                    {msg.codeBlock && (
                      <div className="mt-4 border border-border-hairline rounded-lg overflow-hidden bg-[#151412] text-[#eae5db] font-mono text-[11px] max-w-full">
                        <div className="flex justify-between items-center px-3 py-2 bg-[#1e1c19] border-b border-[#2d2a27]">
                          <span className="flex items-center gap-1.5 text-amber-500 font-semibold font-mono">
                            <Code size={12} /> {msg.codeBlock.filename}
                          </span>
                          <span className="text-[9px] uppercase tracking-widest text-[#ad5f45] bg-[#ad5f45]/10 px-1.5 py-0.5 rounded border border-[#ad5f45]/20 font-bold">
                            {msg.codeBlock.language.toUpperCase()}
                          </span>
                        </div>
                        <div className="p-3 overflow-x-auto whitespace-pre leading-relaxed select-text relative group">
                          <code>{msg.codeBlock.code}</code>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigator.clipboard.writeText(msg.codeBlock?.code || '');
                              alert('Code copied to clipboard!');
                            }}
                            className="absolute right-2 top-2 px-2 py-0.5 border border-[#3e3b37] hover:border-[#eae5db] rounded bg-[#1e1c19] text-[10px] text-zinc-400 hover:text-white transition-all cursor-pointer opacity-80 hover:opacity-100"
                          >
                            Copy
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  <span className={`block text-[10px] font-mono text-ink-muted ${isUser ? 'text-right' : 'text-left'}`}>
                    {msg.timestamp}
                  </span>
                </div>
              </div>
            );
          })}

          {isSending && (
            <div className="flex gap-3 max-w-[80%] mr-auto items-center">
              <div className="w-8 h-8 rounded-full bg-surface-emphasis text-primary flex items-center justify-center font-bold text-xs shrink-0 animate-pulse">
                AI
              </div>
              <div className="bg-surface-card border border-border-hairline p-3 rounded-xl italic text-xs text-ink-muted animate-pulse">
                Drafting your critique...
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Form Prompt Input */}
        <form onSubmit={handleSubmit} className="p-4 border-t border-border-hairline bg-surface-card rounded-b-xl flex gap-2">
          <input
            type="text"
            required
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Ask the editor (e.g. Write a script to count word occurrences...)"
            className="flex-grow px-4 py-3 bg-canvas border border-border-hairline rounded-lg text-sm text-ink focus:outline-hidden focus:ring-3 focus:ring-primary/10 transition-all placeholder:text-ink-muted/50"
          />
          <button
            type="submit"
            disabled={isSending}
            className="px-5 py-3 bg-[#ad5f45] hover:bg-[#8f482f] disabled:bg-indigo-300 text-white font-semibold text-sm rounded-lg shadow-sm transition-colors flex items-center justify-center gap-1 cursor-pointer shrink-0"
          >
            Send <Send size={14} />
          </button>
        </form>
      </section>
    </div>
  );
}
