import AWS from 'aws-sdk';

import * as FeedGenerator from './feedGenerator';

// scanしまくってて最悪なのでなんとかしたい https://github.com/shimobayashi/vimagemore/issues/4
export async function lambdaHandler (event:any) {
    const docClient = new AWS.DynamoDB.DocumentClient();

    return docClient.scan({
        TableName: process.env.CREATE_FEED_TARGET_TABLE_NAME ?? '',
    }).promise().then(value => {
        /* フィード生成対象となるImageTagを取得する */
        const targetTags = value.Items ? value.Items.map((createFeedTarget) => {
            return createFeedTarget.ImageTag + '';
        }) : [];
        console.log('targetTags', targetTags.join(', '));

        return docClient.scan({
            TableName: process.env.IMAGE_TAG_TABLE_NAME ?? '',
            FilterExpression: 'contains(:targetTags, Id)',
            ExpressionAttributeValues: {
                ':targetTags': targetTags,
            },
        }).promise();
    }).then(value => {
        /* フィード生成対象となるそれぞれのImageTagに紐付けられたImageを取得し、フィードを生成してS3へ設置する */
        const imageTags = value.Items ? value.Items : [];

        const s3 = new AWS.S3();
        return Promise.all(
            imageTags.map(imageTag => {
                console.log('scan');
                console.log('imageTag', imageTag.Id);
                return docClient.scan({
                    TableName: process.env.IMAGE_TABLE_NAME ?? '',
                    FilterExpression: 'contains(:images, Id)',
                    ExpressionAttributeValues: {
                        // imageTag.Imagesの末尾に近いものほど新しく追加されたものであるはずなので、
                        // Imagesが多すぎてscanの上限を超えるような場合はなるべく新しいものが処理対象となるようにreverseしている。
                        // reverseは破壊的メソッドだが特に破壊されても問題ないという雑なスタンスで処理している。
                        ':images': imageTag.Images.reverse(),
                    },
                }).promise().then(value => {
                    let images = value.Items ? value.Items.sort((a, b) => {
                        // UpdatedAtで降順に並べる
                        return b.UpdatedAt - a.UpdatedAt;
                    }) : [];
                    console.log('putObject');
                    console.log('imageTag', imageTag.Id);
                    console.log('images.length', images.length);
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