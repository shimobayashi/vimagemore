import fs from 'fs';

import * as app from '../app';

// 参考: https://github.com/aws/aws-sdk-js/issues/1963#issuecomment-508210959
// 参考: https://jestjs.io/docs/ja/tutorial-async
const mockS3PutObject = jest.fn();
const mockDynamoDBPut = jest.fn();
const mockDynamoDBUpdate = jest.fn();
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
                    update: mockDynamoDBUpdate,
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
        process.env.IMAGE_BUCKET_NAME = 'vimagemore_test_bucket';
        process.env.IMAGE_TABLE_NAME = 'Image';
        process.env.IMAGE_TAG_TABLE_NAME = 'ImageTag';
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
        mockDynamoDBUpdate.mockImplementation((params) => {
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
            tags: ['test tag 1', 'test tag 2'],
            image: image.toString('base64'),
        };

        return app.lambdaHandler({
            body: JSON.stringify(event_body),
        }).then((response) => {
            expect(response).toEqual({
                statusCode: 200,
            });
            expect(mockDynamoDBPut.mock.calls).toEqual([
                [
                    {
                        TableName: 'Image',
                        Item: {
                            Id: 'test_id',
                            Path: 'images/test_id.png',
                            Title: 'test title',
                            Tags: ['test tag 1', 'test tag 2'],
                            CreatedAt: 1482363367,
                            UpdatedAt: 1482363367,
                        },
                        Expected: {
                            Id: {
                                Exists: false,
                            },
                        },
                    },
                ],
            ]);
            expect(mockDynamoDBUpdate.mock.calls).toEqual([
                [
                    {
                        TableName: 'ImageTag',
                        Key: {
                            Id: 'test tag 1',
                        },
                        UpdateExpression: 'SET Images = list_append(if_not_exists(Images, :emptyList), :taggedImages)',
                        ExpressionAttributeValues: {
                            ':emptyList': [],
                            ':taggedImages': ['test_id'],
                        },
                        ReturnValues: 'NONE',
                    },
                ],
                [
                    {
                        TableName: 'ImageTag',
                        Key: {
                            Id: 'test tag 2',
                        },
                        UpdateExpression: 'SET Images = list_append(if_not_exists(Images, :emptyList), :taggedImages)',
                        ExpressionAttributeValues: {
                            ':emptyList': [],
                            ':taggedImages': ['test_id'],
                        },
                        ReturnValues: 'NONE',
                    },
                ],
            ])
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

    //TODO 丁寧にやるならConditionalCheckFailedExceptionが返ってくる場合のテストとかも書いたほうが良い気がする
});
