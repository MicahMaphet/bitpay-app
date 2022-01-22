import React, {useLayoutEffect, useState} from 'react';
import {BaseText, HeaderTitle} from '../../../components/styled/Text';
import {useNavigation, useRoute} from '@react-navigation/native';
import {RouteProp} from '@react-navigation/core';
import {WalletStackParamList} from '../WalletStack';
import {useDispatch} from 'react-redux';
import styled from 'styled-components/native';
import {ScreenGutter} from '../../../components/styled/Containers';
import {Caution, SlateDark, White} from '../../../styles/colors';
import * as yup from 'yup';
import {Controller, useForm} from 'react-hook-form';
import {yupResolver} from '@hookform/resolvers/yup';
import BoxInput from '../../../components/form/BoxInput';
import Button from '../../../components/button/Button';
import {WalletActions} from '../../../store/wallet/index';
import {useLogger} from '../../../utils/hooks';
import {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scroll-view';

const EncryptPasswordContainer = styled.SafeAreaView`
  flex: 1;
`;

const ScrollView = styled(KeyboardAwareScrollView)`
  margin-top: 20px;
  padding: 0 ${ScreenGutter};
`;

const Paragraph = styled(BaseText)`
  font-weight: normal;
  font-size: 16px;
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
`;

const PasswordFormContainer = styled.View`
  margin: 15px 0;
`;

const PasswordInputContainer = styled.View`
  margin: 15px 0;
`;

const PasswordActionContainer = styled.View`
  margin-top: 20px;
`;

const ErrorText = styled(BaseText)`
  color: ${Caution};
  font-size: 12px;
  font-weight: 500;
  margin: 5px auto;
`;

const schema = yup.object().shape({
  password: yup.string().required(),
  confirmPassword: yup
    .string()
    .required('Confirm Encryption Password is required field')
    .oneOf([yup.ref('password')], 'Passwords must match'),
});

interface EncryptPasswordFieldValues {
  password: string;
  confirmPassword: string;
}

const CreateEncryptionPassword = () => {
  const navigation = useNavigation();
  const {
    params: {key},
  } = useRoute<RouteProp<WalletStackParamList, 'CreateEncryptionPassword'>>();

  const {
    control,
    handleSubmit,
    formState: {errors},
  } = useForm<EncryptPasswordFieldValues>({
    resolver: yupResolver(schema),
  });

  const dispatch = useDispatch();
  const [genericError, setGenericError] = useState<string>('');
  const logger = useLogger();
  const onSubmit = ({password}: {password: string}) => {
    try {
      if (key) {
        // TODO: Update wallet name
        logger.debug('Encrypting private key for: Wallet 1');

        key.methods.encrypt(password);
        dispatch(WalletActions.successEncryptOrDecryptPassword({key}));
        key.isPrivKeyEncrypted = key.methods.isPrivKeyEncrypted();
        navigation.navigate('Wallet', {
          screen: 'KeySettings',
          params: {key},
        });
        logger.debug('Key encrypted');
      } else {
        setGenericError('Something went wrong. Please try again.');
      }
    } catch (e) {
      if (!e) {
        return;
      }
      setGenericError(`Could not encrypt/decrypt group wallets: ${e}`);
    }
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => <HeaderTitle>Create Encryption Password</HeaderTitle>,
    });
  });

  return (
    <EncryptPasswordContainer>
      <ScrollView>
        <Paragraph>
          Your wallet will be encrypted. Whenever you make a transaction, we
          will ask for the password. This cannot be recovered, so be sure to
          store it safely.
        </Paragraph>

        <PasswordFormContainer>
          {!!genericError && <ErrorText>{genericError}</ErrorText>}
          <PasswordInputContainer>
            <Controller
              control={control}
              render={({field: {onChange, onBlur, value}}) => (
                <BoxInput
                  placeholder={'strongPassword123'}
                  label={'ENCRYPTION PASSWORD'}
                  type={'password'}
                  onBlur={onBlur}
                  onChangeText={(text: string) => onChange(text)}
                  error={errors.password?.message}
                  value={value}
                />
              )}
              name="password"
              defaultValue=""
            />
          </PasswordInputContainer>

          <PasswordInputContainer>
            <Controller
              control={control}
              render={({field: {onChange, onBlur, value}}) => (
                <BoxInput
                  placeholder={'strongPassword123'}
                  label={'CONFIRM ENCRYPTION PASSWORD'}
                  type={'password'}
                  onBlur={onBlur}
                  onChangeText={(text: string) => onChange(text)}
                  error={errors.confirmPassword?.message}
                  value={value}
                />
              )}
              name="confirmPassword"
              defaultValue=""
            />
          </PasswordInputContainer>

          <PasswordActionContainer>
            <Button onPress={handleSubmit(onSubmit)}>
              Save Encryption Password
            </Button>
          </PasswordActionContainer>
        </PasswordFormContainer>
      </ScrollView>
    </EncryptPasswordContainer>
  );
};

export default CreateEncryptionPassword;