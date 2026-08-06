export default function FormField({ label, name, value, onChange, type = 'text', options, required, placeholder, disabled }) {
  if (type === 'textarea') {
    return (
      <label className="field">
        <span>{label}{required ? ' *' : ''}</span>
        <textarea name={name} value={value || ''} onChange={onChange} placeholder={placeholder ?? ''} required={required} disabled={disabled} />
      </label>
    );
  }

  if (type === 'select') {
    return (
      <label className="field">
        <span>{label}{required ? ' *' : ''}</span>
        <select name={name} value={value || ''} onChange={onChange} required={required} disabled={disabled}>
          <option value="">Choose {label.toLowerCase()}</option>
          {(options || []).map((option) => {
            const optionValue = typeof option === 'object' ? option.value : option;
            const optionLabel = typeof option === 'object' ? option.label : option;
            return (
              <option key={optionValue} value={optionValue}>{optionLabel}</option>
            );
          })}
        </select>
      </label>
    );
  }

  return (
    <label className="field">
      <span>{label}{required ? ' *' : ''}</span>
      <input name={name} value={value || ''} onChange={onChange} type={type} placeholder={placeholder ?? ''} required={required} disabled={disabled} />
    </label>
  );
}
