import * as FeedGenerator from '../feedGenerator';

test('フィードを期待通りに生成できる', () => {
    const feed = FeedGenerator.generateFeed({
        Id: 'test tag 1',
    }, [
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
    ]);

    expect(feed).toEqual('<xml></xml>');
});