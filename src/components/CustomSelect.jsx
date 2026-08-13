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
      borderColor: state.isFocused ? '#2e6f40' : '#2e6f40',
      boxShadow: state.isFocused 
        ? '0 0 8px rgba(46, 111, 64, 0.5), inset 0 1px 0 #ffffff' 
        : 'inset 0 1px 0 rgba(255, 255, 255, 0.9), inset 0 1px 2px rgba(0, 0, 0, 0.08)',
      borderRadius: '4px',
      background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 50%, #e2e8f0 100%)',
      padding: '0 4px',
      cursor: 'pointer',
      '&:hover': {
        borderColor: '#1b4527',
        boxShadow: '0 0 6px rgba(46, 111, 64, 0.4), inset 0 1px 0 #ffffff'
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
      color: '#2e6f40',
      padding: '4px'
    }),
    option: (base, state) => ({
      ...base,
      background: (state.isSelected || state.isFocused)
        ? 'linear-gradient(180deg, #52be72 0%, #2e6f40 46%, #1b4527 50%, #29683c 100%)' 
        : 'transparent',
      color: (state.isSelected || state.isFocused) ? '#ffffff' : '#1e293b',
      fontWeight: (state.isSelected || state.isFocused) ? '600' : '400',
      textShadow: (state.isSelected || state.isFocused) ? '0 1px 1px rgba(0, 0, 0, 0.3)' : 'none',
      boxShadow: (state.isSelected || state.isFocused) ? 'inset 0 1px 0 rgba(255, 255, 255, 0.5), inset 0 -1px 0 rgba(0, 0, 0, 0.2)' : 'none',
      cursor: 'pointer',
      fontSize: '13px',
      padding: '8px 12px',
      transition: 'all 0.15s ease',
      '&:active': {
        background: 'linear-gradient(180deg, #1b4527 0%, #29683c 50%, #2e6f40 100%)'
      }
    }),
    menu: (base) => ({
      ...base,
      zIndex: 9999,
      borderRadius: '6px',
      background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(240, 249, 255, 0.96) 100%)',
      border: '1px solid #7dd3fc',
      boxShadow: '0 10px 25px rgba(0, 0, 0, 0.25), inset 0 1px 0 #ffffff',
      overflow: 'hidden'
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
