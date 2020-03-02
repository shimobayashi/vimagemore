import * as FeedGenerator from '../feedGenerator';

test('フィードを期待通りに生成できる', () => {
    const feed = FeedGenerator.generateFeed(
        'www.example.com',
        {
            Id: 'test tag 1',
        },
        [
            {
                Id: 'test image 2',
                Path: 'images/test_image_2.png',
                Title: 'test image 2',
                Tags: ['test tag 1'],
                Link: 'https://www.example.com/',
                CreatedAt: 1482363367,
                UpdatedAt: 1482363367,
            },
            {
                Id: 'test image 1',
                Path: 'images/test_image_1.png',
                Title: 'test image 1',
                Tags: ['test tag 1'],
                Link: 'https://www.example.com/',
                CreatedAt: 1482363367,
                UpdatedAt: 1482363367,
            },
        ]
    );

    // lastBuildDateをもっといい感じにテストしたかったが、global.Dateをうまくモックできなかった
    expect(feed).toEqual(`<?xml version="1.0" encoding="utf-8"?>
<rss version="2.0">
    <channel>
        <title>"test tag 1" images - vimagemore</title>
        <link>undefined</link>
        <description>Images tagged "test tag 1"</description>
        <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
        <docs>https://validator.w3.org/feed/docs/rss2.html</docs>
        <generator>vimagemore</generator>
        <copyright>All rights reserved 2020, vimagemore</copyright>
        <item>
            <title><![CDATA[test image 2]]></title>
            <link>https://www.example.com/</link>
            <guid>test image 2@vimagemore</guid>
            <pubDate>Wed, 21 Dec 2016 23:36:07 GMT</pubDate>
            <description><![CDATA[<a href="https://www.example.com/"><div class="tags">test tag 1</div><img src="https://www.example.com/images/test_image_2.png"></a>]]></description>
        </item>
        <item>
            <title><![CDATA[test image 1]]></title>
            <link>https://www.example.com/</link>
            <guid>test image 1@vimagemore</guid>
            <pubDate>Wed, 21 Dec 2016 23:36:07 GMT</pubDate>
            <description><![CDATA[<a href="https://www.example.com/"><div class="tags">test tag 1</div><img src="https://www.example.com/images/test_image_1.png"></a>]]></description>
        </item>
    </channel>
</rss>`);
});