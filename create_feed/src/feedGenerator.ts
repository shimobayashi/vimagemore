import AWS from 'aws-sdk';

export function generateFeed(imageTag:AWS.DynamoDB.DocumentClient.AttributeMap, images:AWS.DynamoDB.DocumentClient.ItemList) {
    console.log(imageTag.Id);
    console.log(images);

    return '<xml></xml>';
}