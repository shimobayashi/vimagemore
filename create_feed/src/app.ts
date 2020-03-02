import AWS from 'aws-sdk';

import * as FeedGenerator from './feedGenerator';

// scanしまくってて最悪なのでなんとかしたい https://github.com/shimobayashi/vimagemore/issues/4
export async function lambdaHandler (event:any) {
    const docClient = new AWS.DynamoDB.DocumentClient();

    return docClient.scan({
        TableName: process.env.CREATE_FEED_TARGET_TABLE_NAME ?? '',
    }).promise().then(value => {
        /* フィード生成対象となるImageTagを取得する */
        let targetTags = value.Items ? value.Items.map((createFeedTarget) => {
            return createFeedTarget.ImageTag + '';
        }) : [];

        return docClient.scan({
            TableName: process.env.IMAGE_TAG_TABLE_NAME ?? '',
            FilterExpression: 'contains(:targetTags, Id)',
            ExpressionAttributeValues: {
                ':targetTags': targetTags,
            },
        }).promise();
    }).then(value => {
        /* フィード生成対象となるそれぞれのImageTagに紐付けられたImageを取得し、フィードを生成してS3へ設置する */
        let imageTags = value.Items ? value.Items : [];

        const s3 = new AWS.S3();
        return Promise.all(
            imageTags.map(imageTag => {
                return docClient.scan({
                    TableName: process.env.IMAGE_TABLE_NAME ?? '',
                    FilterExpression: 'contains(:images, Id)',
                    ExpressionAttributeValues: {
                        ':images': imageTag.Images,
                    },
                }).promise().then(value => {
                    let images = value.Items ? value.Items.sort((a, b) => {
                        // UpdatedAtで降順に並べる
                        return b.UpdatedAt - a.UpdatedAt;
                    }) : [];
                    const feed = FeedGenerator.generateFeed(process.env.BUCKET_REGIONAL_DOMAIN_NAME ?? '', imageTag, images);
                    return s3.putObject({
                        Bucket: process.env.BUCKET_NAME ?? '',
                        Key: `feeds/${imageTag.Id}.xml`,
                        ContentType: 'application/xml;charset=UTF-8',
                        Body: feed,
                        ACL: 'public-read',
                    }).promise();
                });
            })
        );
    }).then(() => {
        return {
            statusCode: 200,
        };
    });
}