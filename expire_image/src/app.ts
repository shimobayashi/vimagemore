import AWS from 'aws-sdk';

export async function lambdaHandler (event:any) {
    const docClient = new AWS.DynamoDB.DocumentClient();

    /* 古くなっているImageを取得する */
    console.log('Scan expired Image');
    // 最後の更新から14日経過したImageはExpireしたものとする
    const expireUpdatedAt = Math.floor(Date.now() / 1000) - (14 * (24 * 60 * 60));
    return docClient.scan({
        TableName: process.env.IMAGE_TABLE_NAME ?? '',
        FilterExpression: 'UpdatedAt <= :expireUpdatedAt',
        ExpressionAttributeValues: {
            ':expireUpdatedAt': expireUpdatedAt,
        },
    }).promise().then(value => {
        /* ImageTagから古くなっているImageの登録を削除する */
        console.log('Delete Image at ImageTag');
        const expiredImages = value.Items ? value.Items : [];

        // 雑にすべてのImageTagを取得する(雑すぎる！)
        return docClient.scan({
            TableName: process.env.IMAGE_TAG_TABLE_NAME ?? '',
        }).promise().then(value => {
            const imageTags = value.Items ? value.Items : [];

            // すべてのImageTagから古くなっているImageのIdを削除して回る
            return Promise.all(
                // すべてにImageTagへDELETEを発行すると遅すぎるので事前に今回expireしたImageを持っているImageTagのみに絞り込む
                imageTags.filter(imageTag => {
                    return expiredImages.some(expiredImage => {
                        return imageTag.Images.includes(expiredImage.Id);
                    });
                }).map(imageTag => {
                    return docClient.update({
                        TableName: process.env.IMAGE_TAG_TABLE_NAME ?? '',
                        Key: {
                            Id: imageTag.Id,
                        },
                        UpdateExpression: 'DELETE Images :expiredImages',
                        ExpressionAttributeValues: {
                            ':expiredImages': expiredImages.map(expiredImage => {
                                return expiredImage.Id;
                            }),
                        },
                        ReturnValues: 'NONE',
                    }).promise();
                })
            );
        }).then(() => {
            /* 画像データの実体を消す */
            console.log('Delete Image at S3');
            const s3 = new AWS.S3();
            const params:AWS.S3.Types.DeleteObjectsRequest = {
                Bucket: process.env.BUCKET_NAME ?? '',
                Delete: {
                    Objects: expiredImages.map(expiredImage => {
                        return {
                            Key: expiredImage.Path,
                        };
                    }),
                },
            };
            return s3.deleteObjects(params).promise();
        }).then(() => {
            /* Image自身を消す */
            console.log('Delete Image at DynamoDB');
            return Promise.all(
                expiredImages.map(expiredImage => {
                    return docClient.delete({
                        TableName: process.env.IMAGE_TABLE_NAME ?? '',
                        Key: {
                            Id: expiredImage.Id,
                        },
                    }).promise();
                })
            );
        });
    }).then(() => {
        return {
            statusCode: 200,
        };
    });
}