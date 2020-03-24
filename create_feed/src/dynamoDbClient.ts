// 検証のためにDynamoDBにクエリーするスクリプト
// 実行例: `npm bin`/ts-node src/dynamoDbClient.ts TABLE_NAME

import AWS from 'aws-sdk';

AWS.config.update({region: 'ap-northeast-1'});

const tableName = process.argv[2];
const docClient = new AWS.DynamoDB.DocumentClient();
docClient.scan({
    TableName: tableName,
    FilterExpression: 'contains(:targetTags, Id)',
    ExpressionAttributeValues: {
        ':targetTags': ['タグ1', 'タグ1'],
    },
}).promise().then(value => {
    console.log('Success', value);
}).catch(err => {
    console.log('Error', err);
});