import AWS from 'aws-sdk';

export function generateFeed(imageTag:AWS.DynamoDB.DocumentClient.AttributeMap, images:AWS.DynamoDB.DocumentClient.ItemList) {
    return '<xml></xml>';
}