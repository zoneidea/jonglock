import React from 'react';
import {StyleSheet, Text, TextInput, View} from 'react-native';

import {colors} from '../theme/colors';

function LabeledInput({
  label,
  ...props
}: React.ComponentProps<typeof TextInput> & {label: string}) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        {...props}
        placeholderTextColor="#9badbc"
        style={styles.input}
        selectionColor={colors.teal}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    color: colors.ink,
    marginBottom: 8,
    fontSize: 13,
    fontWeight: '800',
  },
  input: {
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#fbfdfe',
    paddingHorizontal: 16,
    color: colors.ink,
    fontSize: 16,
  },
});

export default LabeledInput;
