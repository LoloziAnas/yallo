import { forwardRef, useState } from 'react';
import { TextInput, type TextInputProps, View } from 'react-native';

import { Txt } from '@/components/txt';
import { useRtl } from '@/store/app-store';
import { colors, fontFamily, radius } from '@/theme';

type Props = TextInputProps & {
  /** Field label above the input (the design's .field > label). */
  label?: string;
  fontSize?: number;
  minHeight?: number;
  /** Force left-to-right (phone numbers, codes) even in Arabic. */
  ltr?: boolean;
};

/** The design's .input: white, 14px radius, accent border and soft ring when focused. */
export const TextField = forwardRef<TextInput, Props>(function TextField(
  { label, fontSize = 15, minHeight = 46, ltr, style, onFocus, onBlur, multiline, ...rest },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const rtl = useRtl() && !ltr;
  const input = (
    <TextInput
      ref={ref}
      placeholderTextColor={colors.neutral500}
      cursorColor={colors.accent}
      selectionColor={colors.accent200}
      multiline={multiline}
      onFocus={(e) => {
        setFocused(true);
        onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        onBlur?.(e);
      }}
      style={[
        {
          minHeight,
          paddingVertical: 8,
          paddingHorizontal: 14,
          fontSize,
          fontFamily: fontFamily('body', 400, useRtl()),
          color: colors.text,
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: focused ? colors.accent : colors.divider,
          borderRadius: radius.md,
          boxShadow: focused ? `0px 0px 0px 3px ${colors.accent200}` : undefined,
          textAlign: rtl ? 'right' : 'left',
          writingDirection: rtl ? 'rtl' : 'ltr',
          textAlignVertical: multiline ? 'top' : 'center',
        },
        style,
      ]}
      {...rest}
    />
  );
  if (!label) return input;
  return (
    <View style={{ gap: 6 }}>
      <Txt size={12} w={600} color={colors.neutral700}>
        {label}
      </Txt>
      {input}
    </View>
  );
});
