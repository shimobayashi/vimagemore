import AWS from 'aws-sdk';
import { Feed } from 'feed';

export function generateFeed(websiteUrl:string, imageTag:AWS.DynamoDB.DocumentClient.AttributeMap, images:AWS.DynamoDB.DocumentClient.ItemList) {
    const feed = new Feed({
        title: `"${imageTag.Id}" images - vimagemore`,
        description: `Images tagged "${imageTag.Id}"`,
        id: `${imageTag.Id}@vimagemore`,
        copyright: 'All rights reserved 2020, vimagemore',
        generator: 'vimagemore',
    })

    images.forEach(image => {
        feed.addItem({
            title: image.Title,
            id: `${image.Id}@vimagemore`,
            link: image.Link,
            description: imageToDescription(websiteUrl, image),
            date: new Date(image.UpdatedAt * 1000),
            // content要素を設定しても良いかも知れない
            // image要素を設定しても良いかも知れない
        })
    })

    return feed.rss2();
}

function imageToDescription(websiteUrl:string, image:AWS.DynamoDB.DocumentClient.AttributeMap) {
    const tagHtml = `<div class="tags">${image.Tags.join(', ')}</div>`;
    const src = websiteUrl + image.Path;
    // 本来ならinline-styleでmax-height: 600pxなどと指定したいが、
    // Feedlyはinline-styleを解釈しないようなので指定していない
    // 参考: https://feedly.uservoice.com/forums/192636-suggestions/suggestions/4124796
    // 画像投稿側でリサイズする必要がありそう
    const imageHtml = `<img src="${src}">`;

    const href = image.Link;
    return `<a href="${href}">${tagHtml}${imageHtml}</a>`;
}