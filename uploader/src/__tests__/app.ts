import AWS from 'aws-sdk';

import * as app from '../app';

// 参考: https://github.com/aws/aws-sdk-js/issues/1963#issuecomment-508210959
// 参考: https://jestjs.io/docs/ja/tutorial-async
jest.mock('aws-sdk', () => {
    return {
        S3: () => {
            return {
                putObject: () => {
                    return {
                        promise: () => {
                            return new Promise((resolve) => {
                                resolve();
                            })
                        },
                    }
                },
            }
        },
    };
});
describe('Tests index', () => {
    test('verifies successful response', done => {
        const callback:Function = (err:any, result:any) => {
            try {
                expect(result).toEqual(expect.any(Object));
                expect(result.statusCode).toBe(200);
                expect(result.body).toEqual(expect.any(String));

                let response = JSON.parse(result.body);

                expect(response).toEqual(expect.any(Object));
                expect(response.message).toMatch("Succeed!");

                done();
            } catch (error) {
                done(error);
            }
        };

        app.lambdaHandler({}, {}, callback);
    });
});
