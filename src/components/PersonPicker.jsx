import React, { useState, useRef, useEffect } from 'react';
import { X, Plus, User } from 'lucide-react';

/**
 * Modern person picker component with @mention-style tagging
 *
 * @param {Object} props
 * @param {Array} props.allPeople - All available people to choose from
 * @param {Array} props.selectedPeople - Currently selected people
 * @param {Function} props.onChange - Callback when selection changes
 * @param {Function} props.onAddNewPerson - Callback to trigger add person flow
 * @param {string} props.placeholder - Placeholder text for input
 * @param {Object} props.style - Additional styles for container
 */
const PersonPicker = ({
  allPeople = [],
  selectedPeople = [],
  onChange,
  onAddNewPerson,
  placeholder = 'Type @ to add people...',
  style = {}
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Filter people based on input
  const filteredPeople = allPeople.filter(person => {
    // Don't show already selected people
    const isSelected = selectedPeople.some(p => (p.id && person.id ? p.id === person.id : p.name === person.name));
    if (isSelected) return false;

    // Filter by search term
    if (!inputValue.trim()) return true;
    const searchTerm = inputValue.replace('@', '').toLowerCase();
    return (
      person.name.toLowerCase().includes(searchTerm) ||
      person.team.toLowerCase().includes(searchTerm)
    );
  });

  // Handle person selection
  const handleSelectPerson = (person) => {
    onChange([...selectedPeople, person]);
    setInputValue('');
    setIsOpen(false);
    setFocusedIndex(0);
    inputRef.current?.focus();
  };

  // Handle person removal
  const handleRemovePerson = (personToRemove) => {
    onChange(selectedPeople.filter(p => {
      if (p.id && personToRemove.id) return p.id !== personToRemove.id;
      return p.name !== personToRemove.name;
    }));
  };

  // Handle input change
  const handleInputChange = (e) => {
    const value = e.target.value;
    setInputValue(value);
    setIsOpen(value.length > 0 || value === '@');
    setFocusedIndex(0);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === '@') {
        setIsOpen(true);
      } else if (e.key === 'Backspace' && !inputValue && selectedPeople.length > 0) {
        // Remove last selected person on backspace
        handleRemovePerson(selectedPeople[selectedPeople.length - 1]);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex(prev =>
          prev < filteredPeople.length ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(prev => (prev > 0 ? prev - 1 : 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (focusedIndex === filteredPeople.length && onAddNewPerson) {
          // "Add new person" option
          onAddNewPerson(inputValue.replace('@', '').trim());
          setInputValue('');
          setIsOpen(false);
        } else if (filteredPeople[focusedIndex]) {
          handleSelectPerson(filteredPeople[focusedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setInputValue('');
        break;
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Scroll focused item into view
  useEffect(() => {
    if (isOpen && dropdownRef.current) {
      const focusedElement = dropdownRef.current.querySelector(`[data-index="${focusedIndex}"]`);
      focusedElement?.scrollIntoView({ block: 'nearest' });
    }
  }, [focusedIndex, isOpen]);

  return (
    <div style={{ ...styles.container, ...style }} ref={dropdownRef}>
      <div style={styles.inputWrapper}>
        {/* Selected people chips */}
        {selectedPeople.map((person) => (
          <div key={person.id || person.name} style={styles.chip}>
            <User size={12} style={styles.chipIcon} />
            <span style={styles.chipName}>{person.name}</span>
            <span style={styles.chipTeam}>({person.team})</span>
            <button
              type="button"
              onClick={() => handleRemovePerson(person)}
              style={styles.chipRemove}
              aria-label={`Remove ${person.name}`}
            >
              <X size={12} />
            </button>
          </div>
        ))}

        {/* Input field */}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => inputValue && setIsOpen(true)}
          placeholder={selectedPeople.length === 0 ? placeholder : ''}
          style={styles.input}
        />
      </div>

      {/* Dropdown suggestions */}
      {isOpen && (
        <div style={styles.dropdown}>
          {filteredPeople.length > 0 ? (
            <>
              {filteredPeople.map((person, index) => (
                <div
                  key={person.id || person.name}
                  data-index={index}
                  onClick={() => handleSelectPerson(person)}
                  onMouseEnter={() => setFocusedIndex(index)}
                  style={{
                    ...styles.dropdownItem,
                    ...(focusedIndex === index ? styles.dropdownItemFocused : {})
                  }}
                >
                  <User size={16} style={styles.personIcon} />
                  <div style={styles.personInfo}>
                    <div style={styles.personName}>{person.name}</div>
                    <div style={styles.personTeam}>{person.team}</div>
                  </div>
                </div>
              ))}
            </>
          ) : (
            <div style={styles.noResults}>
              No people found
            </div>
          )}

          {/* Add new person option */}
          {onAddNewPerson && inputValue.trim() && (
            <div
              data-index={filteredPeople.length}
              onClick={() => {
                onAddNewPerson(inputValue.replace('@', '').trim());
                setInputValue('');
                setIsOpen(false);
              }}
              onMouseEnter={() => setFocusedIndex(filteredPeople.length)}
              style={{
                ...styles.addNewOption,
                ...(focusedIndex === filteredPeople.length ? styles.addNewOptionFocused : {})
              }}
            >
              <Plus size={16} style={styles.addIcon} />
              <span>Add new person "{inputValue.replace('@', '').trim()}"</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    position: 'relative',
    width: '100%'
  },
  inputWrapper: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    padding: '8px',
    border: '1px solid var(--cloud)',
    borderRadius: '8px',
    backgroundColor: 'var(--cream)',
    minHeight: '42px',
    cursor: 'text',
    transition: 'border-color 0.2s ease',
    '&:focus-within': {
      borderColor: 'var(--earth)'
    }
  },
  chip: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 8px',
    backgroundColor: 'var(--earth)',
    color: 'white',
    borderRadius: '16px',
    fontSize: '13px',
    fontWeight: '500',
    transition: 'all 0.2s ease'
  },
  chipIcon: {
    opacity: 0.9
  },
  chipName: {
    fontWeight: '600'
  },
  chipTeam: {
    opacity: 0.8,
    fontSize: '12px'
  },
  chipRemove: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: '4px',
    padding: '2px',
    background: 'rgba(255, 255, 255, 0.2)',
    border: 'none',
    borderRadius: '50%',
    cursor: 'pointer',
    transition: 'background 0.2s ease',
    color: 'white',
    '&:hover': {
      background: 'rgba(255, 255, 255, 0.3)'
    }
  },
  input: {
    flex: '1',
    minWidth: '120px',
    border: 'none',
    outline: 'none',
    backgroundColor: 'transparent',
    fontSize: '14px',
    color: 'var(--charcoal)',
    fontFamily: 'inherit',
    padding: '2px 4px'
  },
  dropdown: {
    position: 'absolute',
    top: 'calc(100% + 4px)',
    left: 0,
    right: 0,
    maxHeight: '280px',
    overflowY: 'auto',
    backgroundColor: 'white',
    border: '1px solid var(--cloud)',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
    zIndex: 1000,
    animation: 'fadeIn 0.15s ease'
  },
  dropdownItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 12px',
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
    borderBottom: '1px solid var(--cloud)'
  },
  dropdownItemFocused: {
    backgroundColor: 'var(--cream)'
  },
  personIcon: {
    color: 'var(--stone)',
    flexShrink: 0
  },
  personInfo: {
    flex: 1,
    minWidth: 0
  },
  personName: {
    fontSize: '14px',
    fontWeight: '500',
    color: 'var(--charcoal)',
    marginBottom: '2px'
  },
  personTeam: {
    fontSize: '12px',
    color: 'var(--stone)'
  },
  noResults: {
    padding: '12px',
    textAlign: 'center',
    color: 'var(--stone)',
    fontSize: '13px'
  },
  addNewOption: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 12px',
    cursor: 'pointer',
    borderTop: '1px solid var(--cloud)',
    backgroundColor: 'var(--cream)',
    color: 'var(--earth)',
    fontWeight: '500',
    fontSize: '13px',
    transition: 'background-color 0.15s ease'
  },
  addNewOptionFocused: {
    backgroundColor: '#f5f1e8'
  },
  addIcon: {
    flexShrink: 0
  }
};

export default PersonPicker;
