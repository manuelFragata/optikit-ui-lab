import { useId, type ReactNode } from 'react';
import FormControl from '@mui/material/FormControl';
import FormHelperText from '@mui/material/FormHelperText';
import InputLabel from '@mui/material/InputLabel';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';

export interface SelectOption<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
}

export interface SelectFieldProps<T extends string> {
  label: string;
  value: T;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  helperText?: string;
  fullWidth?: boolean;
  disabled?: boolean;
}

/** Labelled single-value select. */
export function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
  helperText,
  fullWidth = true,
  disabled,
}: SelectFieldProps<T>) {
  const id = useId();
  const labelId = `${id}-label`;

  return (
    <FormControl fullWidth={fullWidth} disabled={disabled}>
      <InputLabel id={labelId}>{label}</InputLabel>
      <Select
        labelId={labelId}
        id={id}
        value={value}
        label={label}
        onChange={(event) => onChange(event.target.value as T)}
        renderValue={(selected) => options.find((o) => o.value === selected)?.label ?? selected}
      >
        {options.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {option.icon && <ListItemIcon>{option.icon}</ListItemIcon>}
            <ListItemText>{option.label}</ListItemText>
          </MenuItem>
        ))}
      </Select>
      {helperText && <FormHelperText>{helperText}</FormHelperText>}
    </FormControl>
  );
}
