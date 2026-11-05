import React, {forwardRef} from 'react';
import {
  Animated,
  StyleSheet,
  Text as NativeText,
  TextInput as NativeTextInput,
  type TextProps,
  type TextInputProps,
} from 'react-native';

// Keep native props, accessibility, refs, and each screen's size/weight intact.
export const Text = forwardRef<NativeText, TextProps>(({style, ...props}, ref) => (
  <NativeText {...props} ref={ref} style={[styles.prompt, style]} />
));
Text.displayName = 'AppText';

export type TextInput = NativeTextInput;
export const TextInput = forwardRef<NativeTextInput, TextInputProps>(
  ({style, ...props}, ref) => (
    <NativeTextInput {...props} ref={ref} style={[styles.prompt, style]} />
  ),
);
TextInput.displayName = 'AppTextInput';

export const AnimatedText = Animated.createAnimatedComponent(Text);

const styles = StyleSheet.create({prompt: {fontFamily: 'Prompt'}});
