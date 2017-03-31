import * as request from 'promisify-supertest';
import * as sinon from 'sinon';
import * as chai from 'chai';
import * as sinonChai from 'sinon-chai';

import { app } from './../src/index';
const expect = chai.use(sinonChai).expect;

describe('test', () => {
  describe('post', () => {
    before(async () => {
    });

    it('should return 404 on invalid path', async () => {
      await request(app)
        .post('/user')
        .expect(404);
    });
  });
});