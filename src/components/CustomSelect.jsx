import React from 'react';
import Select from 'react-select';

export default function CustomSelect({ children, value, onChange, name, className, style, disabled, required }) {
  // Parse children into react-select options
  const options = [];
  React.Children.forEach(children, child => {
    if (child && child.type === 'option') {
      options.push({
        value: child.props.value,
        label: child.props.children
      });
    } else if (child && child.type === React.Fragment && child.props.children) {
        // If wrapped in fragment, parse those
        React.Children.forEach(child.props.children, subChild => {
            if (subChild && subChild.type === 'option') {
              options.push({
                value: subChild.props.value,
                label: subChild.props.children
              });
            }
        });
    } else if (Array.isArray(child)) {
         child.forEach(subChild => {
            if (subChild && subChild.type === 'option') {
              options.push({
                value: subChild.props.value,
                label: subChild.props.children
              });
            }
         });
    }
  });

  const selectedOption = options.find(opt => opt.value == value) || null; // use == to handle number vs string

  const handleChange = (selected) => {
    // Mimic native event object so existing handlers don't break
    const event = {
      target: {
        name: name || '',
        value: selected ? selected.value : ''
      }
    };
    if (onChange) {
      onChange(event);
    }
  };

  const customStyles = {
    control: (base, state) => ({
      ...base,
      minHeight: '36px',
      borderColor: state.isFocused ? 'var(--accent-primary)' : 'var(--border-color, #ddd)',
      boxShadow: state.isFocused ? '0 0 0 1px var(--accent-primary)' : 'none',
      borderTop: 'none',
      borderLeft: 'none',
      borderRight: 'none',
      borderRadius: '0',
      backgroundColor: 'transparent',
      padding: '0',
      '&:hover': {
        borderColor: 'var(--accent-primary)'
      },
      ...style
    }),
    valueContainer: (base) => ({
      ...base,
      padding: '0 8px',
    }),
    input: (base) => ({
      ...base,
      margin: '0',
      padding: '0'
    }),
    indicatorSeparator: () => ({
      display: 'none'
    }),
    dropdownIndicator: (base) => ({
      ...base,
      color: '#666',
      padding: '4px'
    }),
    option: (base, state) => ({
      ...base,
      backgroundColor: state.isSelected 
        ? 'var(--accent-primary)' 
        : state.isFocused 
          ? 'var(--accent-primary)' 
          : 'transparent',
      color: state.isSelected || state.isFocused ? 'white' : '#333',
      cursor: 'pointer',
      fontSize: '13px',
      '&:active': {
        backgroundColor: 'var(--accent-primary)'
      }
    }),
    menu: (base) => ({
      ...base,
      zIndex: 9999,
      borderRadius: '4px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
    }),
    menuPortal: base => ({ ...base, zIndex: 9999 })
  };

  return (
    <Select 
      options={options}
      value={selectedOption}
      onChange={handleChange}
      isDisabled={disabled}
      styles={customStyles}
      className={className}
      required={required}
      menuPortalTarget={document.body}
    />
  );
}
