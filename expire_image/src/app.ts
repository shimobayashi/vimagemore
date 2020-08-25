import AWS from 'aws-sdk';

export async function lambdaHandler (event:any) {
    const docClient = new AWS.DynamoDB.DocumentClient();

    /* 古くなっているImageを取得する */
    console.log('Scan expired Image');
    // 最後の更新から7日経過したImageはExpireしたものとする
    const expireUpdatedAt = Math.floor(Date.now() / 1000) - (7 * (24 * 60 * 60));
    return docClient.scan({
        TableName: process.env.IMAGE_TABLE_NAME ?? '',
        FilterExpression: 'UpdatedAt <= :expireUpdatedAt',
        ExpressionAttributeValues: {
            ':expireUpdatedAt': expireUpdatedAt,
        },
    }).promise().then(value => {
        /* ImageTagから古くなっているImageの登録を削除する */
        console.log('Delete Image at ImageTag');
        let expiredImages = value.Items ? value.Items : [];
        // 一度に大量の画像を消そうとするとDynamoDBまわりでThe level of configured provisioned throughput for the table was exceeded.ということになってしまうので、100個ずつ消すことにする
        // 本当は一気に全部消したほうが良いと思う
        expiredImages.splice(100);
        console.log(`Target expiredImages.length: ${expiredImages.length}`);

        // そもそもexpiredImagesが無いならここでやるべき処理は無いはず
        if (expiredImages.length === 0) {
            return undefined; // ちゃんと理解できてないけどundefinedを返すとPromiseチェインが中断されるっぽい
        }

        // 雑にすべてのImageTagを取得する(雑すぎる！)
        return docClient.scan({
            TableName: process.env.IMAGE_TAG_TABLE_NAME ?? '',
        }).promise().then(value => {
            const imageTags = value.Items ? value.Items : [];

            // すべてのImageTagから古くなっているImageのIdを削除して回る
            return Promise.all(
                imageTags.filter(imageTag => {
                    return expiredImages.some(expiredImage => {
                        return imageTag.Images.includes(expiredImage.Id);
                    });
                }).map(imageTag => {
                    /* REMOVE式を頑張って組み立てる */
                    const allPartialExpressions = expiredImages.map(expiredImage => {
                        return expiredImage.Id;
                    }).map(expiredImageId => {
                        // ImageTag.Imagesにおけるインデックスに変換する
                        return imageTag.Images.findIndex((imageId:string) => imageId === expiredImageId);
                    }).filter(index => {
                        // 見つからなかったものは-1になっているので取り除く
                        return index >= 0;
                    }).map(index => {
                        // REMOVE式の一部として正しい形にする
                        return `Images[${index}]`;
                    });
                    // 1つのREMOVE式にすべて詰め込もうとするとExpression size has exceeded the maximum allowed sizeとかいって怒られるので頑張って分割する
                    // 参考: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Limits.html#limits-expression-parameters
                    let expressions = [];
                    while(allPartialExpressions.length > 0) {
                        const partialExpressions = allPartialExpressions.splice(0, 100); // 適当に100個ずつ分割する
                        expressions.push('REMOVE ' + partialExpressions.join(', '));
                    }

                    return Promise.all(
                        expressions.map(expression => {
                            return docClient.update({
                                TableName: process.env.IMAGE_TAG_TABLE_NAME ?? '',
                                Key: {
                                    Id: imageTag.Id,
                                },
                                UpdateExpression: expression,
                                ReturnValues: 'NONE',
                            }).promise();
                        })
                    )
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