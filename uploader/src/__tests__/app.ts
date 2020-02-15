import AWS from 'aws-sdk';
import fs from 'fs';

import * as app from '../app';

// 参考: https://github.com/aws/aws-sdk-js/issues/1963#issuecomment-508210959
// 参考: https://jestjs.io/docs/ja/tutorial-async
const mockS3PutObject = jest.fn();
jest.mock('aws-sdk', () => {
    return {
        S3: () => {
            return {
                putObject: mockS3PutObject,
            }
        },
    };
});

describe('Tests index', () => {
    beforeEach(() => {
        mockS3PutObject.mockReset();
        process.env.VIMAGEMORE_BUCKET_NAME = 'vimagemore_test_bucket';
    });

    test('verifies successful response', () => {
        mockS3PutObject.mockImplementation((params) => {
            return {
                promise() {
                    return Promise.resolve();
                }
            };
        });

        const image = fs.readFileSync('./src/__tests__/150x150.png');
        const event_body = {
            image: image.toString('base64'),
        };

        app.lambdaHandler({
            body: JSON.stringify(event_body),
        }).then(() => {
            expect(mockS3PutObject.mock.calls).toEqual([
                [{
                    Bucket: 'vimagemore_test_bucket',
                    Key: expect.stringMatching(/^images\/[\w\-]+?\.png$/),
                    ContentType: 'image/png',
                    Body: image,
                    ACL: 'public-read',
                }]
            ]);
        });
    });
});
