declare module 'react-code-input' {
  import { Component } from 'react';

  interface ReactCodeInputProps {
    type?: string;
    fields?: number;
    name?: string;
    inputMode?: string;
    onChange?: (value: string) => void;
    onComplete?: (value: string) => void;
    value?: string;
    className?: string;
    style?: React.CSSProperties;
    inputStyle?: React.CSSProperties;
    inputStyleInvalid?: React.CSSProperties;
    autoFocus?: boolean;
    autoComplete?: string;
    autoCapitalize?: string;
    autoCorrect?: string;
    spellCheck?: boolean;
    pattern?: string;
    title?: string;
    placeholder?: string;
    disabled?: boolean;
    required?: boolean;
    readOnly?: boolean;
    tabIndex?: number;
    maxLength?: number;
    minLength?: number;
    size?: number;
    step?: number;
    dir?: string;
    lang?: string;
    id?: string;
    name?: string;
    form?: string;
    'aria-label'?: string;
    'aria-labelledby'?: string;
    'aria-describedby'?: string;
    'aria-invalid'?: boolean;
    'aria-required'?: boolean;
    'data-testid'?: string;
  }

  export default class ReactCodeInput extends Component<ReactCodeInputProps> {}
}
