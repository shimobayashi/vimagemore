// ImageTagTableの特定のタグに何らかのミスですでに存在しないImageがImagesに含まれているときに、
// 整合処理をするために実行するスクリプト
// すでに存在しないImageを列挙して削除してくれる
// 多分scanの上限がある都合上たぶん何度も実行しないと整合が取れない
// 実行例: `npm bin`/ts-node src/sakusakuSeigouKun.ts IMAGE_TAG_TABLE_NAME TAG_ID IMAGE_TABLE_NAME

import AWS from 'aws-sdk';

AWS.config.update({region: 'ap-northeast-1'});

const imageTagTableName = process.argv[2];
const tagId = process.argv[3];
const imageTableName = process.argv[4];
const docClient = new AWS.DynamoDB.DocumentClient();
docClient.query({
    TableName: imageTagTableName,
    KeyConditionExpression: 'Id = :tagId',
    ExpressionAttributeValues: {
        ':tagId': tagId,
    },
}).promise().then(value => {
    const imageTags = value.Items ? value.Items : [];
    const originalImageIds:string[] = imageTags[0].Images;
    console.log('originalImageIds', originalImageIds);
    return docClient.scan({
        TableName: imageTableName,
        FilterExpression: 'contains(:images, Id)',
        ExpressionAttributeValues: {
            ':images': originalImageIds,
        },
    }).promise().then(value => {
        const images = value.Items ? value.Items : [];
        const existsImageIds:string[] = images.map(image => {
            return image.Id;
        });
        console.log('existsImageIds', existsImageIds);
        const notFoundImageIds = originalImageIds.filter(oe => {
            const found = existsImageIds.findIndex(ee => oe === ee) >= 0;
            return !found;
        });
        console.log('notFoundiffImageIds', notFoundImageIds);
        console.log(originalImageIds.length);
        console.log(existsImageIds.length);
        console.log(notFoundImageIds.length);
        // existsImageIds.length + notFoundiffImageIds.length をしても originalImageIds.length とは一致しないかも知れない。なぜなら、 existsImageIds がscanの上限にあたって全件取得できてないかも知れないので

        /* REMOVE式を頑張って組み立てる */
        const allPartialExpressions = notFoundImageIds.map(notFoundImageId => {
            // ImageTag.Imagesにおけるインデックスに変換する
            return originalImageIds.findIndex((imageId:string) => imageId === notFoundImageId);
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
        //console.log(expressions);

        return Promise.all(
            expressions.map(expression => {
                return docClient.update({
                    TableName: imageTagTableName,
                    Key: {
                        Id: tagId,
                    },
                    UpdateExpression: expression,
                    ReturnValues: 'NONE',
                }).promise();
            })
        );
    }).then(value => {
        console.log('Deleted', value);
    });
}).catch(err => {
    console.log('Error', err);
});
