import { defineMock } from '@umijs/max';

export default defineMock({
  'POST /api/v1/auth/token/refresh': (req: any, res: any) => {
    res.json({
      access: 'test_access_token',
    });
  },
  'GET /api/v1/auth/user': (req: any, res: any) => {
    const authHeader = req.headers['authorization'];
    if (authHeader) {
      res.send({ id: 0, name: 'Umi', nickName: 'U', gender: 'MALE' });
    } else {
      res.status(401).send({
        message: 'Incorrect authentication credentials.',
      });
    }
  },
});
