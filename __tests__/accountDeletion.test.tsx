import React from 'react';
import renderer, {act} from 'react-test-renderer';
import {Alert, Pressable} from 'react-native';
import {GoogleSignin} from '@react-native-google-signin/google-signin';
import {deleteMyAccount} from '../src/services/accountDeletion';
import AccountDeletionButton from '../src/components/AccountDeletionButton';

jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {signInSilently:jest.fn(),signIn:jest.fn(),getTokens:jest.fn(),revokeAccess:jest.fn()},
  isSuccessResponse: (value: {type:string}) => value.type === 'success',
}));

jest.mock('../src/theme/theme', () => ({useTheme: () => ({palette:{danger:'#e33661'}})}));
const originalFetch = global.fetch;
beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Alert,'alert').mockImplementation(() => {});
  jest.mocked(GoogleSignin.signInSilently).mockResolvedValue({type:'success',data:{user:{email:'owner@gmail.com'}}} as Awaited<ReturnType<typeof GoogleSignin.signInSilently>>);
  jest.mocked(GoogleSignin.getTokens).mockResolvedValue({idToken:'signed-owner',accessToken:'unused'});
  jest.mocked(GoogleSignin.revokeAccess).mockResolvedValue(null);
  global.fetch = jest.fn(async () => ({ok:true,json:async()=>({data:{deleted:true}})})) as jest.Mock;
});
afterEach(() => {global.fetch = originalFetch; jest.restoreAllMocks();});

test('deletes with verified Google token and no client-supplied account selector',async()=>{
  await deleteMyAccount('OWNER@gmail.com');
  const [url, options] = (fetch as jest.Mock).mock.calls[0];
  expect(url).toMatch(/\/mobile\/account$/);
  expect(options.method).toBe('DELETE');
  expect(options.headers.Authorization).toBe('Bearer signed-owner');
  expect(JSON.parse(options.body)).toEqual({confirmation:true});
  expect(GoogleSignin.revokeAccess).toHaveBeenCalledTimes(1);
});
test('a changed email in local storage never deletes another account',async()=>{
  await expect(deleteMyAccount('other@gmail.com')).rejects.toThrow('เดียวกับบัญชี');
  expect(fetch).not.toHaveBeenCalled();
});
test('backend rejection retains Google access and is shown to the caller',async()=>{
  (fetch as jest.Mock).mockResolvedValue({ok:false,json:async()=>({message:'Deletion unavailable'})});
  await expect(deleteMyAccount('owner@gmail.com')).rejects.toThrow('Deletion unavailable');
  expect(GoogleSignin.revokeAccess).not.toHaveBeenCalled();
});
test('button requires explicit confirmation, blocks duplicate requests and logs out only on success',async()=>{
  let finish!: () => void;
  (fetch as jest.Mock).mockImplementation(() => new Promise(resolve=>{finish = ()=>resolve({ok:true,json:async()=>({data:{deleted:true}})});}));
  const onDeleted = jest.fn(); let tree!:renderer.ReactTestRenderer;
  act(()=>{tree = renderer.create(<AccountDeletionButton email="owner@gmail.com" onDeleted={onDeleted} />);});
  act(()=>tree.root.findByType(Pressable).props.onPress());
  expect(fetch).not.toHaveBeenCalled();
  const buttons = jest.mocked(Alert.alert).mock.calls[0][2]!;
  expect(buttons[0].style).toBe('cancel');
  let pending: unknown;
  await act(async()=>{pending = buttons[1].onPress!();});
  await act(async()=>{await buttons[1].onPress!();});
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(onDeleted).not.toHaveBeenCalled();
  await act(async()=>{finish(); await pending;});
  expect(onDeleted).toHaveBeenCalledTimes(1);
  act(()=>tree.unmount());
});
