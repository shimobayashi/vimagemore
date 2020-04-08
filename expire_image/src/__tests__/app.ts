import * as app from '../app';

const mockS3DeleteObjects = jest.fn();
const mockDynamoDBScan = jest.fn();
const mockDynamoDBUpdate = jest.fn();
const mockDynamoDBDelete = jest.fn();
jest.mock('aws-sdk', () => {
    return {
        S3: () => {
            return {
                deleteObjects: mockS3DeleteObjects,
            };
        },
        DynamoDB: {
            DocumentClient: () => {
                return {
                    scan: mockDynamoDBScan,
                    update: mockDynamoDBUpdate,
                    delete: mockDynamoDBDelete,
                };
            },
        },
    };
});
Date.now = jest.fn(() => 1482363367071);

describe('Tests index', () => {
    beforeEach(() => {
        mockS3DeleteObjects.mockReset();
        mockDynamoDBScan.mockReset();
        mockDynamoDBUpdate.mockReset();
        mockDynamoDBDelete.mockReset();
        process.env.BUCKET_NAME = 'vimagemore_test_bucket';
        process.env.IMAGE_TABLE_NAME = 'Image';
        process.env.IMAGE_TAG_TABLE_NAME = 'ImageTag';
    });

    // jestでタイムアウトするまで待ってるのでなんかミスってる気がする
    test('verifies successful response', () => {
        mockDynamoDBScan.mockImplementationOnce(params => {
            // 古くなっているImageたち
            return {
                promise() {
                    return Promise.resolve({
                        Items: [
                            {
                                // test tag 1に属している
                                Id: 'test image 1',
                                Path: 'test path 1',
                            },
                            {
                                // どのImageTagにも属していない
                                Id: 'test image 2',
                                Path: 'test path 2',
                            },
                        ],
                    });
                }
            };
        }).mockImplementationOnce(params => {
            // すべてのImageTagたち
            return {
                promise() {
                    return Promise.resolve({
                        Items: [
                            {
                                Id: 'test tag 1',
                                Images: ['unexist test image', 'test image 1'],
                            },
                            {
                                Id: 'test tag 2',
                                Images: ['unexist test image'],
                            },
                        ],
                    });
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
        mockS3DeleteObjects.mockImplementation((params) => {
            return {
                promise() {
                    return Promise.resolve();
                }
            };
        });
        mockDynamoDBDelete.mockImplementation((params) => {
            return {
                promise() {
                    return Promise.resolve();
                }
            };
        });

        return app.lambdaHandler({}).then(response => {
            expect(response).toEqual({
                statusCode: 200,
            });
            expect(mockDynamoDBScan.mock.calls).toEqual([
                [
                    {
                        TableName: 'Image',
                        FilterExpression: 'UpdatedAt <= :expireUpdatedAt',
                        ExpressionAttributeValues: {
                            ':expireUpdatedAt': 1482363367 - (14 * (24 * 60 * 60)),
                        },
                    },
                ],
                [
                    {
                        TableName: 'ImageTag',
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
                        UpdateExpression: 'REMOVE Images[1]',
                        ReturnValues: 'NONE',
                    },
                ],
            ]);
            expect(mockS3DeleteObjects.mock.calls).toEqual([
                [
                    {
                        Bucket: 'vimagemore_test_bucket',
                        Delete: {
                            Objects: [
                                {
                                    Key: 'test path 1'
                                },
                                {
                                    Key: 'test path 2'
                                },
                            ],
                        },
                    },
                ],
            ]);
            expect(mockDynamoDBDelete.mock.calls).toEqual([
                [
                    {
                        TableName: 'Image',
                        Key: {
                            Id: 'test image 1',
                        },
                    },
                ],
                [
                    {
                        TableName: 'Image',
                        Key: {
                            Id: 'test image 2',
                        },
                    },
                ],
            ]);
        });
    });
});
