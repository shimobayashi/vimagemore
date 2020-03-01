import AWS from 'aws-sdk';

export async function lambdaHandler (event:any) {
    const docClient = new AWS.DynamoDB.DocumentClient();

    return docClient.scan({
        TableName: process.env.CREATE_FEED_TARGET_TABLE_NAME ?? '',
    }).promise().then(value => {
        /* フィード生成対象となるImageTagを取得する */
        let targetTags = value.Items ? value.Items.map((createFeedTarget) => {
            return createFeedTarget.ImageTag + '';
        }) : [];

        return docClient.query({
            TableName: process.env.IMAGE_TAG_TABLE_NAME ?? '',
            FilterExpression: 'contains(Id, :targetTags)',
            ExpressionAttributeValues: {
                ':targetTags': targetTags,
            },
        }).promise();
    }).then(value => {
        /* フィード生成対象となるそれぞれのImageTagに紐付けられたImageを取得し、フィードを生成してS3へ設置する */
        let imageTags = value.Items ? value.Items : [];

        return Promise.all(
            imageTags.map(imageTag => {
                return docClient.query({
                    TableName: process.env.IMAGE_TABLE_NAME ?? '',
                    FilterExpression: 'contains(Id, :images)',
                    ExpressionAttributeValues: {
                        ':images': imageTag.Images,
                    },
                    ScanIndexForward: false,
                    Limit: 50,
                }).promise().then(value => {
                    let images = value.Items ? value.Items : [];
                    //XXX フィードを生成してS3へ設置するPromiseをreturnする
                });
            })
        );
    }).then(() => {
        return {
            statusCode: 200,
        };
    });
}