import fs from 'fs';

import * as app from '../app';

// 参考: https://github.com/aws/aws-sdk-js/issues/1963#issuecomment-508210959
// 参考: https://jestjs.io/docs/ja/tutorial-async
const mockS3PutObject = jest.fn();
const mockDynamoDBPut = jest.fn();
jest.mock('aws-sdk', () => {
    return {
        S3: () => {
            return {
                putObject: mockS3PutObject,
            };
        },
        DynamoDB: {
            DocumentClient: () => {
                return {
                    put: mockDynamoDBPut,
                };
            },
        },
    };
});
// 参考: https://jestjs.io/docs/ja/snapshot-testing#2-tests-should-be-deterministic
Date.now = jest.fn(() => 1482363367071);

describe('Tests index', () => {
    beforeEach(() => {
        mockS3PutObject.mockReset();
        mockDynamoDBPut.mockReset();
        process.env.VIMAGEMORE_BUCKET_NAME = 'vimagemore_test_bucket';
        process.env.IMAGE_TABLE_NAME = 'Image';
    });

    test('verifies successful response', () => {
        mockS3PutObject.mockImplementation((params) => {
            return {
                promise() {
                    return Promise.resolve();
                }
            };
        });
        mockDynamoDBPut.mockImplementation((params) => {
            return {
                promise() {
                    return Promise.resolve();
                }
            };
        });

        const image = fs.readFileSync('./src/__tests__/150x150.png');
        const event_body = {
            id: 'test_id',
            title: 'test title',
            image: image.toString('base64'),
        };

        return app.lambdaHandler({
            body: JSON.stringify(event_body),
        }).then((response) => {
            expect(response).toEqual({
                statusCode: 200,
            });
            expect(mockDynamoDBPut.mock.calls).toEqual([
                [{
                    TableName: 'Image',
                    Item: {
                        Id: 'test_id',
                        Path: 'images/test_id.png',
                        Title: 'test title',
                        CreatedAt: 1482363367,
                        UpdatedAt: 1482363367,
                    },
                    Expected: {
                        Id: {
                            Exists: false,
                        },
                    },
                }]
            ]);
            expect(mockS3PutObject.mock.calls).toEqual([
                [{
                    Bucket: 'vimagemore_test_bucket',
                    Key: 'images/test_id.png',
                    ContentType: 'image/png',
                    Body: image,
                    ACL: 'public-read',
                }]
            ]);
        });
    });
});
