import React, { useState } from 'react';

/**
 * UserQuestionPrompt Component
 *
 * Displays a question from the AI agent and allows the user to respond.
 * Supports both free-text input and predefined options.
 */
export default function UserQuestionPrompt({
  question,
  onRespond,
  onCancel,
  colors,
  isLoading = false,
}) {
  const [inputValue, setInputValue] = useState('');
  const styles = getStyles(colors);

  if (!question) return null;

  const handleSubmit = (response) => {
    if (response && response.trim()) {
      onRespond(response.trim());
      setInputValue('');
    }
  };

  const handleOptionClick = (option) => {
    handleSubmit(option);
  };

  const handleInputSubmit = (e) => {
    e.preventDefault();
    handleSubmit(inputValue);
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.icon}>?</span>
        <span style={styles.title}>Momentum needs your input</span>
      </div>

      <div style={styles.content}>
        <p style={styles.question}>{question.question}</p>

        {question.context && (
          <p style={styles.context}>{question.context}</p>
        )}

        {/* Show options as buttons if provided */}
        {question.options && question.options.length > 0 && (
          <div style={styles.optionsContainer}>
            {question.options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleOptionClick(option)}
                style={styles.optionButton}
                disabled={isLoading}
              >
                {option}
              </button>
            ))}
          </div>
        )}

        {/* Always show text input for custom responses */}
        <form onSubmit={handleInputSubmit} style={styles.inputForm}>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={question.options?.length ? "Or type a custom response..." : "Type your response..."}
            style={styles.input}
            disabled={isLoading}
            autoFocus
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isLoading}
            style={{
              ...styles.submitButton,
              opacity: inputValue.trim() && !isLoading ? 1 : 0.5,
            }}
          >
            {isLoading ? '...' : 'Send'}
          </button>
        </form>

        {/* Cancel option */}
        <button
          onClick={onCancel}
          style={styles.cancelButton}
          disabled={isLoading}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

const getStyles = (colors) => ({
  container: {
    backgroundColor: colors.amber + '15',
    border: `2px solid ${colors.amber}`,
    borderRadius: '12px',
    padding: '16px',
    marginTop: '12px',
    animation: 'fadeIn 0.3s ease',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '12px',
  },
  icon: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    backgroundColor: colors.amber,
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: '700',
  },
  title: {
    fontSize: '13px',
    fontWeight: '600',
    color: colors.earth,
  },
  content: {
    paddingLeft: '32px',
  },
  question: {
    fontSize: '14px',
    fontWeight: '500',
    color: colors.earth,
    margin: '0 0 8px 0',
    lineHeight: '1.5',
  },
  context: {
    fontSize: '12px',
    color: colors.stone,
    margin: '0 0 12px 0',
    fontStyle: 'italic',
    lineHeight: '1.4',
  },
  optionsContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    marginBottom: '12px',
  },
  optionButton: {
    padding: '8px 16px',
    borderRadius: '8px',
    border: `1px solid ${colors.amber}`,
    backgroundColor: '#fff',
    color: colors.earth,
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s',
    ':hover': {
      backgroundColor: colors.amber + '20',
    },
  },
  inputForm: {
    display: 'flex',
    gap: '8px',
    marginBottom: '8px',
  },
  input: {
    flex: 1,
    padding: '10px 14px',
    borderRadius: '8px',
    border: `1px solid ${colors.cloud}`,
    fontSize: '13px',
    color: colors.earth,
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  submitButton: {
    padding: '10px 20px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: colors.amber,
    color: '#fff',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'opacity 0.2s',
  },
  cancelButton: {
    padding: '6px 12px',
    borderRadius: '6px',
    border: 'none',
    backgroundColor: 'transparent',
    color: colors.stone,
    fontSize: '11px',
    cursor: 'pointer',
    textDecoration: 'underline',
  },
});
