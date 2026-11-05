import React, {createRef} from 'react';
import renderer, {act} from 'react-test-renderer';
import {StyleSheet, Text as NativeText, TextInput as NativeTextInput} from 'react-native';
import {Text, TextInput} from '../src/components/AppText';

test('shared text uses Prompt while preserving size, weight and accessibility', () => {
  const tree = renderer.create(
    <Text accessibilityLabel="คำทักทาย" style={{fontSize: 15, fontWeight: '700'}}>สวัสดี</Text>,
  );
  const node = tree.root.findByType(NativeText);
  expect(StyleSheet.flatten(node.props.style)).toEqual({fontFamily: 'Prompt', fontSize: 15, fontWeight: '700'});
  expect(node.props.accessibilityLabel).toBe('คำทักทาย');
  tree.unmount();
});

test('shared input preserves native ref, input settings and change events', () => {
  const ref = createRef<NativeTextInput>();
  const onChangeText = jest.fn();
  const tree = renderer.create(<TextInput ref={ref} keyboardType="email-address" onChangeText={onChangeText} style={{fontSize: 16}} />);
  const node = tree.root.findByType(NativeTextInput);
  expect(ref.current).toBeTruthy();
  expect(StyleSheet.flatten(node.props.style)).toEqual({fontFamily: 'Prompt', fontSize: 16});
  expect(node.props.keyboardType).toBe('email-address');
  act(() => node.props.onChangeText('hello'));
  expect(onChangeText).toHaveBeenCalledWith('hello');
  tree.unmount();
});
