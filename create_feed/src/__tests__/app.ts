import * as app from '../app';

const mockDynamoDBScan = jest.fn();
const mockDynamoDBQuery = jest.fn();
jest.mock('aws-sdk', () => {
    return {
        DynamoDB: {
            DocumentClient: () => {
                return {
                    scan: mockDynamoDBScan,
                    query: mockDynamoDBQuery,
                };
            },
        },
    };
});

describe('Tests index', () => {
    beforeEach(() => {
        mockDynamoDBScan.mockReset();
        mockDynamoDBQuery.mockReset();
        process.env.IMAGE_BUCKET_NAME = 'vimagemore_test_bucket';
        process.env.IMAGE_TABLE_NAME = 'Image';
        process.env.IMAGE_TAG_TABLE_NAME = 'ImageTag';
        process.env.CREATE_FEED_TARGET_TABLE_NAME = 'CreateFeedTarget';
    });

    test('verifies successful response', () => {
        mockDynamoDBScan.mockImplementation((params) => {
            return {
                promise() {
                    return new Promise((resolve) => {
                        switch (params.TableName) {
                        case 'CreateFeedTarget':
                            resolve({
                                Items: [
                                    {
                                        ImageTag: 'test tag 1',
                                    },
                                ],
                            })
                            break;
                        }
                    })
                }
            };
        });
        mockDynamoDBQuery.mockImplementation((params) => {
            return {
                promise() {
                    return new Promise((resolve) => {
                        switch (params.TableName) {
                        case 'ImageTag':
                            resolve({
                                Items: [
                                    {
                                        Id: 'test tag 1',
                                        Images: ['test image 1', 'test image 2'],
                                    },
                                ],
                            })
                            break;
                        case 'Image':
                            resolve({
                                Items: [
                                    {
                                        Id: 'test image 2',
                                        Path: 'images/test_image_2.png',
                                        Title: 'test image 2',
                                        Tags: ['test tag 1'],
                                        CreatedAt: 1482363367,
                                        UpdatedAt: 1482363367,
                                    },
                                    {
                                        Id: 'test image 1',
                                        Path: 'images/test_image_1.png',
                                        Title: 'test image 1',
                                        Tags: ['test tag 1'],
                                        CreatedAt: 1482363367,
                                        UpdatedAt: 1482363367,
                                    },
                                ],
                            })
                            break;
                        }
                    });
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
                        TableName: 'CreateFeedTarget',
                    },
                ],
            ]);
            expect(mockDynamoDBQuery.mock.calls).toEqual([
                [
                    {
                        TableName: 'ImageTag',
                        FilterExpression: 'contains(Id, :targetTags)',
                        ExpressionAttributeValues: {
                            ':targetTags': ['test tag 1'],
                        },
                    },
                ],
                [
                    {
                        TableName: 'Image',
                        FilterExpression: 'contains(Id, :images)',
                        ExpressionAttributeValues: {
                            ':images': ['test image 1', 'test image 2'],
                        },
                        ScanIndexForward: false,
                        Limit: 50,
                    }
                ]
            ]);
        });
    });
});