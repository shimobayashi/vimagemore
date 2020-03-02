import * as app from '../app';

const mockS3PutObject = jest.fn();
const mockDynamoDBScan = jest.fn();
const mockDynamoDBQuery = jest.fn();
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
                    scan: mockDynamoDBScan,
                    query: mockDynamoDBQuery,
                };
            },
        },
    };
});

import * as FeedGenerator from '../feedGenerator';
jest.mock('../feedGenerator', () => {
    return {
        generateFeed: jest.fn().mockReturnValueOnce('<xml></xml>'),
    };
});

describe('Tests index', () => {
    beforeEach(() => {
        mockS3PutObject.mockReset();
        mockDynamoDBScan.mockReset();
        mockDynamoDBQuery.mockReset();
        process.env.BUCKET_NAME = 'vimagemore_test_bucket';
        process.env.BUCKET_URL = 'http://vimagemore_test_bucket.s3.example.com/';
        process.env.IMAGE_TABLE_NAME = 'Image';
        process.env.IMAGE_TAG_TABLE_NAME = 'ImageTag';
        process.env.CREATE_FEED_TARGET_TABLE_NAME = 'CreateFeedTarget';
    });

    test('verifies successful response', () => {
        mockS3PutObject.mockImplementation((params) => {
            return {
                promise() {
                    return Promise.resolve();
                }
            };
        });
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
        // mockReturnValueOnceを使って書き直したほうがスッキリするかも知れない
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
            expect(FeedGenerator.generateFeed).toBeCalledWith(
                'http://vimagemore_test_bucket.s3.example.com/',
                {
                    Id: 'test tag 1',
                    Images: ['test image 1', 'test image 2'],
                },
                [
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
            );
            expect(mockS3PutObject.mock.calls).toEqual([
                [{
                    Bucket: 'vimagemore_test_bucket',
                    Key: 'feeds/test tag 1.xml',
                    ContentType: 'application/xml;charset=UTF-8',
                    Body: '<xml></xml>',
                    ACL: 'public-read',
                }]
            ]);
        });
    });
});