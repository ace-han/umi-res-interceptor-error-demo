import Guide from '@/components/Guide';
import {
  getUserInfoViaAxios,
  getUserInfoViaUmi,
} from '@/services/demo/AuthController';
import { trim } from '@/utils/format';
import { clearAccessToken } from '@/utils/storage';
import { PageContainer } from '@ant-design/pro-components';
import { useModel } from '@umijs/max';
import { Button } from 'antd';
import { useState } from 'react';
import styles from './index.less';

const HomePage: React.FC = () => {
  const { name } = useModel('global');
  const [umiUser, setUmiUser] = useState<API.AuthUserResult>({
    name: 'undefined',
  });
  const [axiosUser, setAxiosUser] = useState<API.AuthUserResult>({
    name: 'undefined',
  });

  const updateUmiUser = async () => {
    clearAccessToken();
    setUmiUser({ name: 'loading...' });
    const userInfo = await getUserInfoViaUmi();
    setUmiUser(userInfo);
  };
  const updateAxioUser = async () => {
    clearAccessToken();
    setAxiosUser({ name: 'loading...' });
    const userInfo = await getUserInfoViaAxios();
    setAxiosUser(userInfo);
  };
  return (
    <PageContainer ghost>
      <div className={styles.container}>
        <Guide name={trim(name)} />
      </div>
      <div>
        <div>
          <Button onClick={updateUmiUser}>UserInfo via Umijs</Button>:{' '}
          {JSON.stringify(umiUser)}
        </div>
        <div>
          <Button onClick={updateAxioUser}>UserInfo via Axios</Button>:{' '}
          {JSON.stringify(axiosUser)}
        </div>
      </div>
    </PageContainer>
  );
};

export default HomePage;
