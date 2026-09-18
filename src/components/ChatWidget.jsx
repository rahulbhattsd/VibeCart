import React, { useState, useEffect, useRef, useMemo } from 'react';
import { FiMessageCircle, FiX, FiSend, FiMail, FiRefreshCw } from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';
import { apiUrl } from '../api';
import './ChatWidget.css';

const QUICK_CHIPS = [
  'Track my order',
  'Return policy',
  'Size guide',
  'Talk to human'
];

const INITIAL_GREETING = {
  id: 'greeting',
  role: 'assistant',
  content: "Hi! 👋 Welcome to **VibeCart Support**.\n\nHow can I help you today? You can ask about order status, shoe sizing, returns, or check out our sneaker collection."
};

// Lightweight markdown renderer to safely and cleanly format bot messages
const renderMarkdown = (text) => {
  if (!text) return null;

  const lines = text.split('\n');
  const elements = [];
  let listBuffer = [];
  let isNumbered = false;

  const flushList = () => {
    if (listBuffer.length === 0) return;
    if (isNumbered) {
      elements.push(
        <ol key={`ol-${elements.length}`} className="chat-ol">
          {listBuffer.map((item, idx) => (
            <li key={idx}>{parseInlineMarkdown(item)}</li>
          ))}
        </ol>
      );
    } else {
      elements.push(
        <ul key={`ul-${elements.length}`} className="chat-ul">
          {listBuffer.map((item, idx) => (
            <li key={idx}>{parseInlineMarkdown(item)}</li>
          ))}
        </ul>
      );
    }
    listBuffer = [];
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    // Check for bullet list
    const bulletMatch = trimmed.match(/^[-*•]\s+(.*)$/);
    // Check for numbered list
    const numberMatch = trimmed.match(/^\d+\.\s+(.*)$/);

    if (bulletMatch) {
      if (isNumbered) flushList();
      isNumbered = false;
      listBuffer.push(bulletMatch[1]);
    } else if (numberMatch) {
      if (!isNumbered && listBuffer.length > 0) flushList();
      isNumbered = true;
      listBuffer.push(numberMatch[1]);
    } else {
      flushList();
      if (trimmed === '') {
        elements.push(<div key={`br-${index}`} className="chat-spacer" />);
      } else {
        elements.push(
          <p key={`p-${index}`} className="chat-paragraph">
            {parseInlineMarkdown(trimmed)}
          </p>
        );
      }
    }
  });

  flushList();
  return elements;
};

// Inline markdown parser: **bold**, [link](url), `code`
const parseInlineMarkdown = (line) => {
  const parts = [];
  // Tokenize regex matching [text](url), **bold**, or plain text
  const regex = /(\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|`([^`]+)`)/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(line)) !== null) {
    if (match.index > lastIndex) {
      parts.push(line.slice(lastIndex, match.index));
    }

    if (match[2] && match[3]) {
      // Link [label](url)
      parts.push(
        <a
          key={`link-${match.index}`}
          href={match[3]}
          target="_blank"
          rel="noopener noreferrer"
          className="chat-link"
        >
          {match[2]}
        </a>
      );
    } else if (match[4]) {
      // Bold **text**
      parts.push(<strong key={`b-${match.index}`}>{match[4]}</strong>);
    } else if (match[5]) {
      // Inline code
      parts.push(<code key={`c-${match.index}`} className="chat-code">{match[5]}</code>);
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < line.length) {
    parts.push(line.slice(lastIndex));
  }

  return parts.length > 0 ? parts : line;
};

const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState(() => {
    try {
      const stored = sessionStorage.getItem('vibecart_chat_messages');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Failed to load chat history from sessionStorage:', e);
    }
    return [INITIAL_GREETING];
  });

  const [inputMessage, setInputMessage] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamError, setStreamError] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Sync to sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem('vibecart_chat_messages', JSON.stringify(messages));
    } catch (e) {
      console.warn('Failed to save chat history to sessionStorage:', e);
    }
  }, [messages]);

  // Auto-scroll on new message or stream chunk
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen, isStreaming]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSendMessage = async (textToSend) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isStreaming) return;

    setStreamError(null);
    setInputMessage('');

    // Handle "Talk to human" quick intent directly on client with friendly escalation
    if (text.toLowerCase() === 'talk to human') {
      const userMsg = { id: `u_${Date.now()}`, role: 'user', content: text };
      const humanFallbackMsg = {
        id: `a_${Date.now()}`,
        role: 'assistant',
        isHumanFallback: true,
        content: "Our support agents are available **Mon – Sat, 9:00 AM – 7:00 PM IST**.\n\nYou can reach us immediately via WhatsApp or Email below:"
      };
      setMessages(prev => [...prev, userMsg, humanFallbackMsg]);
      return;
    }

    const newUserMessage = { id: `u_${Date.now()}`, role: 'user', content: text };
    const tempBotId = `a_${Date.now()}`;
    const initialBotMessage = { id: tempBotId, role: 'assistant', content: '' };

    const updatedMessages = [...messages, newUserMessage];
    setMessages([...updatedMessages, initialBotMessage]);
    setIsStreaming(true);

    try {
      // Only send last 8 messages for backend conversation context
      const historyPayload = updatedMessages.slice(-8).map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content
      }));

      const response = await fetch(apiUrl('/chat'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ messages: historyPayload })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || `Error ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let accumulatedContent = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data:')) continue;

          const jsonString = trimmed.replace(/^data:\s*/, '');
          if (jsonString === '[DONE]') continue;

          try {
            const data = JSON.parse(jsonString);
            if (data.error) {
              throw new Error(data.error);
            }
            if (data.content) {
              accumulatedContent += data.content;
              setMessages(prev =>
                prev.map(m => (m.id === tempBotId ? { ...m, content: accumulatedContent } : m))
              );
            }
          } catch (jsonErr) {
            // Ignore parse errors on individual frames
          }
        }
      }

      // If finished but response was somehow empty
      if (!accumulatedContent.trim()) {
        setMessages(prev =>
          prev.map(m =>
            m.id === tempBotId
              ? {
                  ...m,
                  content: "I'm sorry, I couldn't generate a response right now. Please try asking again or reach out to our team at support@vibecart.com."
                }
              : m
          )
        );
      }
    } catch (err) {
      console.error('Chat error:', err);
      setStreamError(err.message);
      setMessages(prev =>
        prev.map(m =>
          m.id === tempBotId
            ? {
                ...m,
                error: true,
                content:
                  "I'm having trouble connecting to support right now. Please try again or reach out to our team directly."
              }
            : m
        )
      );
    } finally {
      setIsStreaming(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleResetChat = () => {
    const fresh = [INITIAL_GREETING];
    setMessages(fresh);
    sessionStorage.setItem('vibecart_chat_messages', JSON.stringify(fresh));
    setStreamError(null);
  };

  return (
    <div className="vibecart-chat-wrapper">
      {/* Floating Launcher Button */}
      {!isOpen && (
        <button
          className="chat-launcher-btn"
          onClick={() => setIsOpen(true)}
          aria-label="Open customer support chat"
        >
          <FiMessageCircle className="launcher-icon" />
          <span className="launcher-label">Need Help?</span>
          <span className="launcher-pulse" />
        </button>
      )}

      {/* Expanded Chat Widget Modal */}
      {isOpen && (
        <div className="chat-modal">
          {/* Header */}
          <div className="chat-header">
            <div className="chat-header-info">
              <div className="chat-avatar">
                <FiMessageCircle />
                <span className="online-indicator" />
              </div>
              <div>
                <h3 className="chat-title">VibeCart Support</h3>
                <span className="chat-status">Always here to help</span>
              </div>
            </div>
            <div className="chat-header-actions">
              <button
                className="chat-header-btn"
                onClick={handleResetChat}
                title="Reset conversation"
                aria-label="Reset conversation"
              >
                <FiRefreshCw />
              </button>
              <button
                className="chat-header-btn"
                onClick={() => setIsOpen(false)}
                title="Close chat"
                aria-label="Close chat"
              >
                <FiX />
              </button>
            </div>
          </div>

          {/* Messages Body */}
          <div className="chat-messages">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`chat-bubble-row ${msg.role === 'user' ? 'user-row' : 'bot-row'}`}
              >
                <div className={`chat-bubble ${msg.role === 'user' ? 'user-bubble' : 'bot-bubble'} ${msg.error ? 'error-bubble' : ''}`}>
                  {msg.role === 'assistant' ? (
                    <>
                      {msg.content ? (
                        renderMarkdown(msg.content)
                      ) : isStreaming ? (
                        <div className="chat-typing-dots">
                          <span />
                          <span />
                          <span />
                        </div>
                      ) : null}

                      {/* Human Fallback Quick Contact Cards */}
                      {msg.isHumanFallback && (
                        <div className="human-contact-actions">
                          <a
                            href="https://wa.me/919876543210?text=Hi%20VibeCart%20Support,%20I%20need%20assistance"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="contact-card whatsapp-btn"
                          >
                            <FaWhatsapp className="contact-icon" />
                            <div>
                              <strong>WhatsApp Support</strong>
                              <span>+91 98765 43210</span>
                            </div>
                          </a>
                          <a
                            href="mailto:support@vibecart.com?subject=Support%20Request%20-%20VibeCart"
                            className="contact-card email-btn"
                          >
                            <FiMail className="contact-icon" />
                            <div>
                              <strong>Email Support</strong>
                              <span>support@vibecart.com</span>
                            </div>
                          </a>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="chat-paragraph">{msg.content}</p>
                  )}
                </div>
              </div>
            ))}

            {/* In-flight typing indicator when waiting for first token */}
            {isStreaming && messages[messages.length - 1]?.content === '' && (
              <div className="chat-bubble-row bot-row">
                <div className="chat-bubble bot-bubble">
                  <div className="chat-typing-dots">
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick-reply chips */}
          <div className="chat-chips-container">
            {QUICK_CHIPS.map((chip) => (
              <button
                key={chip}
                className="chat-chip"
                onClick={() => handleSendMessage(chip)}
                disabled={isStreaming}
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Input & Send Form */}
          <form
            className="chat-input-area"
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
          >
            <input
              ref={inputRef}
              type="text"
              className="chat-input"
              placeholder="Ask about orders, sizing, returns..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isStreaming}
              maxLength={400}
            />
            <button
              type="submit"
              className="chat-send-btn"
              disabled={!inputMessage.trim() || isStreaming}
              aria-label="Send message"
            >
              <FiSend />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default ChatWidget;
